"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Membership } from "@/lib/supabase";

export async function createMembershipAction(membership: Omit<Membership, "id" | "created_at" | "updated_at">) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .insert([membership])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Membership;
}

export async function updateMembershipAction(id: string, updates: Partial<Omit<Membership, "id" | "created_at" | "updated_at">>) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Membership;
}

export async function deleteMembershipAction(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("memberships")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return id;
}

export async function toggleMembershipAction(id: string, is_active: boolean) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("memberships")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Membership;
}
