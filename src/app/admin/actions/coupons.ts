"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { type Coupon } from "@/lib/supabase";

export async function getCouponsAction() {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Coupon[];
}

export async function createCouponAction(coupon: Omit<Coupon, "id" | "created_at" | "updated_at" | "current_uses">) {
  await requireAdmin();
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .insert([{ ...coupon, code: coupon.code.toUpperCase() }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A coupon with this code already exists.');
    throw new Error(error.message);
  }
  return data as Coupon;
}

export async function updateCouponAction(id: string, updates: Partial<Coupon>) {
  await requireAdmin();
  if (updates.code) {
    updates.code = updates.code.toUpperCase();
  }
  
  const { data, error } = await supabaseAdmin
    .from("coupons")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A coupon with this code already exists.');
    throw new Error(error.message);
  }
  return data as Coupon;
}

export async function deleteCouponAction(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("coupons")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  return true;
}
