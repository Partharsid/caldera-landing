"use server";

import { supabaseAdmin } from "@/lib/supabase-server";
import { calculatePriceForDateTime } from "@/lib/pricing";
import crypto from "crypto";
import { sendBookingConfirmationEmail } from "@/lib/email";

export async function validateCouponAction(code: string) {
  if (!code) throw new Error("Coupon code is required");
  
  const { data: coupon, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !coupon) {
    throw new Error("Invalid coupon code");
  }

  if (!coupon.is_active) {
    throw new Error("This coupon is no longer active");
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw new Error("This coupon has expired");
  }

  if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
    throw new Error("This coupon has reached its usage limit");
  }

  return coupon;
}

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function customerCreateBookingAction({
  slotId,
  customerName,
  customerPhone,
  customerEmail,
  razorpay_payment_id,
  razorpay_order_id,
  razorpay_signature,
  couponCode,
}: {
  slotId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  couponCode?: string;
}) {


  // 1. Verify Signature
  const secret = process.env.RAZORPAY_SECRET || "";
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    throw new Error("Invalid payment signature");
  }

  // 2. Fetch slot and calculate exact price
  const { data: slot, error: slotError } = await supabaseAdmin
    .from("slots")
    .select("*, service:services(*)")
    .eq("id", slotId)
    .single();

  if (slotError || !slot) {
    throw new Error("Slot not found");
  }

  if (slot.status !== "available") {
    throw new Error("Slot is no longer available. It may have been booked by someone else.");
  }

  const service = Array.isArray(slot.service) ? slot.service[0] : slot.service;
  let exactPrice = calculatePriceForDateTime(service, new Date(slot.start_time));
  let appliedCoupon = null;

  // Validate and apply coupon if provided
  if (couponCode) {
    try {
      appliedCoupon = await validateCouponAction(couponCode);
      let discount = 0;
      if (appliedCoupon.discount_type === 'percentage') {
        discount = exactPrice * (appliedCoupon.discount_amount / 100);
      } else {
        discount = appliedCoupon.discount_amount;
      }
      exactPrice = Math.max(0, exactPrice - discount);
    } catch (e: any) {
      throw new Error(`Coupon validation failed during checkout: ${e.message}`);
    }
  }

  // 3. Check if transaction already exists (e.g., created by webhook)
  const { data: existingTx } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("razorpay_order_id", razorpay_order_id)
    .single();

  let transaction = existingTx;
  const isAlreadyPaid = existingTx?.status === "paid";

  if (!existingTx) {
    const transactionData: any = {
      amount: exactPrice,
      payment_method: "razorpay",
      status: "paid",
      customer_name: customerName,
      customer_phone: customerPhone,
      razorpay_payment_id,
      razorpay_order_id,
      items_json: [
        {
          type: "service",
          id: slot.id,
          name: service.name,
          quantity: 1,
          price: exactPrice,
          metadata: {
            service,
            slot: { start_time: slot.start_time, end_time: slot.end_time },
            ...(appliedCoupon && {
              coupon: {
                code: appliedCoupon.code,
                discount_amount: appliedCoupon.discount_amount,
                discount_type: appliedCoupon.discount_type
              }
            })
          },
        },
      ],
    };

    const { data: newTx, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert([transactionData])
      .select()
      .single();

    if (txError) throw new Error("Failed to record transaction: " + txError.message);
    transaction = newTx;
  }

  // 4. Update the slot status (if not already done by webhook)
  if (!isAlreadyPaid && transaction) {
    const { error: updateError } = await supabaseAdmin
      .from("slots")
      .update({ status: "booked", updated_at: new Date().toISOString() })
      .eq("id", slot.id);

    if (updateError) {
      console.error(`Failed to mark slot ${slot.id} as booked! Tx ID: ${transaction.id}`);
    }

    // --- Google Sheets & Calendar Sync ---
    try {
      const { appendRowToSheet, createCalendarEvent, getServiceNamesFromItems } = await import("@/lib/google");
      
      // Google Sheet
      const serviceBooked = getServiceNamesFromItems(transaction.items_json);
      const bookingData = {
        dateTime: new Date(transaction.created_at).toLocaleString('en-IN'),
        customerName: customerName || '—',
        phoneNumber: customerPhone || '—',
        serviceBooked,
        amountPaid: exactPrice,
        paymentMethod: "razorpay",
      };
      await appendRowToSheet(bookingData).catch(e => console.error('GSheet Error:', e));

      // Calendar
      const slotData = {
        serviceName: service.name,
        startTime: slot.start_time,
        endTime: slot.end_time,
        slotId: slot.id,
      };
      const customerData = {
        customerName: customerName || '—',
        phoneNumber: customerPhone || '—',
        amountPaid: exactPrice,
        transactionId: transaction.id,
      };
      await createCalendarEvent(slotData, customerData).catch(e => console.error('Calendar Error:', e));
    } catch (e) {
      console.error('Failed to run Google sync from client action:', e);
    }
  }

  // 5. Increment coupon uses if applicable
  if (appliedCoupon) {
    await supabaseAdmin
      .from("coupons")
      .update({ current_uses: appliedCoupon.current_uses + 1 })
      .eq("id", appliedCoupon.id);
  }

  // 6. Send confirmation email
  if (customerEmail) {
    const formattedDate = new Date(slot.start_time).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const formatTime = (ds: string) =>
      new Date(ds).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      
    try {
      const emailResult = await sendBookingConfirmationEmail({
        to: customerEmail,
        customerName,
        serviceName: service.name,
        date: formattedDate,
        timeSlot: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
        totalPaid: `₹${exactPrice.toFixed(2)}`,
        bookingId: transaction.id,
      });
      console.log("Email dispatch result:", emailResult);
    } catch (e) {
      console.error("Failed to trigger email function:", e);
    }
  }

  // 7. Send WhatsApp booking confirmation (non-blocking)
  if (customerPhone) {
    const wadate = new Date(slot.start_time).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const watime = (ds: string) =>
      new Date(ds).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://www.rrdowntownarcade.in"}/api/whatsapp/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "booking_confirmation",
        phone: customerPhone,
        customerName,
        serviceName: service.name,
        date: wadate,
        timeSlot: `${watime(slot.start_time)} - ${watime(slot.end_time)}`,
        amount: `₹${exactPrice.toFixed(2)}`,
        bookingId: transaction.id,
      }),
    }).catch(e => console.error("WhatsApp notification error:", e));
  }

  return transaction;
}
