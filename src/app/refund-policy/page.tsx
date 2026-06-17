import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking, Cancellation & Refund Policy",
  description: "Review our booking, cancellation, and refund policies before making a reservation at RR Downtown Arcade.",
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground dark pt-10 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6 -ml-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary">Booking, Cancellation & Refund Policy</CardTitle>
            <p className="text-zinc-400 text-sm mt-2">Effective Date: August 13, 2025</p>
          </CardHeader>
          <CardContent className="space-y-6 text-zinc-300">
            <p className="text-white font-medium">
              Thank you for choosing RR Downtown Arcade! To ensure a smooth and transparent process for all our guests, we have established the following booking policy. Please read it carefully before completing your payment. By making a booking and completing payment, you acknowledge that you have read, understood, and agree to the terms of this policy.
            </p>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">1. Booking and Payment Policy</h3>
              <p>All bookings made through our website or any other official channel are final, non-cancellable, and non-refundable.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Once a booking is confirmed and payment is made, it cannot be cancelled by the customer for any reason.</li>
                <li>No refunds, credits, or transfers will be issued for bookings that are cancelled by the customer.</li>
                <li>This policy applies to all booking types, including individual play sessions, party packages, group events, and any other reservations.</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">2. Rescheduling Policy</h3>
              <p>
                Customer-initiated rescheduling is not permitted. The date and time you select for your booking are fixed and cannot be changed after payment confirmation. Please ensure your selected date and time are correct before making a payment.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">3. No-Show Policy</h3>
              <p>
                If you do not arrive for your scheduled booking, it will be considered a “No-Show.” No-Shows are not eligible for any refund, credit, or rescheduling. The full booking amount will be forfeited.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">4. Cancellations by RR Downtown Arcade</h3>
              <p>
                In the rare and unforeseen event that RR Downtown Arcade must cancel a booking due to circumstances beyond our control (e.g., power outage, critical equipment failure, or other operational emergencies), we will notify you as soon as possible. In this specific case, you will be entitled to a 100% full refund of your booking amount. We may also, at our discretion, offer to reschedule your booking to another convenient date and time as an alternative to a refund.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">5. Refund Processing (For Arcade-Initiated Cancellations Only)</h3>
              <p>If a refund is issued due to a cancellation by RR Downtown Arcade, it will be processed as follows:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Refunds will be processed within a maximum of 7 business days from the date of the cancellation notice.</li>
                <li>The amount will be credited back to the original mode of payment used for the booking (e.g., credit card, debit card, UPI via Razorpay).</li>
                <li>Please note that after we process the refund, additional time may be required for the amount to reflect in your account, depending on your bank’s policies.</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">Contact Us</h3>
              <p>If you have any questions regarding this policy, please contact us before making a booking.</p>
              <div className="mt-2 text-primary font-medium">
                <p>Email: rrdowntown33@gmail.com</p>
                <p>Phone: +91 9121966933</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}