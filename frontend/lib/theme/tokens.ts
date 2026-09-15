/**
 * Centralized Design System Theme Tokens
 *
 * Problem Statement: SIH26027 · Ministry of Railways
 * Source of Truth: frontend/prd.md Section 6
 *
 * NOTE: This file is the SOLE location where department and status colors are defined.
 * No component or page should hardcode hex codes or Tailwind color classes for
 * department or status meanings.
 */

export type DepartmentKey = "TMS" | "SMMS" | "TDMS";
export type ConflictStatusKey = "clean" | "relaxed" | "hard-conflict";
export type LifecycleStatusKey = "PENDING" | "SCHEDULED" | "GRANTED";

export interface ColorToken {
  key: string;
  name: string;
  shortName: string;
  description: string;
  /** Primary hex color used for SVG, Recharts, and custom Canvas/Grid renders */
  hex: string;
  /** Light accent hex background */
  bgHex: string;
  /** Tailwind class for background */
  bgClass: string;
  /** Tailwind class for text color */
  textClass: string;
  /** Tailwind class for border color */
  borderClass: string;
  /** Ready-to-use composite Tailwind class string for Badges / chips */
  badgeClass: string;
  /** Indicator dot class */
  dotClass: string;
}

/**
 * Department Tokens:
 * - TMS: Track Management System (Civil / Permanent Way)
 * - SMMS: Signalling Maintenance Management System (S&T)
 * - TDMS: Traction Distribution Management System (Electrical / OHE)
 */
export const DEPARTMENT_TOKENS: Record<DepartmentKey, ColorToken> = {
  TMS: {
    key: "TMS",
    name: "Track Management System",
    shortName: "TMS",
    description: "Civil track, rails, sleepers, and ballast maintenance",
    hex: "#2563eb", // Blue-600
    bgHex: "#eff6ff", // Blue-50
    bgClass: "bg-blue-50 dark:bg-blue-950/60",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-800",
    badgeClass:
      "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-600",
  },
  SMMS: {
    key: "SMMS",
    name: "Signalling & Telecom",
    shortName: "SMMS",
    description: "Points, signals, interlocking, and track circuits",
    hex: "#059669", // Emerald-600
    bgHex: "#ecfdf5", // Emerald-50
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-600",
  },
  TDMS: {
    key: "TDMS",
    name: "Traction Distribution",
    shortName: "TDMS",
    description: "Overhead equipment (OHE), power supply, and sub-stations",
    hex: "#7c3aed", // Violet-600
    bgHex: "#f5f3ff", // Violet-50
    bgClass: "bg-violet-50 dark:bg-violet-950/60",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-200 dark:border-violet-800",
    badgeClass:
      "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
    dotClass: "bg-violet-600",
  },
};

/**
 * Optimization Conflict Outcome Tokens:
 * - clean: 0 conflict with train timetables
 * - relaxed: scheduled via soft-penalty buffer relaxation, zero hard conflict
 * - hard-conflict: unavoidable train-path conflict flag
 */
export const CONFLICT_STATUS_TOKENS: Record<ConflictStatusKey, ColorToken> = {
  clean: {
    key: "clean",
    name: "Zero Conflict",
    shortName: "Clean",
    description: "Fully conflict-free block slot with no train timetable interference",
    hex: "#16a34a", // Green-600
    bgHex: "#f0fdf4", // Green-50
    bgClass: "bg-green-50 dark:bg-green-950/60",
    textClass: "text-green-700 dark:text-green-300",
    borderClass: "border-green-200 dark:border-green-800",
    badgeClass:
      "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
    dotClass: "bg-green-600",
  },
  relaxed: {
    key: "relaxed",
    name: "Relaxed Constraint",
    shortName: "Relaxed",
    description: "Feasible window scheduled with soft-preference relaxation",
    hex: "#d97706", // Amber-600
    bgHex: "#fffbeb", // Amber-50
    bgClass: "bg-amber-50 dark:bg-amber-950/60",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800",
    badgeClass:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-600",
  },
  "hard-conflict": {
    key: "hard-conflict",
    name: "Hard Conflict",
    shortName: "Hard Conflict",
    description: "Unavoidable corridor overlap requiring manual controller resolution",
    hex: "#dc2626", // Red-600
    bgHex: "#fef2f2", // Red-50
    bgClass: "bg-red-50 dark:bg-red-950/60",
    textClass: "text-red-700 dark:text-red-300",
    borderClass: "border-red-200 dark:border-red-800",
    badgeClass:
      "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
    dotClass: "bg-red-600",
  },
};

/**
 * Maintenance Job & Block Lifecycle Status Tokens:
 * - PENDING: awaiting optimizer schedule
 * - SCHEDULED: scheduled into a corridor block window
 * - GRANTED: approved and granted by section controller
 */
export const LIFECYCLE_STATUS_TOKENS: Record<LifecycleStatusKey, ColorToken> = {
  PENDING: {
    key: "PENDING",
    name: "Pending Optimization",
    shortName: "Pending",
    description: "Job registered, awaiting candidate window optimization",
    hex: "#64748b", // Slate-500
    bgHex: "#f8fafc", // Slate-50
    bgClass: "bg-slate-100 dark:bg-slate-900/60",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-200 dark:border-slate-800",
    badgeClass:
      "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
    dotClass: "bg-slate-500",
  },
  SCHEDULED: {
    key: "SCHEDULED",
    name: "Scheduled Block",
    shortName: "Scheduled",
    description: "Optimized block window assigned and verified",
    hex: "#0284c7", // Sky-600
    bgHex: "#f0f9ff", // Sky-50
    bgClass: "bg-sky-50 dark:bg-sky-950/60",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
    badgeClass:
      "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    dotClass: "bg-sky-600",
  },
  GRANTED: {
    key: "GRANTED",
    name: "Block Granted",
    shortName: "Granted",
    description: "Section controller has officially sanctioned the block",
    hex: "#10b981", // Emerald-500
    bgHex: "#ecfdf5", // Emerald-50
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
  },
};

/** Safely resolve a department token by key */
export function getDepartmentToken(dept: string | null | undefined): ColorToken {
  if (dept && dept in DEPARTMENT_TOKENS) {
    return DEPARTMENT_TOKENS[dept as DepartmentKey];
  }
  return {
    key: "UNKNOWN",
    name: "Unknown Department",
    shortName: dept || "N/A",
    description: "Unspecified department",
    hex: "#94a3b8",
    bgHex: "#f8fafc",
    bgClass: "bg-slate-100 dark:bg-slate-900",
    textClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-800",
    badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
    dotClass: "bg-slate-400",
  };
}

/** Safely resolve a conflict status token */
export function getConflictStatusToken(
  status: string | null | undefined,
  hasHardConflict?: boolean
): ColorToken {
  if (hasHardConflict) {
    return CONFLICT_STATUS_TOKENS["hard-conflict"];
  }
  if (status && status in CONFLICT_STATUS_TOKENS) {
    return CONFLICT_STATUS_TOKENS[status as ConflictStatusKey];
  }
  return CONFLICT_STATUS_TOKENS.clean;
}

/** Safely resolve a lifecycle status token */
export function getLifecycleStatusToken(status: string | null | undefined): ColorToken {
  if (status && status in LIFECYCLE_STATUS_TOKENS) {
    return LIFECYCLE_STATUS_TOKENS[status as LifecycleStatusKey];
  }
  return LIFECYCLE_STATUS_TOKENS.PENDING;
}

export type DataSourceKey = "real" | "synthetic";

/**
 * Data Source Provenance Tokens:
 * - real: Sourced directly from live RailRadar Indian Railways feeds
 * - synthetic: Generated realistic maintenance inventory with authentic defect models
 */
export const DATA_SOURCE_TOKENS: Record<DataSourceKey, ColorToken> = {
  real: {
    key: "real",
    name: "Source: RailRadar API (real data)",
    shortName: "RailRadar",
    description: "Authentic live Indian Railways schedule feed",
    hex: "#059669", // Emerald-600
    bgHex: "#ecfdf5",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/60",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-600",
  },
  synthetic: {
    key: "synthetic",
    name: "Synthetic Data",
    shortName: "Synthetic",
    description: "Generated maintenance inventory with authentic defect models",
    hex: "#7c3aed", // Violet-600
    bgHex: "#f5f3ff",
    bgClass: "bg-violet-50 dark:bg-violet-950/60",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-200 dark:border-violet-800",
    badgeClass:
      "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
    dotClass: "bg-violet-600",
  },
};

/** Safely resolve a data source token */
export function getDataSourceToken(source: string | boolean | null | undefined): ColorToken {
  if (source === "real" || source === false) {
    return DATA_SOURCE_TOKENS.real;
  }
  return DATA_SOURCE_TOKENS.synthetic;
}

export type MaintenanceBandKey = "DAY" | "NIGHT" | "OFF_BAND";

export interface MaintenanceBandToken {
  key: MaintenanceBandKey;
  name: string;
  hours: string;
  description: string;
  hex: string;
  bgHex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeClass: string;
}

/**
 * Maintenance Band Tokens:
 * - DAY: 10:00 – 14:00 (midday window)
 * - NIGHT: 23:00 – 04:00 (overnight window)
 * - OFF_BAND: high traffic operational corridor
 */
export const MAINTENANCE_BAND_TOKENS: Record<MaintenanceBandKey, MaintenanceBandToken> = {
  DAY: {
    key: "DAY",
    name: "Day Band",
    hours: "10:00 – 14:00",
    description: "Midday window between morning and evening passenger peaks",
    hex: "#f59e0b", // Amber-500
    bgHex: "#fffbeb", // Amber-50
    bgClass: "bg-amber-50/60 dark:bg-amber-950/20",
    borderClass: "border-amber-200 dark:border-amber-900/50",
    textClass: "text-amber-800 dark:text-amber-300",
    badgeClass:
      "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
  NIGHT: {
    key: "NIGHT",
    name: "Night Band",
    hours: "23:00 – 04:00",
    description: "Primary overnight heavy maintenance window for track and traction",
    hex: "#6366f1", // Indigo-500
    bgHex: "#eef2ff", // Indigo-50
    bgClass: "bg-indigo-50/60 dark:bg-indigo-950/20",
    borderClass: "border-indigo-200 dark:border-indigo-900/50",
    textClass: "text-indigo-800 dark:text-indigo-300",
    badgeClass:
      "bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  },
  OFF_BAND: {
    key: "OFF_BAND",
    name: "Off-Band",
    hours: "Outside Bands",
    description: "High-density operational hours reserved for priority passenger paths",
    hex: "#94a3b8", // Slate-400
    bgHex: "#f8fafc", // Slate-50
    bgClass: "bg-slate-50/40 dark:bg-slate-900/20",
    borderClass: "border-slate-100 dark:border-slate-800/40",
    textClass: "text-slate-500 dark:text-slate-400",
    badgeClass:
      "bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800",
  },
};

/** Resolve maintenance band token based on ISO timestamp or hour number */
export function getMaintenanceBandToken(
  timeInput: string | number | null | undefined
): MaintenanceBandToken {
  if (timeInput === null || timeInput === undefined) return MAINTENANCE_BAND_TOKENS.OFF_BAND;
  let hour: number;
  if (typeof timeInput === "number") {
    hour = timeInput;
  } else {
    try {
      const dt = new Date(timeInput);
      hour = dt.getUTCHours();
    } catch {
      return MAINTENANCE_BAND_TOKENS.OFF_BAND;
    }
  }

  if (hour >= 10 && hour < 14) {
    return MAINTENANCE_BAND_TOKENS.DAY;
  }
  if (hour >= 23 || hour < 4) {
    return MAINTENANCE_BAND_TOKENS.NIGHT;
  }
  return MAINTENANCE_BAND_TOKENS.OFF_BAND;
}

/**
 * Priority Scoring Decomposition Factor Tokens (PRD Section 5.7 / Phase 6):
 * Five mathematical terms in the SIH26027 multi-criteria objective function.
 */
export const PRIORITY_FACTOR_TOKENS = {
  criticality: {
    name: "Criticality",
    weightPct: 30,
    hex: DEPARTMENT_TOKENS.TMS.hex, // #2563eb
  },
  urgency: {
    name: "Urgency",
    weightPct: 25,
    hex: MAINTENANCE_BAND_TOKENS.DAY.hex, // #f59e0b
  },
  assetRisk: {
    name: "Asset Risk",
    weightPct: 20,
    hex: DEPARTMENT_TOKENS.TDMS.hex, // #7c3aed
  },
  overdueFactor: {
    name: "Overdue Factor",
    weightPct: 15,
    hex: CONFLICT_STATUS_TOKENS["hard-conflict"].hex, // #dc2626
  },
  failureHistory: {
    name: "Failure History",
    weightPct: 10,
    hex: DEPARTMENT_TOKENS.SMMS.hex, // #059669
  },
} as const;

/**
 * Manual Schedule Override Token (Phase 6 / PRD Section 6):
 * Distinct visual token for jobs/blocks whose schedules have been locked by an operator.
 */
export const LOCKED_STATUS_TOKEN: ColorToken = {
  key: "locked",
  name: "Manual Override (Locked)",
  shortName: "Locked",
  description: "Schedule manually pinned by railway operator — excluded from CP-SAT re-optimization",
  hex: "#ea580c", // Orange-600
  bgHex: "#fff7ed", // Orange-50
  bgClass: "bg-orange-50 dark:bg-orange-950/60",
  textClass: "text-orange-700 dark:text-orange-300",
  borderClass: "border-orange-200 dark:border-orange-800",
  badgeClass:
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
  dotClass: "bg-orange-600",
};


export function getLockedStatusToken(): ColorToken {
  return LOCKED_STATUS_TOKEN;
}
