"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  IndianRupee,
  CheckCircle,
  Receipt,
  Copy,
  Clock,
  Package,
  Tag,
  CreditCard,
  Loader2,
  X,
  Printer,
  Split,
  RefreshCw,
} from "lucide-react";
import { formatPrice, getCurrentTimeInfo } from "@/lib/pricing";
import { printThermalReceipt } from "@/lib/print-utils";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { type CartItem } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface CheckoutModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cart: {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    customerPhone: string;
    comment: string;
    clearCart: () => void;
    itemCount: number;
  };
}

type PaymentMethod = "upi" | "cash" | "razorpay" | "split";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutModal({ isOpen, onOpenChange, cart }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState<string | null>(null);

  // Razorpay QR state
  const [rzpQrUrl, setRzpQrUrl] = useState<string | null>(null);
  const [rzpQrId, setRzpQrId] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [lastQrAmount, setLastQrAmount] = useState<number>(0);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "percentage" | "fixed";
    amount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Split payment state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);

  // Auto-balance split amounts when total changes
  useEffect(() => {
    if (paymentMethod === "split") {
      setSplitCash(0);
      setSplitUpi(getDiscountedTotal());
    }
  }, [cart.total, appliedCoupon, paymentMethod]);

  const createTransaction = useCreateTransaction();
  const timeInfo = getCurrentTimeInfo();

  const getDiscountedTotal = () => {
    if (!appliedCoupon) return cart.total;
    let discount = 0;
    if (appliedCoupon.type === "percentage") {
      discount = cart.total * (appliedCoupon.amount / 100);
    } else {
      discount = appliedCoupon.amount;
    }
    return Math.max(0, cart.total - discount);
  };

  const currentUpiAmount = paymentMethod === "split" ? splitUpi : getDiscountedTotal();

  // Generate Razorpay QR Code
  const generateRazorpayQr = async (amount: number) => {
    if (amount <= 0) {
      setRzpQrUrl(null);
      setLastQrAmount(0);
      return;
    }
    if (amount === lastQrAmount && rzpQrUrl) return; // already generated

    setIsGeneratingQr(true);
    setRzpQrId(null);
    try {
      const res = await fetch("/api/razorpay/pos-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description: `POS Order - ${cart.itemCount} items` }),
      });
      if (!res.ok) throw new Error("Failed to generate QR");
      const data = await res.json();
      setRzpQrUrl(data.image_url);
      setRzpQrId(data.qr_id);
      setLastQrAmount(amount);
    } catch (err) {
      console.error("Error generating Razorpay QR:", err);
      // fallback handled if image_url is missing
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Debounce for QR generation to avoid spamming API while typing split amount
  useEffect(() => {
    if ((paymentMethod === "upi" || paymentMethod === "split") && currentUpiAmount > 0) {
      const timer = setTimeout(() => {
        generateRazorpayQr(currentUpiAmount);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setRzpQrUrl(null);
      setRzpQrId(null);
      setLastQrAmount(0);
    }
  }, [paymentMethod, currentUpiAmount]);

  // Poll for QR payment status
  useEffect(() => {
    if (!rzpQrId || isProcessing || transactionId) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/razorpay/qr-status?id=${rzpQrId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isPaid) {
            clearInterval(intervalId);
            handleQrAutoPayment();
          }
        }
      } catch (err) {
        console.error("Error checking QR status:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [rzpQrId, isProcessing, transactionId]);

  const handleQrAutoPayment = async () => {
    if (cart.items.length === 0) return;
    setIsProcessing(true);
    try {
      const result = await recordTransaction(paymentMethod);
      setTransactionId(result.id);
      cart.clearCart();
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
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
        amount: coupon.discount_amount,
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

  const recordTransaction = async (
    method: PaymentMethod,
    rzpPaymentId?: string,
    rzpOrderId?: string
  ) => {
    const dbMethod = method === "split" ? "upi" : method;
    const result = await createTransaction.mutateAsync({
      amount: getDiscountedTotal(),
      payment_method: dbMethod,
      customer_phone: cart.customerPhone || undefined,
      comment: cart.comment || undefined,
      items: cart.items,
      couponCode: appliedCoupon?.code,
      ...(rzpPaymentId && { razorpay_payment_id: rzpPaymentId }),
      ...(rzpOrderId && { razorpay_order_id: rzpOrderId }),
      ...(method === "split" && {
        splitAmounts: { cash: splitCash, upi: splitUpi },
      }),
    });
    return result;
  };

  const handleCashOrUpiPayment = async () => {
    if (cart.items.length === 0) return;
    
    if (paymentMethod === "split") {
      if (splitCash + splitUpi !== getDiscountedTotal()) {
        alert("Split amounts must exactly equal the total.");
        return;
      }
    }

    setIsProcessing(true);
    try {
      const result = await recordTransaction(paymentMethod);
      setTransactionId(result.id);
      cart.clearCart();
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (cart.items.length === 0) return;
    setIsProcessing(true);

    try {
      // Step 1: Create Razorpay order
      const res = await fetch("/api/razorpay/pos-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: getDiscountedTotal() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create Razorpay order");
      }

      const { order_id, amount, currency, key_id } = await res.json();

      // Step 2: Open Razorpay checkout
      const options = {
        key: key_id,
        amount,
        currency,
        name: "RR Downtown Arcade",
        description: `POS Transaction — ${cart.itemCount} item(s)`,
        order_id,
        prefill: {
          contact: cart.customerPhone || "",
        },
        theme: { color: "#7c3aed" },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // Step 3: Record transaction in DB after payment success
          try {
            const result = await recordTransaction(
              "razorpay",
              response.razorpay_payment_id,
              response.razorpay_order_id
            );
            setRazorpayPaymentId(response.razorpay_payment_id);
            setTransactionId(result.id);
            cart.clearCart();
          } catch (err) {
            console.error("DB record failed after Razorpay payment:", err);
            alert("Payment was captured but failed to record. Contact admin.");
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay script not loaded. Please refresh and try again.");
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Razorpay initiation error:", error);
      alert(error.message || "Failed to initiate Razorpay payment.");
      setIsProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === "razorpay") {
      handleRazorpayPayment();
    } else {
      handleCashOrUpiPayment();
    }
  };

  const handleClose = () => {
    if (transactionId) {
      setTransactionId(null);
      setRazorpayPaymentId(null);
      setPaymentMethod("upi");
      setAppliedCoupon(null);
      setCouponCode("");
      setRzpQrUrl(null);
      setLastQrAmount(0);
    }
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const paymentMethodLabel = () => {
    if (paymentMethod === "upi") return "UPI QR Code";
    if (paymentMethod === "cash") return "Cash";
    if (paymentMethod === "split") return "Split Payment";
    return "Razorpay";
  };

  const handlePrint = () => {
    printThermalReceipt({
      items: cart.items,
      subtotal: cart.subtotal,
      total: getDiscountedTotal(),
      discount: appliedCoupon ? {
        code: appliedCoupon.code,
        amount: cart.total - getDiscountedTotal()
      } : undefined,
      transactionId: transactionId || undefined,
      paymentMethod: paymentMethodLabel(),
      customerPhone: cart.customerPhone || undefined
    });
  };

  return (
    <>
      {/* Load Razorpay SDK */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {transactionId ? (
            /* ── Success Screen ── */
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Payment Successful!</DialogTitle>
                    <DialogDescription>Transaction recorded successfully</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                {/* Amount paid */}
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-green-500">
                        {formatPrice(getDiscountedTotal())}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Paid via {paymentMethodLabel()}
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Completed
                    </Badge>
                  </div>
                </div>

                {/* Details grid */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    Transaction Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-card rounded-lg p-3 border">
                      <div className="text-muted-foreground text-xs mb-1">Transaction ID</div>
                      <div className="font-mono flex items-center gap-1">
                        {transactionId.slice(0, 12)}…
                        <button onClick={() => copyToClipboard(transactionId)} className="ml-1 text-muted-foreground hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border">
                      <div className="text-muted-foreground text-xs mb-1">Time</div>
                      <div>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border">
                      <div className="text-muted-foreground text-xs mb-1">Payment Method</div>
                      <div className="capitalize">{paymentMethodLabel()}</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border">
                      <div className="text-muted-foreground text-xs mb-1">Customer</div>
                      <div>{cart.customerPhone || "Walk-in"}</div>
                    </div>
                    {razorpayPaymentId && (
                      <div className="col-span-2 bg-card rounded-lg p-3 border">
                        <div className="text-muted-foreground text-xs mb-1">Razorpay Payment ID</div>
                        <div className="font-mono flex items-center gap-1 text-xs">
                          {razorpayPaymentId}
                          <button onClick={() => copyToClipboard(razorpayPaymentId!)} className="ml-1 text-muted-foreground hover:text-foreground">
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Order Summary</h4>
                  <div className="rounded-lg border divide-y divide-border">
                    {cart.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-6 w-6 rounded flex items-center justify-center shrink-0",
                            item.type === "service" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"
                          )}>
                            {item.type === "service" ? <Clock className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                          </div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">×{item.quantity}</span>
                        </div>
                        <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 px-1 text-sm pt-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatPrice(cart.subtotal)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-green-500">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>− {formatPrice(cart.total - getDiscountedTotal())}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total Paid</span>
                      <span>{formatPrice(getDiscountedTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button onClick={handlePrint} variant="outline" className="w-full sm:w-1/2">
                  <Printer className="mr-2 h-4 w-4" /> Print Thermal Bill
                </Button>
                <Button onClick={handleClose} className="w-full sm:w-1/2">
                  Start New Transaction
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* ── Payment Selection Screen ── */
            <>
              <DialogHeader>
                <DialogTitle>Complete Checkout</DialogTitle>
                <DialogDescription>Select payment method and complete the transaction</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Order summary */}
                <div className="rounded-xl bg-card border p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {cart.itemCount} item{cart.itemCount !== 1 && "s"} • {timeInfo.pricingMode} pricing
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(getDiscountedTotal())}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="text-xs text-green-500 font-medium">
                      Coupon "{appliedCoupon.code}" applied (−{formatPrice(cart.total - getDiscountedTotal())})
                    </div>
                  )}
                  {cart.customerPhone && (
                    <div className="text-xs text-muted-foreground">
                      Customer: {cart.customerPhone}
                    </div>
                  )}
                </div>

                {/* Coupon */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Discount Coupon</h4>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-green-500 text-sm">
                        <Tag className="h-4 w-4" />
                        <span className="font-medium">{appliedCoupon.code} applied</span>
                      </div>
                      <button onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && handleValidateCoupon()}
                          className="uppercase"
                        />
                        <Button
                          variant="secondary"
                          onClick={handleValidateCoupon}
                          disabled={!couponCode.trim() || isValidatingCoupon}
                          className="shrink-0"
                        >
                          {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      {couponError && <p className="text-destructive text-xs">{couponError}</p>}
                    </div>
                  )}
                </div>

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Payment Method</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* UPI */}
                    <button
                      onClick={() => setPaymentMethod("upi")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                        paymentMethod === "upi"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                      )}
                    >
                      <QrCode className="h-6 w-6" />
                      <span>UPI / QR</span>
                    </button>

                    {/* Cash */}
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                        paymentMethod === "cash"
                          ? "border-amber-500 bg-amber-500/5 text-amber-500"
                          : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                      )}
                    >
                      <IndianRupee className="h-6 w-6" />
                      <span>Cash</span>
                    </button>
                    
                    {/* Split */}
                    <button
                      onClick={() => setPaymentMethod("split")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                        paymentMethod === "split"
                          ? "border-indigo-500 bg-indigo-500/5 text-indigo-500"
                          : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                      )}
                    >
                      <Split className="h-6 w-6" />
                      <span>Split</span>
                    </button>

                    {/* Razorpay */}
                    <button
                      onClick={() => setPaymentMethod("razorpay")}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all text-sm font-medium",
                        paymentMethod === "razorpay"
                          ? "border-blue-500 bg-blue-500/5 text-blue-500"
                          : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                      )}
                    >
                      <CreditCard className="h-6 w-6" />
                      <span>Razorpay</span>
                    </button>
                  </div>

                  {/* UPI info */}
                  {paymentMethod === "upi" && (
                    <div className="rounded-xl border bg-white p-5 flex flex-col items-center gap-3">
                      <div className="bg-white p-2 rounded-xl border shadow-sm relative h-[250px] w-[250px] flex items-center justify-center overflow-hidden">
                        {isGeneratingQr ? (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground z-10">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-xs">Generating Razorpay QR...</span>
                          </div>
                        ) : rzpQrUrl ? (
                          <img 
                            src={rzpQrUrl} 
                            alt="Razorpay UPI QR" 
                            className="absolute top-1/2 left-1/2 max-w-none w-[380px] h-[550px] object-cover pointer-events-none"
                            style={{ transform: "translate(-50%, -54%) scale(1.15)" }}
                          />
                        ) : (
                          <div className="text-center text-xs text-muted-foreground">
                            QR Unavailable
                            <Button variant="ghost" size="sm" onClick={() => generateRazorpayQr(currentUpiAmount)} className="mt-2 h-6 px-2">
                              <RefreshCw className="h-3 w-3 mr-1" /> Retry
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-sm font-semibold text-gray-800">Scan via PhonePe, GPay, Paytm</div>
                        <div className="text-xs text-gray-500 mt-1">Official Razorpay QR</div>
                        <div className="text-lg font-bold text-gray-900 mt-2">{formatPrice(getDiscountedTotal())}</div>
                      </div>
                    </div>
                  )}

                  {/* Cash info */}
                  {paymentMethod === "cash" && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-sm">
                      <p className="font-medium text-amber-600">Cash Payment Instructions</p>
                      <ol className="space-y-1.5 text-muted-foreground list-none">
                        {[
                          `Collect ${formatPrice(getDiscountedTotal())} from customer`,
                          "Verify cash authenticity and count",
                          "Confirm payment below to record transaction",
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Razorpay info */}
                  {paymentMethod === "razorpay" && (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2 text-sm">
                      <p className="font-medium text-blue-500">Online Payment via Razorpay</p>
                      <p className="text-muted-foreground">
                        A secure Razorpay checkout will open. Customer can pay via Credit/Debit card,
                        Net Banking, UPI, Wallets, or EMI.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Amount: {formatPrice(getDiscountedTotal())}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Split info */}
                  {paymentMethod === "split" && (
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-indigo-600">Split Payment</p>
                        <Badge variant={splitCash + splitUpi === getDiscountedTotal() ? "default" : "destructive"}>
                          {formatPrice(splitCash + splitUpi)} / {formatPrice(getDiscountedTotal())}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Cash Amount</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              className="pl-9"
                              value={splitCash || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSplitCash(val);
                                setSplitUpi(Math.max(0, getDiscountedTotal() - val));
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">UPI Amount</label>
                          <div className="relative">
                            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              className="pl-9"
                              value={splitUpi || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setSplitUpi(val);
                                setSplitCash(Math.max(0, getDiscountedTotal() - val));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {splitUpi > 0 && (
                        <div className="bg-white p-3 rounded-lg border shadow-sm flex flex-col sm:flex-row items-center gap-4">
                          <div className="relative h-[160px] w-[160px] flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                            {isGeneratingQr ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground z-10" />
                            ) : rzpQrUrl ? (
                              <img 
                                src={rzpQrUrl} 
                                alt="Razorpay UPI QR" 
                                className="absolute top-1/2 left-1/2 max-w-none w-[240px] h-[350px] object-cover pointer-events-none"
                                style={{ transform: "translate(-50%, -54%) scale(1.15)" }}
                              />
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => generateRazorpayQr(splitUpi)} className="h-6 w-6 z-10">
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-center sm:text-left">
                            <div className="font-semibold text-gray-900">Scan for UPI Portion</div>
                            <div className="text-xl font-bold text-primary">{formatPrice(splitUpi)}</div>
                            <div className="text-xs text-muted-foreground mt-1">Official Razorpay QR</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing || cart.items.length === 0}
                  className={cn(
                    paymentMethod === "upi" && "bg-primary hover:bg-primary/90",
                    paymentMethod === "cash" && "bg-amber-600 hover:bg-amber-700",
                    paymentMethod === "split" && "bg-indigo-600 hover:bg-indigo-700",
                    paymentMethod === "razorpay" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : paymentMethod === "upi" ? (
                    <><QrCode className="mr-2 h-4 w-4" /> Confirm UPI Payment</>
                  ) : paymentMethod === "cash" ? (
                    <><IndianRupee className="mr-2 h-4 w-4" /> Confirm Cash Payment</>
                  ) : paymentMethod === "split" ? (
                    <><Split className="mr-2 h-4 w-4" /> Confirm Split Payment</>
                  ) : (
                    <><CreditCard className="mr-2 h-4 w-4" /> Pay with Razorpay</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}