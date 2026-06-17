import { NextRequest, NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';
import { requireAdmin } from '@/lib/auth-utils';

const razorpay = getRazorpay();

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `pos_${Date.now()}`,
      payment_capture: 1,
      notes: {
        source: 'rr-downtown-arcade-pos',
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('POS Razorpay order creation error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

