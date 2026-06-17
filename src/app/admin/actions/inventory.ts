"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Inventory } from "@/lib/supabase";

export async function getInventoryAction() {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Inventory[];
}

export async function getInventoryItemAction(id: string) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Inventory;
}

export async function createInventoryAction(item: Omit<Inventory, "id" | "created_at" | "updated_at">) {
  await requireAdmin();

  console.log("Creating inventory item:", item);
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Service key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabaseAdmin
      .from("inventory")
      .insert([item])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error(error.message);
    }

    console.log("Insert successful, data:", data);
    return data as Inventory;
  } catch (error) {
    console.error("Error in createInventoryAction:", error);
    throw error;
  }
}

export async function updateInventoryAction(id: string, updates: Partial<Inventory>) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Inventory;
}

export async function deleteInventoryAction(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("inventory")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return id;
}

export async function updateStockAction(id: string, stock_count: number) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("inventory")
    .update({ stock_count })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Inventory;
}
