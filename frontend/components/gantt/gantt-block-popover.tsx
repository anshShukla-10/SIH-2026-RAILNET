"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Warning as AlertTriangle,
  Clock,
  ArrowSquareOut as ExternalLink,
  MapPin,
  Lightning as Zap,
} from "@phosphor-icons/react/dist/ssr";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  getDepartmentToken,
  getMaintenanceBandToken,
  CONFLICT_STATUS_TOKENS,
  type DepartmentKey,
} from "@/lib/theme/tokens";
import type { PlanItem } from "@/lib/api/hooks";

interface GanttBlockPopoverProps {
  item: PlanItem;
  children: React.ReactNode;
}

export function GanttBlockPopover({ item, children }: GanttBlockPopoverProps) {
  const deptToken = getDepartmentToken(item.department as DepartmentKey);
  const bandToken = getMaintenanceBandToken(item.start);

  // Format dates & times
  const startDate = new Date(item.start);
  const endDate = new Date(item.end);

  const dateLabel = startDate.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeRange = `${startDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} – ${endDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;

  const isHard = item.has_hard_conflict;
  const isRelaxed = item.reason.toLowerCase().includes("relaxed");

  return (
    <Popover>
      <PopoverTrigger nativeButton={true} render={children as React.ReactElement} />
      <PopoverContent className="w-80 p-3.5 space-y-3" align="start">
        {/* Header: IDs and Department */}
        <div className="flex items-start justify-between gap-2 pb-2 border-b">
          <div className="space-y-0.5">
            <span className="font-mono font-bold text-xs text-foreground block">
              {item.block_id}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground block">
              {item.job_id}
            </span>
          </div>
          <Badge variant="outline" className={deptToken.badgeClass}>
            <span className={`size-1.5 rounded-full mr-1.5 ${deptToken.dotClass}`} />
            {deptToken.shortName}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 text-xs">
          {/* Section */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3" />
              <span>Section:</span>
            </span>
            <span className="font-mono font-semibold text-foreground">
              {item.section_id}
            </span>
          </div>

          {/* Time & Duration */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              <span>Schedule:</span>
            </span>
            <span className="font-mono font-medium text-foreground text-right">
              {dateLabel}, {timeRange}
            </span>
          </div>

          {/* Duration & Band */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Window / Band:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold">{item.duration_min} min</span>
              <Badge variant="outline" className={bandToken.badgeClass}>
                {bandToken.name}
              </Badge>
            </div>
          </div>

          {/* Priority Score */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="size-3" />
              <span>Priority Score:</span>
            </span>
            <span className="font-mono font-bold text-foreground">
              {item.priority_score.toFixed(1)}
            </span>
          </div>

          {/* Conflict Status */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted-foreground">Conflict Status:</span>
            {isHard ? (
              <Badge
                variant="outline"
                className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}
              >
                <AlertTriangle className="size-3 mr-1" />
                Hard Clash ({item.conflict_count})
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

          {/* Solver Reason / Explainability */}
          {item.reason && (
            <div className="pt-2 border-t text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground block mb-0.5">Solver Note:</span>
              <p className="bg-muted/50 p-1.5 rounded border border-border/50">
                {item.reason}
              </p>
            </div>
          )}
        </div>

        {/* Footer Link to Explainability Detail */}
        <div className="pt-2 border-t">
          <Link
            href={`/blocks/${item.job_id}`}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <span>Detailed Block Audit & Explainability</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
