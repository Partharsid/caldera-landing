import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getTemplatesAction } from "@/app/admin/actions/whatsapp-templates";
import { DEFAULT_TEMPLATES, fillTemplate, type TemplateKey } from "@/lib/whatsapp-templates";

const WORKER_URL = process.env.WHATSAPP_WORKER_URL;

async function getTemplate(key: string): Promise<string> {
  let templates: Record<string, string> = {};
  try {
    templates = await getTemplatesAction();
  } catch {
    templates = { ...DEFAULT_TEMPLATES };
  }
  return templates[key] || DEFAULT_TEMPLATES[key as TemplateKey] || "";
}

export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json();

    if (!WORKER_URL) {
      return NextResponse.json({ error: "WHATSAPP_WORKER_URL not configured" }, { status: 400 });
    }

    let phone = "";
    let templateKey = "";
    let variables: Record<string, string> = {};

    switch (type) {
      case "booking_confirmation": {
        phone = data.phone;
        templateKey = "booking_confirmation";
        variables = {
          customerName: data.customerName || "Valued Customer",
          serviceName: data.serviceName || "Service",
          date: data.date || "",
          timeSlot: data.timeSlot || "",
          amount: data.amount || "",
          bookingId: data.bookingId || "",
        };
        break;
      }
      case "booking_cancellation": {
        phone = data.phone;
        templateKey = "booking_cancellation";
        variables = {
          customerName: data.customerName || "Valued Customer",
          serviceName: data.serviceName || "Service",
          date: data.date || "",
          timeSlot: data.timeSlot || "",
        };
        break;
      }
      case "championship_registration": {
        phone = data.phone;
        templateKey = "championship_registration";
        variables = {
          captainName: data.captainName || "",
          teamName: data.teamName || "",
          championshipName: data.championshipName || "",
          fee: data.fee || "0",
        };
        break;
      }
      case "match_schedule": {
        phone = data.phone;
        templateKey = "match_schedule";
        variables = {
          teamName: data.teamName || "",
          championshipName: data.championshipName || "",
          round: data.round || "",
          opponent: data.opponent || "",
          date: data.date || "",
          time: data.time || "",
        };
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const template = await getTemplate(templateKey);
    const message = fillTemplate(template, variables);

    const res = await fetch(`${WORKER_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(10000),
    });

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Notification send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}