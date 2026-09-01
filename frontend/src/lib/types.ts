// Synthetic demonstration data — not real Indian Railways operational data.
// All identifiers are fabricated for the SIH prototype.

export type Status = 'normal' | 'warning' | 'critical' | 'info';

export interface Section {
  id: string;
  code: string; // DLI-GZB
  name: string; // Delhi Jn – Ghaziabad Jn
  fromStation: string;
  toStation: string;
  km: number; // total length
  electrified: boolean;
  maxSpeed: number; // km/h
}

export interface Station {
  id: string;
  code: string; // DLI
  name: string;
  km: number; // chainage from Delhi (approx)
  lat: number;
  lng: number;
  platforms: number;
  zone: string;
}

export interface Train {
  id: string;          // 12951
  number: string;      // 12951
  name: string;        // NDLS – MMCT Rajdhani Exp
  origin: string;      // NDLS
  destination: string; // MMCT
  viaSection: string;  // DLI-GZB-SBB
  direction: 'UP' | 'DOWN';
  currentKm: number;
  lat: number;
  lng: number;
  speed: number;       // km/h
  delayMin: number;
  nextStation: string;
  status: Status;
  priority: 'RAJDHANI' | 'SHATABDI' | 'EXPRESS' | 'PASSENGER' | 'FREIGHT';
  rake: string;
  loco: string;
  guard: string;
  lastUpdate: string;
  schedule: { station: string; arrive: string; depart: string; km: number }[];
}

export interface TrackAsset {
  id: string;          // TRK-DLI-1245
  section: string;
  km: string;          // 124/5 (km.fraction)
  startKm: number;
  endKm: number;
  type: 'MAINLINE' | 'LOOP' | 'YARD' | 'SIDING';
  railType: '60KG_90UTR' | '52KG_90UTR' | '60KG_52UTR' | '52KG_52UTR';
  sleeperType: 'PSC' | 'Wooden' | 'Steel';
  ballastDepth: number; // mm
  curveDeg: number;
  gradient: number;    // 1 in n
  commissionedYear: number;
  lastInspected: string;
  condition: Status;
  riskScore: number; // 0-100
  defects: string[];
  inspectionId?: string;
  maintenanceId?: string;
}

export interface OHEAsset {
  id: string;          // OHE-DLI-1245-07
  section: string;
  km: string;
  type: 'STANDARD' | 'PORTAL' | 'CANTILEVER' | 'CROSSOVER';
  voltage: number;     // 25 kV
  mastNo: string;
  contactWireHeight: number; // m
  tension: number;     // kN
  lastInspected: string;
  condition: Status;
  riskScore: number;
  faults: string[];
}

export interface SignalAsset {
  id: string;          // SIG-DLI-1245-UP
  section: string;
  km: string;
  type: 'COLOUR_LED_4ASP' | 'COLOUR_LED_3ASP' | 'SEMAPHORE' | 'SHUNT' | 'CALLING';
  aspect: 'RED' | 'YELLOW' | 'GREEN' | 'DOUBLE_YELLOW';
  trackCircuit: string; // TC-DLI-1245
  interlockingId: string;
  lastInspected: string;
  status: Status;
  faults: string[];
  history: { date: string; event: string; severity: Status }[];
}

export interface PointMachine {
  id: string;          // PTM-DLI-1245-12
  section: string;
  km: string;
  type: 'CLAMP_LOCK' | 'END_OPI' | 'END_CLAMP';
  throwTime: number; // sec
  lastOperation: string;
  condition: Status;
}

export interface TrackCircuit {
  id: string;          // TC-DLI-1245
  section: string;
  km: string;
  length: number; // m
  freq: number; // Hz
  healthy: boolean;
  lastTested: string;
}

export interface BridgeAsset {
  id: string;
  section: string;
  km: string;
  name: string;
  type: 'GIRDER' | 'TRUSS' | 'ARCH' | 'RCC' | 'PSC';
  spans: number;
  length: number; // m
  yearBuilt: number;
  lastInspected: string;
  condition: Status;
  riskScore: number;
}

export interface Inspection {
  id: string;          // INSP-2026-0829-0042
  assetId: string;
  assetType: 'TRACK' | 'OHE' | 'SIGNAL' | 'BRIDGE' | 'POINT';
  assetKm: string;
  section: string;
  scheduledDate: string;
  completedDate?: string;
  inspector: string;
  department: 'TRACK' | 'TRD' | 'SIGNALLING' | 'BRIDGE';
  status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'COMPLETED' | 'CRITICAL';
  findings: string;
  parameters: Record<string, string | number>;
}

export interface Defect {
  id: string;          // DEF-2026-091
  inspectionId: string;
  assetId: string;
  assetType: 'TRACK' | 'OHE' | 'SIGNAL' | 'BRIDGE' | 'POINT';
  assetKm: string;
  section: string;
  reportedDate: string;
  severity: Status;
  category: string;
  description: string;
  measurement?: string;
  photo: boolean;
  resolved: boolean;
  workOrderId?: string;
}

export interface WorkOrder {
  id: string;          // WRK-2026-0831-018
  defectId?: string;
  assetId: string;
  assetType: 'TRACK' | 'OHE' | 'SIGNAL' | 'BRIDGE' | 'POINT';
  assetKm: string;
  section: string;
  problem: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'OVERDUE';
  team: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  blockId?: string;
  estimatedDelay: number; // min
}

export interface BlockRequest {
  id: string;          // BLK-DLI-2026-0831-03
  section: string;
  fromKm: string;
  toKm: string;
  track: 'UP' | 'DOWN' | 'BOTH';
  workType: 'MAINTENANCE' | 'ENGINEERING' | 'OHE' | 'SIGNALLING' | 'BRIDGE';
  purpose: string;
  requestedBy: string;
  startTime: string;
  endTime: string;
  status: 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CONFLICT';
  workOrderIds: string[];
  affectedTrains: string[];
  affectedAssets: string[];
  conflicts: string[];
  aiNote?: string;
}

export interface RiskRecord {
  domain: 'TRACK' | 'OHE' | 'SIGNALLING' | 'BRIDGE' | 'TRAIN' | 'MAINTENANCE';
  assetId?: string;
  location: string;
  score: number;
  reasons: string[];
  affectedAssets: string[];
  affectedTrains: string[];
  recommendation: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  ts: string;
  level: Status;
  domain: string;
  title: string;
  detail: string;
  relatedId?: string;
  acknowledged: boolean;
}

export interface LayerToggle {
  key: string;
  label: string;
  visible: boolean;
}
