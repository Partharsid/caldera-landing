"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Service } from "@/lib/supabase";

export async function createServiceAction(service: Omit<Service, "id" | "created_at" | "updated_at">) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("services")
    .insert([service])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Service;
}

export async function updateServiceAction(id: string, updates: Partial<Service>) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("services")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Service;
}

export async function deleteServiceAction(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("services")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return id;
}

export async function updateServicePricesAction(id: string, base_price: number, peak_price: number) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("services")
    .update({ base_price, peak_price })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Service;
}
