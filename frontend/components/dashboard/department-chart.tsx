"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { DEPARTMENT_TOKENS, type DepartmentKey } from "@/lib/theme/tokens";
import type { MaintenanceJob } from "@/lib/api/hooks";

interface DepartmentChartProps {
  jobs?: MaintenanceJob[];
  isLoading?: boolean;
}

const chartConfig = {
  count: {
    label: "Job Count",
  },
  TMS: {
    label: DEPARTMENT_TOKENS.TMS.name,
    color: DEPARTMENT_TOKENS.TMS.hex,
  },
  SMMS: {
    label: DEPARTMENT_TOKENS.SMMS.name,
    color: DEPARTMENT_TOKENS.SMMS.hex,
  },
  TDMS: {
    label: DEPARTMENT_TOKENS.TDMS.name,
    color: DEPARTMENT_TOKENS.TDMS.hex,
  },
} satisfies ChartConfig;

export function DepartmentChart({ jobs = [], isLoading = false }: DepartmentChartProps) {
  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full flex flex-col justify-end gap-2 p-4">
            <Skeleton className="h-[240px] w-full rounded-md" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate departmental distribution and average priority score
  const departments: DepartmentKey[] = ["TMS", "SMMS", "TDMS"];

  const stats = departments.map((dept) => {
    const deptJobs = jobs.filter((j) => j.department.toUpperCase() === dept);
    const count = deptJobs.length;
    const avgPriority =
      count > 0
        ? deptJobs.reduce((sum, j) => sum + (j.priority_score ?? 0), 0) / count
        : 0;

    return {
      department: dept,
      label: DEPARTMENT_TOKENS[dept].shortName,
      name: DEPARTMENT_TOKENS[dept].name,
      count,
      avgPriority: Number(avgPriority.toFixed(2)),
      fill: DEPARTMENT_TOKENS[dept].hex,
    };
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          Departmental Job Distribution
        </CardTitle>
        <CardDescription>
          Active maintenance requests and workload breakdown across TMS, SMMS, and TDMS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart
              data={stats}
              margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs font-semibold"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs text-muted-foreground"
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                content={
                  <ChartTooltipContent
                    hideLabel={false}
                    formatter={(value, name, item) => (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground">
                          {value} Jobs
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Avg Priority: {item.payload.avgPriority}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.map((entry) => (
                  <Cell key={`cell-${entry.department}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Detailed department breakdown footer tiles */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
          {stats.map((entry) => {
            const token = DEPARTMENT_TOKENS[entry.department];
            return (
              <div
                key={entry.department}
                className="flex flex-col p-3 rounded-lg border bg-card/60 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: token.hex }}
                    />
                    {token.shortName}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: token.bgHex,
                      color: token.hex,
                    }}
                  >
                    {entry.count} jobs
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground flex justify-between">
                  <span>Avg Priority</span>
                  <span className="font-medium text-foreground">
                    {entry.avgPriority}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

