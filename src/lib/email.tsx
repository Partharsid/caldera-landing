import { Resend } from "resend";
import { BookingConfirmationEmail } from "@/components/emails/BookingConfirmationEmail";
import * as React from "react";

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function sendBookingConfirmationEmail(params: {
  to: string;
  customerName: string;
  serviceName: string;
  date: string;
  timeSlot: string;
  totalPaid: string;
  bookingId: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Email not sent.");
    return { error: "RESEND_API_KEY not set" };
  }

  try {
    const { render } = await import("@react-email/render");
    const htmlString = await render(<BookingConfirmationEmail
      customerName={params.customerName}
      serviceName={params.serviceName}
      date={params.date}
      timeSlot={params.timeSlot}
      totalPaid={params.totalPaid}
      bookingId={params.bookingId}
    />);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "RR Downtown Arcade <onboarding@resend.dev>",
      to: [params.to],
      subject: "Your Booking is Confirmed! - RR Downtown Arcade",
      html: htmlString,
    });

    if (error) {
      console.error("Failed to send email via Resend:", error);
    }
    return { data, error };
  } catch (err) {
    console.error("Error sending email:", err);
    return { error: err };
  }
}
