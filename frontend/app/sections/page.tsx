"use client";

import React, { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Path as GitCommitHorizontal, Info, ArrowClockwise as RefreshCw, MagnifyingGlass as Search } from "@phosphor-icons/react/dist/ssr";

import { useSections, type Section } from "@/lib/api/hooks";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard } from "@/components/ui/error-card";
import { DATA_SOURCE_TOKENS, CONFLICT_STATUS_TOKENS } from "@/lib/theme/tokens";

const sectionColumns: ColumnDef<Section>[] = [
  {
    accessorKey: "section_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Section ID" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
          <GitCommitHorizontal className="size-3.5 text-muted-foreground" />
        </div>
        <span className="font-mono font-bold text-xs text-foreground">
          {row.getValue("section_id")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Section Name" />,
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.getValue("name")}</span>
    ),
  },
  {
    accessorKey: "single_line",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Track Configuration" />,
    cell: ({ row }) => {
      const isSingle = Boolean(row.getValue("single_line"));
      return (
        <Badge
          variant="outline"
          className={
            isSingle
              ? CONFLICT_STATUS_TOKENS.relaxed.badgeClass
              : CONFLICT_STATUS_TOKENS.clean.badgeClass
          }
        >
          {isSingle ? "Single Line" : "Double / Multi-Line"}
        </Badge>
      );
    },
  },
];

export default function SectionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: sections = [], isLoading, isError, error, refetch } = useSections();

  const realSourceToken = DATA_SOURCE_TOKENS.real;

  // Filter sections by search term
  const filteredSections = React.useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const term = searchTerm.toLowerCase();
    return sections.filter(
      (s) =>
        s.section_id.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term)
    );
  }, [sections, searchTerm]);

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Track Sections</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Corridor railway section directory across the Northern/North Central trunk route.
          </p>
        </div>
        <ErrorCard
          title="Failed to Load Sections"
          message={error?.message || "Could not fetch railway sections from GET /api/sections."}
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
            <h1 className="text-3xl font-bold tracking-tight">Track Sections</h1>
            <Badge
              variant="outline"
              className={realSourceToken.badgeClass}
            >
              <span className={`size-1.5 rounded-full mr-1.5 ${realSourceToken.dotClass}`} />
              {sections.length} Seeded Route Sections
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            All 183 consecutive station-to-station track sections across 4 corridor anchor stations (NDLS ↔ GZB ↔ ALJN ↔ TDL ↔ CNB).
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

      {/* Scope / Deferred Feature Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 text-xs text-muted-foreground">
        <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">Timeline Scope Note:</span>
          <p>
            Per Section 5.3 of the PRD, per-section mini-timelines are deferred to Phase 5, where they will share the unified CSS grid timeline engine alongside the weekly and monthly plans.
          </p>
        </div>
      </div>

      {/* Shared Data Table with Filter Toolbar */}
      <DataTable
        columns={sectionColumns}
        data={filteredSections}
        isLoading={isLoading}
        emptyMessage="No railway track sections found matching your search."
        pageSize={15}
        toolbar={
          <div className="flex items-center gap-2 w-full sm:w-72">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search section ID or name..."
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
