import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { supabaseAdmin } from "@/lib/supabase-server";

const razorpay = getRazorpay();

export async function POST(request: NextRequest) {
  try {
    const { participantId, championshipId, amount } = await request.json();

    if (!participantId || !championshipId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify participant exists
    const { data: participant, error: pErr } = await supabaseAdmin
      .from("championship_participants")
      .select("*, championship:championships(*)")
      .eq("id", participantId)
      .single();

    if (pErr || !participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    if (participant.payment_status === "paid") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(amount * 100);
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `champ_${championshipId.slice(0, 8)}_${participantId.slice(0, 8)}`,
      notes: {
        source: "rr-downtown-arcade-championship",
        participantId,
        championshipId,
        teamName: participant.team_name,
        captainPhone: participant.captain_phone,
      },
    });

    // Store order ID
    await supabaseAdmin
      .from("championship_participants")
      .update({ razorpay_order_id: order.id })
      .eq("id", participantId);

    return NextResponse.json({
      order_id: order.id,
      amount: amountInPaise,
      currency: "INR",
    });
  } catch (error: any) {
    console.error("Championship order creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
