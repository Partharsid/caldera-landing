import { NextRequest, NextResponse } from "next/server";
import { getWorkerStatus, sendViaWorker } from "@/lib/whatsapp";

export async function GET() {
  const status = await getWorkerStatus();
  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();
    if (!phone || !message) {
      return NextResponse.json({ error: "Phone and message required" }, { status: 400 });
    }
    const result = await sendViaWorker(phone, message);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}