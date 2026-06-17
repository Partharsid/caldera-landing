"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function updateSettingAction(key: string, value: boolean) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
