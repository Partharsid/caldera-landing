"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trophy, User, Users, IndianRupee, Check, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/pricing";

declare global { interface Window { Razorpay: any; } }

interface Props {
  championship: {
    id: string;
    name: string;
    sport_type: string;
    registration_fee: number;
    prize_pool: number;
    first_prize: number;
    second_prize: number;
    third_prize?: number;
    max_participants: number;
    current_participants: number;
    format: string;
  };
}

export default function RegisterClient({ championship }: Props) {
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [captainName, setCaptainName] = useState("");
  const [captainPhone, setCaptainPhone] = useState("");
  const [captainEmail, setCaptainEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { checkParticipantExistsAction } = await import("@/app/championships/actions");
      const existing = await checkParticipantExistsAction(championship.id, captainPhone);
      if (existing) {
        setError(`You are already registered as "${existing.team_name}" (${existing.payment_status === "paid" ? "Paid" : "Pending payment"})`);
        setIsLoading(false);
        return;
      }

      const { publicRegisterForChampionshipAction } = await import("@/app/championships/actions");
      const participant = await publicRegisterForChampionshipAction({
        championshipId: championship.id,
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        captainEmail: captainEmail.trim() || undefined,
        members: [],
      });

      if (championship.registration_fee === 0) {
        setSuccess(true);
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/razorpay/championship-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          championshipId: championship.id,
          amount: championship.registration_fee,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create payment");
      }

      const { order_id, amount } = await res.json();

      const loadRazorpay = (): Promise<boolean> =>
        new Promise((resolve) => {
          if ((window as any).Razorpay) return resolve(true);
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.async = true;
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.body.appendChild(s);
        });

      const loaded = await loadRazorpay();
      if (!loaded) { setError("Failed to load payment gateway"); setIsLoading(false); return; }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: "INR",
        name: "RR Downtown Arcade",
        description: `${championship.name} Registration`,
        order_id,
        prefill: { name: captainName, contact: captainPhone, email: captainEmail },
        theme: { color: "#3b82f6" },
        handler: async (response: any) => {
          try {
            const { confirmChampionshipPaymentAction } = await import("@/app/championships/actions");
            await confirmChampionshipPaymentAction({
              participantId: participant.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setSuccess(true);
          } catch (e: any) {
            setError("Payment completed but confirmation failed. Contact support.");
          }
        },
      });

      rzp.open();
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
    } catch (e: any) {
      setError(e.message || "Registration failed");
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <Card className="glass-card border-white/10 max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4 ring-1 ring-green-500/50">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-white">Registration Successful!</CardTitle>
          <CardDescription className="text-zinc-300">
            {championship.registration_fee > 0 ? "Payment received. " : ""}
            You are now registered for {championship.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-zinc-400">Team: {teamName}</p>
          <p className="text-sm text-zinc-400">Captain: {captainName}</p>
          <Button className="w-full" onClick={() => router.push(`/championships/${championship.id}`)}>
            View Championship
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl text-white">Register for {championship.name}</CardTitle>
            <CardDescription className="text-zinc-400 capitalize">{championship.sport_type} · {championship.format.replace("_", " ")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-zinc-300">Registration Fee</span>
          <span className="text-xl font-bold text-primary">
            {championship.registration_fee > 0 ? formatPrice(championship.registration_fee) : "FREE"}
          </span>
        </div>

        {championship.prize_pool > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <span className="text-sm text-zinc-300">Prize Pool</span>
            <span className="font-bold text-amber-400">{formatPrice(championship.prize_pool)}</span>
          </div>
        )}

        <Separator className="bg-white/10" />

        <div className="grid gap-2">
          <Label className="text-zinc-300">Team Name</Label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team name"
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <User className="h-4 w-4" /> Captain Details
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-zinc-400 text-xs">Full Name</Label>
              <Input
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                placeholder="John Doe"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-zinc-400 text-xs">Phone Number</Label>
              <Input
                value={captainPhone}
                onChange={(e) => setCaptainPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-zinc-400 text-xs">Email (optional)</Label>
            <Input
              type="email"
              value={captainEmail}
              onChange={(e) => setCaptainEmail(e.target.value)}
              placeholder="john@example.com"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          className="w-full py-6 text-lg neon-glow"
          onClick={handleRegister}
          disabled={isLoading || !teamName || !captainName || !captainPhone}
        >
          {isLoading ? "Processing..." : championship.registration_fee > 0 ? `Pay & Register - ${formatPrice(championship.registration_fee)}` : "Register Free"}
        </Button>
      </CardContent>
    </Card>
  );
}