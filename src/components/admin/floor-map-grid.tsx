"use client";

import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { type Slot, type Service } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface FloorMapGridProps {
  slots: Slot[];
  services: Service[];
  onSlotClick: (slot: Slot) => void;
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

export default function FloorMapGrid({ slots, services, onSlotClick }: FloorMapGridProps) {
  const [now, setNow] = useState(new Date());
  const [filter, setFilter] = useState<"all" | "available" | "booked" | "blocked">("all");

  // Live clock — updates every 30 s so status indicators stay fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const servicesWithSlots = useMemo(() => {
    return services
      .map((service) => {
        const serviceSlots = slots
          .filter((s) => s.service_id === service.id)
          .filter((s) => filter === "all" || s.status === filter)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        return {
          ...service,
          slots: serviceSlots,
          availableCount: slots.filter((s) => s.service_id === service.id && s.status === "available").length,
          bookedCount: slots.filter((s) => s.service_id === service.id && s.status === "booked").length,
          blockedCount: slots.filter((s) => s.service_id === service.id && s.status === "blocked").length,
        };
      })
      .filter((s) => s.slots.length > 0);
  }, [slots, services, filter]);

  const getSlotStyle = (slot: Slot, isLive: boolean) => {
    if (isLive) return "bg-white text-black border-white shadow-white/30 shadow-md";
    if (slot.status === "available") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25";
    if (slot.status === "booked") return "bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25";
    return "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25";
  };

  const totalSlots = slots.length;
  const totalAvailable = slots.filter((s) => s.status === "available").length;
  const totalBooked = slots.filter((s) => s.status === "booked").length;
  const totalBlocked = slots.filter((s) => s.status === "blocked").length;

  return (
    <div className="space-y-4">
      {/* ── Legend + Filter bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-1">
        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "available", "booked", "blocked"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize",
                filter === f
                  ? f === "all"
                    ? "bg-white text-black border-white"
                    : f === "available"
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : f === "booked"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-amber-500 text-black border-amber-500"
                  : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
              )}
            >
              {f === "all" ? `All (${totalSlots})` : f === "available" ? `Available (${totalAvailable})` : f === "booked" ? `Booked (${totalBooked})` : `Blocked (${totalBlocked})`}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" />Available</div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" />Booked</div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" />Blocked</div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-white" />Live Now</div>
        </div>
      </div>

      {servicesWithSlots.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-lg">No slots match the current filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {servicesWithSlots.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden"
            >
              {/* Accent bar */}
              <div className={`h-1 bg-gradient-to-r ${TYPE_ACCENT[service.type] ?? "from-gray-600 to-gray-500"}`} />

              {/* Service header */}
              <div className="px-4 pt-3 pb-2 border-b border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate text-white">{service.name}</h3>
                    <span className="text-white/40 text-xs capitalize">{service.type}</span>
                  </div>
                  <div className="flex gap-1.5 shrink-0 text-xs">
                    <span className="text-emerald-400 font-semibold">{service.availableCount} free</span>
                    <span className="text-white/20">·</span>
                    <span className="text-red-400">{service.bookedCount} booked</span>
                    {service.blockedCount > 0 && (
                      <>
                        <span className="text-white/20">·</span>
                        <span className="text-amber-400">{service.blockedCount} blocked</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Slot grid */}
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {service.slots.map((slot) => {
                  const slotStart = new Date(slot.start_time);
                  const slotEnd = new Date(slot.end_time);
                  const isLive = now >= slotStart && now < slotEnd;
                  const startDT = formatDateTime(slot.start_time);
                  const endDT = formatDateTime(slot.end_time);

                  return (
                    <button
                      key={slot.id}
                      onClick={() => onSlotClick(slot)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all",
                        getSlotStyle(slot, isLive),
                        isLive && "animate-pulse"
                      )}
                    >
                      {/* Left: Date + Time range */}
                      <div className="flex items-center gap-2 text-left">
                        {isLive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-black shrink-0" />
                        )}
                        <div>
                          <div className="font-bold">
                            {startDT.time} → {endDT.time}
                          </div>
                          <div className={cn("text-xs", isLive ? "text-black/60" : "text-white/40")}>
                            {startDT.date}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status */}
                      <div className={cn(
                        "font-semibold capitalize text-xs shrink-0",
                        isLive ? "text-black font-bold" : ""
                      )}>
                        {isLive ? "LIVE" : slot.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}