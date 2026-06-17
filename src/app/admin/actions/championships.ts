"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

type CreateChampionshipInput = {
  name: string;
  description?: string;
  sport_type: string;
  service_id?: string;
  registration_fee: number;
  prize_pool: number;
  first_prize: number;
  second_prize: number;
  third_prize?: number;
  max_participants: number;
  min_team_size?: number;
  max_team_size?: number;
  format: 'single_elimination' | 'double_elimination' | 'round_robin' | 'league';
  banner_image_url?: string;
  rules?: string;
  start_date: string;
  end_date?: string;
  registration_deadline?: string;
};

export async function createChampionshipAction(input: CreateChampionshipInput) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("championships")
    .insert([{
      ...input,
      status: 'draft',
      current_participants: 0,
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/championships");
  revalidatePath("/");
  return data;
}

export async function updateChampionshipAction(id: string, input: Partial<CreateChampionshipInput & { status: string }>) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("championships")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/championships");
  revalidatePath("/admin/championships/" + id);
  revalidatePath("/");
  revalidatePath("/championships");
  return data;
}

export async function deleteChampionshipAction(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("championships").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/championships");
  revalidatePath("/");
  return { success: true };
}

export async function getChampionshipsAction() {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getChampionshipAction(id: string) {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveChampionshipsAction() {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*")
    .in("status", ["open", "in_progress"])
    .order("start_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getChampionshipParticipantsAction(championshipId: string) {
  const { data, error } = await supabaseAdmin
    .from("championship_participants")
    .select("*")
    .eq("championship_id", championshipId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getChampionshipMatchesAction(championshipId: string) {
  const { data, error } = await supabaseAdmin
    .from("championship_matches")
    .select("*")
    .eq("championship_id", championshipId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function generateBracketAction(championshipId: string) {
  await requireAdmin();
  
  const { data: participants, error: pErr } = await supabaseAdmin
    .from("championship_participants")
    .select("*")
    .eq("championship_id", championshipId)
    .eq("payment_status", "paid");
  
  if (pErr) throw new Error(pErr.message);
  if (!participants || participants.length < 2) throw new Error("Need at least 2 paid participants to generate bracket");
  
  const { data: existing, error: eErr } = await supabaseAdmin
    .from("championship_matches")
    .select("id")
    .eq("championship_id", championshipId)
    .limit(1);
  
  if (eErr) throw new Error(eErr.message);
  if (existing && existing.length > 0) throw new Error("Bracket already generated. Delete existing matches first.");

  // Randomize and seed
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const count = shuffled.length;
  const totalSlots = Math.pow(2, Math.ceil(Math.log2(count)));
  const numRounds = Math.ceil(Math.log2(totalSlots));
  
  // Seed participants into slots
  const slots: (typeof shuffled[0] | null)[] = Array(totalSlots).fill(null);
  for (let i = 0; i < count; i++) slots[i] = shuffled[i];
  
  const matches: any[] = [];
  let matchNum = 1;
  
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = totalSlots / Math.pow(2, round);
    for (let m = 0; m < matchesInRound; m++) {
      const idx1 = m * 2;
      const idx2 = m * 2 + 1;
      matches.push({
        championship_id: championshipId,
        round,
        match_number: matchNum++,
        participant1_id: slots[idx1]?.id || null,
        participant2_id: slots[idx2]?.id || null,
        status: 'scheduled',
      });
    }
  }
  
  const { error: insertErr } = await supabaseAdmin
    .from("championship_matches")
    .insert(matches);
  
  if (insertErr) throw new Error(insertErr.message);
  
  await supabaseAdmin.from("championships").update({ status: 'in_progress' }).eq("id", championshipId);
  
  revalidatePath("/admin/championships/" + championshipId);
  revalidatePath("/championships");
  return { success: true, totalMatches: matches.length };
}

export async function updateMatchResultAction(
  matchId: string,
  data: { winner_id: string; score_p1?: string; score_p2?: string; }
) {
  await requireAdmin();
  
  const { data: match, error: mErr } = await supabaseAdmin
    .from("championship_matches")
    .select("*")
    .eq("id", matchId)
    .single();
  
  if (mErr || !match) throw new Error("Match not found");
  
  const loserId = match.participant1_id === data.winner_id ? match.participant2_id : match.participant1_id;
  
  const { error: updateErr } = await supabaseAdmin
    .from("championship_matches")
    .update({
      winner_id: data.winner_id,
      loser_id: loserId,
      score_p1: data.score_p1,
      score_p2: data.score_p2,
      status: 'completed',
    })
    .eq("id", matchId);
  
  if (updateErr) throw new Error(updateErr.message);
  
  // Advance winner to next round
  const nextRound = match.round + 1;
  const nextMatchNumber = Math.ceil(match.match_number / 2);
  
  const { data: nextMatch, error: nErr } = await supabaseAdmin
    .from("championship_matches")
    .select("*")
    .eq("championship_id", match.championship_id)
    .eq("round", nextRound)
    .eq("match_number", nextMatchNumber)
    .single();
  
  if (!nErr && nextMatch) {
    const isFirstSlot = match.match_number % 2 === 1;
    const updateField = isFirstSlot ? { participant1_id: data.winner_id } : { participant2_id: data.winner_id };
    await supabaseAdmin.from("championship_matches").update(updateField).eq("id", nextMatch.id);
  }
  
  revalidatePath("/admin/championships/" + match.championship_id);
  return { success: true };
}

export async function deleteChampionshipMatchesAction(championshipId: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("championship_matches").delete().eq("championship_id", championshipId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/championships/" + championshipId);
  return { success: true };
}

export async function getOpenChampionshipsPublicAction() {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*, service:services(name, type)")
    .in("status", ["open", "in_progress"])
    .order("start_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getChampionshipPublicAction(id: string) {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*, service:services(name, type)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getChampionshipParticipantsPublicAction(championshipId: string) {
  const { data, error } = await supabaseAdmin
    .from("championship_participants")
    .select("*")
    .eq("championship_id", championshipId)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}