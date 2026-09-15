"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  DEPARTMENT_TOKENS,
  MAINTENANCE_BAND_TOKENS,
  CONFLICT_STATUS_TOKENS,
  LOCKED_STATUS_TOKEN,
  type DepartmentKey,
} from "@/lib/theme/tokens";
import { ShieldCheck, Warning as AlertTriangle, Lock } from "@phosphor-icons/react/dist/ssr";

export function GanttLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3.5 rounded-lg border bg-card/60 text-xs shadow-xs">
      {/* 1. Department Workloads */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">Departments:</span>
        <div className="flex items-center gap-1.5">
          {(["TMS", "SMMS", "TDMS"] as DepartmentKey[]).map((dept) => {
            const token = DEPARTMENT_TOKENS[dept];
            return (
              <Badge key={dept} variant="outline" className={token.badgeClass}>
                <span className={`size-1.5 rounded-full mr-1.5 ${token.dotClass}`} />
                {token.shortName}
              </Badge>
            );
          })}
        </div>
      </div>

      <span className="hidden sm:inline text-border">|</span>

      {/* 2. Maintenance Bands */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">Bands:</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={MAINTENANCE_BAND_TOKENS.DAY.badgeClass}>
            <span
              className="size-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: MAINTENANCE_BAND_TOKENS.DAY.hex }}
            />
            Day ({MAINTENANCE_BAND_TOKENS.DAY.hours})
          </Badge>
          <Badge variant="outline" className={MAINTENANCE_BAND_TOKENS.NIGHT.badgeClass}>
            <span
              className="size-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: MAINTENANCE_BAND_TOKENS.NIGHT.hex }}
            />
            Night ({MAINTENANCE_BAND_TOKENS.NIGHT.hours})
          </Badge>
        </div>
      </div>

      <span className="hidden sm:inline text-border">|</span>

      {/* 3. Conflict Outlines */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">Invariants:</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.clean.badgeClass}>
            <ShieldCheck className="size-3 mr-1" />
            Zero Conflicts
          </Badge>
          <Badge variant="outline" className={CONFLICT_STATUS_TOKENS.relaxed.badgeClass}>
            Relaxed Window
          </Badge>
          <Badge variant="outline" className={CONFLICT_STATUS_TOKENS["hard-conflict"].badgeClass}>
            <AlertTriangle className="size-3 mr-1" />
            Hard Clash
          </Badge>
        </div>
      </div>

      <span className="hidden sm:inline text-border">|</span>

      {/* 4. Scheduling Allocation Mode */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">Allocation:</span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
            CP-SAT Optimizer
          </Badge>
          <Badge variant="outline" className={LOCKED_STATUS_TOKEN.badgeClass}>
            <Lock className="size-3 mr-1" />
            Manual Override
          </Badge>
        </div>
      </div>
    </div>
  );
}

