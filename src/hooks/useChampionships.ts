"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useChampionships() {
  return useQuery({
    queryKey: ["championships"],
    queryFn: async () => {
      const { getChampionshipsAction } = await import("@/app/admin/actions/championships");
      return getChampionshipsAction();
    },
  });
}

export function useChampionship(id: string) {
  return useQuery({
    queryKey: ["championships", id],
    queryFn: async () => {
      const { getChampionshipAction } = await import("@/app/admin/actions/championships");
      return getChampionshipAction(id);
    },
    enabled: !!id,
  });
}

export function useActiveChampionships() {
  return useQuery({
    queryKey: ["championships", "active"],
    queryFn: async () => {
      const { getActiveChampionshipsAction } = await import("@/app/admin/actions/championships");
      return getActiveChampionshipsAction();
    },
  });
}

export function useChampionshipParticipants(championshipId: string) {
  return useQuery({
    queryKey: ["championship-participants", championshipId],
    queryFn: async () => {
      const { getChampionshipParticipantsAction } = await import("@/app/admin/actions/championships");
      return getChampionshipParticipantsAction(championshipId);
    },
    enabled: !!championshipId,
  });
}

export function useChampionshipMatches(championshipId: string) {
  return useQuery({
    queryKey: ["championship-matches", championshipId],
    queryFn: async () => {
      const { getChampionshipMatchesAction } = await import("@/app/admin/actions/championships");
      return getChampionshipMatchesAction(championshipId);
    },
    enabled: !!championshipId,
  });
}

export function useCreateChampionship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: any) => {
      const { createChampionshipAction } = await import("@/app/admin/actions/championships");
      return createChampionshipAction(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championships"] });
    },
  });
}

export function useUpdateChampionship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: any) => {
      const { updateChampionshipAction } = await import("@/app/admin/actions/championships");
      return updateChampionshipAction(id, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championships"] });
    },
  });
}

export function useDeleteChampionship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { deleteChampionshipAction } = await import("@/app/admin/actions/championships");
      return deleteChampionshipAction(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championships"] });
    },
  });
}

export function useGenerateBracket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (championshipId: string) => {
      const { generateBracketAction } = await import("@/app/admin/actions/championships");
      return generateBracketAction(championshipId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championship-matches"] });
      qc.invalidateQueries({ queryKey: ["championships"] });
    },
  });
}

export function useUpdateMatchResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, ...data }: any) => {
      const { updateMatchResultAction } = await import("@/app/admin/actions/championships");
      return updateMatchResultAction(matchId, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championship-matches"] });
    },
  });
}

export function useDeleteChampionshipMatches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (championshipId: string) => {
      const { deleteChampionshipMatchesAction } = await import("@/app/admin/actions/championships");
      return deleteChampionshipMatchesAction(championshipId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["championship-matches"] });
      qc.invalidateQueries({ queryKey: ["championships"] });
    },
  });
}