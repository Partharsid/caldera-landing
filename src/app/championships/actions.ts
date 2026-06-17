"use server";

import { supabaseAdmin } from "@/lib/supabase-server";
import * as crypto from 'crypto';

export async function publicRegisterForChampionshipAction(params: {
  championshipId: string;
  teamName: string;
  captainName: string;
  captainPhone: string;
  captainEmail?: string;
  members: { name: string; phone: string }[];
}) {
  const { data: champ, error: cErr } = await supabaseAdmin
    .from("championships")
    .select("*")
    .eq("id", params.championshipId)
    .single();
  
  if (cErr || !champ) throw new Error("Championship not found");
  if (champ.status !== "open") throw new Error("Registration is closed");
  if (champ.current_participants >= champ.max_participants) throw new Error("Championship is full");

  const { data, error } = await supabaseAdmin
    .from("championship_participants")
    .insert([{
      championship_id: params.championshipId,
      team_name: params.teamName,
      captain_name: params.captainName,
      captain_phone: params.captainPhone,
      captain_email: params.captainEmail,
      members: params.members,
      payment_status: champ.registration_fee > 0 ? "pending" : "paid",
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // If no fee, increment count immediately
  if (champ.registration_fee === 0) {
    await supabaseAdmin.from("championships").update({
      current_participants: (champ.current_participants || 0) + 1,
    }).eq("id", params.championshipId);
  }

  return data;
}

export async function confirmChampionshipPaymentAction(params: {
  participantId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { data: participant, error: pErr } = await supabaseAdmin
    .from("championship_participants")
    .select("*, championship:championships(*)")
    .eq("id", params.participantId)
    .single();
  
  if (pErr || !participant) throw new Error("Participant not found");
  if (participant.payment_status === "paid") return participant;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET || '')
    .update(params.razorpayOrderId + '|' + params.razorpayPaymentId)
    .digest('hex');

  if (expectedSig !== params.razorpaySignature) throw new Error("Invalid payment signature");

  const champ = participant.championship as any;

  const { error: updateErr } = await supabaseAdmin
    .from("championship_participants")
    .update({
      payment_status: "paid",
      razorpay_order_id: params.razorpayOrderId,
      razorpay_payment_id: params.razorpayPaymentId,
    })
    .eq("id", params.participantId);

  if (updateErr) throw new Error(updateErr.message);

  await supabaseAdmin.from("championships").update({
    current_participants: (champ.current_participants || 0) + 1,
  }).eq("id", champ.id);

  // Send WhatsApp notification (non-blocking)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.rrdowntownarcade.in";
  fetch(`${baseUrl}/api/whatsapp/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "championship_registration",
      phone: participant.captain_phone,
      captainName: participant.captain_name,
      teamName: participant.team_name,
      championshipName: champ.name,
      fee: String(champ.registration_fee || 0),
    }),
  }).catch(e => console.error("WhatsApp champ notification error:", e));

  return { success: true };
}

export async function checkParticipantExistsAction(championshipId: string, phone: string) {
  const { data, error } = await supabaseAdmin
    .from("championship_participants")
    .select("id, team_name, payment_status")
    .eq("championship_id", championshipId)
    .eq("captain_phone", phone)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}