"use client";

import React from "react";
import { type Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowsDownUp as ArrowUpDown } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(isSorted === "asc")}
      >
        <span>{title}</span>
        {isSorted === "desc" ? (
          <ArrowDown className="ml-2 size-3.5 text-primary" />
        ) : isSorted === "asc" ? (
          <ArrowUp className="ml-2 size-3.5 text-primary" />
        ) : (
          <ArrowUpDown className="ml-2 size-3.5 opacity-50" />
        )}
      </Button>
    </div>
  );
}

