"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar, Clock, IndianRupee, User, Phone, QrCode, Check,
  ChevronRight, AlertCircle, Tag, Calendar as CalendarIcon
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  formatPrice,
  calculateCurrentPrice,
  calculatePriceForDateTime,
  getCurrentTimeInfo,
} from "@/lib/pricing";
import { supabase, type Service, type Slot } from "@/lib/supabase";
import { cn } from "@/lib/utils";

declare global {
  interface Window { Razorpay: any; }
}

interface BookingClientProps {
  service: Service;
  initialSlots: Slot[];
  initialDate: string;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── IST-aware date range (forces UTC bounds for Indian timezone) ─────────────────
function localDayRange(dateStr: string) {
  return {
    start: new Date(`${dateStr}T00:00:00+05:30`).toISOString(),
    end:   new Date(`${dateStr}T23:59:59+05:30`).toISOString(),
  };
}

// Step indicator
function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", active ? "text-white" : done ? "text-green-400" : "text-zinc-500")}>
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0",
        active ? "border-primary bg-primary/20 text-primary" : done ? "border-green-500 bg-green-500/20 text-green-400" : "border-zinc-600 text-zinc-600"
      )}>
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export default function BookingClient({ service, initialSlots, initialDate }: BookingClientProps) {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, type: 'percentage'|'fixed', amount: number} | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);


  // Derive current step
  const step = !selectedDate ? 1 : !selectedSlot ? 2 : 3;

  // ── Fetch slots when date changes (local-time range) ──────────────────────
  useEffect(() => {
    async function fetchSlots() {
      if (!service.id || !selectedDate) return;
      setLoadingSlots(true);
      setSelectedSlot(null);

      const { start, end } = localDayRange(selectedDate);

      const { data, error } = await supabase
        .from("slots")
        .select("*")
        .eq("service_id", service.id)
        .eq("status", "available")
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time");

      if (!error && data) {
        // Filter out past slots
        const now = new Date();
        const validSlots = data.filter(slot => new Date(slot.start_time) > now);
        setSlots(validSlots);
      }
      setLoadingSlots(false);
    }
    fetchSlots();
  }, [selectedDate, service.id]);

  const formatTime = (ds: string) =>
    new Date(ds).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const formatDisplayDate = (ds: string) => {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  };

  const generateDates = (days: number = 14) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dateOptions = generateDates(14);

  const getSlotPrice = (slot: Slot | null) => {
    if (!service || !slot) return calculateCurrentPrice(service);
    return calculatePriceForDateTime(service, new Date(slot.start_time));
  };

  const getDiscountedPrice = (slot: Slot | null) => {
    const basePrice = getSlotPrice(slot);
    if (!appliedCoupon) return basePrice;
    
    let discount = 0;
    if (appliedCoupon.type === 'percentage') {
      discount = basePrice * (appliedCoupon.amount / 100);
    } else {
      discount = appliedCoupon.amount;
    }
    return Math.max(0, basePrice - discount);
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setIsValidatingCoupon(true);
    setCouponError("");
    try {
      const { validateCouponAction } = await import("@/app/book/actions");
      const coupon = await validateCouponAction(couponCode);
      setAppliedCoupon({
        code: coupon.code,
        type: coupon.discount_type,
        amount: coupon.discount_amount
      });
      setCouponCode("");
    } catch (e: any) {
      setCouponError(e.message || "Invalid coupon");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  // ── Razorpay helpers ──────────────────────────────────────────────────────
  const loadRazorpay = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (razorpayLoaded) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => { setRazorpayLoaded(true); resolve(true); };
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  const createRazorpayOrder = async (slotId: string) => {
    try {
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, couponCode: appliedCoupon?.code, customerName, customerPhone }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create order");
      return await res.json() as { order_id: string, amount: number };
    } catch (e: any) {
      alert(`Failed to initialize payment: ${e.message || 'Please try again.'}`);
      return null;
    }
  };

  const createTransactionWithRazorpay = async (
    razorpayPaymentId: string, razorpayOrderId: string, razorpaySignature: string
  ) => {
    if (!selectedSlot) return;
    try {
      const { customerCreateBookingAction } = await import("@/app/book/actions");
      const result = await customerCreateBookingAction({
        slotId: selectedSlot.id,
        customerName,
        customerPhone,
        customerEmail,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_signature: razorpaySignature,
        couponCode: appliedCoupon?.code,
      });
      setBookingId(result.id);
      setBookingSuccess(true);
    } catch (e: any) {
      alert(`Booking creation failed after payment: ${e.message}. Contact support with your payment ID.`);
    }
  };

  const initiateRazorpayPayment = async () => {
    if (!selectedSlot || !customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      alert("Please select a slot and provide your name, phone number, and email.");
      return;
    }
    setIsLoading(true);
    try {
      const orderData = await createRazorpayOrder(selectedSlot.id);
      if (!orderData) return;
      const loaded = await loadRazorpay();
      if (!loaded) { alert("Failed to load payment gateway."); return; }

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount, // from server in paise
        currency: "INR",
        name: "RR Downtown Arcade",
        description: `${service.name} • ${formatTime(selectedSlot.start_time)}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          await createTransactionWithRazorpay(
            response.razorpay_payment_id, 
            response.razorpay_order_id,
            response.razorpay_signature
          );
        },
        prefill: { name: customerName, contact: customerPhone, email: customerEmail },
        notes: { service: service.name, slot: selectedSlot.start_time, customer_name: customerName },
        theme: { color: "#3b82f6" },
      });
      rzp.open();
      rzp.on("payment.failed", (r: any) => alert(`Payment failed: ${r.error.description ?? "Please try again."}`));
    } finally {
      setIsLoading(false);
    }
  };

  const timeInfo = getCurrentTimeInfo();

  // ── Success screen ────────────────────────────────────────────────────────
  if (bookingSuccess && bookingId) {
    return (
      <div className="dark min-h-screen bg-transparent text-white flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full glass-card border-white/10">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4 ring-1 ring-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Booking Confirmed!</CardTitle>
            <CardDescription className="text-zinc-300">Your slot has been successfully reserved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-zinc-400">Service</span><span className="font-medium">{service.name}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Date</span><span className="font-medium">{formatDisplayDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Time Slot</span>
                <span className="font-medium">{selectedSlot && `${formatTime(selectedSlot.start_time)} – ${formatTime(selectedSlot.end_time)}`}</span>
              </div>
              <div className="flex justify-between"><span className="text-zinc-400">Customer</span><span className="font-medium">{customerName}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Phone</span><span className="font-medium">{customerPhone}</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Email</span><span className="font-medium">{customerEmail}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-400">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span>- {appliedCoupon.type === 'percentage' ? `${appliedCoupon.amount}%` : formatPrice(appliedCoupon.amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold"><span>Total Paid</span><span className="text-primary">{formatPrice(getDiscountedPrice(selectedSlot))}</span></div>
            </div>
            <p className="text-center text-xs text-zinc-400">Booking ID: {bookingId}</p>
            <Button className="w-full" onClick={() => router.push("/")}>Back to Home</Button>
            <div className="pt-2 border-t border-border text-center text-xs text-zinc-500 space-y-1">
              <div className="flex justify-center gap-4">
                <Link href="/terms-and-conditions" className="hover:text-primary">Terms</Link>
                <Link href="/privacy-policy" className="hover:text-primary">Privacy</Link>
                <Link href="/refund-policy" className="hover:text-primary">Refund</Link>
              </div>
              <p>© {new Date().getFullYear()} RR Downtown Arcade</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main booking flow ─────────────────────────────────────────────────────
  return (
    <div className="dark min-h-screen bg-transparent text-white">
      <div className="w-full mx-auto max-w-5xl px-4 py-4 md:px-8 md:py-8">
        {/* Page header */}
        <header className="mb-5 md:mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2 -ml-2 h-8 px-2 text-sm">
            ← Back
          </Button>
          <h1 className="text-2xl md:text-4xl font-bold">Book {service.name}</h1>
          <p className="text-zinc-400 mt-1 text-sm">Choose a date, pick a slot, then confirm your details.</p>
        </header>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5 md:mb-8 overflow-x-auto pb-1">
          <Step n={1} label="Pick a Date" active={step === 1} done={step > 1} />
          <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
          <Step n={2} label="Choose a Slot" active={step === 2} done={step > 2} />
          <ChevronRight className="h-3 w-3 text-zinc-600 shrink-0" />
          <Step n={3} label="Confirm & Pay" active={step === 3} done={false} />
        </div>

        {/* Mobile-first: booking flow on top, sidebar info below on md+ */}
        <div className="flex flex-col-reverse md:grid md:grid-cols-3 gap-5">
          {/* ── Sidebar (shown at bottom on mobile, left col on desktop) ── */}
          <div className="md:col-span-1 space-y-4">
            {/* Service info */}
            <Card className="glass-card border-white/10 overflow-hidden">
              {service.image_url && (
                <div className="w-full h-32 relative border-b border-white/10">
                  <Image src={service.image_url} alt={service.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                </div>
              )}
              <CardHeader className={cn("pb-3", service.image_url ? "pt-3" : "")}>
                <CardTitle className="text-base text-white">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Type</span><span className="capitalize text-white">{service.type}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Base Price</span><span className="font-bold text-white">{formatPrice(service.base_price)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Peak Price</span><span className="font-bold text-primary">{formatPrice(service.peak_price)}</span></div>
                {selectedSlot && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Slot Price</span>
                      <div className="text-right">
                        <div className="font-bold text-base">{formatPrice(getSlotPrice(selectedSlot))}</div>
                        <Badge className={cn("text-xs mt-0.5", getSlotPrice(selectedSlot) === service.peak_price ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>
                          {getSlotPrice(selectedSlot) === service.peak_price ? "Peak rate" : "Base rate"}
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment trust card */}
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white"><QrCode className="w-4 h-4" />Secure Payment</CardTitle>
                <CardDescription>via Razorpay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-zinc-400">
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-400 shrink-0" />PCI DSS Compliant</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-400 shrink-0" />Instant Booking Confirmation</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-400 shrink-0" />Cards, UPI, NetBanking, Wallets</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-green-400 shrink-0" />We never store card details</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Main booking flow (full width mobile, 2/3 desktop) ── */}
          <div className="md:col-span-2 space-y-4">

            {/* Step 1 – Date picker */}
            <Card className={cn("glass-card border-white/10 transition-all", step > 1 && "border-green-500/30")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold", step > 1 ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50" : "bg-primary/20 text-primary ring-1 ring-primary/50")}>
                    {step > 1 ? <Check className="h-3.5 w-3.5" /> : "1"}
                  </div>
                  <Calendar className="w-4 h-4 text-white/80" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-zinc-300">Choose a day</Label>
                  <div className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {dateOptions.map((date) => {
                      // Use local time instead of UTC to avoid off-by-one errors in IST
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      const dateStr = `${y}-${m}-${d}`;
                      
                      const isSelected = selectedDate === dateStr;
                      const dayName = date.toLocaleDateString("en-IN", { weekday: "short" });
                      const dayNum = date.getDate();
                      const monthName = date.toLocaleDateString("en-IN", { month: "short" });
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={cn(
                            "flex flex-col items-center justify-center min-w-[76px] h-[96px] rounded-2xl transition-all snap-start",
                            isSelected 
                              ? "bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-primary/50 scale-105" 
                              : "bg-white/5 text-zinc-300 hover:text-white border border-white/10 hover:bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                          )}
                        >
                          <span className="text-[11px] uppercase tracking-wider font-medium opacity-80 mb-1">{dayName}</span>
                          <span className="text-2xl font-bold mb-0.5">{dayNum}</span>
                          <span className="text-[10px] uppercase tracking-wider">{monthName}</span>
                        </button>
                      );
                    })}
                    
                    {/* Add a Calendar Picker for flexibility */}
                    <div className="flex flex-col items-center justify-center min-w-[76px] h-[96px] snap-start">
                      <DatePicker 
                        date={selectedDate ? parseLocalDate(selectedDate) : undefined}
                        setDate={(d) => setSelectedDate(d ? format(d, "yyyy-MM-dd") : selectedDate)}
                        className="h-[96px] w-[76px] rounded-2xl bg-white/5 border-white/10 flex flex-col items-center justify-center gap-1 hover:bg-white/10 hover:text-white text-zinc-300"
                        trigger={<div className="flex flex-col items-center">
                          <CalendarIcon className="h-6 w-6 mb-1" />
                          <span className="text-[10px] uppercase tracking-wider font-medium">More</span>
                        </div>}
                      />
                    </div>
                  </div>
                  {selectedDate && (
                    <p className="text-sm text-primary font-medium flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4" />
                      {formatDisplayDate(selectedDate)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Step 2 – Slot picker */}
            <Card className={cn(
              "glass-card border-white/10 transition-all",
              !selectedDate && "opacity-50 pointer-events-none",
              selectedSlot && "border-green-500/30"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ring-1", selectedSlot ? "bg-green-500/20 text-green-400 ring-green-500/50" : step === 2 ? "bg-primary/20 text-primary ring-primary/50" : "bg-white/10 text-white/50 ring-white/10")}>
                    {selectedSlot ? <Check className="h-3.5 w-3.5" /> : "2"}
                  </div>
                  <Clock className="w-4 h-4 text-white/80" />
                  Available Time Slots
                  {selectedDate && !loadingSlots && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {slots.length} available
                    </Badge>
                  )}
                </CardTitle>
                {selectedDate && (
                  <CardDescription>
                    Slots for <span className="text-zinc-300">{formatDisplayDate(selectedDate)}</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-zinc-500 text-sm text-center py-6">← Select a date first</p>
                ) : loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    <p className="text-zinc-400 mt-2 text-sm">Loading slots…</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="h-10 w-10 mx-auto text-zinc-500 mb-3" />
                    <p className="text-zinc-300 font-medium">No available slots for this date</p>
                    <p className="text-sm text-zinc-500 mt-1">Try selecting another date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map((slot) => {
                      const price = calculatePriceForDateTime(service, new Date(slot.start_time));
                      const isPeak = price === service.peak_price;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "relative p-4 rounded-xl border text-center transition-all text-left group shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
                            selectedSlot?.id === slot.id
                              ? "border-primary bg-primary/20 ring-1 ring-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                              : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                          )}
                        >
                          <div className={cn("font-bold text-sm", selectedSlot?.id === slot.id ? "text-white" : "text-zinc-200 group-hover:text-white")}>{formatTime(slot.start_time)}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">to {formatTime(slot.end_time)}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-semibold">{formatPrice(price)}</span>
                            <span className={cn("text-xs px-1.5 py-0.5 rounded", isPeak ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>
                              {isPeak ? "Peak" : "Base"}
                            </span>
                          </div>
                          {selectedSlot?.id === slot.id && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3 – Customer details */}
            <Card className={cn(
              "glass-card border-white/10 transition-all",
              !selectedSlot && "opacity-50 pointer-events-none"
            )}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ring-1", step === 3 ? "bg-primary/20 text-primary ring-primary/50" : "bg-white/10 text-white/50 ring-white/10")}>3</div>
                  <User className="w-4 h-4 text-white/80" />
                  Your Details
                </CardTitle>
                <CardDescription>No login required — just your name, number, and email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name" className="text-zinc-300">Full Name</Label>
                    <Input id="customer-name" placeholder="John Doe" value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)} className="mt-2 bg-white/5 border-white/10 focus:border-primary/50 placeholder:text-zinc-500 text-white shadow-inner" />
                  </div>
                  <div>
                    <Label htmlFor="customer-phone" className="text-zinc-300">Phone Number</Label>
                    <Input id="customer-phone" placeholder="+91 9876543210" value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)} className="mt-2 bg-white/5 border-white/10 focus:border-primary/50 placeholder:text-zinc-500 text-white shadow-inner" />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="customer-email" className="text-zinc-300">Email Address</Label>
                    <Input id="customer-email" type="email" placeholder="john@example.com" value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)} className="mt-2 bg-white/5 border-white/10 focus:border-primary/50 placeholder:text-zinc-500 text-white shadow-inner" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking summary + CTA */}
            {selectedSlot && (
              <Card className="glass-card border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <CardHeader className="pb-3"><CardTitle className="text-white">Booking Summary</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Service</span><span>{service.name}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Date</span><span>{formatDisplayDate(selectedDate)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Time</span><span>{formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}</span></div>
                  {customerName && <div className="flex justify-between"><span className="text-zinc-400">Customer</span><span>{customerName}</span></div>}
                  <Separator />
                  
                  {/* Coupon Section */}
                  <div className="pt-2">
                    {appliedCoupon ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-md p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-400" />
                          <span className="font-medium text-green-400">{appliedCoupon.code} applied</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-6 text-zinc-400 hover:text-white">Remove</Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="coupon-code" className="text-zinc-300">Have a Coupon?</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="coupon-code" 
                            placeholder="Enter code" 
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="bg-white/5 border-white/10 focus:border-primary/50 placeholder:text-zinc-500 text-white shadow-inner"
                          />
                          <Button 
                            variant="secondary" 
                            onClick={handleValidateCoupon}
                            disabled={!couponCode.trim() || isValidatingCoupon}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md"
                          >
                            {isValidatingCoupon ? "..." : "Apply"}
                          </Button>
                        </div>
                        {couponError && <p className="text-red-400 text-xs">{couponError}</p>}
                      </div>
                    )}
                  </div>

                  <Separator />
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal</span>
                      <span>{formatPrice(getSlotPrice(selectedSlot))}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-400">
                        <span>Discount</span>
                        <span>- {formatPrice(getSlotPrice(selectedSlot) - getDiscountedPrice(selectedSlot))}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2">
                      <span>Total Amount</span>
                      <span className="text-primary">{formatPrice(getDiscountedPrice(selectedSlot))}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full py-6 text-lg neon-glow mt-2"
                    size="lg"
                    disabled={!selectedSlot || !customerName.trim() || !customerPhone.trim() || !customerEmail.trim() || isLoading}
                    onClick={initiateRazorpayPayment}
                  >
                    {isLoading ? "Processing…" : "Pay with Razorpay & Confirm"}
                  </Button>
                  <p className="text-xs text-center text-zinc-500">
                    By confirming, you agree to our{" "}
                    <Link href="/terms-and-conditions" className="underline hover:text-primary">terms and conditions</Link>.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border text-center text-sm text-zinc-500">
          <div className="flex flex-wrap justify-center gap-4 mb-2">
            <Link href="/terms-and-conditions" className="hover:text-primary">Terms & Conditions</Link>
            <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:text-primary">Refund Policy</Link>
            <Link href="/" className="hover:text-primary">Home</Link>
          </div>
          <p>© {new Date().getFullYear()} RR Downtown Arcade. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}