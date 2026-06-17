"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Slot, type Service } from "@/lib/supabase";

// ── Helper: local-time date string → ISO range ───────────────────────────────
function localDayRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end   = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── useTodaySlots — TV panel hook (server-side filtered to today) ─────────────
export function useTodaySlots() {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const dateKey = todayStr();
  const { start, end } = localDayRange(dateKey);

  // Fetch active services
  const servicesQuery = useQuery({
    queryKey: ["services", { active: true }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  // Fetch only today's slots from the server
  const slotsQuery = useQuery({
    queryKey: ["slots", "today", dateKey, lastRefresh],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slots")
        .select("*")
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time");
      if (error) throw error;
      return data as Slot[];
    },
    // Refetch automatically when the calendar day changes
    refetchInterval: 60_000,
  });

  // Real-time subscription — invalidates today's slot query on any change
  useEffect(() => {
    const channel = supabase
      .channel("slots-today-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "slots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["slots", "today"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("services-tv-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
        queryClient.invalidateQueries({ queryKey: ["services"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const refresh = () => setLastRefresh(Date.now());

  return {
    slots: slotsQuery.data ?? [],
    services: servicesQuery.data ?? [],
    isLoading: slotsQuery.isLoading || servicesQuery.isLoading,
    error: slotsQuery.error ?? servicesQuery.error,
    todayDateStr: dateKey,
    refresh,
  };
}

// ── useSlots — general hook for admin panels (all slots, no date filter) ──────
export function useSlots() {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const slotsQuery = useQuery({
    queryKey: ["slots", lastRefresh],
    queryFn: async () => {
      const { data, error } = await supabase.from("slots").select("*").order("start_time");
      if (error) throw error;
      return data as Slot[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("slots-all-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "slots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["slots"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const refresh = () => setLastRefresh(Date.now());

  return {
    slots: slotsQuery.data ?? [],
    services: servicesQuery.data ?? [],
    isLoading: slotsQuery.isLoading || servicesQuery.isLoading,
    error: slotsQuery.error ?? servicesQuery.error,
    refresh,
  };
}

// Fetch single slot with service details

export function useSlot(id: string) {
  return useQuery({
    queryKey: ["slots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slots")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Slot;
    },
    enabled: !!id,
  });
}

// Update slot (general mutation)
export function useUpdateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Slot> }) => {
      const { updateSlotAction } = await import("@/app/admin/actions/slots");
      return await updateSlotAction(id, updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["slots", variables.id] });
    },
  });
}

// Block a slot (set status to 'blocked')
export function useBlockSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { blockSlotAction } = await import("@/app/admin/actions/slots");
      return await blockSlotAction(id, reason);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["slots", variables.id] });
    },
  });
}

// Force cancel a booking
export function useForceCancelSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { forceCancelSlotAction } = await import("@/app/admin/actions/slots");
      return await forceCancelSlotAction(id, note);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["slots", variables.id] });
    },
  });
}

// Create slots in bulk
export function useCreateSlotsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slots: Omit<Slot, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { createSlotsBulkAction } = await import("@/app/admin/actions/slots");
      return await createSlotsBulkAction(slots);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

// ── useSlotsForDate — admin floor-map date-scoped hook ────────────────────────
export function useSlotsForDate(dateStr: string) {
  const queryClient = useQueryClient();
  const { start, end } = localDayRange(dateStr);

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const slotsQuery = useQuery({
    queryKey: ["slots", "date", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slots")
        .select("*")
        .gte("start_time", start)
        .lte("start_time", end)
        .order("start_time");
      if (error) throw error;
      return data as Slot[];
    },
    enabled: !!dateStr,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`slots-date-${dateStr}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "slots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["slots", "date", dateStr] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, dateStr]);

  return {
    slots: slotsQuery.data ?? [],
    services: servicesQuery.data ?? [],
    isLoading: slotsQuery.isLoading || servicesQuery.isLoading,
    error: slotsQuery.error ?? servicesQuery.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["slots", "date", dateStr] }),
  };
}

// ── useDeleteSlot — hard-delete a single slot ─────────────────────────────────
export function useDeleteSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteSlotAction } = await import("@/app/admin/actions/slots");
      await deleteSlotAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

// ── useDeleteSlotsByDate — delete all slots for a service on a date ───────────
export function useDeleteSlotsByDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ serviceId, dateStr }: { serviceId: string; dateStr: string }) => {
      const { deleteSlotsByDateAction } = await import("@/app/admin/actions/slots");
      await deleteSlotsByDateAction(serviceId, dateStr);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}