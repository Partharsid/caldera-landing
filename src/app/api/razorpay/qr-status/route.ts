import { NextRequest, NextResponse } from 'next/server';
import { getRazorpay } from '@/lib/razorpay';
import { requireAdmin } from '@/lib/auth-utils';

const razorpay = getRazorpay();

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const qrId = searchParams.get('id');

    if (!qrId) {
      return NextResponse.json({ error: 'QR ID is required' }, { status: 400 });
    }

    const qr = await razorpay.qrCode.fetch(qrId);

    // If payments_amount_received is greater than 0, it means it's paid
    const isPaid = qr.payments_amount_received > 0;

    return NextResponse.json({
      success: true,
      isPaid,
      payments_amount_received: qr.payments_amount_received,
    });
  } catch (error) {
    console.error('POS Razorpay QR fetch error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message || 'Failed to fetch QR code' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

