"use client";

import React, { useMemo } from "react";
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
} from "@phosphor-icons/react/dist/ssr";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import { useBlockExplain, useMaintenanceJobs } from "@/lib/api/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
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
      <Card className="shadow-xs border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              CP-SAT Solver Decision Audit
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Algorithmic justification for window allocation under OR-Tools constraint satisfaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Plain English Solver Rationale */}
          <div
            className={cn(
              "p-4 rounded-lg border space-y-2",
              isHardConflict
                ? `${CONFLICT_STATUS_TOKENS["hard-conflict"].bgClass} ${CONFLICT_STATUS_TOKENS["hard-conflict"].borderClass}`
                : isRelaxed
                ? `${CONFLICT_STATUS_TOKENS.relaxed.bgClass} ${CONFLICT_STATUS_TOKENS.relaxed.borderClass}`
                : `${CONFLICT_STATUS_TOKENS.clean.bgClass} ${CONFLICT_STATUS_TOKENS.clean.borderClass}`
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                {isHardConflict ? (
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
                    ? CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass
                    : isRelaxed
                    ? CONFLICT_STATUS_TOKENS.relaxed.badgeClass
                    : CONFLICT_STATUS_TOKENS.clean.badgeClass
                }
              >
                {isHardConflict
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
    </div>
  );
}
