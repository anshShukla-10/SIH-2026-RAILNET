"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  MagnifyingGlass as Search,
  Stack as Layers,
  Warning as AlertTriangle,
  Lock,
} from "@phosphor-icons/react/dist/ssr";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GanttBlockPopover } from "./gantt-block-popover";
import {
  DEPARTMENT_TOKENS,
  MAINTENANCE_BAND_TOKENS,
  CONFLICT_STATUS_TOKENS,
  LOCKED_STATUS_TOKEN,
  getDepartmentToken,
  type DepartmentKey,
} from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";
import type { PlanItem } from "@/lib/api/hooks";

interface GanttTimelineProps {
  items: PlanItem[];
  daysCount?: 7 | 30;
  density?: "detailed" | "compact";
  isLoading?: boolean;
  emptyMessage?: string;
}

export function GanttTimeline({
  items = [],
  daysCount = 7,
  density = daysCount === 7 ? "detailed" : "compact",
  isLoading = false,
  emptyMessage = "No maintenance blocks scheduled in this planning window.",
}: GanttTimelineProps) {
  // Filter & View State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("all"); // "all", "1", "2", "3", "4"
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentKey | "ALL">("ALL");

  // Determine horizon start date (based on earliest scheduled block or current time)
  const baseStartDate = useMemo(() => {
    if (items.length === 0) {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    const timestamps = items.map((i) => new Date(i.start).getTime());
    const minTime = Math.min(...timestamps);
    const minDate = new Date(minTime);
    // Normalize to midnight UTC/local
    return new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  }, [items]);

  // Generate calendar days array
  const allDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseStartDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [baseStartDate, daysCount]);

  // Filter days if week is selected in 30-day view
  const visibleDays = useMemo(() => {
    if (daysCount === 30 && selectedWeek !== "all") {
      const weekNum = parseInt(selectedWeek, 10);
      const startIdx = (weekNum - 1) * 7;
      const endIdx = Math.min(startIdx + 7, daysCount);
      return allDays.slice(startIdx, endIdx);
    }
    return allDays;
  }, [allDays, daysCount, selectedWeek]);

  // Determine visible corridor sections
  const sectionsWithBlocks = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.section_id))).sort();
  }, [items]);

  const displaySections = useMemo(() => {
    let list = [...sectionsWithBlocks];
    if (departmentFilter !== "ALL") {
      const filteredByDept = items
        .filter((i) => i.department === departmentFilter)
        .map((i) => i.section_id);
      list = list.filter((sec) => filteredByDept.includes(sec));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((sec) => sec.toLowerCase().includes(q));
    }
    return list;
  }, [sectionsWithBlocks, departmentFilter, searchTerm, items]);

  // Index items by section, day date string, and band (DAY / NIGHT)
  const blocksByCell = useMemo(() => {
    const map = new Map<string, PlanItem[]>();

    items.forEach((item) => {
      const itemDate = new Date(item.start);
      const dayKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`;
      const hour = itemDate.getUTCHours();
      const band = hour >= 10 && hour < 14 ? "DAY" : "NIGHT";

      const keyDetailed = `${item.section_id}_${dayKey}_${band}`;
      const keyCompact = `${item.section_id}_${dayKey}`;

      // Index for both modes
      if (!map.has(keyDetailed)) map.set(keyDetailed, []);
      map.get(keyDetailed)!.push(item);

      if (!map.has(keyCompact)) map.set(keyCompact, []);
      map.get(keyCompact)!.push(item);
    });

    return map;
  }, [items]);

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center bg-card/40">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Calendar className="size-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No Blocks Scheduled</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Search, Dept Filter, Week Segmenter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border text-xs shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search section (e.g. NDLS)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-1 border-l pl-2.5">
            <Button
              variant={departmentFilter === "ALL" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDepartmentFilter("ALL")}
              className="h-7 text-xs px-2"
            >
              All
            </Button>
            {(["TMS", "SMMS", "TDMS"] as DepartmentKey[]).map((dept) => {
              const token = DEPARTMENT_TOKENS[dept];
              const isSelected = departmentFilter === dept;
              return (
                <Button
                  key={dept}
                  variant={isSelected ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDepartmentFilter(isSelected ? "ALL" : dept)}
                  className="h-7 text-xs px-2 gap-1"
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: token.hex }} />
                  {token.shortName}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 30-Day Week Navigation Tabs */}
        {daysCount === 30 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-[11px] font-medium hidden md:inline">
              View Week:
            </span>
            <Tabs value={selectedWeek} onValueChange={setSelectedWeek}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="all" className="text-[11px] px-2 h-6">
                  All 30d
                </TabsTrigger>
                <TabsTrigger value="1" className="text-[11px] px-2 h-6">
                  W1
                </TabsTrigger>
                <TabsTrigger value="2" className="text-[11px] px-2 h-6">
                  W2
                </TabsTrigger>
                <TabsTrigger value="3" className="text-[11px] px-2 h-6">
                  W3
                </TabsTrigger>
                <TabsTrigger value="4" className="text-[11px] px-2 h-6">
                  W4
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] shrink-0">
          <Layers className="size-3.5" />
          <span>
            Showing <strong className="text-foreground">{displaySections.length}</strong> active sections
          </span>
        </div>
      </div>

      {/* Gantt Matrix Grid */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div
            className="min-w-full inline-block align-middle"
            style={{
              minWidth:
                density === "detailed"
                  ? `${visibleDays.length * 280 + 180}px`
                  : `${visibleDays.length * 60 + 180}px`,
            }}
          >
            {/* Header Row: Days & Sub-Bands */}
            <div className="flex border-b bg-muted/40 text-xs select-none sticky top-0 z-20">
              {/* Sticky Left Header: Section Label */}
              <div className="w-[180px] shrink-0 p-2.5 font-bold uppercase tracking-wider text-muted-foreground border-r bg-muted/70 sticky left-0 z-30 flex items-center justify-between">
                <span>Corridor Section</span>
                <span className="text-[10px] font-normal text-muted-foreground/80 lowercase">
                  (NDLS ↔ CNB)
                </span>
              </div>

              {/* Day Columns */}
              <div className="flex grow">
                {visibleDays.map((day, dIdx) => {
                  const dayName = day.toLocaleDateString("en-IN", { weekday: "short" });
                  const dateNum = day.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

                  if (density === "detailed") {
                    return (
                      <div
                        key={dIdx}
                        className="flex-1 min-w-[280px] border-r last:border-r-0 flex flex-col"
                      >
                        {/* Day Title */}
                        <div className="py-1 px-2 font-semibold text-center border-b bg-muted/20 text-foreground">
                          {dayName}, {dateNum}
                        </div>
                        {/* Sub-Bands Header: Day (10-14) & Night (23-04) */}
                        <div className="grid grid-cols-2 text-[10px] font-mono text-center">
                          <div
                            className={`py-1 border-r ${MAINTENANCE_BAND_TOKENS.DAY.bgClass} ${MAINTENANCE_BAND_TOKENS.DAY.textClass}`}
                          >
                            Day (10:00–14:00)
                          </div>
                          <div
                            className={`py-1 ${MAINTENANCE_BAND_TOKENS.NIGHT.bgClass} ${MAINTENANCE_BAND_TOKENS.NIGHT.textClass}`}
                          >
                            Night (23:00–04:00)
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Compact Monthly Day Header
                  return (
                    <div
                      key={dIdx}
                      className="flex-1 min-w-[55px] p-1 text-center border-r last:border-r-0 flex flex-col justify-center"
                    >
                      <span className="text-[10px] font-semibold text-foreground">{dateNum}</span>
                      <span className="text-[9px] text-muted-foreground">{dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Body: Section Rows */}
            <div className="divide-y text-xs">
              {displaySections.map((sectionId) => (
                <div key={sectionId} className="flex hover:bg-muted/10 transition-colors">
                  {/* Sticky Section ID */}
                  <div className="w-[180px] shrink-0 p-2.5 font-mono font-bold text-foreground border-r bg-card sticky left-0 z-10 flex flex-col justify-center shadow-xs">
                    <span className="text-xs truncate">{sectionId}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      Track section
                    </span>
                  </div>

                  {/* Horizon Cells */}
                  <div className="flex grow">
                    {visibleDays.map((day, dIdx) => {
                      const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

                      if (density === "detailed") {
                        const dayBlocks = blocksByCell.get(`${sectionId}_${dayKey}_DAY`) || [];
                        const nightBlocks = blocksByCell.get(`${sectionId}_${dayKey}_NIGHT`) || [];

                        return (
                          <div
                            key={dIdx}
                            className="flex-1 min-w-[280px] border-r last:border-r-0 grid grid-cols-2"
                          >
                            {/* Day Band Cell */}
                            <div
                              className={`p-1.5 border-r min-h-[60px] flex flex-col gap-1.5 transition-colors ${
                                dayBlocks.length > 0
                                  ? MAINTENANCE_BAND_TOKENS.DAY.bgClass
                                  : "hover:bg-muted/5"
                              }`}
                            >
                              {dayBlocks.map((blk) => (
                                <BlockCard key={blk.block_id} item={blk} />
                              ))}
                            </div>

                            {/* Night Band Cell */}
                            <div
                              className={`p-1.5 min-h-[60px] flex flex-col gap-1.5 transition-colors ${
                                nightBlocks.length > 0
                                  ? MAINTENANCE_BAND_TOKENS.NIGHT.bgClass
                                  : "hover:bg-muted/5"
                              }`}
                            >
                              {nightBlocks.map((blk) => (
                                <BlockCard key={blk.block_id} item={blk} />
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Compact Mode: Single Day Cell
                      const dayBlocks = blocksByCell.get(`${sectionId}_${dayKey}`) || [];
                      return (
                        <div
                          key={dIdx}
                          className="flex-1 min-w-[55px] p-1 border-r last:border-r-0 min-h-[50px] flex flex-col gap-1 justify-center items-center"
                        >
                          {dayBlocks.map((blk) => (
                            <CompactBlockBadge key={blk.block_id} item={blk} />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Detailed Block Bar in Weekly View
function BlockCard({ item }: { item: PlanItem }) {
  const deptToken = getDepartmentToken(item.department as DepartmentKey);
  const isHard = item.has_hard_conflict;
  // PlanItemOut does not expose a dedicated relaxed boolean (only BlockExplainOut does), so we inspect the solver rationale string.
  const isRelaxed = item.reason.toLowerCase().includes("relaxed");
  const isLocked = Boolean(item.is_locked);

  const conflictToken = isHard
    ? CONFLICT_STATUS_TOKENS["hard-conflict"]
    : isRelaxed
    ? CONFLICT_STATUS_TOKENS.relaxed
    : CONFLICT_STATUS_TOKENS.clean;

  const startTime = new Date(item.start).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <GanttBlockPopover item={item}>
      <button
        type="button"
        className={cn(
          "w-full max-w-full overflow-hidden box-border text-left p-1.5 rounded-md cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border",
          isLocked
            ? "border-2 shadow-xs border-orange-400 dark:border-orange-600 ring-1 ring-orange-400/30"
            : isHard
            ? "border-2 shadow-md animate-pulse"
            : isRelaxed
            ? "border-2 shadow-xs"
            : "",
          !isLocked && conflictToken.borderClass
        )}
        style={{
          borderColor: isLocked
            ? LOCKED_STATUS_TOKEN.hex
            : isHard || isRelaxed
            ? conflictToken.hex
            : undefined,
          backgroundColor: isLocked
            ? LOCKED_STATUS_TOKEN.bgHex
            : isHard
            ? conflictToken.bgHex
            : deptToken.bgHex,
        }}
      >
        {/* Row 1: Department Badge and Start Time */}
        {/* Row 1: Department Badge, Locked Flag, and Start Time */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <Badge
            variant="outline"
            className="text-[9px] py-0 px-1 font-bold h-4 shrink-0"
            style={{ color: deptToken.hex, borderColor: deptToken.hex + "60" }}
          >
            {deptToken.shortName}
          </Badge>
          <div className="flex items-center gap-1 min-w-0">
            <Badge
              variant="outline"
              className="text-[9px] py-0 px-1 font-bold h-4 shrink-0"
              style={{ color: deptToken.hex, borderColor: deptToken.hex + "60" }}
            >
              {deptToken.shortName}
            </Badge>
            {isLocked && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] py-0 px-1 h-3.5 font-bold uppercase gap-0.5 shrink-0",
                  LOCKED_STATUS_TOKEN.badgeClass
                )}
              >
                <Lock className="size-2 shrink-0" />
                <span>Locked</span>
              </Badge>
            )}
          </div>
          <span className="font-mono text-[10px] font-bold text-foreground shrink-0">
            {startTime}
          </span>
        </div>

        {/* Row 2: Conflict/Relaxed Status Pill (if applicable) */}
        {(isHard || isRelaxed) && (
          <div className="mt-1 flex items-center justify-between gap-1 min-w-0">
            {isHard && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] py-0 px-1 h-3.5 font-bold uppercase gap-0.5 shrink-0 max-w-full",
                  CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass
                )}
              >
                <AlertTriangle className="size-2.5 shrink-0" />
                <span className="truncate">Clash ({item.conflict_count})</span>
              </Badge>
            )}
            {isRelaxed && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] py-0 px-1 h-3.5 font-bold uppercase shrink-0 max-w-full",
                  CONFLICT_STATUS_TOKENS.relaxed.badgeClass
                )}
              >
                <span>Relaxed</span>
              </Badge>
            )}
          </div>
        )}

        {/* Row 3: Job ID and Duration */}
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono min-w-0">
          <span className="truncate min-w-0" title={item.job_id}>
            {item.job_id}
          </span>
          <span className="font-semibold text-foreground shrink-0 ml-1">
            {item.duration_min}m
          </span>
        </div>
      </button>
    </GanttBlockPopover>
  );
}

// Sub-component: Compact Block Badge in 30-Day Monthly View
function CompactBlockBadge({ item }: { item: PlanItem }) {
  const deptToken = getDepartmentToken(item.department as DepartmentKey);
  const isHard = item.has_hard_conflict;
  // PlanItemOut does not expose a dedicated relaxed boolean (only BlockExplainOut does), so we inspect the solver rationale string.
  const isRelaxed = item.reason.toLowerCase().includes("relaxed");
  const isLocked = Boolean(item.is_locked);

  const conflictToken = isHard
    ? CONFLICT_STATUS_TOKENS["hard-conflict"]
    : isRelaxed
    ? CONFLICT_STATUS_TOKENS.relaxed
    : CONFLICT_STATUS_TOKENS.clean;

  return (
    <GanttBlockPopover item={item}>
      <button
        type="button"
        className={cn(
          "size-6 rounded-full flex items-center justify-center font-bold text-[9px] text-white cursor-pointer shadow-xs transition-transform hover:scale-110",
          isLocked
            ? "ring-2 ring-offset-1 ring-orange-500"
            : isHard
            ? "ring-2 ring-offset-1 animate-pulse ring-red-500"
            : isRelaxed
            ? "ring-2 ring-offset-1 ring-amber-500"
            : ""
        )}
        style={{
          boxShadow: isHard || isRelaxed ? `0 0 0 2px ${conflictToken.hex}` : undefined,
          backgroundColor: isLocked
            ? LOCKED_STATUS_TOKEN.hex
            : isHard
            ? conflictToken.hex
            : deptToken.hex,
        }}
        title={`${item.job_id} (${item.department})${isLocked ? " — LOCKED OVERRIDE" : isHard ? " — HARD CLASH" : isRelaxed ? " — Relaxed" : ""}`}
      >
        {isLocked ? <Lock className="size-3" /> : isHard ? "!" : item.department[0]}
      </button>
    </GanttBlockPopover>
  );
}
