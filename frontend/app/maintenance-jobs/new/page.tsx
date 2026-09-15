"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeft,
  CheckCircle,
  PlusCircle,
  MagnifyingGlass as SearchIcon,
  CalendarBlank,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

import { useSections, useCreateMaintenanceJob, type MaintenanceJob } from "@/lib/api/hooks";
import {
  PRIORITY_FACTOR_TOKENS,
  getDepartmentToken,
} from "@/lib/theme/tokens";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Strict Zod schema matching backend MaintenanceJobCreateIn
const jobFormSchema = z.object({
  department: z.enum(["TMS", "SMMS", "TDMS"]),
  asset_id: z
    .string()
    .min(2, "Asset ID must be at least 2 characters")
    .max(50, "Asset ID cannot exceed 50 characters")
    .trim(),
  section_id: z.string().min(1, "Please select an active corridor section"),
  defect_desc: z
    .string()
    .min(5, "Defect description must be at least 5 characters")
    .max(500, "Defect description cannot exceed 500 characters")
    .trim(),
  criticality: z.number().min(0).max(100),
  urgency: z.number().min(0).max(100),
  asset_risk: z.number().min(0).max(100),
  overdue_factor: z.number().min(0).max(100),
  failure_history: z.number().min(0).max(100),
  due_date: z.string().min(10, "Please select a valid due date (YYYY-MM-DD)"),
  duration_min: z
    .number()
    .int()
    .min(15, "Minimum duration is 15 minutes")
    .max(720, "Maximum duration is 720 minutes (12 hours)"),
  day_night_pref: z.enum(["ANY", "DAY", "NIGHT"]),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export default function NewMaintenanceJobPage() {
  const { data: sections = [], isLoading: isSectionsLoading } = useSections();
  const createJobMutation = useCreateMaintenanceJob();

  // Created job state for displaying backend priority score
  const [createdJob, setCreatedJob] = useState<MaintenanceJob | null>(null);
  const [sectionSearch, setSectionSearch] = useState("");
  const [isSectionOpen, setIsSectionOpen] = useState(false);

  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      department: "TMS",
      asset_id: "",
      section_id: "",
      defect_desc: "",
      criticality: 60,
      urgency: 50,
      asset_risk: 40,
      overdue_factor: 30,
      failure_history: 20,
      due_date: defaultDate,
      duration_min: 120,
      day_night_pref: "NIGHT",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const selectedDept = watch("department");
  const selectedSectionId = watch("section_id");
  const deptToken = getDepartmentToken(selectedDept);

  // Filter sections for searchable select
  const filteredSections = useMemo(() => {
    if (!sectionSearch.trim()) return sections.slice(0, 50);
    const q = sectionSearch.toLowerCase();
    return sections
      .filter(
        (s) =>
          s.section_id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [sections, sectionSearch]);

  const selectedSectionObj = useMemo(() => {
    return sections.find((s) => s.section_id === selectedSectionId);
  }, [sections, selectedSectionId]);

  const onSubmit = async (values: JobFormValues) => {
    try {
      const result = await createJobMutation.mutateAsync({
        department: values.department,
        asset_id: values.asset_id,
        section_id: values.section_id,
        defect_desc: values.defect_desc,
        criticality: values.criticality,
        urgency: values.urgency,
        asset_risk: values.asset_risk,
        overdue_factor: values.overdue_factor,
        failure_history: values.failure_history,
        due_date: values.due_date,
        duration_min: values.duration_min,
        day_night_pref: values.day_night_pref,
      });
      setCreatedJob(result);
    } catch (err: unknown) {
      console.error("Failed to create maintenance job:", err);
    }
  };

  if (createdJob) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <Link
          href="/maintenance-jobs"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-xs text-muted-foreground")}
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Maintenance Jobs</span>
        </Link>

        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/50 shadow-sm">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 mb-2">
              <CheckCircle className="size-6" />
            </div>
            <CardTitle className="text-xl text-foreground font-bold">
              Maintenance Job Created Successfully
            </CardTitle>
            <CardDescription className="text-xs">
              Job <code className="font-mono font-bold text-foreground">{createdJob.job_id}</code> is registered in NeonDB and queued for CP-SAT optimization.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Computed Priority Score Banner */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">
                  Official Statutory Priority Score
                </span>
                <span className="text-[11px] text-muted-foreground/80">
                  Computed transparently by backend 5-factor model (30/25/20/15/10)
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xl font-mono font-bold text-primary">
                  {Number(createdJob.priority_score).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground block">/ 100 pts</span>
              </div>
            </div>

            {/* Key Job Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-card text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Department</span>
                <Badge variant="outline" className={cn("mt-0.5", deptToken.badgeClass)}>
                  {createdJob.department}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Asset ID</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 block">
                  {createdJob.asset_id}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Corridor Section</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 block">
                  {createdJob.section_id}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Required Duration</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {createdJob.duration_min} minutes
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Band Preference</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {createdJob.day_night_pref}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Due Date</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 block">
                  {createdJob.due_date}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic text-center">
              &quot;{createdJob.defect_desc}&quot;
            </p>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/maintenance-jobs"
              className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto text-xs")}
            >
              View in Maintenance Jobs Table →
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreatedJob(null);
                form.reset();
              }}
              className="w-full sm:w-auto text-xs"
            >
              Create Another Job
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href="/maintenance-jobs"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-xs text-muted-foreground -ml-2 mb-1")}
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Maintenance Jobs</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PlusCircle className="size-6 text-primary" />
            Create Manual Maintenance Job
          </h1>
          <p className="text-xs text-muted-foreground">
            Register an ad-hoc or emergency railway defect directly into the corridor database with transparent priority scoring.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Department & Asset Selection */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">1. Department & Asset Identification</CardTitle>
            <CardDescription className="text-xs">
              Select the responsible engineering division and specific permanent way or OHE asset.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Department *</label>
              <select
                {...register("department")}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="TMS">TMS (Track / Civil)</option>
                <option value="SMMS">SMMS (Signalling & Telecom)</option>
                <option value="TDMS">TDMS (Traction / Electrical)</option>
              </select>
              {errors.department && (
                <p className="text-[11px] text-destructive">{errors.department.message}</p>
              )}
            </div>

            {/* Asset ID */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Asset ID / Track Unit *</label>
              <Input
                {...register("asset_id")}
                placeholder="e.g. TRK-KM-142-UP or SIG-GZB-XING-4"
                className="h-8 text-xs font-mono"
              />
              {errors.asset_id && (
                <p className="text-[11px] text-destructive">{errors.asset_id.message}</p>
              )}
            </div>

            {/* Section ID (Searchable select) */}
            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-xs font-semibold text-foreground">Corridor Track Section *</label>
              <Popover open={isSectionOpen} onOpenChange={setIsSectionOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-mono text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    !selectedSectionId && "text-muted-foreground"
                  )}
                >
                  {selectedSectionObj ? (
                    <span className="truncate">
                      <strong className="text-foreground">{selectedSectionObj.section_id}</strong> — {selectedSectionObj.name} ({selectedSectionObj.single_line ? "Single Line" : "Double Line"})
                    </span>
                  ) : (
                    <span>{isSectionsLoading ? "Loading corridor sections..." : "Search and select corridor section..."}</span>
                  )}
                  <SearchIcon className="size-3.5 text-muted-foreground shrink-0 ml-2" />
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-3rem)] sm:w-96 p-2" align="start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 border rounded-md bg-muted/40">
                      <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Search by code, station name..."
                        value={sectionSearch}
                        onChange={(e) => setSectionSearch(e.target.value)}
                        className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {filteredSections.map((sec) => (
                        <button
                          type="button"
                          key={sec.section_id}
                          onClick={() => {
                            setValue("section_id", sec.section_id, { shouldValidate: true });
                            setIsSectionOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-xs transition-colors hover:bg-muted flex flex-col font-mono",
                            selectedSectionId === sec.section_id && "bg-primary/10 text-primary font-bold"
                          )}
                        >
                          <span className="font-bold">{sec.section_id}</span>
                          <span className="text-[11px] text-muted-foreground font-sans truncate">
                            {sec.name} · {sec.single_line ? "Single Line" : "Double Line"}
                          </span>
                        </button>
                      ))}
                      {filteredSections.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          No sections match &quot;{sectionSearch}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              {errors.section_id && (
                <p className="text-[11px] text-destructive">{errors.section_id.message}</p>
              )}
            </div>

            {/* Defect Description */}
            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-xs font-semibold text-foreground">Defect Description *</label>
              <Textarea
                {...register("defect_desc")}
                placeholder="Describe track defect, ultrasonic flaw detection finding, or OHE cantilever inspection requirement..."
                className="text-xs min-h-16"
              />
              {errors.defect_desc && (
                <p className="text-[11px] text-destructive">{errors.defect_desc.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Scoring Sliders (5 Statutory Factors) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>2. Multi-Factor Priority Evaluation (0 – 100)</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Formula: 0.30·C + 0.25·U + 0.20·R + 0.15·O + 0.10·F
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Rate each mathematical parameter. The backend engine computes the composite score transparently upon submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Factor 1: Criticality (30%) */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-600" />
                  {PRIORITY_FACTOR_TOKENS.criticality.name} (Weight: 30%)
                </span>
                <span className="font-mono font-bold text-foreground">{watch("criticality")} / 100</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  {...register("criticality")}
                  className="w-full accent-blue-600 h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("criticality")}
                  className="w-16 h-7 text-xs font-mono text-right"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Structural severity and safety hazard (e.g. rail weld fracture vs surface corrosion).
              </p>
            </div>

            {/* Factor 2: Urgency (25%) */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  {PRIORITY_FACTOR_TOKENS.urgency.name} (Weight: 25%)
                </span>
                <span className="font-mono font-bold text-foreground">{watch("urgency")} / 100</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  {...register("urgency")}
                  className="w-full accent-amber-500 h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("urgency")}
                  className="w-16 h-7 text-xs font-mono text-right"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Time sensitivity before operational speed restrictions or cautionary orders must be imposed.
              </p>
            </div>

            {/* Factor 3: Asset Risk (20%) */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-violet-600" />
                  {PRIORITY_FACTOR_TOKENS.assetRisk.name} (Weight: 20%)
                </span>
                <span className="font-mono font-bold text-foreground">{watch("asset_risk")} / 100</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  {...register("asset_risk")}
                  className="w-full accent-violet-600 h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("asset_risk")}
                  className="w-16 h-7 text-xs font-mono text-right"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Probability of collateral asset degradation or secondary equipment failure.
              </p>
            </div>

            {/* Factor 4: Overdue Factor (15%) */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-600" />
                  {PRIORITY_FACTOR_TOKENS.overdueFactor.name} (Weight: 15%)
                </span>
                <span className="font-mono font-bold text-foreground">{watch("overdue_factor")} / 100</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  {...register("overdue_factor")}
                  className="w-full accent-red-600 h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("overdue_factor")}
                  className="w-16 h-7 text-xs font-mono text-right"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Days elapsed since statutory inspection due date or scheduled maintenance cycle.
              </p>
            </div>

            {/* Factor 5: Failure History (10%) */}
            <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  {PRIORITY_FACTOR_TOKENS.failureHistory.name} (Weight: 10%)
                </span>
                <span className="font-mono font-bold text-foreground">{watch("failure_history")} / 100</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  {...register("failure_history")}
                  className="w-full accent-emerald-600 h-1.5 bg-muted rounded-lg cursor-pointer"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("failure_history")}
                  className="w-16 h-7 text-xs font-mono text-right"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Historical frequency of signal or track dropouts at this specific corridor asset.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling Constraints */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">3. Operational Scheduling Constraints</CardTitle>
            <CardDescription className="text-xs">
              Required block window length, due date horizon, and day/night corridor band preference.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Duration Min */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Clock className="size-3.5 text-muted-foreground" />
                Duration (minutes) *
              </label>
              <Input
                type="number"
                min="15"
                max="720"
                step="15"
                {...register("duration_min")}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">e.g. 90, 120, 180 min</p>
              {errors.duration_min && (
                <p className="text-[11px] text-destructive">{errors.duration_min.message}</p>
              )}
            </div>

            {/* Day/Night Preference */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Time Band Preference *</label>
              <select
                {...register("day_night_pref")}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="NIGHT">NIGHT (23:00 – 04:00)</option>
                <option value="DAY">DAY (10:00 – 14:00)</option>
                <option value="ANY">ANY (No Band Restriction)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">Heavy work preferred in night band</p>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <CalendarBlank className="size-3.5 text-muted-foreground" />
                Statutory Due Date *
              </label>
              <Input
                type="date"
                {...register("due_date")}
                className="h-8 text-xs font-mono"
              />
              {errors.due_date && (
                <p className="text-[11px] text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Server Error Alert if any */}
        {createJobMutation.isError && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <WarningCircle className="size-4 shrink-0" />
            <span>
              Failed to register job: {(createJobMutation.error as Error)?.message || "Internal server error"}
            </span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/maintenance-jobs"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || createJobMutation.isPending}
            size="sm"
            className="text-xs gap-1.5"
          >
            {createJobMutation.isPending ? (
              <span>Saving & Computing Score...</span>
            ) : (
              <>
                <PlusCircle className="size-4" />
                <span>Register Maintenance Job</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

