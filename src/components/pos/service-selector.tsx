"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Search, Filter, Plus, Clock, Calendar as CalendarIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSlotsForDate } from "@/hooks/useSlots";
import { calculatePriceForDateTime, formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { type ServiceSlot } from "@/hooks/useCart";
import { type Service } from "@/lib/supabase";

interface ServiceSelectorProps {
  onAddService: (service: Service, slot: ServiceSlot) => void;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateTime(dateString: string) {
  const d = new Date(dateString);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
  return { time, date };
}

const TYPE_ACCENT: Record<string, string> = {
  court: "from-violet-600 to-purple-600",
  machine: "from-blue-600 to-cyan-600",
  table: "from-emerald-600 to-teal-600",
};

export default function ServiceSelector({ onAddService }: ServiceSelectorProps) {
  const [selectedDate, setSelectedDate] = useState(localToday());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [now, setNow] = useState(new Date());

  const { services, slots, isLoading } = useSlotsForDate(selectedDate);

  // Update now every 30s so "live" indicators stay accurate
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const serviceTypes = Array.from(new Set(services.map((s) => s.type)));

  // Group upcoming available slots by service
  const slotsByService = useMemo(() => {
    return services
      .map((service) => {
        if (!service.is_active) return null;

        // Only show upcoming slots (not fully past)
        const serviceSlots = slots
          .filter((s) => s.service_id === service.id)
          .filter((s) => new Date(s.end_time) > now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        const matchesSearch =
          searchQuery === "" ||
          service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          service.type.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = selectedType === "all" || service.type === selectedType;

        if (!matchesSearch || !matchesType || serviceSlots.length === 0) return null;

        return {
          ...service,
          slots: serviceSlots,
          availableCount: serviceSlots.filter((s) => s.status === "available").length,
        };
      })
      .filter(Boolean) as (Service & {
        slots: typeof slots;
        availableCount: number;
      })[];
  }, [services, slots, now, searchQuery, selectedType]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-500 mx-auto mb-3" />
          <p className="text-sm">Loading slots…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* ── Filters ── */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-white/10">
        {/* Date + Search */}
        <div className="flex gap-2">
          <div className="flex items-center rounded-lg h-9 shrink-0">
            <DatePicker 
              date={selectedDate ? parseLocalDate(selectedDate) : undefined} 
              setDate={(d) => setSelectedDate(d ? format(d, "yyyy-MM-dd") : localToday())}
              className="bg-white/5 border-white/10 text-white h-9 text-xs"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder="Search services…"
              className="pl-8 h-9 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedType("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
              selectedType === "all"
                ? "bg-white text-black border-white"
                : "bg-white/5 text-white/50 border-white/10 hover:border-white/30"
            )}
          >
            <Filter className="h-3 w-3 inline mr-1" />All
          </button>
          {serviceTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize whitespace-nowrap",
                selectedType === type
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white/5 text-white/50 border-white/10 hover:border-white/30"
              )}
            >
              {type}s
            </button>
          ))}
        </div>
      </div>

      {/* ── Slot grid ── */}
      <div className="flex-1 overflow-y-auto p-3">
        {slotsByService.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 text-white/30">
            <Clock className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No available slots</p>
            <p className="text-xs mt-1 opacity-60">
              {searchQuery || selectedType !== "all"
                ? "Try clearing filters"
                : `No upcoming slots for ${selectedDate}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {slotsByService.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Accent + header */}
                <div className={`h-0.5 bg-gradient-to-r ${TYPE_ACCENT[service.type] ?? "from-gray-600 to-gray-500"}`} />
                <div className="px-3 pt-2.5 pb-2 border-b border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs truncate text-white">{service.name}</h3>
                      <span className="text-white/40 text-xs capitalize">{service.type}</span>
                    </div>
                    <span className={cn(
                      "text-xs font-semibold shrink-0",
                      service.availableCount > 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {service.availableCount > 0 ? `${service.availableCount} free` : "Full"}
                    </span>
                  </div>
                </div>

                {/* Slots */}
                <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
                  {service.slots.map((slot) => {
                    const slotStart = new Date(slot.start_time);
                    const slotEnd = new Date(slot.end_time);
                    const isLive = now >= slotStart && now < slotEnd;
                    const isAvailable = slot.status === "available";
                    const price = calculatePriceForDateTime(service, slotStart);
                    const startDT = formatDateTime(slot.start_time);
                    const endDT = formatDateTime(slot.end_time);

                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs transition-all",
                          isLive
                            ? "bg-white text-black border-white animate-pulse"
                            : isAvailable
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : slot.status === "booked"
                            ? "bg-red-500/10 text-red-300 border-red-500/30"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          {/* Time + date */}
                          <div className="flex items-center gap-2">
                            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-black shrink-0" />}
                            <div>
                              <div className="font-bold leading-tight">
                                {startDT.time} → {endDT.time}
                              </div>
                              <div className={cn("leading-tight", isLive ? "text-black/50" : "text-white/30")}>
                                {startDT.date}
                              </div>
                            </div>
                          </div>

                          {/* Price + Add button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn("font-bold", isLive ? "text-black" : "text-white")}>
                              {formatPrice(price)}
                            </span>
                            {isAvailable && (
                              <button
                                onClick={() =>
                                  onAddService(service, {
                                    id: slot.id,
                                    service_id: slot.service_id,
                                    service,
                                    start_time: slot.start_time,
                                    end_time: slot.end_time,
                                    status: slot.status,
                                  })
                                }
                                className="h-6 w-6 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors"
                                title="Add to cart"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {!isAvailable && (
                              <span className={cn(
                                "text-xs font-semibold capitalize",
                                isLive ? "text-black" : slot.status === "booked" ? "text-red-300" : "text-amber-300"
                              )}>
                                {isLive ? "LIVE" : slot.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}