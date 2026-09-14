"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/hooks";
import { CONFLICT_STATUS_TOKENS } from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

interface HealthResponse {
  status: string;
}

interface HealthIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function HealthIndicator({ className, showDetails = true }: HealthIndicatorProps) {
  const { data, isSuccess, isLoading } = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiFetch<HealthResponse>("/health"),
    refetchInterval: 10_000,
    retry: 1,
  });

  const isConnected = isSuccess && data?.status === "ok";
  const activeToken = isConnected
    ? CONFLICT_STATUS_TOKENS.clean
    : isLoading
    ? CONFLICT_STATUS_TOKENS.relaxed
    : CONFLICT_STATUS_TOKENS["hard-conflict"];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
        activeToken.bgClass,
        activeToken.borderClass,
        activeToken.textClass,
        className
      )}
      title={
        isConnected
          ? "Backend API is online and responding at /health"
          : isLoading
          ? "Checking backend health status..."
          : "Backend API is unreachable. Ensure the FastAPI server is running on http://localhost:8000"
      }
    >
      <span className="relative flex size-2">
        {isConnected ? (
          <>
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", activeToken.dotClass)} />
            <span className={cn("relative inline-flex rounded-full size-2", activeToken.dotClass)} />
          </>
        ) : isLoading ? (
          <span className={cn("relative inline-flex rounded-full size-2 animate-pulse", activeToken.dotClass)} />
        ) : (
          <span className={cn("relative inline-flex rounded-full size-2", activeToken.dotClass)} />
        )}
      </span>

      {showDetails && (
        <span className="font-medium select-none truncate">
          {isConnected
            ? "Backend Connected"
            : isLoading
            ? "Checking..."
            : "Backend Unreachable"}
        </span>
      )}
    </div>
  );
}

