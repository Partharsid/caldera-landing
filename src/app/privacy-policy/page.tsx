import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Privacy Policy for RR Downtown Arcade.",
};

export default function PrivacyPolicy() {
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
            <CardTitle className="text-3xl font-bold text-primary">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-zinc-300">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">1. Information We Collect</h3>
              <p>
                We collect personal data (name, email, phone) you provide during booking, and financial data processed by Razorpay (we do not store it). We also collect derivative data like your IP address and browser type for site functionality.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">2. How We Use Your Information</h3>
              <p>
                Your information is used to process your booking, send confirmation and reminder emails, and respond to customer service requests.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">3. Disclosure of Your Information</h3>
              <p>
                We may share information with third-party service providers like Razorpay for payment processing or as required by law to protect rights and safety.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">4. Security of Your Information</h3>
              <p>
                We use administrative, technical, and physical security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}