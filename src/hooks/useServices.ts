"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Service } from "@/lib/supabase";

// Fetch all services
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
  });
}

// Fetch single service
export function useService(id: string) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Service;
    },
    enabled: !!id,
  });
}

// Create service
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: Omit<Service, "id" | "created_at" | "updated_at">) => {
      const { createServiceAction } = await import("@/app/admin/actions/services");
      return await createServiceAction(service);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

// Update service
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Service> }) => {
      const { updateServiceAction } = await import("@/app/admin/actions/services");
      return await updateServiceAction(id, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", variables.id] });
    },
  });
}

// Delete service
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteServiceAction } = await import("@/app/admin/actions/services");
      return await deleteServiceAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

// Update prices (base_price and peak_price)
export function useUpdateServicePrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      base_price,
      peak_price
    }: {
      id: string;
      base_price: number;
      peak_price: number;
    }) => {
      const { updateServicePricesAction } = await import("@/app/admin/actions/services");
      return await updateServicePricesAction(id, base_price, peak_price);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", variables.id] });
    },
  });
}