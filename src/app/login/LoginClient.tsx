"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Gamepad2, ArrowRight, Loader2, KeyRound, Phone } from "lucide-react";
import Link from "next/link";

export default function LoginClient() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (error) throw error;

      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10"></div>

      <Link href="/" className="mb-8 flex items-center gap-2 group">
        <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
          <Gamepad2 className="w-8 h-8 text-primary" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">RR Downtown</span>
      </Link>

      <Card className="w-full max-w-md border-border bg-card/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-bold">
            {step === "phone" ? "Welcome Back" : "Verify Number"}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {step === "phone"
              ? "Sign in or create an account with your phone number"
              : `We sent a code to ${phone}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-10 bg-black/40 border-border h-12"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-md font-semibold neon-glow" disabled={loading || phone.length < 10}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 bg-black/40 border-border h-12 text-center tracking-widest text-lg font-mono"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-md font-semibold neon-glow" disabled={loading || otp.length < 6}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Log In"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); }}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
