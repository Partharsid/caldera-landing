import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { calculatePriceForDateTime } from '@/lib/pricing';
import { authenticateApiUser } from '@/lib/api-auth';
import crypto from 'crypto';
import { sendBookingConfirmationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slotId,
      customerName,
      customerPhone,
      customerEmail,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      couponCode,
    } = body;

    if (!slotId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'slotId, razorpay_payment_id, razorpay_order_id, and razorpay_signature are required' },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const { data: slot, error: slotError } = await supabaseAdmin
      .from('slots')
      .select('*, service:services(*)')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    if (slot.status !== 'available') {
      return NextResponse.json(
        { error: 'Slot is no longer available' },
        { status: 400 }
      );
    }

    const service = Array.isArray(slot.service) ? slot.service[0] : slot.service;
    let exactPrice = calculatePriceForDateTime(service, new Date(slot.start_time));
    let appliedCoupon: any = null;

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (!couponError && coupon) {
        const now = new Date();
        const expired = coupon.expires_at && new Date(coupon.expires_at) < now;
        const usedUp = coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses;

        if (coupon.is_active && !expired && !usedUp) {
          appliedCoupon = coupon;
          let discount = 0;
          if (coupon.discount_type === 'percentage') {
            discount = exactPrice * (coupon.discount_amount / 100);
          } else {
            discount = coupon.discount_amount;
          }
          exactPrice = Math.max(0, exactPrice - discount);
        }
      }
    }

    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    let transaction = existingTx;
    const isAlreadyPaid = existingTx?.status === 'paid';

    if (!existingTx) {
      const transactionData: any = {
        amount: exactPrice,
        payment_method: 'razorpay',
        status: 'paid',
        customer_name: customerName || '',
        customer_phone: customerPhone || '',
        razorpay_payment_id,
        razorpay_order_id,
        items_json: [
          {
            type: 'service',
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
                  discount_type: appliedCoupon.discount_type,
                },
              }),
            },
          },
        ],
      };

      const { data: newTx, error: txError } = await supabaseAdmin
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (txError) {
        return NextResponse.json(
          { error: 'Failed to record transaction: ' + txError.message },
          { status: 500 }
        );
      }
      transaction = newTx;
    }

    if (!isAlreadyPaid && transaction) {
      const { error: updateError } = await supabaseAdmin
        .from('slots')
        .update({ status: 'booked', updated_at: new Date().toISOString() })
        .eq('id', slot.id);

      if (updateError) {
        console.error(`Failed to mark slot ${slot.id} as booked`);
      }

      try {
        const { appendRowToSheet, createCalendarEvent, getServiceNamesFromItems } =
          await import('@/lib/google');

        const serviceBooked = getServiceNamesFromItems(transaction.items_json);
        await appendRowToSheet({
          dateTime: new Date(transaction.created_at).toLocaleString('en-IN'),
          customerName: customerName || '\u2014',
          phoneNumber: customerPhone || '\u2014',
          serviceBooked,
          amountPaid: exactPrice,
          paymentMethod: 'razorpay',
        }).catch((e) => console.error('GSheet Error:', e));

        await createCalendarEvent(
          {
            serviceName: service.name,
            startTime: slot.start_time,
            endTime: slot.end_time,
            slotId: slot.id,
          },
          {
            customerName: customerName || '\u2014',
            phoneNumber: customerPhone || '\u2014',
            amountPaid: exactPrice,
            transactionId: transaction.id,
          }
        ).catch((e) => console.error('Calendar Error:', e));
      } catch (e) {
        console.error('Google sync failed:', e);
      }
    }

    if (appliedCoupon) {
      await supabaseAdmin
        .from('coupons')
        .update({ current_uses: appliedCoupon.current_uses + 1 })
        .eq('id', appliedCoupon.id);
    }

    if (customerEmail) {
      const formattedDate = new Date(slot.start_time).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const formatTime = (ds: string) =>
        new Date(ds).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

      try {
        await sendBookingConfirmationEmail({
          to: customerEmail,
          customerName: customerName || '',
          serviceName: service.name,
          date: formattedDate,
          timeSlot: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
          totalPaid: `\u20B9${exactPrice.toFixed(2)}`,
          bookingId: transaction.id,
        });
      } catch (e) {
        console.error('Email send failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        serviceName: service.name,
        slotStartTime: slot.start_time,
        slotEndTime: slot.end_time,
        createdAt: transaction.created_at,
      },
    });
  } catch (err: any) {
    console.error('Booking creation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}
