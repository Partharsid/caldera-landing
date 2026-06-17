"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { addDays, subDays } from "date-fns";

export interface RevenueDataPoint {
  date: string; // YYYY-MM-DD (local IST date)
  revenue: number;
  transactionCount: number;
  cashRevenue: number;
  upiRevenue: number;
  razorpayRevenue: number;
}

// Helper: convert a JS Date to a local YYYY-MM-DD string (IST-safe)
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchRevenueTrend(days: number): Promise<RevenueDataPoint[]> {
  const now = new Date();
  const startDate = subDays(now, days);

  // Build local midnight boundaries to avoid UTC off-by-one
  const startStr = `${toLocalDateStr(startDate)}T00:00:00`;

  const { adminGetRevenueTrendTransactionsAction } = await import("@/app/admin/actions/transactions");
  const data = await adminGetRevenueTrendTransactionsAction(
    new Date(startStr).toISOString(),
    now.toISOString()
  );

  // Group by LOCAL date (not UTC) — critical for IST correctness
  const grouped: Record<
    string,
    { revenue: number; count: number; cash: number; upi: number; razorpay: number }
  > = {};

  data.forEach((tx) => {
    // Use local date string — new Date().toLocaleDateString produces locale-specific output,
    // so we build it manually to get YYYY-MM-DD
    const d = new Date(tx.created_at);
    const dateKey = toLocalDateStr(d);

    if (!grouped[dateKey]) {
      grouped[dateKey] = { revenue: 0, count: 0, cash: 0, upi: 0, razorpay: 0 };
    }

    const amt = Number(tx.amount);
    grouped[dateKey].revenue += amt;
    grouped[dateKey].count += 1;

    const items = (tx.items_json as any[]) || [];
    const splitInfo = items.find(i => i.type === "split_payment");
    
    if (splitInfo) {
      grouped[dateKey].cash += splitInfo.cash || 0;
      grouped[dateKey].upi += splitInfo.upi || 0;
    } else {
      if (tx.payment_method === "cash") grouped[dateKey].cash += amt;
      else if (tx.payment_method === "razorpay") grouped[dateKey].razorpay += amt;
      else grouped[dateKey].upi += amt;
    }
  });

  // Build dense date array filling zero-revenue days
  const result: RevenueDataPoint[] = [];
  let cur = new Date(startDate);

  while (cur <= now) {
    const dateKey = toLocalDateStr(cur);
    const day = grouped[dateKey] || { revenue: 0, count: 0, cash: 0, upi: 0, razorpay: 0 };

    result.push({
      date: dateKey,
      revenue: day.revenue,
      transactionCount: day.count,
      cashRevenue: day.cash,
      upiRevenue: day.upi,
      razorpayRevenue: day.razorpay,
    });

    cur = addDays(cur, 1);
  }

  return result;
}

export function useRevenueTrend(days: number = 30) {
  return useQuery({
    queryKey: ["revenue-trend", days],
    queryFn: () => fetchRevenueTrend(days),
    refetchInterval: 300_000, // 5 minutes
  });
}