"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase, type Transaction } from "@/lib/supabase";
import { type CartItem } from "@/lib/pricing";

interface TransactionWithAnalysis extends Transaction {
  items_parsed?: CartItem[];
  category_breakdown: {
    services: number;
    inventory: number;
  };
}

// ── Parse a raw transaction into analysis shape ──────────────────────────────
function parseTransaction(transaction: Transaction): TransactionWithAnalysis {
  const items = (transaction.items_json as CartItem[]) || [];

  let servicesTotal = 0;
  let inventoryTotal = 0;

  items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    if (item.type === "service") {
      servicesTotal += itemTotal;
    } else {
      inventoryTotal += itemTotal;
    }
  });

  return {
    ...transaction,
    items_parsed: items,
    category_breakdown: {
      services: servicesTotal,
      inventory: inventoryTotal,
    },
  };
}

// ── Transactions for a single day (used by settlement) ───────────────────────
export function useTransactionsData(date: Date = new Date()) {
  // Use local midnight to avoid timezone off-by-one
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return useQuery({
    queryKey: ["transactions", dateStr],
    queryFn: async () => {
      const startOfDay = new Date(`${dateStr}T00:00:00`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999`);

      const { adminGetTransactionsAction } = await import("@/app/admin/actions/transactions");
      const data = await adminGetTransactionsAction({
        dateFrom: dateStr,
        dateTo: dateStr,
      });

      return data.map(parseTransaction);
    },
  });
}

// ── All transactions with optional filters (used by /admin/transactions) ─────
export interface TransactionFilters {
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  paymentMethod?: "cash" | "upi" | "razorpay" | "all";
  status?: "paid" | "refunded" | "pending" | "all";
}

export function useAllTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ["transactions", "all", filters],
    queryFn: async () => {
      const { adminGetTransactionsAction } = await import("@/app/admin/actions/transactions");
      const data = await adminGetTransactionsAction(filters);
      return data.map(parseTransaction);
    },
  });
}

// ── Settlement report derived from single-day data ───────────────────────────
export function useSettlementReport(date: Date = new Date()) {
  const { data: transactions = [], isLoading, error } = useTransactionsData(date);

  // Gross revenue = sum of all transaction amounts
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // Payment split — three buckets
  const paymentSplit = transactions.reduce(
    (split, t) => {
      // Check for split_payment metadata
      const items = (t.items_json as any[]) || [];
      const splitInfo = items.find(i => i.type === "split_payment");
      
      if (splitInfo) {
        split.cash += splitInfo.cash || 0;
        split.upi += splitInfo.upi || 0;
      } else {
        const amt = Number(t.amount);
        if (t.payment_method === "cash") {
          split.cash += amt;
        } else if (t.payment_method === "razorpay") {
          split.razorpay += amt;
        } else {
          split.upi += amt;
        }
      }
      return split;
    },
    { cash: 0, upi: 0, razorpay: 0 }
  );

  // Online total = upi + razorpay (money that landed in bank)
  const onlineTotal = paymentSplit.upi + paymentSplit.razorpay;

  const categoryBreakdown = transactions.reduce(
    (breakdown, t) => {
      breakdown.services += t.category_breakdown?.services || 0;
      breakdown.inventory += t.category_breakdown?.inventory || 0;
      return breakdown;
    },
    { services: 0, inventory: 0 }
  );

  // Hourly transaction count
  const hourlyTransactions = transactions.reduce((hourly, t) => {
    const hour = new Date(t.created_at).getHours();
    hourly[hour] = (hourly[hour] || 0) + 1;
    return hourly;
  }, {} as Record<number, number>);

  // Average transaction value
  const avgTransactionValue =
    transactions.length > 0 ? totalRevenue / transactions.length : 0;

  return {
    transactions,
    isLoading,
    error,
    totals: {
      revenue: totalRevenue,
      transactionCount: transactions.length,
      avgTransactionValue,
    },
    paymentSplit,
    onlineTotal,
    categoryBreakdown,
    hourlyTransactions,
  };
}