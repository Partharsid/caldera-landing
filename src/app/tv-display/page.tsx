"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Tv, RefreshCw, Wifi } from "lucide-react";
import { useTodaySlots } from "@/hooks/useSlots";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export default function TvDisplayPage() {
  const { slots, services, isLoading, todayDateStr, refresh } = useTodaySlots();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [tick, setTick] = useState(0);

  // Update clock every second for live feel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTick((t) => t + 1);
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
      setLastRefresh(new Date());
    }, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  // Group by service, filter out past slots (start time has passed),
  // but keep currently active slots (started but not yet ended)
  const slotsByService = services
    .map((service) => {
      const upcomingSlots = slots
        .filter((s) => s.service_id === service.id)
        .filter((s) => {
          const slotEnd = new Date(s.end_time);
          // Keep slot if it hasn't fully ended yet
          return slotEnd > currentTime;
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5); // Show next 5 slots max per service

      return {
        ...service,
        slots: upcomingSlots,
        availableCount: upcomingSlots.filter((s) => s.status === "available").length,
      };
    })
    .filter((s) => s.slots.length > 0 && s.is_active);

  const getStatusColor = (status: string, isActive: boolean) => {
    if (isActive) return "bg-white text-black border-white";
    if (status === "available") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
    if (status === "booked") return "bg-red-500/20 text-red-300 border-red-500/50";
    return "bg-amber-500/20 text-amber-300 border-amber-500/50";
  };

  const getTypeAccent = (type: string) => {
    if (type === "court") return "from-violet-600 to-purple-600";
    if (type === "machine") return "from-blue-600 to-cyan-600";
    return "from-emerald-600 to-teal-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-violet-500 mx-auto" />
          <p className="mt-4 text-white/60 text-xl">Initializing Display…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white flex flex-col"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ── Compact Header ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <Tv className="h-4 w-4" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">RR Downtown Arcade</span>
            <span className="ml-3 text-white/40 text-sm">Live Availability</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-emerald-400">LIVE</span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <RefreshCw className="h-3.5 w-3.5" />
            <span suppressHydrationWarning>{lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xl font-bold text-white" suppressHydrationWarning>
            <Clock className="h-5 w-5 text-violet-400" />
            {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-white/40 text-xs" suppressHydrationWarning>
            {currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </div>
        </div>
      </header>

      {/* ── Legend bar ── */}
      <div className="flex items-center justify-center gap-8 py-2 bg-black/30 border-b border-white/5 text-xs text-white/50">
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span>Available</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /><span>Booked</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /><span>Blocked</span></div>
        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-white" /><span>Live Now</span></div>
      </div>

      {/* ── Main grid ── */}
      <main className="flex-1 p-4">
        {slotsByService.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30 text-center">
            <div>
              <Tv className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-2xl font-semibold">No upcoming slots for today</p>
              <p className="text-sm mt-2 opacity-60">{todayDateStr}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-min">
            {slotsByService.map((service) => {
              const nextAvailable = service.slots.find(
                (s) => s.status === "available" && new Date(s.start_time) > currentTime
              );

              return (
                <div
                  key={service.id}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
                >
                  {/* Service header */}
                  <div className={`h-1.5 bg-gradient-to-r ${getTypeAccent(service.type)}`} />
                  <div className="p-3 border-b border-white/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-bold text-sm leading-tight truncate">{service.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white/40 text-xs capitalize">{service.type}</span>
                          <span className="text-white/20 text-xs">•</span>
                          <span className="text-white/40 text-xs">{formatPrice(service.base_price)}/hr</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn(
                          "text-xs font-semibold",
                          service.availableCount > 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {service.availableCount > 0 ? `${service.availableCount} free` : "Full"}
                        </div>
                        {nextAvailable && (
                          <div className="text-white/30 text-xs">
                            Next: {formatTime(nextAvailable.start_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slots */}
                  <div className="p-2 space-y-1.5">
                    {service.slots.map((slot) => {
                      const slotStart = new Date(slot.start_time);
                      const slotEnd = new Date(slot.end_time);
                      const isLive = currentTime >= slotStart && currentTime < slotEnd;

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2 border text-xs transition-all",
                            getStatusColor(slot.status, isLive),
                            isLive && "animate-pulse shadow-lg shadow-white/20"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {isLive && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 animate-none" />
                            )}
                            <span className="font-bold">{formatTime(slot.start_time)}</span>
                            <span className={isLive ? "text-black/60" : "text-white/40"}>→</span>
                            <span className={isLive ? "text-black/60" : "text-white/40"}>{formatTime(slot.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isLive ? (
                              <span className="font-bold text-black text-xs uppercase tracking-wide">LIVE</span>
                            ) : (
                              <span className={cn(
                                "capitalize font-semibold",
                                slot.status === "available" && "text-emerald-300",
                                slot.status === "booked" && "text-red-300",
                                slot.status === "blocked" && "text-amber-300",
                              )}>
                                {slot.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="flex items-center justify-between px-6 py-2 bg-black/60 border-t border-white/10 text-white/30 text-xs">
        <span>Showing upcoming slots for {todayDateStr} — Past slots hidden automatically</span>
        <span>Auto-refreshes every 30 s • RR Downtown Arcade</span>
      </footer>
    </div>
  );
}