import { NextRequest, NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';
import { supabaseAdmin } from '@/lib/supabase-server';
import { calculatePriceForDateTime, calculateCurrentPrice } from '@/lib/pricing';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const razorpay = getRazorpay();

export async function POST(request: NextRequest) {
  try {


    const body = await request.json();
    const { slotId, couponCode, customerName, customerPhone } = body;

    if (!slotId) {
      return NextResponse.json({ error: 'slotId is required' }, { status: 400 });
    }

    // Fetch slot and service securely on the server
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('slots')
      .select('*, service:services(*)')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    if (slot.status !== 'available') {
      return NextResponse.json({ error: 'Slot is no longer available' }, { status: 400 });
    }

    // Calculate exact price
    const service = Array.isArray(slot.service) ? slot.service[0] : slot.service;
    let exactPrice = 0;
    if (slot.start_time) {
      exactPrice = calculatePriceForDateTime(service, new Date(slot.start_time));
    } else {
      exactPrice = calculateCurrentPrice(service);
    }

    // Apply Coupon Discount if provided
    if (couponCode) {
      const { validateCouponAction } = await import("@/app/book/actions");
      try {
        const coupon = await validateCouponAction(couponCode);
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
          discount = exactPrice * (coupon.discount_amount / 100);
        } else {
          discount = coupon.discount_amount;
        }
        exactPrice = Math.max(0, exactPrice - discount);
      } catch (e: any) {
        return NextResponse.json({ error: `Invalid coupon: ${e.message}` }, { status: 400 });
      }
    }

    const amountInPaise = Math.round(exactPrice * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        source: 'rr-downtown-arcade-booking',
        slotId: slotId,
        customerName: customerName ? customerName.substring(0, 200) : '',
        customerPhone: customerPhone ? customerPhone.substring(0, 200) : '',
        couponCode: couponCode ? couponCode.substring(0, 200) : '',
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount, // this is in paise
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed. Use POST to create an order.' }, { status: 405 });
}
