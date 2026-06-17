"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Transaction } from "@/lib/supabase";
import { type CartItem } from "@/lib/pricing";
import { calculateCurrentPrice, calculatePriceForDateTime } from "@/lib/pricing";

interface CreateTransactionParams {
  amount: number;
  payment_method: "cash" | "upi" | "razorpay";
  customer_phone?: string;
  customer_name?: string;
  comment?: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  couponCode?: string;
  items: CartItem[];
  splitAmounts?: {
    cash: number;
    upi: number;
  };
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTransactionParams) => {
      const { adminCreateTransactionAction } = await import("@/app/admin/actions/transactions");
      return await adminCreateTransactionAction(params);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}