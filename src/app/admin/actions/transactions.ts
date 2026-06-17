"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Transaction } from "@/lib/supabase";
import { type CartItem, calculateCurrentPrice, calculatePriceForDateTime } from "@/lib/pricing";
import {
  appendRowToSheet,
  getServiceNamesFromItems,
  createCalendarEvent,
  type SlotData,
  type CustomerData
} from "@/lib/google";

export interface CreateTransactionParams {
  amount: number;
  payment_method: "cash" | "upi" | "razorpay";
  customer_phone?: string;
  customer_name?: string;
  comment?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  couponCode?: string;
  items: CartItem[];
  splitAmounts?: {
    cash: number;
    upi: number;
  };
}

export async function adminCreateTransactionAction({
  amount,
  payment_method,
  customer_phone,
  customer_name,
  comment,
  razorpay_payment_id,
  razorpay_order_id,
  couponCode,
  items,
  splitAmounts,
}: CreateTransactionParams) {
  await requireAdmin();

  // Process cart items to apply dynamic pricing for services
  const processedItems = items.map(item => {
    if (item.type === "service" && item.metadata?.service) {
      if (item.metadata.slot?.start_time) {
        const slotStartTime = new Date(item.metadata.slot.start_time);
        const slotPrice = calculatePriceForDateTime(item.metadata.service, slotStartTime);
        return { ...item, price: slotPrice };
      }
      const currentPrice = calculateCurrentPrice(item.metadata.service);
      return { ...item, price: currentPrice };
    }
    return item;
  });

  let recalculatedAmount = processedItems.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  let appliedCoupon = null;
  if (couponCode) {
    const { validateCouponAction } = await import("@/app/book/actions");
    try {
      appliedCoupon = await validateCouponAction(couponCode);
      let discount = 0;
      if (appliedCoupon.discount_type === 'percentage') {
        discount = recalculatedAmount * (appliedCoupon.discount_amount / 100);
      } else {
        discount = appliedCoupon.discount_amount;
      }
      recalculatedAmount = Math.max(0, recalculatedAmount - discount);
    } catch (e: any) {
      throw new Error(`Coupon validation failed: ${e.message}`);
    }
  }

  let finalItemsJson: any[] = [...processedItems];
  if (appliedCoupon) {
    finalItemsJson.unshift({ type: 'discount', metadata: { coupon: appliedCoupon } });
  }
  if (splitAmounts) {
    finalItemsJson.unshift({ type: 'split_payment', cash: splitAmounts.cash, upi: splitAmounts.upi });
  }

  const transactionData = {
    amount: recalculatedAmount,
    payment_method,
    status: "paid",
    items_json: finalItemsJson,
    ...(customer_phone && { customer_phone }),
    ...(customer_name && { customer_name }),
    ...(comment && { comment }),
    ...(razorpay_payment_id && { razorpay_payment_id }),
    ...(razorpay_order_id && { razorpay_order_id }),
  };

  const { data, error } = await supabaseAdmin
    .from("transactions")
    .insert([transactionData])
    .select()
    .single();

  if (error) throw new Error(error.message);

  const serviceItems = processedItems.filter(item => item.type === "service");
  for (const item of serviceItems) {
    if (item.metadata?.slot) {
      await supabaseAdmin
        .from("slots")
        .update({ status: "booked", updated_at: new Date().toISOString() })
        .eq("id", item.id);
    }
  }

  const inventoryItems = processedItems.filter(item => item.type === "inventory");
  for (const item of inventoryItems) {
    await supabaseAdmin
      .from("inventory")
      .update({
        stock_count: (item.metadata?.inventory?.stock_count || 0) - item.quantity,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);
  }

  if (appliedCoupon) {
    await supabaseAdmin
      .from("coupons")
      .update({ current_uses: appliedCoupon.current_uses + 1 })
      .eq("id", appliedCoupon.id);
  }

  // Log booking to Google Sheet if there are service bookings
  if (serviceItems.length > 0) {
    try {
      const serviceBooked = getServiceNamesFromItems(processedItems);
      const bookingData = {
        dateTime: new Date(data.created_at).toLocaleString('en-IN'),
        customerName: customer_name || '—',
        phoneNumber: customer_phone || '—',
        serviceBooked,
        amountPaid: Number(data.amount),
        paymentMethod: payment_method,
        comment: comment || '',
      };
      await appendRowToSheet(bookingData);
      console.log('Booking logged to Google Sheet successfully');
    } catch (error) {
      console.error('Failed to log booking to Google Sheet:', error);
      // Continue - don't fail the transaction if Google Sheets fails
    }

    // Create calendar events for each service booking
    for (const item of serviceItems) {
      if (item.metadata?.slot) {
        try {
          const slotData: SlotData = {
            serviceName: item.name,
            startTime: item.metadata.slot.start_time,
            endTime: item.metadata.slot.end_time,
            slotId: item.id,
          };
          const customerData: CustomerData = {
            customerName: customer_name || '—',
            phoneNumber: customer_phone || '—',
            amountPaid: Number(data.amount),
            transactionId: data.id,
          };
          await createCalendarEvent(slotData, customerData);
          console.log(`Calendar event created for ${item.name}`);
        } catch (error) {
          console.error(`Failed to create calendar event for ${item.name}:`, error);
          // Continue - don't fail the transaction if calendar creation fails
        }
      }
    }
  }

  return data as Transaction;
}

export async function adminGetTransactionsAction(filters?: {
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: "cash" | "upi" | "razorpay" | "all";
  status?: "paid" | "refunded" | "pending" | "all";
}) {
  await requireAdmin();

  let query = supabaseAdmin
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999`);
  }
  if (filters?.paymentMethod && filters.paymentMethod !== "all") {
    query = query.eq("payment_method", filters.paymentMethod);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Transaction[];
}

export async function adminGetRevenueTrendTransactionsAction(startStr: string, endStr: string) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("amount, created_at, status, payment_method, items_json")
    .eq("status", "paid")
    .gte("created_at", startStr)
    .lte("created_at", endStr)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}
