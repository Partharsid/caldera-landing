export const DEFAULT_TEMPLATES = {
  booking_confirmation:
`🎮 RR Downtown Arcade - Booking Confirmed

Hi {{customerName}}!

Your booking has been confirmed ✅

━━━━━━━━━━━━━━━━━━
📋 Service: {{serviceName}}
📅 Date: {{date}}
⏰ Time: {{timeSlot}}
💰 Amount: {{amount}}
🆔 Booking ID: {{bookingId}}
━━━━━━━━━━━━━━━━━━

📍 Visit us at RR Downtown Arcade
📞 Contact: +91 9121966933

See you there! 🎉`,

  booking_cancellation:
`⚠️ RR Downtown Arcade - Booking Cancelled

Hi {{customerName}},

Your booking has been cancelled.

━━━━━━━━━━━━━━━━━━
📋 Service: {{serviceName}}
📅 Date: {{date}}
⏰ Time: {{timeSlot}}
━━━━━━━━━━━━━━━━━━

For any queries, contact us at +91 9121966933

Team RR Downtown Arcade`,

  championship_registration:
`🏆 RR Downtown Arcade - Championship Registration Confirmed

Hi {{captainName}}!

Your team {{teamName}} is now registered for {{championshipName}} ✅

━━━━━━━━━━━━━━━━━━
💰 Fee: {{fee}}
━━━━━━━━━━━━━━━━━━

We'll keep you updated about match schedules.

Good luck! 🎯`,

  match_schedule:
`⚔️ RR Downtown Arcade - Match Alert!

Hey {{teamName}}!

Your next match is scheduled:

━━━━━━━━━━━━━━━━━━
🏆 {{championshipName}}
🎯 Round: {{round}}
👊 Opponent: {{opponent}}
📅 Date: {{date}}
⏰ Time: {{time}}
━━━━━━━━━━━━━━━━━━

Come prepared and give your best! 💪`,
};

export type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}