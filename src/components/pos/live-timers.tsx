"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Clock } from "lucide-react";
import { supabase, type Service } from "@/lib/supabase";
import { formatPrice, getCurrentTimeInfo } from "@/lib/pricing";

interface TimerSession {
  id: string;
  serviceId: string;
  startTime: number;
}

interface LiveTimersProps {
  onAddCustomItem: (name: string, price: number, quantity: number) => void;
}

export default function LiveTimers({ onAddCustomItem }: LiveTimersProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [timers, setTimers] = useState<TimerSession[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  // Load services and timers
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("services").select("*").eq("is_active", true);
      if (data) setServices(data);
      
      try {
        const stored = localStorage.getItem("pos_live_timers");
        if (stored) setTimers(JSON.parse(stored));
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  // Timer tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const saveTimers = (newTimers: TimerSession[]) => {
    setTimers(newTimers);
    localStorage.setItem("pos_live_timers", JSON.stringify(newTimers));
  };

  const startTimer = (serviceId: string) => {
    saveTimers([...timers, { id: Date.now().toString(), serviceId, startTime: Date.now() }]);
  };

  const stopTimer = (timerId: string, service: Service) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    const durationMs = Date.now() - timer.startTime;
    const durationMinutes = Math.max(1, Math.ceil(durationMs / 60000)); // Minimum 1 minute
    
    // Check if peak
    const { pricingMode } = getCurrentTimeInfo();
    const hourlyRate = pricingMode === "peak" ? service.peak_price : service.base_price;
    
    const calculatedPrice = (durationMinutes / 60) * hourlyRate;
    const finalPrice = Math.round(calculatedPrice * 100) / 100; // Round to 2 decimals

    onAddCustomItem(
      `${service.name} (${durationMinutes} mins)`,
      finalPrice,
      1
    );

    saveTimers(timers.filter(t => t.id !== timerId));
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading services...</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Live Gaming Timers
        </h2>
        <Badge variant="outline">{timers.length} Active</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(service => {
            const activeTimers = timers.filter(t => t.serviceId === service.id);
            const { pricingMode } = getCurrentTimeInfo();
            const currentPrice = pricingMode === "peak" ? service.peak_price : service.base_price;

            return (
              <Card key={service.id} className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{service.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{service.type}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-primary">{formatPrice(currentPrice)}<span className="text-xs text-muted-foreground font-normal">/hr</span></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {activeTimers.map(timer => {
                      const elapsed = now - timer.startTime;
                      const durationMinutes = Math.max(1, Math.ceil(elapsed / 60000));
                      const estimatedPrice = (durationMinutes / 60) * currentPrice;

                      return (
                        <div key={timer.id} className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-mono text-xl font-bold text-primary tracking-tight">
                              {formatDuration(elapsed)}
                            </span>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block leading-none">Est. Total</span>
                              <span className="font-semibold">{formatPrice(estimatedPrice)}</span>
                            </div>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full font-medium"
                            onClick={() => stopTimer(timer.id, service)}
                          >
                            <Square className="w-4 h-4 mr-2" fill="currentColor" /> Stop & Add to Bill
                          </Button>
                        </div>
                      )
                    })}

                    <Button 
                      variant={activeTimers.length > 0 ? "outline" : "default"} 
                      className="w-full"
                      onClick={() => startTimer(service.id)}
                    >
                      <Play className="w-4 h-4 mr-2" fill="currentColor" /> 
                      {activeTimers.length > 0 ? "Start Another Session" : "Start Timer Session"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  );
}
