"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  CalendarBlank as CalendarDays,
  ArrowClockwise as RotateCw,
  Sparkle as Sparkles,
  ArrowLeft,
  ShieldCheck,
  Warning as AlertTriangle,
} from "@phosphor-icons/react/dist/ssr";

import { useMonthlyPlan } from "@/lib/api/hooks";
import { GanttTimeline } from "@/components/gantt/gantt-timeline";
import { GanttLegend } from "@/components/gantt/gantt-legend";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorCard } from "@/components/ui/error-card";
import { cn } from "@/lib/utils";
import {
  CONFLICT_STATUS_TOKENS,
  LIFECYCLE_STATUS_TOKENS,
} from "@/lib/theme/tokens";

export default function MonthlyPlanPage() {
  const { data: blocks = [], isLoading, isError, error, refetch } = useMonthlyPlan();

  // Compute metrics from live block records
  const metrics = useMemo(() => {
    const total = blocks.length;
    let zeroConflict = 0;
    let relaxed = 0;
    let hardConflict = 0;

    blocks.forEach((b) => {
      if (b.has_hard_conflict) {
        hardConflict += 1;
      } else if (b.reason?.toLowerCase().includes("relaxed")) {
        relaxed += 1;
      } else {
        zeroConflict += 1;
      }
    });

    return { total, zeroConflict, relaxed, hardConflict };
  }, [blocks]);

  // Compute date range span string
  const dateSpan = useMemo(() => {
    if (blocks.length === 0) return "Next 30 Days";
    const times = blocks.map((b) => new Date(b.start).getTime());
    const minD = new Date(Math.min(...times));
    const maxD = new Date(minD);
    maxD.setDate(maxD.getDate() + 30);

    const startStr = minD.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const endStr = maxD.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} – ${endStr}`;
  }, [blocks]);

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Plan (30-Day Horizon)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Macro-level corridor maintenance visibility across extended planning horizons.
          </p>
        </div>
        <ErrorCard
          title="Failed to Load Monthly Plan"
          message={error?.message || "Could not retrieve monthly plan data from the server."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight">Monthly Plan (30-Day Horizon)</h1>
            <Badge variant="outline" className="font-mono text-xs py-1 px-2.5 bg-card">
              {dateSpan}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Macro-level corridor maintenance visibility across extended 30-day planning horizons for civil, S&T, and electrical railway infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link
            href="/plans/weekly"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 gap-1.5 text-xs")}
          >
            <ArrowLeft className="size-3" />
            <span>7-Day Weekly View</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <KpiCard
          label="Monthly Blocks"
          value={metrics.total}
          subtext="Allocated across 30-day window"
          isLoading={isLoading}
          badge={
            <Badge variant="outline" className={LIFECYCLE_STATUS_TOKENS.SCHEDULED.badgeClass}>
              {LIFECYCLE_STATUS_TOKENS.SCHEDULED.shortName}
            </Badge>
          }
        />
        <KpiCard
          label="Zero-Conflict"
          value={metrics.zeroConflict}
          subtext="Satisfies hard train separation"
          isLoading={isLoading}
          badge={
            <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.clean.badgeClass}>
              <ShieldCheck className="size-3 mr-1" />
              Clean
            </Badge>
          }
        />
        <KpiCard
          label="Relaxed Windows"
          value={metrics.relaxed}
          subtext="Alternative clean window"
          isLoading={isLoading}
          badge={
            <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.relaxed.badgeClass}>
              Relaxed
            </Badge>
          }
        />
        <KpiCard
          label="Hard Conflicts"
          value={metrics.hardConflict}
          subtext="Unavoidable train clashes"
          isLoading={isLoading}
          badge={
            <Badge variant="outline" className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}>
              <AlertTriangle className="size-3 mr-1" />
              Hard Clash
            </Badge>
          }
        />
      </div>

      {/* Legend */}
      <GanttLegend />

      {/* Empty State with Optimizer CTA */}
      {!isLoading && blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center bg-card">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <CalendarDays className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Maintenance Blocks Scheduled</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5">
            There are currently no active blocks committed for the 30-day horizon. Run the CP-SAT Optimizer to generate and persist long-range schedules.
          </p>
          <div className="mt-5">
            <Link
              href="/optimizer"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5 shadow-sm")}
            >
              <Sparkles className="size-3.5" />
              <span>Open Optimizer Console</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Reusable Gantt Matrix Component in Compact Mode */
        <GanttTimeline
          items={blocks}
          daysCount={30}
          density="compact"
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
