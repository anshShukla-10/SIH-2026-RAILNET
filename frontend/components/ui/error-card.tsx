"use client";

import { WarningCircle as AlertCircle, ArrowClockwise as RefreshCw, CloudSlash as ServerOff } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiBaseUrl } from "@/lib/api/client";
import { CONFLICT_STATUS_TOKENS } from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorCard({
  title = "Backend Service Unavailable",
  message = "Could not load data from the RAILNET-AI backend API.",
  onRetry,
  className,
}: ErrorCardProps) {
  const baseUrl = getApiBaseUrl();
  const token = CONFLICT_STATUS_TOKENS["hard-conflict"];

  return (
    <Card className={cn("border shadow-sm", token.borderClass, token.bgClass, className)}>
      <CardHeader className="text-center pb-2 pt-6">
        <div className={cn("mx-auto flex size-12 items-center justify-center rounded-full mb-3", token.bgClass, token.textClass)}>
          <ServerOff className="size-6" />
        </div>
        <CardTitle className={cn("text-lg font-bold", token.textClass)}>
          {title}
        </CardTitle>
        <CardDescription className={cn("text-sm opacity-80 max-w-md mx-auto mt-1", token.textClass)}>
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center pb-6">
        <div className={cn("rounded-md border bg-background/80 p-3 text-xs text-muted-foreground max-w-md mx-auto space-y-1", token.borderClass)}>
          <div className="flex items-center justify-center gap-1.5 font-medium text-foreground">
            <AlertCircle className={cn("size-3.5", token.textClass)} />
            <span>Connection Troubleshooting</span>
          </div>
          <p>
            Target API URL: <code className={cn("font-mono font-semibold", token.textClass)}>{baseUrl}</code>
          </p>
          <p className="text-[11px]">
            Please ensure the FastAPI service is running. Check the Health Indicator in the sidebar or header.
          </p>
        </div>

        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className={cn("hover:bg-muted/50", token.borderClass, token.textClass)}
          >
            <RefreshCw className="mr-2 size-4" />
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

