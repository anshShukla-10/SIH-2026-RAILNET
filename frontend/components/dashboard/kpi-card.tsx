"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value?: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function KpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
  isLoading = false,
  className,
  children,
}: KpiCardProps) {
  return (
    <Card className={cn("relative overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          {isLoading ? (
            <Skeleton className="h-4 w-28" />
          ) : (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          )}
        </div>
        {isLoading ? (
          <Skeleton className="size-8 rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5">
            {badge && <div>{badge}</div>}
            {Icon && (
              <div className="flex size-8 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                <Icon className="size-4" />
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </div>
            {subtext && (
              <div className="text-xs text-muted-foreground leading-relaxed">
                {subtext}
              </div>
            )}
          </>
        )}

        {children && (
          <div className="pt-2 mt-2 border-t border-border/50">
            {isLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ) : (
              children
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

