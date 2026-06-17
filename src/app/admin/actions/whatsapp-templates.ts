"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase-server";
import { DEFAULT_TEMPLATES, type TemplateKey } from "@/lib/whatsapp-templates";
import { revalidatePath } from "next/cache";

export async function getTemplatesAction(): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("key", "whatsapp_templates")
    .single();

  if (error || !data) {
    // Return defaults if not saved yet
    return { ...DEFAULT_TEMPLATES };
  }

  try {
    const saved = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return { ...DEFAULT_TEMPLATES, ...saved };
  } catch {
    return { ...DEFAULT_TEMPLATES };
  }
}

export async function updateTemplateAction(key: TemplateKey, content: string) {
  await requireAdmin();

  // Get existing templates
  const { data } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("key", "whatsapp_templates")
    .single();

  let templates: Record<string, string> = {};

  if (data) {
    try {
      templates = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    } catch { /* ignore */ }
  }

  templates[key] = content;

  if (data) {
    await supabaseAdmin
      .from("settings")
      .update({ value: JSON.stringify(templates), updated_at: new Date().toISOString() })
      .eq("key", "whatsapp_templates");
  } else {
    await supabaseAdmin
      .from("settings")
      .insert([{ key: "whatsapp_templates", value: JSON.stringify(templates), label: "WhatsApp Message Templates", description: "Editable WhatsApp notification message templates" }]);
  }

  revalidatePath("/admin/whatsapp/templates");
  return { success: true };
}

export async function resetTemplateAction(key: TemplateKey) {
  await requireAdmin();

  const { data } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("key", "whatsapp_templates")
    .single();

  if (data) {
    let templates: Record<string, string> = {};
    try {
      templates = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    } catch { /* ignore */ }

    // Remove the key or set it to default
    templates[key] = DEFAULT_TEMPLATES[key];
    
    await supabaseAdmin
      .from("settings")
      .update({ value: JSON.stringify(templates), updated_at: new Date().toISOString() })
      .eq("key", "whatsapp_templates");
  }

  revalidatePath("/admin/whatsapp/templates");
  return { success: true };
}