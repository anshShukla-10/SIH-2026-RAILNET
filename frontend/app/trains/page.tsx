"use client";

import React, { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Train as TrainTrack, ArrowRight, Info, ArrowClockwise as RefreshCw } from "@phosphor-icons/react/dist/ssr";

import { useTrains, type Train } from "@/lib/api/hooks";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorCard } from "@/components/ui/error-card";
import { DATA_SOURCE_TOKENS, LIFECYCLE_STATUS_TOKENS } from "@/lib/theme/tokens";

const trainColumns: ColumnDef<Train>[] = [
  {
    accessorKey: "train_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Train Number" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
          <TrainTrack className="size-3.5 text-muted-foreground" />
        </div>
        <span className="font-mono font-bold text-sm text-foreground">
          {row.getValue("train_id")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Train Service Name" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.getValue("name")}</span>
        <span className="text-[11px] text-muted-foreground">Express Passenger / Freight</span>
      </div>
    ),
  },
  {
    id: "route",
    header: "Corridor Route",
    cell: ({ row }) => {
      const src = row.original.source;
      const dst = row.original.destination;
      return (
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
          <span className="px-1.5 py-0.5 rounded bg-muted/80">{src}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span className="px-1.5 py-0.5 rounded bg-muted/80">{dst}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "run_days",
    header: "Operating Days",
    cell: ({ row }) => {
      const days = (row.getValue("run_days") as string) || "";
      const isDaily = days.toUpperCase().includes("DAILY") || days.split(",").length >= 7;
      return (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className={
              isDaily
                ? LIFECYCLE_STATUS_TOKENS.SCHEDULED.badgeClass
                : "text-muted-foreground"
            }
          >
            {isDaily ? "Daily Service" : days}
          </Badge>
        </div>
      );
    },
  },
];

export default function TrainsPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const skip = pageIndex * pageSize;
  const limit = pageSize;

  const { data: trains = [], isLoading, isError, error, refetch } = useTrains(skip, limit);

  const realSourceToken = DATA_SOURCE_TOKENS.real;

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Train Timetables</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real passenger and freight train operations on the Northern/North Central trunk corridor.
          </p>
        </div>
        <ErrorCard
          title="Failed to Load Trains"
          message={error?.message || "Could not fetch train schedule data from GET /api/trains."}
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
            <h1 className="text-3xl font-bold tracking-tight">Train Timetables</h1>
            <Badge
              variant="outline"
              className={realSourceToken.badgeClass}
            >
              <span className={`size-1.5 rounded-full mr-1.5 ${realSourceToken.dotClass}`} />
              {realSourceToken.name}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real passenger and freight train operations on the Northern/North Central trunk corridor (NDLS ↔ CNB).
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
      </div>

      {/* Backend Capability Gap Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-xs text-muted-foreground">
        <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">API Scope Note:</span>
          <p>
            The backend <code className="bg-muted px-1 rounded">GET /api/trains</code> endpoint returns paginated corridor train headers. Detailed stop-by-stop sequencing is calculated during conflict evaluation; individual train stop expansion is deferred until a dedicated train-detail API endpoint is added.
          </p>
        </div>
      </div>

      {/* Shared Data Table */}
      <DataTable
        columns={trainColumns}
        data={trains}
        isLoading={isLoading}
        emptyMessage="No train timetables found for the selected range."
        manualPagination={true}
        pageIndex={pageIndex}
        pageSize={pageSize}
        // Backend currently has 20 seeded trains from RailRadar API
        totalCount={20}
        onPageChange={(newPageIndex) => setPageIndex(newPageIndex)}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPageIndex(0);
        }}
      />
    </div>
  );
}
