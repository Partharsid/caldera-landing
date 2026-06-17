"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Membership } from "@/lib/supabase";

// ── Fetch all memberships ────────────────────────────────────────────────────
export function useMemberships() {
  return useQuery({
    queryKey: ["memberships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Membership[];
    },
  });
}

// ── Create membership ────────────────────────────────────────────────────────
export function useCreateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      membership: Omit<Membership, "id" | "created_at" | "updated_at">
    ) => {
      const { createMembershipAction } = await import("@/app/admin/actions/memberships");
      return await createMembershipAction(membership);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

// ── Update membership ────────────────────────────────────────────────────────
export function useUpdateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Membership, "id" | "created_at" | "updated_at">>;
    }) => {
      const { updateMembershipAction } = await import("@/app/admin/actions/memberships");
      return await updateMembershipAction(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

// ── Delete membership ────────────────────────────────────────────────────────
export function useDeleteMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteMembershipAction } = await import("@/app/admin/actions/memberships");
      return await deleteMembershipAction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}

// ── Toggle is_active (quick action) ─────────────────────────────────────────
export function useToggleMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { toggleMembershipAction } = await import("@/app/admin/actions/memberships");
      return await toggleMembershipAction(id, is_active);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
  });
}
