// Rail Radar — counts operational train status across the synthetic dataset.
// Provides a stable snapshot for dashboards, the Live Map overlay, and
// the dedicated Rail Radar panel.

import { extendedTrains, getTrainPosition, REF_TIME, REF_DATE } from './trainRoutes';
import type { ExtendedTrain, TrainPosition } from './trainRoutes';

export type TrainOperationalStatus =
  | 'RUNNING'        // in motion on the route
  | 'AT_STATION'     // currently at a stop (arrived, holding for departure)
  | 'SCHEDULED'      // not yet departed origin
  | 'COMPLETED'      // arrived at destination
  | 'DELAYED'        // delay > 0
  | 'HELD'           // delay > 15 min, treated as held
  | 'OFFLINE';       // placeholder for trains not visible on the map section

export interface TrainRadarEntry {
  id: string;
  number: string;
  name: string;
  origin: string;
  destination: string;
  priority: ExtendedTrain['priority'];
  baseStatus: ExtendedTrain['status'];
  operational: TrainOperationalStatus;
  delayMin: number;
  km: number;
  speed: number;
  currentStation?: string | null;
  nextStation?: string | null;
  previousStation?: string | null;
  progress: number; // 0..1
  source: 'ESTIMATED' | 'TIMETABLE_DERIVATION';
  onMap: boolean; // currently visible in the Delhi section bounding box
  tracker: string; // last update string
}

export interface RailRadarSnapshot {
  asOf: string;                  // ISO timestamp
  refTime: { hh: number; mm: number };
  totalOperational: number;
  totalInSection: number;
  byStatus: Record<TrainOperationalStatus, number>;
  byPriority: Record<string, number>;
  bySection: { section: string; count: number }[];
  activeTrains: TrainRadarEntry[];      // operational + in section
  delayedTrains: TrainRadarEntry[];     // filter: delay > 0
  heldTrains: TrainRadarEntry[];        // filter: delay > 15 min
  healthy: number;
  warnings: number;
  criticals: number;
  lastUpdated: number;
}

const SECTION_BBOX = {
  minLng: 77.05,
  maxLng: 77.55,
  minLat: 28.55,
  maxLat: 28.78,
};

// Determine operational status from schedule + position.
function classify(train: ExtendedTrain, pos: TrainPosition | null, nowMin: number): TrainRadarEntry {
  const first = train.schedule[0];
  const last = train.schedule[train.schedule.length - 1];
  const firstDep = parseMin(first.depart);
  const lastArr = parseMin(last.arrive === '--' ? last.depart : last.arrive);

  let operational: TrainOperationalStatus = 'RUNNING';
  if (pos?.currentStation) operational = 'AT_STATION';
  if (nowMin < firstDep) operational = 'SCHEDULED';
  if (nowMin > lastArr) operational = 'COMPLETED';
  if (train.delayMin > 15) operational = 'HELD';
  else if (train.delayMin > 0) operational = 'DELAYED';

  const onMap = pos
    ? pos.lng >= SECTION_BBOX.minLng && pos.lng <= SECTION_BBOX.maxLng
      && pos.lat >= SECTION_BBOX.minLat && pos.lat <= SECTION_BBOX.maxLat
    : false;

  return {
    id: train.id,
    number: train.number,
    name: train.name,
    origin: train.origin,
    destination: train.destination,
    priority: train.priority,
    baseStatus: train.status,
    operational,
    delayMin: train.delayMin,
    km: pos?.km ?? 0,
    speed: pos?.currentStation ? 0 : train.speed,
    currentStation: pos?.currentStation?.code ?? null,
    nextStation: pos?.nextStation?.code ?? null,
    previousStation: pos?.previousStation?.code ?? null,
    progress: pos?.progress ?? 0,
    source: pos?.source ?? 'ESTIMATED',
    onMap,
    tracker: `${String(REF_TIME.hh).padStart(2, '0')}:${String(REF_TIME.mm).padStart(2, '0')} IST`,
  };
}

function parseMin(t: string): number {
  if (!t || t === '--') return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Compute the full snapshot at the current reference time.
export function getRailRadarSnapshot(refHH?: number, refMM?: number): RailRadarSnapshot {
  const hh = refHH ?? REF_TIME.hh;
  const mm = refMM ?? REF_TIME.mm;
  const nowMin = hh * 60 + mm;

  const entries: TrainRadarEntry[] = extendedTrains.map(t => {
    const pos = getTrainPosition(t, hh, mm);
    return classify(t, pos, nowMin);
  });

  const byStatus: Record<TrainOperationalStatus, number> = {
    RUNNING: 0, AT_STATION: 0, SCHEDULED: 0, COMPLETED: 0,
    DELAYED: 0, HELD: 0, OFFLINE: 0,
  };
  const byPriority: Record<string, number> = {};
  let healthy = 0, warnings = 0, criticals = 0;

  for (const e of entries) {
    byStatus[e.operational]++;
    byPriority[e.priority] = (byPriority[e.priority] || 0) + 1;
    if (e.operational === 'RUNNING' || e.operational === 'AT_STATION') {
      if (e.delayMin > 15) criticals++;
      else if (e.delayMin > 0) warnings++;
      else healthy++;
    }
  }

  const activeTrains = entries
    .filter(e => (e.operational === 'RUNNING' || e.operational === 'AT_STATION') && e.onMap)
    .sort((a, b) => a.number.localeCompare(b.number));

  const delayedTrains = entries
    .filter(e => e.delayMin > 0)
    .sort((a, b) => b.delayMin - a.delayMin);

  const heldTrains = entries
    .filter(e => e.delayMin > 15)
    .sort((a, b) => b.delayMin - a.delayMin);

  const totalOperational = entries.filter(e => e.operational !== 'COMPLETED' && e.operational !== 'SCHEDULED').length;
  const totalInSection = activeTrains.length;

  // Group by section inferred from origin station
  const sectionCounts: Record<string, number> = {};
  for (const e of entries) {
    if (!e.onMap) continue;
    const key = e.origin;
    sectionCounts[key] = (sectionCounts[key] || 0) + 1;
  }
  const bySection = Object.entries(sectionCounts)
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => b.count - a.count);

  return {
    asOf: `${REF_DATE}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+05:30`,
    refTime: { hh, mm },
    totalOperational,
    totalInSection,
    byStatus,
    byPriority,
    bySection,
    activeTrains,
    delayedTrains,
    heldTrains,
    healthy,
    warnings,
    criticals,
    lastUpdated: Date.now(),
  };
}

// Style helpers for radar rows.
export function operationalChip(op: TrainOperationalStatus): string {
  switch (op) {
    case 'RUNNING': return 'chip-green';
    case 'AT_STATION': return 'chip-blue';
    case 'SCHEDULED': return 'chip-grey';
    case 'COMPLETED': return 'chip-grey';
    case 'DELAYED': return 'chip-amber';
    case 'HELD': return 'chip-red';
    default: return 'chip-grey';
  }
}

export function operationalLabel(op: TrainOperationalStatus): string {
  switch (op) {
    case 'RUNNING': return 'RUNNING';
    case 'AT_STATION': return 'AT STATION';
    case 'SCHEDULED': return 'SCHEDULED';
    case 'COMPLETED': return 'COMPLETED';
    case 'DELAYED': return 'DELAYED';
    case 'HELD': return 'HELD';
    default: return 'OFFLINE';
  }
}
