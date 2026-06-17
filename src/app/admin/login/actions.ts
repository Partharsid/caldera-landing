"use server";

import { cookies } from "next/headers";
import { makeToken } from "@/lib/auth-utils";

export async function adminLoginAction(password: string): Promise<{ success: boolean; error?: string }> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return { success: false, error: "Admin password not configured." };
  }

  if (password !== adminPassword) {
    return { success: false, error: "Invalid password." };
  }

  const token = await makeToken();
  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return { success: true };
}
