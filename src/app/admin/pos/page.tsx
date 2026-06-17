"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Clock, Package, QrCode, IndianRupee, Phone, User, X, Printer, PauseCircle, ListRestart, Trash2, MessageSquare } from "lucide-react";
import ServiceSelector from "@/components/pos/service-selector";
import InventorySelector from "@/components/pos/inventory-selector";
import CartDisplay from "@/components/pos/cart-display";
import CheckoutModal from "@/components/pos/checkout-modal";
import LiveTimers from "@/components/pos/live-timers";
import { useCart, HeldCart } from "@/hooks/useCart";
import { getCurrentTimeInfo, formatPrice } from "@/lib/pricing";
import { printThermalReceipt } from "@/lib/print-utils";
import { cn } from "@/lib/utils";

export default function PosPage() {
  const [activeTab, setActiveTab] = useState<"services" | "inventory" | "timers">("services");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const cart = useCart();
  const timeInfo = getCurrentTimeInfo();

  const handleCheckout = () => {
    if (cart.items.length === 0) return;
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Arcade Command Center
            </h1>
            <p className="text-slate-400 mt-1 font-medium">
              Unified Point of Sale & Terminal Management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={timeInfo.pricingMode === "peak" ? "destructive" : "outline"}
              className={cn(
                "gap-2 px-3 py-1.5 text-sm",
                timeInfo.pricingMode === "peak" 
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30" 
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              )}
            >
              <Clock className="h-4 w-4" />
              {timeInfo.currentTime} • {timeInfo.pricingMode === "peak" ? "Peak" : "Base"}
            </Badge>
            <div className="hidden md:flex items-center gap-3 px-5 py-2.5 bg-black/40 rounded-xl border border-white/10 shadow-inner">
              <div className="h-10 w-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight text-white">{cart.itemCount} items</div>
                <div className="text-sm text-indigo-300 font-medium">{formatPrice(cart.total)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
              <button
                onClick={() => setActiveTab("services")}
                className={cn(
                  "flex-1 py-3 px-4 text-center font-semibold rounded-xl transition-all duration-300",
                  activeTab === "services"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  Terminal Bookings
                </div>
              </button>
              <button
                onClick={() => setActiveTab("inventory")}
                className={cn(
                  "flex-1 py-3 px-4 text-center font-semibold rounded-xl transition-all duration-300",
                  activeTab === "inventory"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Package className="h-4 w-4" />
                  Concessions
                </div>
              </button>
              <button
                onClick={() => setActiveTab("timers")}
                className={cn(
                  "flex-1 py-3 px-4 text-center font-semibold rounded-xl transition-all duration-300",
                  activeTab === "timers"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  Live Timers
                </div>
              </button>
            </div>

            {/* Product Selection Area */}
            <div className="h-[calc(100vh-250px)] rounded-3xl overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
              {activeTab === "services" ? (
                <ServiceSelector onAddService={cart.addService} />
              ) : activeTab === "inventory" ? (
                <InventorySelector onAddInventory={cart.addInventory} />
              ) : (
                <LiveTimers onAddCustomItem={cart.addCustomItem} />
              )}
            </div>
          </div>

          {/* Right Column - Cart & Checkout */}
          <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
            {/* Customer Info */}
            <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 p-5 shadow-xl shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Customer</h3>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="Phone Number (Guest Checkout)"
                    value={cart.customerPhone}
                    onChange={(e) => cart.setCustomerPhone(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Cart Display */}
            <div className="flex-1 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col overflow-hidden shadow-xl">
              <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <ShoppingCart className="h-5 w-5 text-indigo-400" />
                    Current Order
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {cart.items.length > 0 && (
                      <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printThermalReceipt({
                            items: cart.items,
                            subtotal: cart.subtotal,
                            total: cart.total,
                            customerPhone: cart.customerPhone || undefined
                          })}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cart.holdCart}
                          className="h-8 px-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
                        >
                          <PauseCircle className="h-4 w-4 mr-1.5" />
                          Hold
                        </Button>
                      </div>
                    )}
                    {cart.heldCarts.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => setIsHeldBillsOpen(true)}
                        className="h-9 px-3 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg"
                      >
                        <ListRestart className="h-4 w-4 mr-1.5" />
                        Held ({cart.heldCarts.length})
                      </Button>
                    )}
                    {cart.items.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cart.clearCart}
                        className="h-9 px-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg border border-rose-500/20"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CartDisplay
                  items={cart.items}
                  onUpdateQuantity={cart.updateQuantity}
                  onRemoveItem={cart.removeItem}
                />
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 p-6 shadow-2xl shrink-0">
              <div className="space-y-4">
                {/* Bill Comment */}
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Bill Note (e.g. Birthday Party)"
                    value={cart.comment}
                    onChange={(e) => cart.setComment(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl"
                  />
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="flex justify-between items-center text-slate-300">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    {formatPrice(cart.total)}
                  </span>
                </div>

                {/* Checkout Button */}
                <div className="pt-5">
                  <Button
                    size="lg"
                    className="w-full h-16 text-lg rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02]"
                    onClick={handleCheckout}
                    disabled={cart.items.length === 0}
                  >
                    <QrCode className="h-6 w-6 mr-3" />
                    Checkout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        cart={cart}
      />

      {/* Held Bills Dialog */}
      <Dialog open={isHeldBillsOpen} onOpenChange={setIsHeldBillsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-500" />
              Held Bills
            </DialogTitle>
            <DialogDescription>
              {cart.heldCarts.length} bill{cart.heldCarts.length !== 1 ? "s" : ""} on hold. Resume to load back into the active cart.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {cart.heldCarts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <PauseCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No held bills</p>
              </div>
            ) : (
              cart.heldCarts.map((hc) => {
                const timeAgo = Math.round((Date.now() - hc.timestamp) / 60_000);
                return (
                  <div
                    key={hc.id}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3"
                  >
                    {/* Comment prominently displayed */}
                    {hc.comment && (
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="font-semibold text-amber-600 text-sm">
                          {hc.comment}
                        </span>
                      </div>
                    )}

                    {/* Details row */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <div className="font-bold text-lg">{formatPrice(hc.total)}</div>
                        <div className="text-muted-foreground text-xs">
                          {hc.itemCount} item{hc.itemCount !== 1 ? "s" : ""} •{" "}
                          {hc.customerPhone || "Walk-in"} •{" "}
                          {timeAgo < 1 ? "Just now" : `${timeAgo}m ago`}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => {
                          cart.restoreCart(hc.id);
                          setIsHeldBillsOpen(false);
                        }}
                      >
                        <ListRestart className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => cart.discardCart(hc.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Discard
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}