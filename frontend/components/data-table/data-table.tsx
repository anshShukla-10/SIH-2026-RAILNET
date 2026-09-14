"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CaretLeft as ChevronLeft, CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  initialSorting?: SortingState;
  manualPagination?: boolean;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (row: TData) => void;
  toolbar?: React.ReactNode;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records found.",
  initialSorting = [],
  manualPagination = false,
  pageIndex = 0,
  pageSize = 10,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  toolbar,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [pagination, setPagination] = React.useState({
    pageIndex: pageIndex,
    pageSize: pageSize,
  });

  // Sync internal pagination state if controlled externally
  React.useEffect(() => {
    setPagination({ pageIndex, pageSize });
  }, [pageIndex, pageSize]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: manualPagination ? { pageIndex, pageSize } : pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    manualPagination,
    pageCount: manualPagination && totalCount !== undefined ? Math.ceil(totalCount / pageSize) : undefined,
  });

  const currentPage = manualPagination ? pageIndex : table.getState().pagination.pageIndex;
  const currentSize = manualPagination ? pageSize : table.getState().pagination.pageSize;
  const pageCount = manualPagination && totalCount !== undefined
    ? Math.max(1, Math.ceil(totalCount / currentSize))
    : table.getPageCount();

  const handlePrev = () => {
    if (manualPagination) {
      onPageChange?.(Math.max(0, currentPage - 1));
    } else {
      table.previousPage();
    }
  };

  const handleNext = () => {
    if (manualPagination) {
      onPageChange?.(currentPage + 1);
    } else {
      table.nextPage();
    }
  };

  const canPrev = manualPagination ? currentPage > 0 : table.getCanPreviousPage();
  const canNext = manualPagination
    ? (totalCount !== undefined ? (currentPage + 1) * currentSize < totalCount : data.length === currentSize)
    : table.getCanNextPage();

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar && <div className="flex flex-wrap items-center justify-between gap-4">{toolbar}</div>}

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-11 px-4 text-xs font-semibold text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skeleton-row-${idx}`} className="border-b">
                  {columns.map((_, colIdx) => (
                    <TableCell key={`skeleton-cell-${idx}-${colIdx}`} className="p-4">
                      <Skeleton className="h-5 w-full max-w-[140px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "border-b transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Table Pagination Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 text-xs text-muted-foreground">
        <div>
          {totalCount !== undefined ? (
            <span>
              Showing{" "}
              <strong className="text-foreground">
                {data.length > 0 ? currentPage * currentSize + 1 : 0}
              </strong>{" "}
              to{" "}
              <strong className="text-foreground">
                {Math.min((currentPage + 1) * currentSize, totalCount)}
              </strong>{" "}
              of <strong className="text-foreground">{totalCount}</strong> entries
            </span>
          ) : (
            <span>
              Page <strong className="text-foreground">{currentPage + 1}</strong> of{" "}
              <strong className="text-foreground">{Math.max(1, pageCount)}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs">Rows per page:</span>
            <Select
              value={`${currentSize}`}
              onValueChange={(value) => {
                const newSize = Number(value);
                if (manualPagination) {
                  onPageSizeChange?.(newSize);
                } else {
                  table.setPageSize(newSize);
                }
              }}
            >
              <SelectTrigger className="h-8 w-18 text-xs">
                <SelectValue placeholder={`${currentSize}`} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={`${size}`} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handlePrev}
              disabled={!canPrev}
              title="Previous Page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              {currentPage + 1} / {Math.max(1, pageCount)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleNext}
              disabled={!canNext}
              title="Next Page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
