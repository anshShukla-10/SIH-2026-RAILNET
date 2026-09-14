"use client";

import React from "react";
import Link from "next/link";
import {
  Train as TrainTrack,
  Path as GitCommitHorizontal,
  Wrench,
  Warning as AlertTriangle,
  ArrowRight,
  Sparkle as Sparkles,
  Calendar as CalendarRange,
  ArrowClockwise as RefreshCw,
} from "@phosphor-icons/react/dist/ssr";

import { useTrains, useSections, useMaintenanceJobs } from "@/lib/api/hooks";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DepartmentChart } from "@/components/dashboard/department-chart";
import { ProvenanceBadge } from "@/components/dashboard/provenance-badge";
import { ErrorCard } from "@/components/ui/error-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEPARTMENT_TOKENS, DATA_SOURCE_TOKENS, CONFLICT_STATUS_TOKENS } from "@/lib/theme/tokens";

export default function DashboardPage() {
  const trainsQuery = useTrains();
  const sectionsQuery = useSections();
  const jobsQuery = useMaintenanceJobs();

  const isLoading =
    trainsQuery.isLoading || sectionsQuery.isLoading || jobsQuery.isLoading;
  const isError =
    trainsQuery.isError || sectionsQuery.isError || jobsQuery.isError;

  const handleRefetch = () => {
    trainsQuery.refetch();
    sectionsQuery.refetch();
    jobsQuery.refetch();
  };

  // Error State: Entire dashboard gracefully displays troubleshooting card
  if (isError) {
    const errorMessage =
      jobsQuery.error?.message ||
      sectionsQuery.error?.message ||
      trainsQuery.error?.message ||
      "Failed to communicate with the RAILNET-AI backend API.";

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of corridor health, job distribution, real train feeds, and optimizer status.
          </p>
        </div>
        <ErrorCard
          title="Backend API Unreachable"
          message={errorMessage}
          onRetry={handleRefetch}
        />
      </div>
    );
  }

  // Loading Skeleton State: Matches full final layout to avoid shifts
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        <Skeleton className="h-28 w-full rounded-xl" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Jobs" isLoading={true} />
          <KpiCard label="Real Trains" isLoading={true} />
          <KpiCard label="Sections" isLoading={true} />
          <KpiCard label="High Criticality" isLoading={true} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DepartmentChart isLoading={true} />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36 mb-1" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success State: Live data computation
  const jobs = jobsQuery.data || [];
  const trains = trainsQuery.data || [];
  const sections = sectionsQuery.data || [];

  const totalJobs = jobs.length;
  const tmsJobs = jobs.filter((j) => j.department.toUpperCase() === "TMS");
  const smmsJobs = jobs.filter((j) => j.department.toUpperCase() === "SMMS");
  const tdmsJobs = jobs.filter((j) => j.department.toUpperCase() === "TDMS");

  // High priority / critical jobs count
  const criticalJobs = jobs.filter(
    (j) => (j.priority_score ?? 0) >= 7.0 || j.criticality >= 4
  );

  const sampleSourceNote =
    jobs.find((j) => j.source_note)?.source_note ||
    "Generated — TMS/SMMS/TDMS are internal railway systems not publicly accessible";

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
            <Badge variant="outline" className="text-xs bg-muted/40 font-mono">
              Live Feed
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Northern / North Central Railway Trunk Corridor (NDLS ↔ CNB) · SIH26027
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefetch}
          className="self-start sm:self-auto gap-1.5 text-xs shadow-2xs"
        >
          <RefreshCw className="size-3.5" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Provenance Callout Banner */}
      <ProvenanceBadge
        trainCount={trains.length}
        sectionCount={sections.length}
        jobCount={totalJobs}
        sourceNote={sampleSourceNote}
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Maintenance Jobs */}
        <KpiCard
          label="Maintenance Jobs"
          value={totalJobs}
          subtext="Prioritized across civil, signalling, & traction"
          icon={Wrench}
          badge={
            <Badge variant="secondary" className="text-[10px] font-mono">
              All Pending
            </Badge>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className="px-1.5 py-0.5 rounded font-medium border"
              style={{
                backgroundColor: DEPARTMENT_TOKENS.TMS.bgHex,
                color: DEPARTMENT_TOKENS.TMS.hex,
                borderColor: DEPARTMENT_TOKENS.TMS.hex + "30",
              }}
            >
              TMS: {tmsJobs.length}
            </span>
            <span
              className="px-1.5 py-0.5 rounded font-medium border"
              style={{
                backgroundColor: DEPARTMENT_TOKENS.SMMS.bgHex,
                color: DEPARTMENT_TOKENS.SMMS.hex,
                borderColor: DEPARTMENT_TOKENS.SMMS.hex + "30",
              }}
            >
              SMMS: {smmsJobs.length}
            </span>
            <span
              className="px-1.5 py-0.5 rounded font-medium border"
              style={{
                backgroundColor: DEPARTMENT_TOKENS.TDMS.bgHex,
                color: DEPARTMENT_TOKENS.TDMS.hex,
                borderColor: DEPARTMENT_TOKENS.TDMS.hex + "30",
              }}
            >
              TDMS: {tdmsJobs.length}
            </span>
          </div>
        </KpiCard>

        {/* KPI 2: Real Timetabled Trains */}
        <KpiCard
          label="Operational Trains"
          value={trains.length}
          subtext="Active timetable slice from RailRadar feed (up to 200)"
          icon={TrainTrack}
          badge={
            <Badge variant="outline" className={DATA_SOURCE_TOKENS.real.badgeClass}>
              RailRadar
            </Badge>
          }
        />

        {/* KPI 3: Railway Sections */}
        <KpiCard
          label="Corridor Sections"
          value={sections.length}
          subtext="Trunk line: New Delhi ↔ Kanpur Central"
          icon={GitCommitHorizontal}
          badge={
            <Badge variant="outline" className="text-[10px]">
              Trunk Route
            </Badge>
          }
        />

        {/* KPI 4: Urgent Maintenance Defects */}
        <KpiCard
          label="Critical Workloads"
          value={criticalJobs.length}
          subtext="High urgency (score ≥ 7.0 or criticality ≥ 4)"
          icon={AlertTriangle}
          badge={
            <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.relaxed.badgeClass}>
              Priority Flag
            </Badge>
          }
        />
      </div>

      {/* Main Content Grid: Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Breakdown Bar Chart */}
        <div className="lg:col-span-2">
          <DepartmentChart jobs={jobs} isLoading={false} />
        </div>

        {/* Quick Links / Actions (PRD Section 5.1) */}
        <Card className="shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Planning Actions
              </CardTitle>
              <CardDescription>
                Core SIH26027 workflow links to optimizer and rolling schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Quick Link 1: Optimizer */}
              <Link
                href="/optimizer"
                className="group block p-3.5 rounded-lg border bg-card hover:border-primary/40 hover:bg-accent/40 transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-primary">
                      <Sparkles className="size-4 text-primary" />
                      <span>Run CP-SAT Optimizer</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Trigger constraint satisfaction solver to generate conflict-free block windows.
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform mt-0.5 shrink-0" />
                </div>
              </Link>

              {/* Quick Link 2: Weekly Schedule */}
              <Link
                href="/plans/weekly"
                className="group block p-3.5 rounded-lg border bg-card hover:border-primary/40 hover:bg-accent/40 transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-primary">
                      <CalendarRange className="size-4 text-primary" />
                      <span>View Weekly Plan</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Inspect the 7-day rolling maintenance timeline across sections.
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-transform mt-0.5 shrink-0" />
                </div>
              </Link>
            </CardContent>
          </div>

          <div className="p-6 pt-0 border-t border-border/50 text-xs text-muted-foreground mt-4">
            <span className="font-medium text-foreground">Hackathon Workflow:</span> Ingested data feeds above are optimized via Google OR-Tools CP-SAT into conflict-free maintenance windows.
          </div>
        </Card>
      </div>
    </div>
  );
}
