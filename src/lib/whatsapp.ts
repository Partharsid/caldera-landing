/**
 * WhatsApp service — delegates to external worker process.
 * 
 * The worker (whatsapp-worker.js) maintains the persistent WhatsApp connection.
 * Run it on any always-on device: laptop, Android (Termux), Railway, etc.
 * 
 * Set WHATSAPP_WORKER_URL env var in Vercel to point to your worker.
 * Example: WHATSAPP_WORKER_URL=https://whatsapp-worker.onrender.com
 */

const WORKER_URL = process.env.WHATSAPP_WORKER_URL;

export async function getWorkerStatus(): Promise<{ status: string; qr: string | null }> {
  if (!WORKER_URL) {
    return { status: "no_worker", qr: null };
  }
  try {
    const res = await fetch(`${WORKER_URL}/status`, { signal: AbortSignal.timeout(5000) });
    return await res.json();
  } catch {
    return { status: "unreachable", qr: null };
  }
}

export async function sendViaWorker(phone: string, message: string) {
  if (!WORKER_URL) {
    return { success: false, error: "WhatsApp worker not configured. Set WHATSAPP_WORKER_URL env var." };
  }
  try {
    const res = await fetch(`${WORKER_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(10000),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Message templates ─────────────────────────────────────────

export async function sendBookingConfirmationWhatsApp(
  phone: string,
  customerName: string,
  serviceName: string,
  date: string,
  timeSlot: string,
  bookingId: string,
  amount: string
) {
  const msg = `🎮 *RR Downtown Arcade - Booking Confirmed*

Hi ${customerName}!

Your booking has been confirmed ✅

━━━━━━━━━━━━━━━━━━
📋 *Service:* ${serviceName}
📅 *Date:* ${date}
⏰ *Time:* ${timeSlot}
💰 *Amount:* ${amount}
🆔 *Booking ID:* ${bookingId.slice(0, 8)}
━━━━━━━━━━━━━━━━━━

📍 Visit us at RR Downtown Arcade
📞 Contact: +91 9121966933

See you there! 🎉`;

  return sendViaWorker(phone, msg);
}

export async function sendBookingCancellationWhatsApp(
  phone: string,
  customerName: string,
  serviceName: string,
  date: string,
  timeSlot: string
) {
  const msg = `⚠️ *RR Downtown Arcade - Booking Cancelled*

Hi ${customerName},

Your booking has been cancelled.

━━━━━━━━━━━━━━━━━━
📋 *Service:* ${serviceName}
📅 *Date:* ${date}
⏰ *Time:* ${timeSlot}
━━━━━━━━━━━━━━━━━━

For any queries, contact us at +91 9121966933

Team RR Downtown Arcade`;

  return sendViaWorker(phone, msg);
}

export async function sendChampionshipRegistrationWhatsApp(
  phone: string,
  teamName: string,
  captainName: string,
  championshipName: string,
  amount: string
) {
  const msg = `🏆 *RR Downtown Arcade - Championship Registration Confirmed*

Hi ${captainName}!

Your team *${teamName}* is now registered for *${championshipName}* ✅

━━━━━━━━━━━━━━━━━━
💰 *Fee:* ${amount === "0" ? "FREE" : "₹" + amount}
━━━━━━━━━━━━━━━━━━

We'll keep you updated about match schedules.

Good luck! 🎯`;

  return sendViaWorker(phone, msg);
}

export async function sendMatchScheduleWhatsApp(
  phone: string,
  teamName: string,
  championshipName: string,
  round: string,
  opponent: string,
  date: string,
  time: string
) {
  const msg = `⚔️ *RR Downtown Arcade - Match Alert!*

Hey ${teamName}!

Your next match is scheduled:

━━━━━━━━━━━━━━━━━━
🏆 *${championshipName}*
🎯 *Round:* ${round}
👊 *Opponent:* ${opponent}
📅 *Date:* ${date}
⏰ *Time:* ${time}
━━━━━━━━━━━━━━━━━━

Come prepared and give your best! 💪`;

  return sendViaWorker(phone, msg);
}

export async function sendPromotionalWhatsApp(phone: string, message: string) {
  const header = "🎮 *RR Downtown Arcade*\n━━━━━━━━━━━━━━━━━━\n\n";
  const footer = "\n━━━━━━━━━━━━━━━━━━\n📍 Visit us at RR Downtown Arcade\n📞 +91 9121966933";
  return sendViaWorker(phone, header + message + footer);
}