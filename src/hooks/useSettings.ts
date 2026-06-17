"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, type Setting } from "@/lib/supabase";

// ── Fetch all settings ───────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;
      // Supabase stores JSONB; coerce value to boolean
      return (data as Array<{
        key: string;
        value: unknown;
        label: string | null;
        description: string | null;
        updated_at: string;
      }>).map((row) => ({
        ...row,
        value: row.value === true || row.value === "true",
        label: row.label ?? row.key,
        description: row.description ?? "",
      })) as Setting[];
    },
  });
}

// ── Update a single setting ──────────────────────────────────────────────────
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { updateSettingAction } = await import("@/app/admin/actions/settings");
      return await updateSettingAction(key, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
