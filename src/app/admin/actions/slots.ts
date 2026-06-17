"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Slot } from "@/lib/supabase";

function localDayRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end   = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function updateSlotAction(id: string, updates: Partial<Slot>) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("slots")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Slot;
}

export async function blockSlotAction(id: string, reason?: string) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("slots")
    .update({
      status: 'blocked',
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (reason) {
    console.log(`Slot ${id} blocked with reason: ${reason}`);
    // In production, insert refund ledger transaction securely
  }

  return data as Slot;
}

export async function forceCancelSlotAction(id: string, note: string) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("slots")
    .update({
      status: 'available',
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  console.log(`Slot ${id} cancelled with note: ${note}`);
  // In production, insert refund ledger transaction securely

  return data as Slot;
}

export async function createSlotsBulkAction(slots: Omit<Slot, 'id' | 'created_at' | 'updated_at'>[]) {
  await requireAdmin();
  
  const serviceId = slots[0]?.service_id;
  if (!serviceId) throw new Error('Service ID is required');

  const startTimes = slots.map(s => s.start_time);
  const earliestStart = new Date(Math.min(...startTimes.map(t => new Date(t).getTime()))).toISOString();
  const latestStart = new Date(Math.max(...startTimes.map(t => new Date(t).getTime()))).toISOString();

  const { data: existingSlots, error: fetchError } = await supabaseAdmin
    .from("slots")
    .select("*")
    .eq("service_id", serviceId)
    .gte("start_time", earliestStart)
    .lte("start_time", latestStart);

  if (fetchError) throw new Error(fetchError.message);

  const existingSlotMap = new Map(
    existingSlots.map((slot: any) => [`${slot.start_time}-${slot.end_time}`, slot])
  );

  const newSlots = slots.filter(slot => {
    const key = `${slot.start_time}-${slot.end_time}`;
    return !existingSlotMap.has(key);
  });

  if (newSlots.length === 0) {
    throw new Error('All requested slots already exist');
  }

  const { data, error } = await supabaseAdmin
    .from("slots")
    .insert(newSlots)
    .select();

  if (error) throw new Error(error.message);
  return data as Slot[];
}

export async function deleteSlotAction(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("slots").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSlotsByDateAction(serviceId: string, dateStr: string) {
  await requireAdmin();
  const { start, end } = localDayRange(dateStr);
  const { error } = await supabaseAdmin
    .from("slots")
    .delete()
    .eq("service_id", serviceId)
    .gte("start_time", start)
    .lte("start_time", end);
  if (error) throw new Error(error.message);
}
