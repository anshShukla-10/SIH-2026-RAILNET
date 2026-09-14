"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle as CheckCircle2, Database, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { DATA_SOURCE_TOKENS, DEPARTMENT_TOKENS } from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

interface ProvenanceBadgeProps {
  sourceNote?: string;
  trainCount?: number;
  sectionCount?: number;
  jobCount?: number;
}

export function ProvenanceBadge({
  sourceNote = "Generated — TMS/SMMS/TDMS are internal railway systems not publicly accessible",
  trainCount,
  sectionCount,
  jobCount,
}: ProvenanceBadgeProps) {
  return (
    <Card className={cn("border shadow-xs", DEPARTMENT_TOKENS.TMS.borderClass, DEPARTMENT_TOKENS.TMS.bgClass)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("flex size-8 items-center justify-center rounded-lg text-white shadow-xs", DEPARTMENT_TOKENS.TMS.dotClass)}>
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Data Provenance & Transparency
                </h3>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", DEPARTMENT_TOKENS.TMS.badgeClass)}>
                  SIH26027 Audit Trail
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Authentic railway schedule integration paired with realistic synthetic departmental workloads.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Real Data Block */}
          <div className={cn("flex items-start gap-2.5 p-3 rounded-md border", DATA_SOURCE_TOKENS.real.bgClass, DATA_SOURCE_TOKENS.real.borderClass)}>
            <CheckCircle2 className={cn("size-4 mt-0.5 shrink-0", DATA_SOURCE_TOKENS.real.textClass)} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-semibold", DATA_SOURCE_TOKENS.real.textClass)}>
                  Real Operational Timetable (RailRadar API)
                </span>
                {trainCount !== undefined && (
                  <span className={cn("text-[10px] font-mono px-1.5 rounded", DATA_SOURCE_TOKENS.real.badgeClass)}>
                    {trainCount} Trains {sectionCount ? `· ${sectionCount} Sections` : ""}
                  </span>
                )}
              </div>
              <p className={cn("leading-relaxed text-[11px]", DATA_SOURCE_TOKENS.real.textClass)}>
                High-density Northern/North Central trunk corridor (NDLS → GZB → ALJN → TDL → CNB).
                Scheduled passenger and freight train timings are queried directly from live Indian Railways feeds.
              </p>
            </div>
          </div>

          {/* Synthetic Workload Block */}
          <div className={cn("flex items-start gap-2.5 p-3 rounded-md border", DATA_SOURCE_TOKENS.synthetic.bgClass, DATA_SOURCE_TOKENS.synthetic.borderClass)}>
            <Database className={cn("size-4 mt-0.5 shrink-0", DATA_SOURCE_TOKENS.synthetic.textClass)} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-semibold", DATA_SOURCE_TOKENS.synthetic.textClass)}>
                  Synthetic Maintenance Inventory
                </span>
                {jobCount !== undefined && (
                  <span className={cn("text-[10px] font-mono px-1.5 rounded", DATA_SOURCE_TOKENS.synthetic.badgeClass)}>
                    {jobCount} Synthetic Jobs
                  </span>
                )}
              </div>
              <p className={cn("leading-relaxed text-[11px]", DATA_SOURCE_TOKENS.synthetic.textClass)}>
                <strong>Source Note:</strong> &ldquo;{sourceNote}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
