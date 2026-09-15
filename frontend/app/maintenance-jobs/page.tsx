"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  WarningCircle as AlertCircle,
  Info,
  ArrowClockwise as RefreshCw,
  MagnifyingGlass as Search,
  Clock,
  Calendar as CalendarRange,
  CheckCircle as CheckCircle2,
  Lock,
  PlusCircle,
} from "@phosphor-icons/react/dist/ssr";

import { useMaintenanceJobs, type MaintenanceJob } from "@/lib/api/hooks";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorCard } from "@/components/ui/error-card";
import {
  getDepartmentToken,
  getLifecycleStatusToken,
  DEPARTMENT_TOKENS,
  CONFLICT_STATUS_TOKENS,
  DATA_SOURCE_TOKENS,
  LOCKED_STATUS_TOKEN,
  type DepartmentKey,
} from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

const jobColumns: ColumnDef<MaintenanceJob>[] = [
  {
    accessorKey: "job_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Job ID / Asset" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-mono font-bold text-xs text-foreground">
          {row.getValue("job_id")}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          {row.original.asset_id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "department",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dept" />,
    cell: ({ row }) => {
      const dept = row.getValue("department") as string;
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
    accessorKey: "defect_desc",
    header: "Defect Description & Section",
    cell: ({ row }) => (
      <div className="flex flex-col max-w-md">
        <span className="font-medium text-xs text-foreground leading-snug">
          {row.getValue("defect_desc")}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
          Section: <strong className="text-foreground">{row.original.section_id}</strong> · {row.original.duration_min} min ({row.original.day_night_pref})
        </span>
      </div>
    ),
  },
  {
    accessorKey: "priority_score",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
    cell: ({ row }) => {
      const score = row.getValue("priority_score") as number | null;
      const formatted = score !== null ? Number(score).toFixed(1) : "—";
      const isHigh = score !== null && score >= 70.0;
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-mono font-bold text-xs",
              isHigh ? CONFLICT_STATUS_TOKENS.relaxed.textClass : "text-foreground"
            )}
          >
            {formatted}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "criticality",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Crit" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {Number(row.getValue("criticality")).toFixed(0)}
      </span>
    ),
  },
  {
    accessorKey: "urgency",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Urg" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {Number(row.getValue("urgency")).toFixed(0)}
      </span>
    ),
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due Date" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.getValue("due_date")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status / Scheduling",
    cell: ({ row }) => {
      const isLocked = Boolean(row.original.is_locked);
      const lockedToken = LOCKED_STATUS_TOKEN;

      if (isLocked) {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={lockedToken.badgeClass}>
              <Lock className="size-3 mr-1" />
              {lockedToken.shortName}
            </Badge>
            <Link
              href={`/blocks/${row.original.job_id}`}
              className={cn("inline-flex items-center gap-1 text-[11px] font-medium hover:underline", lockedToken.textClass)}
            >
              <span>Locked Override — view audit →</span>
            </Link>
          </div>
        );
      }

      const status = (row.getValue("status") as string) || "PENDING";
      const token = getLifecycleStatusToken(status);

      if (status.toUpperCase() === "SCHEDULED") {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={token.badgeClass}>
              {token.shortName}
            </Badge>
            <Link
              href={`/blocks/${row.original.job_id}`}
              className={cn("inline-flex items-center gap-1 text-[11px] font-medium hover:underline", token.textClass)}
            >
              <CalendarRange className={cn("size-3", token.textClass)} />
              <span>Scheduled — view audit →</span>
            </Link>
          </div>
        );
      }

      if (status.toUpperCase() === "GRANTED") {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={token.badgeClass}>
              {token.shortName}
            </Badge>
            <Link
              href={`/blocks/${row.original.job_id}`}
              className={cn("inline-flex items-center gap-1 text-[11px] font-medium hover:underline", token.textClass)}
            >
              <CheckCircle2 className={cn("size-3", token.textClass)} />
              <span>Granted — view audit →</span>
            </Link>
          </div>
        );
      }

      // Default: PENDING
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={token.badgeClass}>
            {token.shortName}
          </Badge>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3 text-muted-foreground/70" />
            <span>Not yet scheduled</span>
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "has_hard_conflict",
    header: "Conflict",
    cell: ({ row }) => {
      const hasConflict = Boolean(row.getValue("has_hard_conflict"));
      if (!hasConflict) {
        return <span className="text-xs text-muted-foreground/60">—</span>;
      }
      return (
        <Badge
          variant="outline"
          className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}
        >
          <AlertCircle className="size-3 mr-1" />
          Clash
        </Badge>
      );
    },
  },
];

export default function MaintenanceJobsPage() {
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const departmentQueryParam = selectedDept === "ALL" ? undefined : selectedDept;
  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useMaintenanceJobs(departmentQueryParam);

  const syntheticToken = DATA_SOURCE_TOKENS.synthetic;

  // Client-side text search over jobs
  const filteredJobs = React.useMemo(() => {
    if (!searchTerm.trim()) return jobs;
    const term = searchTerm.toLowerCase();
    return jobs.filter(
      (j) =>
        j.job_id.toLowerCase().includes(term) ||
        j.defect_desc.toLowerCase().includes(term) ||
        j.asset_id.toLowerCase().includes(term) ||
        j.section_id.toLowerCase().includes(term)
    );
  }, [jobs, searchTerm]);

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cross-departmental track, signal, and traction maintenance requests awaiting optimizer scheduling.
          </p>
        </div>
        <ErrorCard
          title="Failed to Load Maintenance Jobs"
          message={error?.message || "Could not fetch jobs from GET /api/maintenance-jobs."}
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
            <h1 className="text-3xl font-bold tracking-tight">Maintenance Jobs</h1>
            <Badge
              variant="outline"
              className={syntheticToken.badgeClass}
            >
              <span className={`size-1.5 rounded-full mr-1.5 ${syntheticToken.dotClass}`} />
              Synthetic Workload (120 Seeded)
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Cross-departmental track, signal, and traction maintenance requests awaiting optimizer scheduling.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="self-start sm:self-auto gap-1.5 text-xs shadow-2xs"
        >
          <RefreshCw className="size-3.5" />
          <span>Refresh</span>
        </Button>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/maintenance-jobs/new"
            className={cn(buttonVariants({ size: "sm" }), "gap-1.5 text-xs shadow-2xs")}
          >
            <PlusCircle className="size-3.5" />
            <span>Create New Job</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs shadow-2xs"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Backend Scope & Non-Navigating Rows Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-xs text-muted-foreground">
        <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">Optimizer & Block Linkage Note:</span>
          <p>
            Jobs are currently pending with no scheduled block assignment. In the backend schema, <code className="bg-muted px-1 rounded">MaintenanceJobOut</code> does not include a block ID until scheduled by the optimizer. Run the optimizer in Phase 4 (<code className="bg-muted px-1 rounded">/optimizer</code>) to generate block windows and explainability links.
          </p>
        </div>
      </div>

      {/* Shared Data Table with Filter Tabs and Search Toolbar */}
      <DataTable
        columns={jobColumns}
        data={filteredJobs}
        isLoading={isLoading}
        emptyMessage={`No maintenance jobs found for department ${selectedDept}.`}
        initialSorting={[{ id: "priority_score", desc: true }]}
        pageSize={15}
        toolbar={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            {/* Department Filter Tabs */}
            <Tabs
              value={selectedDept}
              onValueChange={(val) => setSelectedDept(val)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="ALL" className="text-xs">
                  All
                </TabsTrigger>
                {(["TMS", "SMMS", "TDMS"] as DepartmentKey[]).map((dept) => {
                  const token = DEPARTMENT_TOKENS[dept];
                  return (
                    <TabsTrigger
                      key={dept}
                      value={dept}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: token.hex }}
                      />
                      <span>{dept}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search defect, asset, or section..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
