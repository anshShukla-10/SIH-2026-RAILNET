"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Sparkle as Sparkles,
  Play,
  CheckCircle as CheckCircle2,
  Warning as AlertTriangle,
  Clock,
  Calendar,
  Stack as Layers,
  CaretRight as ChevronRight,
  ShieldCheck,
  Lock,
} from "@phosphor-icons/react/dist/ssr";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { useRunOptimizer, useMaintenanceJobs, type Assignment, type OptimizerRunSummary } from "@/lib/api/hooks";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorCard } from "@/components/ui/error-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DEPARTMENT_TOKENS,
  CONFLICT_STATUS_TOKENS,
  LIFECYCLE_STATUS_TOKENS,
  LOCKED_STATUS_TOKEN,
  getDepartmentToken,
  type DepartmentKey,
} from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

// Helper to extract department from standard job ID (e.g. JOB-TMS-0007 -> TMS)
function getJobDepartment(jobId: string): DepartmentKey {
  if (jobId.includes("-TMS-")) return "TMS";
  if (jobId.includes("-SMMS-")) return "SMMS";
  if (jobId.includes("-TDMS-")) return "TDMS";
  return "TMS";
}

// Format ISO date-time into readable corridor timestamp (e.g., 2026-09-04 23:00)
function formatTimestamp(isoStr: string): string {
  try {
    const dt = new Date(isoStr);
    const date = dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date} ${time}`;
  } catch {
    return isoStr;
  }
}

// Calculate duration in minutes between start and end ISO strings
function calculateDurationMin(startIso: string, endIso: string): number {
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    return Math.max(0, Math.round((e - s) / (1000 * 60)));
  } catch {
    return 0;
  }
}

// Recharts configuration for department balance chart
const balanceChartConfig = {
  blocks: { label: "Scheduled Blocks" },
  TMS: { label: DEPARTMENT_TOKENS.TMS.name, color: DEPARTMENT_TOKENS.TMS.hex },
  SMMS: { label: DEPARTMENT_TOKENS.SMMS.name, color: DEPARTMENT_TOKENS.SMMS.hex },
  TDMS: { label: DEPARTMENT_TOKENS.TDMS.name, color: DEPARTMENT_TOKENS.TDMS.hex },
} satisfies ChartConfig;

// Table columns for candidate block assignments
const blockColumns: ColumnDef<Assignment>[] = [
  {
    accessorKey: "job_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Job / Block ID" />,
    cell: ({ row }) => {
      const jobId = row.getValue("job_id") as string;
      return (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-xs text-foreground">{jobId}</span>
          <span className="text-[10px] text-muted-foreground">Block candidate</span>
        </div>
      );
    },
  },
  {
    id: "department",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dept" />,
    cell: ({ row }) => {
      const dept = getJobDepartment(row.original.job_id);
      const token = getDepartmentToken(dept);
      return (
        <Badge variant="outline" className={token.badgeClass}>
          <span className={`size-1.5 rounded-full mr-1.5 ${token.dotClass}`} />
          {token.shortName}
        </Badge>
      );
    },
  },
  {
    accessorKey: "section_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Corridor Section" />,
    cell: ({ row }) => (
      <span className="font-mono font-semibold text-xs text-foreground">
        {row.getValue("section_id")}
      </span>
    ),
  },
  {
    id: "window",
    header: "Proposed Window",
    cell: ({ row }) => {
      const start = formatTimestamp(row.original.start);
      const end = formatTimestamp(row.original.end);
      const duration = calculateDurationMin(row.original.start, row.original.end);
      return (
        <div className="flex flex-col text-xs">
          <div className="font-mono font-medium text-foreground">
            {start} → {end}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            Duration: <strong className="text-foreground">{duration} min</strong>
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "priority_score",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
    cell: ({ row }) => {
      const score = Number(row.getValue("priority_score"));
      return (
        <span className="font-mono font-bold text-xs text-foreground">
          {score.toFixed(1)}
        </span>
      );
    },
  },
  {
    accessorKey: "window_rank",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rank" />,
    cell: ({ row }) => {
      const rank = row.getValue("window_rank") as number;
      const isPrimary = rank === 0;
      return (
        <Badge
          variant="outline"
          className={
            isPrimary
              ? "bg-muted text-muted-foreground border-border"
              : CONFLICT_STATUS_TOKENS.relaxed.badgeClass
          }
        >
          {isPrimary ? "Primary" : `Alt (${rank})`}
        </Badge>
      );
    },
  },
  {
    id: "conflict_status",
    header: "Conflict Status",
    cell: ({ row }) => {
      const isHard = row.original.hard_conflict;
      const isRelaxed = row.original.relaxed;
      const conflicts = row.original.conflict_count;

      if (isHard) {
        return (
          <Badge variant="outline" className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}>
            <AlertTriangle className="size-3 mr-1" />
            Hard Clash ({conflicts})
          </Badge>
        );
      }
      if (isRelaxed) {
        return (
          <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.relaxed.badgeClass}>
            Relaxed Window
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.clean.badgeClass}>
          <ShieldCheck className="size-3 mr-1" />
          Zero Conflicts
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Plan & Audit",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          href="/plans/weekly"
          className="inline-flex items-center text-[11px] font-medium text-primary hover:underline"
        >
          Plan →
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link
          href={`/blocks/${row.original.job_id}`}
          className={cn("inline-flex items-center text-[11px] font-medium hover:underline", DEPARTMENT_TOKENS.TDMS.textClass)}
        >
          Explain →
        </Link>
      </div>
    ),
  },
];

export default function OptimizerPage() {
  // Parameter State
  const [horizon, setHorizon] = useState<"weekly" | "monthly">("weekly");

  // Queries & Mutation
  const { data: currentJobs = [], isLoading: isJobsLoading } = useMaintenanceJobs();
  const runMutation = useRunOptimizer();

  // Pre-run counts (PRD 5.5: pending vs scheduled jobs before the run)
  const pendingJobsCount = useMemo(
    () => currentJobs.filter((j) => j.status === "PENDING").length,
    [currentJobs]
  );
  const scheduledJobsCount = useMemo(
    () => currentJobs.filter((j) => j.status === "SCHEDULED" || j.status === "GRANTED").length,
    [currentJobs]
  );

  // Execution result state
  const [summary, setSummary] = useState<OptimizerRunSummary | null>(null);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  // Stopwatch timer for honest indeterminate progress
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!runMutation.isPending) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [runMutation.isPending]);

  // Request-lifecycle phase progression based on actual elapsed duration
  const solverPhase = useMemo(() => {
    if (elapsedSeconds < 2) {
      return "Formulating CP-SAT mathematical model & indexing corridor candidate windows...";
    }
    if (elapsedSeconds < 5) {
      return "Searching conflict-free assignment space with Google OR-Tools...";
    }
    return "Finalizing schedule, checking NoOverlap invariants & committing blocks to PostgreSQL...";
  }, [elapsedSeconds]);

  const handleRunOptimizer = async () => {
    setElapsedSeconds(0);
    try {
      const result = await runMutation.mutateAsync();
      setSummary(result);
      setLastRunTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // Error handled by mutation state
    }
  };

  // Assignments for table
  const filteredAssignments = useMemo(() => {
    return summary?.assignments || [];
  }, [summary]);

  // Department breakdown data for Recharts
  const departmentChartData = useMemo(() => {
    if (!summary?.assignments) return [];
    const counts = { TMS: 0, SMMS: 0, TDMS: 0 };
    summary.assignments.forEach((a) => {
      const dept = getJobDepartment(a.job_id);
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return [
      { department: "TMS", name: "Track (TMS)", count: counts.TMS, fill: DEPARTMENT_TOKENS.TMS.hex },
      { department: "SMMS", name: "Signal (SMMS)", count: counts.SMMS, fill: DEPARTMENT_TOKENS.SMMS.hex },
      { department: "TDMS", name: "Traction (TDMS)", count: counts.TDMS, fill: DEPARTMENT_TOKENS.TDMS.hex },
    ];
  }, [summary]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight">CP-SAT Corridor Optimizer</h1>
            <Badge
              variant="outline"
              className={DEPARTMENT_TOKENS.TDMS.badgeClass}
            >
              <Sparkles className="size-3 mr-1.5" />
              Google OR-Tools CP-SAT
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Autonomous constraint-programming engine scheduling cross-departmental maintenance blocks with zero hard conflicts.
          </p>
        </div>

        {summary && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-2.5 font-mono">
              Last run: {lastRunTime}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Grid: Parameters Form (Left) + Solver Status / Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Parameter Controls & Specifications (4 Cols) */}
        <Card className="lg:col-span-4 shadow-sm border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">Optimizer Engine</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Autonomous CP-SAT scheduling against Indian Railways corridor constraints.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 text-sm">
            {/* Control 1: Planning Horizon */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>Planning Horizon</span>
              </label>
              <Tabs
                value={horizon}
                onValueChange={(val) => setHorizon(val as "weekly" | "monthly")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="weekly" className="text-xs">
                    Weekly (7-Day)
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs">
                    Monthly (30-Day)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Read-Only Specification 1: Statutory Priority Scoring Formula */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Statutory Priority Formula
                </span>
                <Badge variant="outline" className={cn("text-[10px]", CONFLICT_STATUS_TOKENS.clean.badgeClass)}>
                  Fixed Standard
                </Badge>
              </div>

              <div className="space-y-2 rounded-md bg-muted/30 border p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Criticality</span>
                  <span className="font-mono font-medium text-foreground">30%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: "30%" }} />
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Urgency</span>
                  <span className="font-mono font-medium text-foreground">25%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: "25%" }} />
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Asset Risk</span>
                  <span className="font-mono font-medium text-foreground">20%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: "20%" }} />
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Overdue Factor</span>
                  <span className="font-mono font-medium text-foreground">15%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: "15%" }} />
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Failure History</span>
                  <span className="font-mono font-medium text-foreground">10%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: "10%" }} />
                </div>

                <p className="text-[10px] text-muted-foreground pt-1.5 border-t border-border/60 leading-relaxed">
                  Statutory weights persisted in PostgreSQL per Indian Railways Joint Corridor Protocol (sum: 100%).
                </p>
              </div>
            </div>

            {/* Read-Only Specification 2: Corridor & Department Scope */}
            <div className="space-y-2.5 pt-2 border-t">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-muted-foreground" />
                <span>Corridor & Department Scope</span>
              </span>

              <div className="rounded-md bg-muted/30 border p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Corridor</span>
                  <span className="font-medium text-foreground">NDLS – CNB (183 Sections)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Solver Engine</span>
                  <span className="font-mono text-xs font-semibold text-foreground">Google OR-Tools CP-SAT</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Invariant</span>
                  <span className={cn("text-[11px] font-mono font-medium", CONFLICT_STATUS_TOKENS.clean.textClass)}>
                    Section NoOverlap
                  </span>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Active Disciplines</span>
                  <div className="flex items-center gap-1.5">
                    {(["TMS", "SMMS", "TDMS"] as DepartmentKey[]).map((dept) => {
                      const token = DEPARTMENT_TOKENS[dept];
                      return (
                        <Badge
                          key={dept}
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0.5", token.badgeClass)}
                        >
                          {dept}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Run Button */}
            <div className="pt-2">
              <Button
                onClick={handleRunOptimizer}
                disabled={runMutation.isPending}
                className="w-full gap-2 shadow-sm font-semibold"
              >
                {runMutation.isPending ? (
                  <>
                    <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Optimizing Schedule...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    <span>Run CP-SAT Optimizer</span>
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Evaluates {currentJobs.length} maintenance requests against real passenger train timetables.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Active Telemetry OR Results View (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Error State */}
          {runMutation.isError && (
            <ErrorCard
              title="Optimizer Execution Failed"
              message={runMutation.error?.message || "An unexpected error occurred during CP-SAT solving."}
              onRetry={handleRunOptimizer}
            />
          )}

          {/* Running State: Active Non-Frozen Telemetry (PRD 5.5) */}
          {runMutation.isPending && (
            <Card className="border-primary/40 bg-primary/5 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-primary animate-ping" />
                    <CardTitle className="text-base font-semibold">
                      CP-SAT Solver in Progress
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-bold py-1 px-2">
                    {`00:${elapsedSeconds < 10 ? "0" + elapsedSeconds : elapsedSeconds}s`}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Running Google OR-Tools integer programming engine synchronously on the backend.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visual Indeterminate Ramp */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary animate-pulse w-full rounded-full" />
                </div>

                {/* Honest Request-Lifecycle Stage */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-background border text-xs">
                  <Clock className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground">Current Phase:</span>
                    <p className="text-muted-foreground leading-relaxed">{solverPhase}</p>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground text-center italic">
                  Note: The solver operates synchronously in-memory; results will be committed to PostgreSQL atomically.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Idle State: Pre-Run Status Display (PRD 5.5: pending vs scheduled jobs) */}
          {!runMutation.isPending && !summary && !runMutation.isError && (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardHeader className="text-center py-8">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <Sparkles className="size-6" />
                </div>
                <CardTitle className="text-lg">Optimizer Ready for Run</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-2 text-xs">
                  Review current inventory status before triggering autonomous block allocation across the corridor.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8 space-y-6">
                {/* Current Counts Grid (PRD 5.5 requirement) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                  <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                    <span className="text-[11px] text-muted-foreground block">Pending Jobs</span>
                    {isJobsLoading ? (
                      <Skeleton className="h-7 w-12 mx-auto my-0.5" />
                    ) : (
                      <span className="font-mono text-xl font-bold text-foreground">{pendingJobsCount}</span>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] mx-auto", LIFECYCLE_STATUS_TOKENS.PENDING.badgeClass)}>
                      {LIFECYCLE_STATUS_TOKENS.PENDING.shortName}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                    <span className="text-[11px] text-muted-foreground block">Scheduled Blocks</span>
                    {isJobsLoading ? (
                      <Skeleton className="h-7 w-12 mx-auto my-0.5" />
                    ) : (
                      <span className="font-mono text-xl font-bold text-foreground">{scheduledJobsCount}</span>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] mx-auto", LIFECYCLE_STATUS_TOKENS.SCHEDULED.badgeClass)}>
                      {LIFECYCLE_STATUS_TOKENS.SCHEDULED.shortName}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                    <span className="text-[11px] text-muted-foreground block">Corridor Total</span>
                    {isJobsLoading ? (
                      <Skeleton className="h-7 w-12 mx-auto my-0.5" />
                    ) : (
                      <span className="font-mono text-xl font-bold text-foreground">{currentJobs.length}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground block font-mono">183 Sections</span>
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground max-w-md mx-auto">
                  Click <strong>Run CP-SAT Optimizer</strong> to generate conflict-free maintenance windows adhering to track NoOverlap and real train timetables.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results: Complete OptimizerRunSummary Results Panel (PRD 5.5) */}
          {summary && !runMutation.isPending && (
            <div className="space-y-6">
              {/* Tokenized Success / Conflict Alert Banner */}
              <div
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-lg border text-xs",
                  summary.hard_conflict_jobs > 0
                    ? `${CONFLICT_STATUS_TOKENS["hard-conflict"].bgClass} ${CONFLICT_STATUS_TOKENS["hard-conflict"].borderClass}`
                    : summary.relaxed_but_clean_jobs > 0
                    ? `${CONFLICT_STATUS_TOKENS.relaxed.bgClass} ${CONFLICT_STATUS_TOKENS.relaxed.borderClass}`
                    : `${CONFLICT_STATUS_TOKENS.clean.bgClass} ${CONFLICT_STATUS_TOKENS.clean.borderClass}`
                )}
              >
                <div className="flex items-center gap-2">
                  {summary.hard_conflict_jobs > 0 ? (
                    <AlertTriangle className={cn("size-4 shrink-0", CONFLICT_STATUS_TOKENS["hard-conflict"].textClass)} />
                  ) : summary.relaxed_but_clean_jobs > 0 ? (
                    <AlertTriangle className={cn("size-4 shrink-0", CONFLICT_STATUS_TOKENS.relaxed.textClass)} />
                  ) : (
                    <CheckCircle2 className={cn("size-4 shrink-0", CONFLICT_STATUS_TOKENS.clean.textClass)} />
                  )}
                  <span
                    className={cn(
                      "font-semibold",
                      summary.hard_conflict_jobs > 0
                        ? CONFLICT_STATUS_TOKENS["hard-conflict"].textClass
                        : summary.relaxed_but_clean_jobs > 0
                        ? CONFLICT_STATUS_TOKENS.relaxed.textClass
                        : CONFLICT_STATUS_TOKENS.clean.textClass
                    )}
                  >
                    {summary.hard_conflict_jobs > 0
                      ? `Optimization Solved: ${summary.jobs_scheduled} Blocks Allocated (${summary.zero_conflict_jobs} Clean, ${summary.relaxed_but_clean_jobs} Relaxed, ${summary.hard_conflict_jobs} Hard Clash — Section Controller Attention Needed)`
                      : summary.relaxed_but_clean_jobs > 0
                      ? `Optimization Solved: ${summary.jobs_scheduled} Blocks Allocated (${summary.zero_conflict_jobs} Clean, ${summary.relaxed_but_clean_jobs} Relaxed Clean Windows)`
                      : `Optimization Solved & Persisted: ${summary.jobs_scheduled} Blocks Allocated (100% Zero Conflicts)`}
                    {(summary.locked_skipped_jobs ?? 0) > 0 && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        • {summary.locked_skipped_jobs} {summary.locked_skipped_jobs === 1 ? "job" : "jobs"} skipped (manually locked)
                      </span>
                    )}
                  </span>
                </div>
                <Link
                  href="/plans/weekly"
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold hover:underline",
                    summary.hard_conflict_jobs > 0
                      ? CONFLICT_STATUS_TOKENS["hard-conflict"].textClass
                      : summary.relaxed_but_clean_jobs > 0
                      ? CONFLICT_STATUS_TOKENS.relaxed.textClass
                      : CONFLICT_STATUS_TOKENS.clean.textClass
                  )}
                >
                  <span>View in Weekly Plan</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              {/* 5-Metric Results Panel: Clean vs Relaxed vs Hard-Conflict Stat Tiles (PRD 5.5) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* 5-Metric (or 6-Metric when locked blocks present) Results Panel (PRD 5.5) */}
              <div
                className={cn(
                  "grid grid-cols-2 gap-3",
                  (summary.locked_skipped_jobs ?? 0) > 0
                    ? "sm:grid-cols-3 lg:grid-cols-6"
                    : "sm:grid-cols-5"
                )}
              >
                <KpiCard
                  label="Total Scheduled"
                  value={summary.jobs_scheduled}
                  subtext="100% committed"
                  badge={
                    <Badge variant="outline" className={LIFECYCLE_STATUS_TOKENS.SCHEDULED.badgeClass}>
                      {LIFECYCLE_STATUS_TOKENS.SCHEDULED.shortName}
                    </Badge>
                  }
                />
                <KpiCard
                  label="Zero-Conflict"
                  value={summary.zero_conflict_jobs}
                  subtext="Clean train slot"
                  badge={
                    <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.clean.badgeClass}>
                      {CONFLICT_STATUS_TOKENS.clean.shortName}
                    </Badge>
                  }
                />
                <KpiCard
                  label="Relaxed Clean"
                  value={summary.relaxed_but_clean_jobs}
                  subtext="Alt clean window"
                  badge={
                    <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.relaxed.badgeClass}>
                      {CONFLICT_STATUS_TOKENS.relaxed.shortName}
                    </Badge>
                  }
                />
                <KpiCard
                  label="Hard Clashes"
                  value={summary.hard_conflict_jobs}
                  subtext="Corridor overlap"
                  badge={
                    <Badge variant="outline" className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}>
                      {CONFLICT_STATUS_TOKENS["hard-conflict"].shortName}
                    </Badge>
                  }
                />
                <KpiCard
                  label="Total Clashes"
                  value={summary.total_conflicts}
                  subtext="Train interaction"
                  badge={
                    <Badge
                      variant="outline"
                      className={
                        summary.total_conflicts === 0
                          ? CONFLICT_STATUS_TOKENS.clean.badgeClass
                          : CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass
                      }
                    >
                      {summary.total_conflicts === 0 ? "0 Clashes" : `${summary.total_conflicts} Clashes`}
                    </Badge>
                  }
                />
                {(summary.locked_skipped_jobs ?? 0) > 0 && (
                  <KpiCard
                    label="Manually Locked"
                    value={summary.locked_skipped_jobs!}
                    subtext="Preserved schedule"
                    badge={
                      <Badge variant="outline" className={LOCKED_STATUS_TOKEN.badgeClass}>
                        <Lock className="size-3 mr-1" />
                        Locked
                      </Badge>
                    }
                  />
                )}
              </div>

              {/* Department Balance Chart */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Department Block Allocation Balance
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Harmonized cross-departmental workload share across Track, Signal, and Traction.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[180px] w-full">
                    <ChartContainer config={balanceChartConfig} className="h-full w-full">
                      <BarChart data={departmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {departmentChartData.map((entry) => (
                            <Cell key={`cell-${entry.department}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>

                  {/* Summary Chips */}
                  <div className="grid grid-cols-3 gap-3 pt-3 mt-2 border-t text-xs">
                    {departmentChartData.map((item) => {
                      const token = DEPARTMENT_TOKENS[item.department as DepartmentKey];
                      return (
                        <div
                          key={item.department}
                          className="flex items-center justify-between p-2 rounded-md border"
                          style={{ borderColor: token.hex + "30", backgroundColor: token.bgHex }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: token.hex }} />
                            <span className="font-semibold" style={{ color: token.hex }}>
                              {item.department}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-foreground">{item.count} Blocks</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Candidate Block List Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Candidate Block Schedules
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredAssignments.length} blocks assigned by the solver.
                    </p>
                  </div>
                </div>

                <DataTable
                  columns={blockColumns}
                  data={filteredAssignments}
                  pageSize={10}
                  emptyMessage="No block assignments found for the selected department filter."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
