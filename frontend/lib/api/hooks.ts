"use client";

/**
 * TanStack Query Hooks for RAILNET-AI API endpoints.
 *
 * Problem Statement: SIH26027 · Ministry of Railways
 * Source of Truth: frontend/prd.md Section 7
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

// Convenient type aliases derived strictly from generated OpenAPI schema
export type Train = components["schemas"]["TrainOut"];
export type Section = components["schemas"]["SectionOut"];
export type MaintenanceJob = components["schemas"]["MaintenanceJobOut"];
export type OptimizerRunSummary = components["schemas"]["OptimizerRunSummary"];
export type Assignment = components["schemas"]["Assignment"];
export type PlanItem = components["schemas"]["PlanItemOut"];
export type BlockExplain = components["schemas"]["BlockExplainOut"];
export type BenchmarkReport = components["schemas"]["BenchmarkReport"];

export const queryKeys = {
  health: ["health"] as const,
  trains: (skip?: number, limit?: number) => ["trains", { skip, limit }] as const,
  sections: ["sections"] as const,
  maintenanceJobs: (dept?: string) => ["maintenance-jobs", { dept }] as const,
  blockDetail: (id: string) => ["block", id] as const,
  blockExplain: (id: string) => ["block-explain", id] as const,
  weeklyPlan: ["plans", "weekly"] as const,
  monthlyPlan: ["plans", "monthly"] as const,
  benchmarkReport: ["benchmark-report"] as const,
};

/**
 * Hook to fetch trains from RailRadar live schedules.
 * Note: The backend /api/trains endpoint returns a paginated array (max limit 200)
 * without a total count wrapper. Callers should handle pagination or present
 * the slice honestly.
 */
export function useTrains(skip = 0, limit = 200) {
  return useQuery({
    queryKey: queryKeys.trains(skip, limit),
    queryFn: () => apiClient.get<Train[]>("/api/trains", { params: { skip, limit } }),
  });
}

/**
 * Hook to fetch all corridor sections.
 */
export function useSections() {
  return useQuery({
    queryKey: queryKeys.sections,
    queryFn: () => apiClient.get<Section[]>("/api/sections"),
  });
}

/**
 * Hook to fetch maintenance jobs, optionally filtered by department (TMS, SMMS, TDMS).
 */
export function useMaintenanceJobs(department?: string) {
  return useQuery({
    queryKey: queryKeys.maintenanceJobs(department),
    queryFn: () =>
      apiClient.get<MaintenanceJob[]>("/api/maintenance-jobs", {
        params: department ? { department } : undefined,
      }),
  });
}

/**
 * Hook to trigger the CP-SAT Optimizer.
 * Calls POST /api/blocks/optimize synchronously and invalidates maintenance jobs and plans on success.
 */
export function useRunOptimizer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<OptimizerRunSummary>("/api/blocks/optimize"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

/**
 * Hook to fetch 7-day rolling weekly maintenance block plan (FR7.1).
 */
export function useWeeklyPlan() {
  return useQuery({
    queryKey: queryKeys.weeklyPlan,
    queryFn: () => apiClient.get<PlanItem[]>("/api/plans/weekly"),
  });
}

/**
 * Hook to fetch 30-day rolling monthly maintenance block plan (FR7.2).
 */
export function useMonthlyPlan() {
  return useQuery({
    queryKey: queryKeys.monthlyPlan,
    queryFn: () => apiClient.get<PlanItem[]>("/api/plans/monthly"),
  });
}

/**
 * Hook to fetch explainability details for a scheduled block (FR6.1).
 * Resolves either block_id (BLK-JOB-*) or job_id (JOB-*).
 */
export function useBlockExplain(id: string) {
  const effectiveId = id.startsWith("JOB-") ? `BLK-${id}` : id;
  return useQuery({
    queryKey: queryKeys.blockExplain(effectiveId),
    queryFn: () => apiClient.get<BlockExplain>(`/api/blocks/${effectiveId}/explain`),
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch defensible benchmarking report (PRD Section 13).
 * Compares CP-SAT against FCFS and EDD baselines.
 */
export function useBenchmarkReport() {
  return useQuery({
    queryKey: queryKeys.benchmarkReport,
    queryFn: () => apiClient.get<BenchmarkReport>("/api/blocks/benchmark"),
  });
}


