import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and conditions for using the RR Downtown Arcade website and facility.",
};

export default function TermsAndConditions() {
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
            <CardTitle className="text-3xl font-bold text-primary">Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-zinc-300">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">1. Bookings, Payments, and Fees</h3>
              <p>
                All bookings must be made online and paid in full at the time of booking via Razorpay to secure your slot.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">2. Rules of Conduct at the Facility</h3>
              <p>
                Users must conduct themselves respectfully. Unsafe, illegal, or disruptive behavior may result in removal from the facility without a refund.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">3. Assumption of Risk and Waiver of Liability</h3>
              <p>
                You acknowledge that participation in physical activities involves inherent risks. By booking, you voluntarily accept these risks and release RR Downtown Arcade from liability for any injury or loss sustained during your visit, to the fullest extent permitted by law.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">4. Governing Law</h3>
              <p>
                These terms are governed by the laws of India.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}