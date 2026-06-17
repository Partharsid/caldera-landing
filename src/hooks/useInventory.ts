"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Inventory } from "@/lib/supabase";
import {
  createInventoryAction,
  updateInventoryAction,
  deleteInventoryAction,
  updateStockAction,
  getInventoryAction,
  getInventoryItemAction,
} from "@/app/admin/actions/inventory";

// Fetch all inventory items
export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      return await getInventoryAction();
    },
  });
}

// Fetch single inventory item
export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: ["inventory", id],
    queryFn: async () => {
      return await getInventoryItemAction(id);
    },
    enabled: !!id,
  });
}

// Create inventory item
export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<Inventory, "id" | "created_at" | "updated_at">) => {
      return await createInventoryAction(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// Update inventory item
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Inventory> }) => {
      return await updateInventoryAction(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.id] });
    },
  });
}

// Delete inventory item
export function useDeleteInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await deleteInventoryAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// Update stock count (quick action)
export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stock_count }: { id: string; stock_count: number }) => {
      return await updateStockAction(id, stock_count);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.id] });
    },
  });
}