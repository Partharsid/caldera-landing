import { NextRequest, NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';
import { requireAdmin } from '@/lib/auth-utils';

const razorpay = getRazorpay();

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { amount, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);

    const qr = await razorpay.qrCode.create({
      type: "upi_qr",
      name: "RR Downtown Arcade",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amountInPaise,
      description: description || "POS Order",
      close_by: Math.round(Date.now() / 1000) + 15 * 60, // 15 mins expiry
    });

    return NextResponse.json({
      success: true,
      qr_id: qr.id,
      image_url: qr.image_url,
    });
  } catch (error) {
    console.error('POS Razorpay QR creation error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message || 'Failed to create QR code' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

