"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Helper: local-time date string → ISO range (from useSlots.ts)
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

function yesterdayStr(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Fetch today's revenue: sum of paid transactions for today
async function fetchTodayRevenue() {
  const dateStr = todayStr();
  const { start, end } = localDayRange(dateStr);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("status", "paid")
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) throw error;

  const total = data.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  return total;
}

// Fetch yesterday's revenue: sum of paid transactions for yesterday
async function fetchYesterdayRevenue() {
  const dateStr = yesterdayStr();
  const { start, end } = localDayRange(dateStr);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("status", "paid")
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) throw error;

  const total = data.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  return total;
}

// Fetch active bookings: count of booked slots for today
async function fetchActiveBookings() {
  const dateStr = todayStr();
  const { start, end } = localDayRange(dateStr);

  const { count, error } = await supabase
    .from("slots")
    .select("id", { count: "exact", head: true })
    .eq("status", "booked")
    .gte("start_time", start)
    .lte("start_time", end);

  if (error) throw error;

  return count ?? 0;
}

// Fetch yesterday's bookings: count of booked slots for yesterday
async function fetchYesterdayBookings() {
  const dateStr = yesterdayStr();
  const { start, end } = localDayRange(dateStr);

  const { count, error } = await supabase
    .from("slots")
    .select("id", { count: "exact", head: true })
    .eq("status", "booked")
    .gte("start_time", start)
    .lte("start_time", end);

  if (error) throw error;

  return count ?? 0;
}

// Fetch total inventory items count
async function fetchInventoryCount() {
  const { count, error } = await supabase
    .from("inventory")
    .select("id", { count: "exact", head: true });

  if (error) throw error;

  return count ?? 0;
}

// Fetch active services count
async function fetchActiveServices() {
  const { count, error } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) throw error;

  return count ?? 0;
}

// Fetch active memberships count
async function fetchActiveMemberships() {
  const { count, error } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) throw error;

  return count ?? 0;
}

export function useDashboardMetrics() {
  const revenueQuery = useQuery({
    queryKey: ["dashboard", "revenue", "today"],
    queryFn: fetchTodayRevenue,
    refetchInterval: 60000, // Refetch every minute for real-time updates
  });

  const bookingsQuery = useQuery({
    queryKey: ["dashboard", "bookings", "today"],
    queryFn: fetchActiveBookings,
    refetchInterval: 60000,
  });

  const inventoryQuery = useQuery({
    queryKey: ["dashboard", "inventory", "count"],
    queryFn: fetchInventoryCount,
  });

  const servicesQuery = useQuery({
    queryKey: ["dashboard", "services", "active"],
    queryFn: fetchActiveServices,
  });

  const membershipsQuery = useQuery({
    queryKey: ["dashboard", "memberships", "active"],
    queryFn: fetchActiveMemberships,
  });

  const yesterdayRevenueQuery = useQuery({
    queryKey: ["dashboard", "revenue", "yesterday"],
    queryFn: fetchYesterdayRevenue,
  });

  const yesterdayBookingsQuery = useQuery({
    queryKey: ["dashboard", "bookings", "yesterday"],
    queryFn: fetchYesterdayBookings,
  });

  const isLoading = revenueQuery.isLoading || bookingsQuery.isLoading ||
                    inventoryQuery.isLoading || servicesQuery.isLoading ||
                    membershipsQuery.isLoading;

  const error = revenueQuery.error || bookingsQuery.error ||
                inventoryQuery.error || servicesQuery.error ||
                membershipsQuery.error;

  return {
    todayRevenue: revenueQuery.data ?? 0,
    activeBookings: bookingsQuery.data ?? 0,
    inventoryCount: inventoryQuery.data ?? 0,
    activeServices: servicesQuery.data ?? 0,
    activeMemberships: membershipsQuery.data ?? 0,
    yesterdayRevenue: yesterdayRevenueQuery.data ?? 0,
    yesterdayBookings: yesterdayBookingsQuery.data ?? 0,
    isLoading,
    error,
    refetch: () => {
      revenueQuery.refetch();
      bookingsQuery.refetch();
      inventoryQuery.refetch();
      servicesQuery.refetch();
      membershipsQuery.refetch();
    },
  };
}