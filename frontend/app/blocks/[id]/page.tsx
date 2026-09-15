"use client";

import React, { useMemo } from "react";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Warning as AlertTriangle,
  Clock,
  MapPin,
  Lightning as Zap,
  CheckCircle as CheckCircle2,
  Calculator,
  Stack as Layers,
  Question as FileQuestion,
  ArrowClockwise as RotateCw,
  Lock,
  LockOpen,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { useBlockExplain, useMaintenanceJobs } from "@/lib/api/hooks";
import {
  useBlockExplain,
  useMaintenanceJobs,
  usePinBlock,
  useUnpinBlock,
  useCheckBlockConflict,
  type ConflictCheckOut,
} from "@/lib/api/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  getDepartmentToken,
  getMaintenanceBandToken,
  getLifecycleStatusToken,
  LIFECYCLE_STATUS_TOKENS,
  CONFLICT_STATUS_TOKENS,
  PRIORITY_FACTOR_TOKENS,
  LOCKED_STATUS_TOKEN,
  type DepartmentKey,
} from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

// Format ISO date string into readable corridor timestamp
function formatTimestamp(isoStr?: string): string {
  if (!isoStr) return "—";
  try {
    const dt = new Date(isoStr);
    const date = dt.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date} ${time}`;
  } catch {
    return isoStr;
  }
}

// Convert ISO string to format expected by HTML5 datetime-local input
function toLocalDatetimeInput(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

// Calculate duration in minutes between start and end
function calculateDurationMin(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 0;
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    return Math.max(0, Math.round((e - s) / (1000 * 60)));
  } catch {
    return 0;
  }
}

// Chart configuration for priority factor contribution
const factorChartConfig = {
  score: { label: "Weighted Contribution (pts)" },
} satisfies ChartConfig;

export default function BlockExplainPage() {
  const params = useParams();
  const rawId = typeof params?.id === "string" ? params.id : "";

  // Normalize block ID (e.g. JOB-SMMS-0070 -> BLK-JOB-SMMS-0070)
  const blockId = useMemo(() => {
    if (!rawId) return "";
    return rawId.startsWith("JOB-") ? `BLK-${rawId}` : rawId;
  }, [rawId]);

  // Queries
  const {
    data: explainData,
    isLoading: isExplainLoading,
    isError: isExplainError,
    error: explainError,
    refetch: refetchExplain,
  } = useBlockExplain(blockId);

  const { data: allJobs = [] } = useMaintenanceJobs();

  // Schedule Override & Pinning State
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [isUnpinOpen, setIsUnpinOpen] = useState(false);
  const [overrideStart, setOverrideStart] = useState("");
  const [overrideEnd, setOverrideEnd] = useState("");
  const [conflictResult, setConflictResult] = useState<ConflictCheckOut | null>(null);
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const effectiveJobId = explainData?.job_id || "";
  const pinMutation = usePinBlock(effectiveJobId);
  const unpinMutation = useUnpinBlock(effectiveJobId);
  const checkConflictMutation = useCheckBlockConflict(effectiveJobId);

  const initOverrideWindow = () => {
    if (explainData?.start && explainData?.end) {
      setOverrideStart(toLocalDatetimeInput(explainData.start));
      setOverrideEnd(toLocalDatetimeInput(explainData.end));
    }
    setConflictResult(null);
    setOverrideAcknowledged(false);
    setOverrideError(null);
  };

  const handleCheckConflict = async () => {
    if (!overrideStart || !overrideEnd || !effectiveJobId) return;
    setOverrideError(null);
    try {
      const res = await checkConflictMutation.mutateAsync({
        start: new Date(overrideStart).toISOString(),
        end: new Date(overrideEnd).toISOString(),
      });
      setConflictResult(res);
    } catch (err: any) {
      setOverrideError(err?.message || "Failed to check timetable conflicts");
    }
  };

  const handleConfirmPin = async () => {
    if (!overrideStart || !overrideEnd || !effectiveJobId) return;
    setOverrideError(null);
    try {
      await pinMutation.mutateAsync({
        start: new Date(overrideStart).toISOString(),
        end: new Date(overrideEnd).toISOString(),
      });
      setIsOverrideOpen(false);
      refetchExplain();
    } catch (err: any) {
      setOverrideError(err?.message || "Failed to pin block schedule");
    }
  };

  const handleConfirmUnpin = async () => {
    if (!effectiveJobId) return;
    try {
      await unpinMutation.mutateAsync();
      setIsUnpinOpen(false);
      refetchExplain();
    } catch (err: any) {
      console.error("Failed to unpin block:", err);
    }
  };

  // Match corresponding MaintenanceJob for raw factor breakdown
  const matchingJob = useMemo(() => {
    if (!explainData?.job_id) return null;
    return allJobs.find((j) => j.job_id === explainData.job_id) || null;
  }, [allJobs, explainData]);

  // Derived department key
  const departmentKey = useMemo<DepartmentKey>(() => {
    if (matchingJob?.department) return matchingJob.department as DepartmentKey;
    if (explainData?.job_id) {
      if (explainData.job_id.includes("-TMS-")) return "TMS";
      if (explainData.job_id.includes("-SMMS-")) return "SMMS";
      if (explainData.job_id.includes("-TDMS-")) return "TDMS";
    }
    return "TMS";
  }, [matchingJob, explainData]);

  const deptToken = getDepartmentToken(departmentKey);
  const bandToken = getMaintenanceBandToken(explainData?.start);
  const lifecycleToken = getLifecycleStatusToken(explainData?.status || "SCHEDULED");

  // Priority formula factor calculation
  const factorBreakdown = useMemo(() => {
    if (!matchingJob) return null;

    const rawCrit = matchingJob.criticality ?? 0;
    const rawUrg = matchingJob.urgency ?? 0;
    const rawRisk = matchingJob.asset_risk ?? 0;
    const rawOverdue = matchingJob.overdue_factor ?? 0;
    const rawFail = matchingJob.failure_history ?? 0;

    const critContrib = rawCrit * 0.30;
    const urgContrib = rawUrg * 0.25;
    const riskContrib = rawRisk * 0.20;
    const overdueContrib = rawOverdue * 0.15;
    const failContrib = rawFail * 0.10;

    const calculatedSum = critContrib + urgContrib + riskContrib + overdueContrib + failContrib;

    const items = [
      {
        name: PRIORITY_FACTOR_TOKENS.criticality.name,
        desc: "Safety severity and impact on train operations if unaddressed",
        weight: `${PRIORITY_FACTOR_TOKENS.criticality.weightPct}%`,
        raw: rawCrit.toFixed(1),
        contrib: critContrib.toFixed(2),
        formula: `${rawCrit.toFixed(1)} × ${PRIORITY_FACTOR_TOKENS.criticality.weightPct}%`,
        fill: PRIORITY_FACTOR_TOKENS.criticality.hex,
      },
      {
        name: PRIORITY_FACTOR_TOKENS.urgency.name,
        desc: "Immediate operational necessity and proximity to statutory failure threshold",
        weight: `${PRIORITY_FACTOR_TOKENS.urgency.weightPct}%`,
        raw: rawUrg.toFixed(1),
        contrib: urgContrib.toFixed(2),
        formula: `${rawUrg.toFixed(1)} × ${PRIORITY_FACTOR_TOKENS.urgency.weightPct}%`,
        fill: PRIORITY_FACTOR_TOKENS.urgency.hex,
      },
      {
        name: PRIORITY_FACTOR_TOKENS.assetRisk.name,
        desc: "Asset degradation probability, tonnage wear, and physical lifecycle status",
        weight: `${PRIORITY_FACTOR_TOKENS.assetRisk.weightPct}%`,
        raw: rawRisk.toFixed(1),
        contrib: riskContrib.toFixed(2),
        formula: `${rawRisk.toFixed(1)} × ${PRIORITY_FACTOR_TOKENS.assetRisk.weightPct}%`,
        fill: PRIORITY_FACTOR_TOKENS.assetRisk.hex,
      },
      {
        name: PRIORITY_FACTOR_TOKENS.overdueFactor.name,
        desc: "Normalized factor of days elapsed past required inspection cycle",
        weight: `${PRIORITY_FACTOR_TOKENS.overdueFactor.weightPct}%`,
        raw: rawOverdue.toFixed(1),
        contrib: overdueContrib.toFixed(2),
        formula: `${rawOverdue.toFixed(1)} × ${PRIORITY_FACTOR_TOKENS.overdueFactor.weightPct}%`,
        fill: PRIORITY_FACTOR_TOKENS.overdueFactor.hex,
      },
      {
        name: PRIORITY_FACTOR_TOKENS.failureHistory.name,
        desc: "Historical incident recurrence rate on this specific asset identifier",
        weight: `${PRIORITY_FACTOR_TOKENS.failureHistory.weightPct}%`,
        raw: rawFail.toFixed(1),
        contrib: failContrib.toFixed(2),
        formula: `${rawFail.toFixed(1)} × ${PRIORITY_FACTOR_TOKENS.failureHistory.weightPct}%`,
        fill: PRIORITY_FACTOR_TOKENS.failureHistory.hex,
      },
    ];

    return { items, calculatedSum };
  }, [matchingJob]);

  // Loading skeleton state
  if (isExplainLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Not found state (e.g. 404 or missing block)
  if (isExplainError && (explainError?.message?.includes("not found") || explainError?.message?.includes("404"))) {
    return (
      <div className="space-y-6">
        <Link
          href="/plans/weekly"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-xs")}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Weekly Plan</span>
        </Link>

        <Card className="border-dashed border-2 text-center py-12 bg-card">
          <CardHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted mb-2">
              <FileQuestion className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Block Not Found</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2 text-xs">
              No scheduled maintenance block with ID <code className="bg-muted px-1 rounded font-mono">{blockId}</code> was found in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Link
              href="/plans/weekly"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
            >
              View Weekly Plan
            </Link>
            <Link
              href="/optimizer"
              className={cn(buttonVariants({ size: "sm" }), "text-xs")}
            >
              Go to Optimizer
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generic Error State
  if (isExplainError) {
    return (
      <div className="space-y-6">
        <Link
          href="/plans/weekly"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-xs")}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Weekly Plan</span>
        </Link>
        <ErrorCard
          title="Failed to Load Block Audit"
          message={explainError?.message || "An unexpected error occurred while loading block explainability data."}
          onRetry={() => refetchExplain()}
        />
      </div>
    );
  }

  if (!explainData) return null;

  const durationMin = calculateDurationMin(explainData.start, explainData.end);
  const isHardConflict = explainData.hard_conflict;
  const isRelaxed = explainData.relaxed;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/plans/weekly" className="hover:underline flex items-center gap-1 text-foreground font-medium">
            <ArrowLeft className="size-3.5" />
            <span>Weekly Plan</span>
          </Link>
          <span>/</span>
          <Link href="/optimizer" className="hover:underline">
            Optimizer
          </Link>
          <span>/</span>
          <span className="font-mono text-muted-foreground">{explainData.block_id}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchExplain()}
          className="h-7 text-xs gap-1.5"
        >
          <RotateCw className="size-3" />
          <span>Refresh Audit</span>
        </Button>
        <div className="flex items-center gap-2">
          {explainData.is_locked ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  initOverrideWindow();
                  setIsOverrideOpen(true);
                }}
                className="h-7 text-xs gap-1.5"
              >
                <PencilSimple className="size-3" />
                <span>Change Override Window</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsUnpinOpen(true)}
                className="h-7 text-xs gap-1.5"
              >
                <LockOpen className="size-3" />
                <span>Unpin / Return to Optimizer</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                initOverrideWindow();
                setIsOverrideOpen(true);
              }}
              className="h-7 text-xs gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/40"
            >
              <Lock className="size-3" />
              <span>Override Schedule</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchExplain()}
            className="h-7 text-xs gap-1.5"
          >
            <RotateCw className="size-3" />
            <span>Refresh Audit</span>
          </Button>
        </div>
      </div>

      {/* Header Block Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border bg-card shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {explainData.block_id}
            </h1>
            <Badge variant="outline" className={deptToken.badgeClass}>
              <span className={`size-1.5 rounded-full mr-1.5 ${deptToken.dotClass}`} />
              {deptToken.name}
            </Badge>
            <Badge variant="outline" className={lifecycleToken.badgeClass}>
              {lifecycleToken.name}
            </Badge>
            {isHardConflict ? (
            {explainData.is_locked ? (
              <Badge variant="outline" className={LOCKED_STATUS_TOKEN.badgeClass}>
                <Lock className="size-3 mr-1" />
                {LOCKED_STATUS_TOKEN.shortName} Override
              </Badge>
            ) : isHardConflict ? (
              <Badge variant="outline" className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}>
                <AlertTriangle className="size-3 mr-1" />
                Hard Clash
              </Badge>
            ) : isRelaxed ? (
              <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.relaxed.badgeClass}>
                Relaxed Window
              </Badge>
            ) : (
              <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.clean.badgeClass}>
                <ShieldCheck className="size-3 mr-1" />
                Zero Conflicts
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Linked Maintenance Job:</span>
            <strong className="font-mono text-foreground">{explainData.job_id}</strong>
            {matchingJob?.asset_id && (
              <>
                <span>·</span>
                <span>Asset: <strong className="font-mono text-foreground">{matchingJob.asset_id}</strong></span>
              </>
            )}
          </p>
        </div>

        {/* Priority Rank Indicator */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 shrink-0">
          <div className="size-10 rounded-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm">
            #{explainData.priority_rank}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground block">Corridor Priority Ranking</span>
            <span className="font-bold text-foreground">
              Rank {explainData.priority_rank} of {explainData.total_jobs} Jobs
            </span>
          </div>
        </div>
      </div>

      {/* Operational Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <MapPin className="size-3 text-muted-foreground" />
              <span>Section</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="font-mono font-bold text-sm text-foreground">
              {explainData.section_id}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              NDLS ↔ CNB Trunk Corridor
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground" />
              <span>Scheduled Window</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="font-mono font-bold text-xs text-foreground">
              {formatTimestamp(explainData.start)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Duration: <strong className="text-foreground">{durationMin} min</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Layers className="size-3 text-muted-foreground" />
              <span>Maintenance Band</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <Badge variant="outline" className={bandToken.badgeClass}>
              {bandToken.name}
            </Badge>
            <p className="text-[11px] text-muted-foreground mt-1">
              Window: {bandToken.hours}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Zap className="size-3 text-muted-foreground" />
              <span>Priority Score</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-1">
            <div className="font-mono font-bold text-base text-foreground">
              {explainData.priority_score.toFixed(2)} pts
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Top 20% high-urgency defect
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Solver Decision Explanation & Invariant Audits */}
      {/* Solver Decision & Explanatory Reasoning Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              CP-SAT Solver Decision Audit
            </CardTitle>
            {explainData.is_locked ? (
              <>
                <Lock className="size-4 text-orange-600" />
                <CardTitle className="text-base font-semibold text-foreground">
                  Manual Schedule Override Audit
                </CardTitle>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">
                  CP-SAT Solver Decision Audit
                </CardTitle>
              </>
            )}
          </div>
          <CardDescription className="text-xs">
            Algorithmic justification for window allocation under OR-Tools constraint satisfaction.
            {explainData.is_locked
              ? "Human operator schedule override audit and mathematical barrier constraint notice."
              : "Algorithmic justification for window allocation under OR-Tools constraint satisfaction."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Plain English Solver Rationale */}
          <div
            className={cn(
              "p-4 rounded-lg border space-y-2",
              isHardConflict
              explainData.is_locked
                ? `${LOCKED_STATUS_TOKEN.bgClass} ${LOCKED_STATUS_TOKEN.borderClass}`
                : isHardConflict
                ? `${CONFLICT_STATUS_TOKENS["hard-conflict"].bgClass} ${CONFLICT_STATUS_TOKENS["hard-conflict"].borderClass}`
                : isRelaxed
                ? `${CONFLICT_STATUS_TOKENS.relaxed.bgClass} ${CONFLICT_STATUS_TOKENS.relaxed.borderClass}`
                : `${CONFLICT_STATUS_TOKENS.clean.bgClass} ${CONFLICT_STATUS_TOKENS.clean.borderClass}`
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                {isHardConflict ? (
                {explainData.is_locked ? (
                  <>
                    <Lock className={cn("size-4", LOCKED_STATUS_TOKEN.textClass)} />
                    <span className={LOCKED_STATUS_TOKEN.textClass}>
                      Manual Schedule Pin Notice (Operator Override)
                    </span>
                  </>
                ) : isHardConflict ? (
                  <>
                    <AlertTriangle className={cn("size-4", CONFLICT_STATUS_TOKENS["hard-conflict"].textClass)} />
                    <span className={CONFLICT_STATUS_TOKENS["hard-conflict"].textClass}>
                      Corridor Bottleneck Clash Audit Notice
                    </span>
                  </>
                ) : isRelaxed ? (
                  <>
                    <AlertTriangle className={cn("size-4", CONFLICT_STATUS_TOKENS.relaxed.textClass)} />
                    <span className={CONFLICT_STATUS_TOKENS.relaxed.textClass}>
                      Relaxed Constraint Allocation Notice
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className={cn("size-4", CONFLICT_STATUS_TOKENS.clean.textClass)} />
                    <span className={CONFLICT_STATUS_TOKENS.clean.textClass}>
                      Optimal Zero-Conflict Allocation
                    </span>
                  </>
                )}
              </div>
              <Badge
                variant="outline"
                className={
                  isHardConflict
                  explainData.is_locked
                    ? LOCKED_STATUS_TOKEN.badgeClass
                    : isHardConflict
                    ? CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass
                    : isRelaxed
                    ? CONFLICT_STATUS_TOKENS.relaxed.badgeClass
                    : CONFLICT_STATUS_TOKENS.clean.badgeClass
                }
              >
                {isHardConflict
                {explainData.is_locked
                  ? "Operator Override"
                  : isHardConflict
                  ? "Action Required"
                  : isRelaxed
                  ? "Relaxed Preference"
                  : "Verified Clean"}
              </Badge>
            </div>

            <p className="font-mono text-xs font-semibold text-foreground bg-background/80 p-2.5 rounded border">
              &quot;{explainData.reason}&quot;
            </p>

            <div className="text-[11px] text-muted-foreground leading-relaxed pt-1">
              {isHardConflict ? (
              {explainData.is_locked ? (
                <p>
                  <strong>Operator Override Constraint:</strong> This maintenance block window was manually fixed by a railway section controller rather than automatically assigned by the CP-SAT optimizer.
                  The solver enforces this fixed interval as an immutable barrier constraint under section <code className="font-mono font-bold text-foreground">NoOverlap</code> — guaranteeing that subsequent optimizer runs will never move this job or allocate overlapping maintenance on section <code className="font-mono font-bold text-foreground">{explainData.section_id}</code>.
                  {explainData.conflict_count > 0 ? (
                    <span className="block mt-1 text-destructive font-semibold">
                      ⚠️ Note: {explainData.conflict_count} train timetable conflict(s) are recorded for this pinned window. Hard conflict flag is active.
                    </span>
                  ) : (
                    <span className="block mt-1 text-emerald-700 dark:text-emerald-300 font-semibold">
                      ✓ Timetable analysis confirms 0 conflicting passenger/freight trains at this pinned window.
                    </span>
                  )}
                </p>
              ) : isHardConflict ? (
                <p>
                  <strong>Why this conflict occurred:</strong> High train traffic density on choke point{" "}
                  <code className="font-mono font-bold text-foreground">{explainData.section_id}</code> left zero
                  conflict-free windows of {durationMin} min within a 14-day search horizon, even after relaxing day/night preference.
                  The CP-SAT solver minimized total penalty by assigning the least-disruptive slot with exactly {explainData.conflict_count} train
                  path overlap. <em>Section Controller approval and dynamic train regulation will be required.</em>
                </p>
              ) : isRelaxed ? (
                <p>
                  <strong>Why this window was relaxed:</strong> The primary candidate window was congested or conflicted with higher-priority
                  track work. The solver successfully satisfied the hard zero-conflict invariant by extending candidate search across the 14-day
                  horizon, yielding a completely clean window without impacting passenger timetables.
                </p>
              ) : (
                <p>
                  <strong>Why this window was chosen:</strong> The CP-SAT solver matched this high-priority maintenance demand to its rank-1
                  preferred window inside the declared {bandToken.name}. Timetable analysis confirms zero passenger train interactions and zero
                  overlapping corridor maintenance.
                </p>
              )}
            </div>
          </div>

          {/* Invariant Verification Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div
              className={cn(
                "p-3 rounded-lg border space-y-1",
                isHardConflict
                  ? `${CONFLICT_STATUS_TOKENS["hard-conflict"].bgClass} ${CONFLICT_STATUS_TOKENS["hard-conflict"].borderClass}`
                  : "bg-background"
              )}
            >
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                {isHardConflict ? (
                  <>
                    <AlertTriangle className={cn("size-3.5", CONFLICT_STATUS_TOKENS["hard-conflict"].textClass)} />
                    <span className={CONFLICT_STATUS_TOKENS["hard-conflict"].textClass}>
                      Train Clash ({explainData.conflict_count})
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className={cn("size-3.5", CONFLICT_STATUS_TOKENS.clean.textClass)} />
                    <span>Zero Train Clashes</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isHardConflict
                  ? `Unavoidable clash: ${explainData.conflict_count} train timetable overlap on section ${explainData.section_id}.`
                  : `Verified: 0 passenger timetable overlaps on section ${explainData.section_id}.`}
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-background space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck className={cn("size-3.5", CONFLICT_STATUS_TOKENS.clean.textClass)} />
                <span>Section NoOverlap</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Isolated track possession invariant maintained with zero overlapping jobs.
              </p>
            </div>

            <div
              className={cn(
                "p-3 rounded-lg border space-y-1",
                isRelaxed ? `${CONFLICT_STATUS_TOKENS.relaxed.bgClass} ${CONFLICT_STATUS_TOKENS.relaxed.borderClass}` : "bg-background"
              )}
            >
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                {isRelaxed ? (
                  <>
                    <AlertTriangle className={cn("size-3.5", CONFLICT_STATUS_TOKENS.relaxed.textClass)} />
                    <span className={CONFLICT_STATUS_TOKENS.relaxed.textClass}>
                      Extended Horizon (14d)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className={cn("size-3.5", LIFECYCLE_STATUS_TOKENS.SCHEDULED.textClass)} />
                    <span>Band Conformance</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isRelaxed
                  ? "Assigned via extended candidate window search to preserve 0 conflicts."
                  : `Scheduled inside declared ${bandToken.name} (${bandToken.hours}).`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Score Mathematical Breakdown */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Priority Score Mathematical Audit
              </CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Formula: SIH26027 Weighted Sum
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Reproducible arithmetic verifying the multi-factor weighted composition of this job&apos;s priority score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {factorBreakdown ? (
            <>
              {/* Arithmetic Table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b font-semibold text-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Factor Name & Operational Meaning</th>
                      <th className="py-2.5 px-3 text-right">Raw Value (0–100)</th>
                      <th className="py-2.5 px-3 text-right">Factor Weight</th>
                      <th className="py-2.5 px-3 text-right">Weighted Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {factorBreakdown.items.map((factor) => (
                      <tr key={factor.name} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-semibold text-foreground block">{factor.name}</span>
                          <span className="text-[11px] text-muted-foreground">{factor.desc}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {factor.raw}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {factor.weight}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          <span className="text-[11px] text-muted-foreground font-normal mr-1.5">
                            ({factor.formula}) =
                          </span>
                          {factor.contrib} pts
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-bold text-xs border-t-2">
                      <td className="py-3 px-3 font-sans text-foreground">
                        Total Computed Priority Score
                      </td>
                      <td className="py-3 px-3 text-right">—</td>
                      <td className="py-3 px-3 text-right">100%</td>
                      <td className="py-3 px-3 text-right text-primary text-sm font-bold">
                        {factorBreakdown.calculatedSum.toFixed(2)} pts
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Visual Breakdown Bar Chart */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Relative Factor Impact Share:
                </span>
                <div className="h-[160px] w-full">
                  <ChartContainer config={factorChartConfig} className="h-full w-full">
                    <BarChart
                      data={factorBreakdown.items}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" unit=" pts" domain={[0, 30]} tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="contrib" radius={[0, 4, 4, 0]}>
                        {factorBreakdown.items.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-lg bg-muted/30 border text-xs text-muted-foreground text-center">
              Per-factor raw score contributions could not be retrieved from the maintenance database. Final score:{" "}
              <strong className="font-mono text-foreground">{explainData.priority_score.toFixed(2)} pts</strong>.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Override Modal */}
      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-orange-600" />
              <span>Override Maintenance Schedule</span>
            </DialogTitle>
            <DialogDescription>
              Fix job <strong className="font-mono text-foreground">{explainData.job_id}</strong> on section{" "}
              <strong className="font-mono text-foreground">{explainData.section_id}</strong> to an exact time window.
              The CP-SAT optimizer will treat this window as an immutable constraint and will not re-optimize it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Window Start (Date & Time)</label>
                <Input
                  type="datetime-local"
                  value={overrideStart}
                  onChange={(e) => {
                    setOverrideStart(e.target.value);
                    setConflictResult(null);
                    setOverrideAcknowledged(false);
                  }}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Window End (Date & Time)</label>
                <Input
                  type="datetime-local"
                  value={overrideEnd}
                  onChange={(e) => {
                    setOverrideEnd(e.target.value);
                    setConflictResult(null);
                    setOverrideAcknowledged(false);
                  }}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Check Conflicts Action */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted-foreground">
                Required duration: {matchingJob?.duration_min || durationMin} min
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckConflict}
                disabled={!overrideStart || !overrideEnd || checkConflictMutation.isPending}
                className="h-7 text-xs gap-1"
              >
                {checkConflictMutation.isPending ? "Checking Timetable..." : "Check Train Conflicts"}
              </Button>
            </div>

            {/* Conflict Inspection Feedback */}
            {conflictResult !== null && (
              <div
                className={cn(
                  "p-3 rounded-lg border text-xs space-y-1.5",
                  conflictResult.conflict_count > 0
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {conflictResult.conflict_count > 0 ? (
                    <>
                      <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                      <span>Warning: {conflictResult.conflict_count} Timetable Conflict(s) Detected</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                      <span>Zero Conflicts: Clean Window Verified</span>
                    </>
                  )}
                </div>
                {conflictResult.conflict_count > 0 ? (
                  <>
                    <p className="text-[11px] leading-relaxed">
                      This window intersects with {conflictResult.conflict_count} train run(s) on section {conflictResult.section_id}:{" "}
                      <strong className="font-mono">{conflictResult.conflicting_trains.join(", ") || "Passenger Paths"}</strong>.
                      Pinning will assert a hard conflict flag requiring manual train regulation.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer font-medium text-xs">
                      <input
                        type="checkbox"
                        checked={overrideAcknowledged}
                        onChange={(e) => setOverrideAcknowledged(e.target.checked)}
                        className="rounded border-amber-400"
                      />
                      <span>I acknowledge this will cause train timetable conflicts</span>
                    </label>
                  </>
                ) : (
                  <p className="text-[11px]">
                    No conflicting passenger or freight trains operate on this corridor section during the selected window.
                  </p>
                )}
              </div>
            )}

            {overrideError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                {overrideError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOverrideOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmPin}
              disabled={
                !overrideStart ||
                !overrideEnd ||
                pinMutation.isPending ||
                (conflictResult !== null && conflictResult.conflict_count > 0 && !overrideAcknowledged)
              }
              className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              {pinMutation.isPending ? "Pinning Window..." : "Confirm & Pin Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpin Confirmation Modal */}
      <Dialog open={isUnpinOpen} onOpenChange={setIsUnpinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <LockOpen className="size-5" />
              <span>Unpin Block & Return to Optimizer</span>
            </DialogTitle>
            <DialogDescription>
              Job <strong className="font-mono text-foreground">{explainData.job_id}</strong> will be unpinned and reverted to <strong className="text-foreground">PENDING</strong> status.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>
              Its manually fixed block window will be cleared. On the next CP-SAT optimization run, this maintenance job will be re-evaluated alongside all other pending corridor demands and freely reassigned based on priority score and timetable availability.
            </p>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-[11px]">
              ⚠️ Are you sure you want to release operator control over this maintenance block?
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUnpinOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmUnpin}
              disabled={unpinMutation.isPending}
              className="text-xs"
            >
              {unpinMutation.isPending ? "Unpinning..." : "Confirm Unpin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
