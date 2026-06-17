"use client";

import { Clock, Package, X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/pricing";
import { type CartItem } from "@/lib/pricing";
import { cn } from "@/lib/utils";

interface CartDisplayProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

export default function CartDisplay({ items, onUpdateQuantity, onRemoveItem }: CartDisplayProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  };

  if (items.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 shadow-inner border border-white/5">
          <Package className="h-8 w-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white">Cart is Empty</h3>
        <p className="text-slate-400">
          Add services or inventory items to begin
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/10">
      {items.map((item) => (
        <div key={item.id} className="p-4 hover:bg-white/5 transition-colors">
          <div className="flex items-start justify-between gap-4">
            {/* Left side - Item details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center border",
                  item.type === "service"
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                )}>
                  {item.type === "service" ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate text-white">{item.name}</h4>
                    <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-slate-300">
                      {item.type === "service" ? "Service" : "Item"}
                    </Badge>
                  </div>

                  {item.type === "service" && item.metadata?.slot && (
                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(item.metadata.slot.start_time)} - {formatTime(item.metadata.slot.end_time)}</span>
                    </div>
                  )}

                  {item.type === "inventory" && item.metadata?.inventory && (
                    <div className="text-sm text-slate-400 mt-1">
                      {item.metadata.inventory.type.charAt(0).toUpperCase() + item.metadata.inventory.type.slice(1)}
                    </div>
                  )}

                  {/* Price per unit */}
                  <div className="text-sm text-slate-400 mt-1 font-medium">
                    {formatPrice(item.price)} <span className="text-slate-500">each</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Quantity and total */}
            <div className="flex flex-col items-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10"
                onClick={() => onRemoveItem(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>

              <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center font-bold text-white">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-right">
                <div className="font-bold text-lg text-white">
                  {formatPrice(item.price * item.quantity)}
                </div>
                <div className="text-xs text-slate-400">
                  {item.quantity} × {formatPrice(item.price)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}