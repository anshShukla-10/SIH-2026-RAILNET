// Railway Digital Twin Network Topology
// OpenRailwayMap-inspired infrastructure layer for the Delhi section.
// This file is intentionally SEPARATE from the application data layer:
//   infrastructure, static train data, route geometry, and railnet data are
//   connected via LOCATION + TIME + ASSET ID.

export interface NetworkStation {
  id: string;
  code: string;
  name: string;
  km: number; // chainage from DLI along main line (where applicable)
  type: 'junction' | 'terminal' | 'halt' | 'cabin';
  platforms: number;
  zone: string;
  lng: number;
  lat: number;
  electrified: boolean;
  hasLoop: boolean;
}

export interface TrackSegment {
  id: string;
  from: string; // station code
  to: string;
  type: 'main' | 'branch' | 'loop' | 'yard' | 'siding' | 'ring';
  tracks: ('UP' | 'DOWN')[];
  geometry: [number, number][]; // base polyline, [lng, lat]
  // Per-track geometries (offset perpendicular)
  upGeometry?: [number, number][];
  downGeometry?: [number, number][];
  kmStart: number;
  kmEnd: number;
  electrified: boolean;
  maxSpeed: number;
  gauge?: string;
}

export interface SignalPoint {
  id: string;
  km: number;
  lng: number;
  lat: number;
  type: 'home' | 'distant' | 'starter' | 'shunt' | 'automatic' | 'calling';
  direction: 'UP' | 'DOWN';
  aspect: 'red' | 'yellow' | 'green' | 'double-yellow';
  assetId: string;
}

export interface OHEMast {
  id: string;
  km: number;
  lng: number;
  lat: number;
  type: 'cantilever' | 'portal' | 'head-span' | 'cross-span';
  mastNo: string;
  voltage: number;
}

export interface LevelCrossing {
  id: string;
  km: number;
  lng: number;
  lat: number;
  name: string;
  status: 'manned' | 'unmanned' | 'interlocked';
}

export interface BridgeAsset {
  id: string;
  km: number;
  name: string;
  lng: number;
  lat: number;
  type: 'GIRDER' | 'TRUSS' | 'RCC' | 'PSC' | 'ARCH';
  spans: number;
  length: number;
  assetId: string;
}

export interface Yard {
  id: string;
  station: string;
  name: string;
  lng: number;
  lat: number;
  tracks: { id: string; lng: number; lat: number }[]; // individual siding tracks
}

export interface SwitchPoint {
  id: string;
  km: number;
  lng: number;
  lat: number;
  type: 'CLAMP_LOCK' | 'END_OPI' | 'END_CLAMP' | 'TRAILABLE';
  assetId: string;
}

export interface InspectionPoint {
  id: string;
  km: number;
  lng: number;
  lat: number;
  assetType: 'TRACK' | 'OHE' | 'SIGNAL' | 'BRIDGE' | 'POINT';
  status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'COMPLETED' | 'CRITICAL';
  assetId: string;
}

export interface DefectPoint {
  id: string;
  km: number;
  lng: number;
  lat: number;
  assetType: string;
  severity: 'normal' | 'warning' | 'critical';
  category: string;
  assetId: string;
}

export interface WorkOrderPoint {
  id: string;
  km: number;
  lng: number;
  lat: number;
  assetType: string;
  status: 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'OVERDUE';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  assetId: string;
}

export interface BlockSegment {
  id: string;
  segmentIds: string[];
  startTime: string;
  endTime: string;
  status: 'PROPOSED' | 'APPROVED' | 'ACTIVE' | 'COMPLETED' | 'CONFLICT';
  workType: string;
}

// ---------- HELPER: offset perpendicular to a polyline ----------
function offsetPerp(points: [number, number][], offsetLng: number): [number, number][] {
  return points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular (rotate 90° CCW): (-dy, dx)
    const nx = -dy / len;
    const ny = dx / len;
    return [p[0] + nx * offsetLng, p[1] + ny * offsetLng];
  });
}

// ---------- STATIONS ----------
export const stations: NetworkStation[] = [
  // Main east-west trunk (DLI → SBB)
  { id: 'stn-DLI',  code: 'DLI',  name: 'Delhi Junction',          km: 0.0,  type: 'terminal', platforms: 16, zone: 'NR', lng: 77.2280, lat: 28.6620, electrified: true, hasLoop: true },
  { id: 'stn-CYZ',  code: 'CYZ',  name: 'Delhi Kishanganj',        km: 1.4,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.2400, lat: 28.6660, electrified: true, hasLoop: false },
  { id: 'stn-DBSI', code: 'DBSI', name: 'Dayabasti',               km: 3.8,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.2190, lat: 28.6720, electrified: true, hasLoop: false },
  { id: 'stn-SZM',  code: 'SZM',  name: 'Subzi Mandi',             km: 5.1,  type: 'junction', platforms: 6,  zone: 'NR', lng: 77.2089, lat: 28.6811, electrified: true, hasLoop: true },
  { id: 'stn-ANVR', code: 'ANVR', name: 'Anand Vihar',             km: 6.6,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.2580, lat: 28.6805, electrified: true, hasLoop: false },
  { id: 'stn-DSA',  code: 'DSA',  name: 'Delhi Shahdara',          km: 8.2,  type: 'junction', platforms: 6,  zone: 'NR', lng: 77.2906, lat: 28.6736, electrified: true, hasLoop: true },
  { id: 'stn-VVB',  code: 'VVB',  name: 'Vivek Vihar',             km: 11.0, type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.3176, lat: 28.6720, electrified: true, hasLoop: false },
  { id: 'stn-CPS',  code: 'CPS',  name: 'Chanderpuri Halt',        km: 14.6, type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.3550, lat: 28.6680, electrified: true, hasLoop: false },
  { id: 'stn-BHHJ', code: 'BHHJ', name: 'Behta Hajipur',           km: 18.2, type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.3880, lat: 28.6620, electrified: true, hasLoop: false },
  { id: 'stn-NZB',  code: 'NZB',  name: 'Naya Azadpur',            km: 21.8, type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.4180, lat: 28.6580, electrified: true, hasLoop: false },
  { id: 'stn-GZB',  code: 'GZB',  name: 'Ghaziabad Junction',      km: 25.5, type: 'junction', platforms: 9,  zone: 'NR', lng: 77.4393, lat: 28.6531, electrified: true, hasLoop: true },
  { id: 'sth-GZBO', code: 'GZBO', name: 'Ghaziabad Outer Cabin',   km: 27.0, type: 'cabin',    platforms: 0,  zone: 'NR', lng: 77.4530, lat: 28.6515, electrified: true, hasLoop: false },
  { id: 'stn-HZD',  code: 'HZD',  name: 'Hindon',                  km: 28.6, type: 'halt',     platforms: 3,  zone: 'NR', lng: 77.4700, lat: 28.6500, electrified: true, hasLoop: false },
  { id: 'stn-SBB',  code: 'SBB',  name: 'Sahibabad',               km: 32.1, type: 'junction', platforms: 3,  zone: 'NR', lng: 77.5012, lat: 28.6457, electrified: true, hasLoop: true },

  // NDLS branch
  { id: 'stn-NDLS', code: 'NDLS', name: 'New Delhi',               km: 2.4,  type: 'terminal', platforms: 16, zone: 'NR', lng: 77.2197, lat: 28.6431, electrified: true, hasLoop: true },
  { id: 'stn-PGMD', code: 'PGMD', name: 'Pragati Maidan',          km: 4.0,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.2320, lat: 28.6350, electrified: true, hasLoop: false },
  { id: 'stn-TKJ',  code: 'TKJ',  name: 'Tilak Bridge',            km: 6.0,  type: 'terminal', platforms: 6,  zone: 'NR', lng: 77.2410, lat: 28.6270, electrified: true, hasLoop: true },
  { id: 'stn-LPN',  code: 'LPN',  name: 'Lajpat Nagar',            km: 5.6,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.2430, lat: 28.6390, electrified: true, hasLoop: false },
  { id: 'stn-SJ',   code: 'SJ',   name: 'Safdarjung',              km: 4.2,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.2000, lat: 28.6480, electrified: true, hasLoop: false },
  { id: 'stn-PWL',  code: 'PWL',  name: 'Patel Nagar',             km: 6.4,  type: 'junction', platforms: 3,  zone: 'NR', lng: 77.1793, lat: 28.6521, electrified: true, hasLoop: true },
  { id: 'stn-BRSQ', code: 'BRSQ', name: 'Brar Square',             km: 8.1,  type: 'halt',     platforms: 2,  zone: 'NR', lng: 77.1630, lat: 28.6540, electrified: true, hasLoop: false },
  { id: 'stn-NZM',  code: 'NZM',  name: 'Hazrat Nizamuddin',       km: 7.6,  type: 'junction', platforms: 8,  zone: 'NR', lng: 77.2530, lat: 28.6395, electrified: true, hasLoop: true },
];

// ---------- SEGMENT BUILDER ----------
// Define raw polylines between stations; up/down tracks are offset.
function buildSegment(
  id: string, from: string, to: string, type: TrackSegment['type'],
  points: [number, number][], kmStart: number, kmEnd: number, maxSpeed: number,
  electrified = true, tracks: ('UP' | 'DOWN')[] = ['UP', 'DOWN']
): TrackSegment {
  // Compute parallel UP/DOWN tracks by perpendicular offset.
  // In Northern Railway convention, UP direction = towards Delhi; we offset
  // UP on the -north side and DOWN on the +north side of the polyline.
  const offsetLng = 0.00025; // ~25 m visual offset for clarity
  return {
    id, from, to, type, tracks,
    geometry: points,
    upGeometry: tracks.includes('UP') ? offsetPerp(points, -offsetLng) : undefined,
    downGeometry: tracks.includes('DOWN') ? offsetPerp(points, offsetLng) : undefined,
    kmStart, kmEnd, electrified, maxSpeed,
    gauge: '1676mm',
  };
}

// ---------- TRACK SEGMENTS ----------
// Geometry defined as waypoints following the Yamuna corridor and realistic
// Northern Railway alignment. Each waypoint is [lng, lat].
export const segments: TrackSegment[] = [
  // Main line DLI → CYZ → SZM
  buildSegment('SEG-DLI-CYZ', 'DLI', 'CYZ', 'main',
    [[77.2280, 28.6620], [77.2310, 28.6630], [77.2350, 28.6645], [77.2380, 28.6655], [77.2400, 28.6660]],
    0.0, 1.4, 50),
  // SZM branch via DBSI
  buildSegment('SEG-DLI-DBSI', 'DLI', 'DBSI', 'main',
    [[77.2280, 28.6620], [77.2250, 28.6650], [77.2215, 28.6685], [77.2195, 28.6715], [77.2190, 28.6720]],
    0.0, 3.8, 50),
  // CYZ → SZM (direct)
  buildSegment('SEG-CYZ-SZM', 'CYZ', 'SZM', 'main',
    [[77.2400, 28.6660], [77.2350, 28.6700], [77.2280, 28.6750], [77.2180, 28.6790], [77.2089, 28.6811]],
    1.4, 5.1, 80),
  // DBSI → SZM
  buildSegment('SEG-DBSI-SZM', 'DBSI', 'SZM', 'main',
    [[77.2190, 28.6720], [77.2150, 28.6760], [77.2120, 28.6790], [77.2089, 28.6811]],
    3.8, 5.1, 80),

  // Main line SZM → DSA (crosses Yamuna via bridge)
  buildSegment('SEG-SZM-ANVR', 'SZM', 'ANVR', 'main',
    [[77.2089, 28.6811], [77.2230, 28.6840], [77.2400, 28.6830], [77.2580, 28.6805]],
    5.1, 6.6, 100),
  buildSegment('SEG-ANVR-DSA', 'ANVR', 'DSA', 'main',
    [[77.2580, 28.6805], [77.2730, 28.6780], [77.2820, 28.6755], [77.2906, 28.6736]],
    6.6, 8.2, 100),

  // Main line DSA → VVB → GZB → SBB
  buildSegment('SEG-DSA-VVB', 'DSA', 'VVB', 'main',
    [[77.2906, 28.6736], [77.2990, 28.6730], [77.3080, 28.6725], [77.3176, 28.6720]],
    8.2, 11.0, 110),
  buildSegment('SEG-VVB-CPS', 'VVB', 'CPS', 'main',
    [[77.3176, 28.6720], [77.3300, 28.6710], [77.3440, 28.6690], [77.3550, 28.6680]],
    11.0, 14.6, 130),
  buildSegment('SEG-CPS-BHHJ', 'CPS', 'BHHJ', 'main',
    [[77.3550, 28.6680], [77.3700, 28.6655], [77.3810, 28.6635], [77.3880, 28.6620]],
    14.6, 18.2, 130),
  buildSegment('SEG-BHHJ-NZB', 'BHHJ', 'NZB', 'main',
    [[77.3880, 28.6620], [77.4000, 28.6605], [77.4110, 28.6590], [77.4180, 28.6580]],
    18.2, 21.8, 130),
  buildSegment('SEG-NZB-GZB', 'NZB', 'GZB', 'main',
    [[77.4180, 28.6580], [77.4250, 28.6565], [77.4320, 28.6550], [77.4393, 28.6531]],
    21.8, 25.5, 110),
  buildSegment('SEG-GZB-GZBO', 'GZB', 'GZBO', 'main',
    [[77.4393, 28.6531], [77.4470, 28.6520], [77.4530, 28.6515]],
    25.5, 27.0, 100),
  buildSegment('SEG-GZBO-HZD', 'GZBO', 'HZD', 'main',
    [[77.4530, 28.6515], [77.4620, 28.6505], [77.4700, 28.6500]],
    27.0, 28.6, 100),
  buildSegment('SEG-HZD-SBB', 'HZD', 'SBB', 'main',
    [[77.4700, 28.6500], [77.4820, 28.6485], [77.4930, 28.6470], [77.5012, 28.6457]],
    28.6, 32.1, 100),

  // NDLS branch (DLI ↔ NDLS)
  buildSegment('SEG-DLI-NDLS', 'DLI', 'NDLS', 'branch',
    [[77.2280, 28.6620], [77.2255, 28.6570], [77.2230, 28.6510], [77.2210, 28.6470], [77.2197, 28.6431]],
    0.0, 2.4, 40),
  // NDLS → TKJ
  buildSegment('SEG-NDLS-LPN', 'NDLS', 'LPN', 'branch',
    [[77.2197, 28.6431], [77.2280, 28.6415], [77.2360, 28.6405], [77.2430, 28.6390]],
    2.4, 5.6, 80),
  buildSegment('SEG-LPN-PGMD', 'LPN', 'PGMD', 'branch',
    [[77.2430, 28.6390], [77.2385, 28.6375], [77.2350, 28.6365], [77.2320, 28.6350]],
    5.6, 4.0, 80),
  buildSegment('SEG-LPN-NZM', 'LPN', 'NZM', 'branch',
    [[77.2430, 28.6390], [77.2480, 28.6395], [77.2530, 28.6395]],
    5.6, 7.6, 60),
  buildSegment('SEG-PGMD-TKJ', 'PGMD', 'TKJ', 'branch',
    [[77.2320, 28.6350], [77.2360, 28.6310], [77.2390, 28.6290], [77.2410, 28.6270]],
    4.0, 6.0, 80),
  // NDLS → SJ → PWL (Patel Nagar branch)
  buildSegment('SEG-NDLS-SJ', 'NDLS', 'SJ', 'branch',
    [[77.2197, 28.6431], [77.2130, 28.6445], [77.2060, 28.6465], [77.2000, 28.6480]],
    2.4, 4.2, 60),
  buildSegment('SEG-SJ-PWL', 'SJ', 'PWL', 'branch',
    [[77.2000, 28.6480], [77.1930, 28.6500], [77.1860, 28.6515], [77.1793, 28.6521]],
    4.2, 6.4, 60),
  buildSegment('SEG-PWL-BRSQ', 'PWL', 'BRSQ', 'branch',
    [[77.1793, 28.6521], [77.1720, 28.6525], [77.1670, 28.6530], [77.1630, 28.6540]],
    6.4, 8.1, 60),

  // LOOP LINES at major stations (siding tracks)
  buildSegment('SEG-LOOP-DLI', 'DLI', 'DLI', 'loop',
    [[77.2270, 28.6615], [77.2250, 28.6610], [77.2240, 28.6625], [77.2260, 28.6640], [77.2290, 28.6635]],
    0.0, 0.5, 30, true, ['UP']),
  buildSegment('SEG-LOOP-GZB', 'GZB', 'GZB', 'loop',
    [[77.4380, 28.6528], [77.4360, 28.6520], [77.4370, 28.6540], [77.4405, 28.6540]],
    25.5, 26.0, 30, true, ['UP']),
  buildSegment('SEG-LOOP-DSA', 'DSA', 'DSA', 'loop',
    [[77.2895, 28.6733], [77.2885, 28.6720], [77.2910, 28.6718], [77.2920, 28.6740]],
    8.2, 8.7, 30, true, ['UP']),
  buildSegment('SEG-LOOP-SZM', 'SZM', 'SZM', 'loop',
    [[77.2080, 28.6810], [77.2065, 28.6825], [77.2095, 28.6830], [77.2110, 28.6815]],
    5.1, 5.5, 30, true, ['DOWN']),
  buildSegment('SEG-LOOP-SBB', 'SBB', 'SBB', 'loop',
    [[77.5000, 28.6452], [77.4985, 28.6440], [77.5020, 28.6440], [77.5025, 28.6462]],
    32.1, 32.5, 30, true, ['DOWN']),
  buildSegment('SEG-LOOP-NDLS', 'NDLS', 'NDLS', 'loop',
    [[77.2185, 28.6425], [77.2165, 28.6420], [77.2160, 28.6435], [77.2190, 28.6445]],
    2.4, 2.8, 30, true, ['UP']),
  buildSegment('SEG-LOOP-TKJ', 'TKJ', 'TKJ', 'loop',
    [[77.2400, 28.6265], [77.2380, 28.6275], [77.2420, 28.6280], [77.2430, 28.6265]],
    6.0, 6.5, 30, true, ['DOWN']),
  buildSegment('SEG-LOOP-PWL', 'PWL', 'PWL', 'loop',
    [[77.1780, 28.6518], [77.1760, 28.6510], [77.1775, 28.6535], [77.1810, 28.6535]],
    6.4, 6.9, 30, true, ['UP']),
];

// ---------- HELPERS ----------
export function getStationByCode(code: string): NetworkStation | undefined {
  return stations.find(s => s.code === code);
}

export function getSegmentById(id: string): TrackSegment | undefined {
  return segments.find(s => s.id === id);
}

// Resolve a route between two stations through the segment graph.
// Returns the sequence of segment IDs (forward direction).
export function findSegmentsBetween(from: string, to: string): string[] {
  // BFS through the segment graph
  const adj: Record<string, { to: string; segId: string; reversed: boolean }[]> = {};
  for (const seg of segments) {
    if (seg.from === seg.to) continue;
    if (!adj[seg.from]) adj[seg.from] = [];
    if (!adj[seg.to]) adj[seg.to] = [];
    adj[seg.from].push({ to: seg.to, segId: seg.id, reversed: false });
    adj[seg.to].push({ to: seg.from, segId: seg.id, reversed: true });
  }
  const visited = new Set<string>();
  const queue: { code: string; path: { segId: string; reversed: boolean }[] }[] = [
    { code: from, path: [] }
  ];
  while (queue.length) {
    const { code, path } = queue.shift()!;
    if (code === to) return path.map(p => p.segId);
    if (visited.has(code)) continue;
    visited.add(code);
    const neighbours = adj[code] || [];
    for (const n of neighbours) {
      queue.push({ code: n.to, path: [...path, { segId: n.segId, reversed: n.reversed }] });
    }
  }
  return [];
}

// Resolve a polyline for a sequence of station codes
export function resolvePolyline(stationsCodes: string[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < stationsCodes.length - 1; i++) {
    const segIds = findSegmentsBetween(stationsCodes[i], stationsCodes[i + 1]);
    for (let j = 0; j < segIds.length; j++) {
      const seg = getSegmentById(segIds[j]);
      if (!seg) continue;
      // Reverse based on direction
      const isReversed = seg.to !== stationsCodes[i];
      let geom = seg.geometry;
      if (isReversed) geom = [...geom].reverse() as [number, number][];
      // Skip first point if not the first segment
      if (out.length > 0 && j === 0) geom = geom.slice(1);
      out.push(...geom);
    }
  }
  return out;
}

// ---------- SIGNALS ----------
export const signalPoints: SignalPoint[] = [
  { id: 'SIG-DLI-1241-UP', km: 124.1, lng: 77.2310, lat: 28.6630, type: 'home', direction: 'UP', aspect: 'green', assetId: 'SIG-DLI-1241-UP' },
  { id: 'SIG-DLI-1245-UP', km: 124.5, lng: 77.2400, lat: 28.6660, type: 'home', direction: 'UP', aspect: 'yellow', assetId: 'SIG-DLI-1245-UP' },
  { id: 'SIG-DLI-1245-DN', km: 124.5, lng: 77.2410, lat: 28.6670, type: 'home', direction: 'DOWN', aspect: 'red', assetId: 'SIG-DLI-1245-DN' },
  { id: 'SIG-DLI-1248-DN', km: 124.8, lng: 77.3176, lat: 28.6720, type: 'home', direction: 'DOWN', aspect: 'green', assetId: 'SIG-DLI-1248-DN' },
  { id: 'SIG-SZM-1251-UP', km: 125.1, lng: 77.2220, lat: 28.6790, type: 'starter', direction: 'UP', aspect: 'green', assetId: 'SIG-SZM-1251-UP' },
  { id: 'SIG-DSA-1258-UP', km: 125.8, lng: 77.2906, lat: 28.6736, type: 'home', direction: 'UP', aspect: 'green', assetId: 'SIG-DSA-1258-UP' },
  { id: 'SIG-VVB-1261-DN', km: 126.1, lng: 77.3186, lat: 28.6730, type: 'home', direction: 'DOWN', aspect: 'green', assetId: 'SIG-VVB-1261-DN' },
  { id: 'SIG-GZB-1275-DN', km: 127.5, lng: 77.4393, lat: 28.6531, type: 'home', direction: 'DOWN', aspect: 'green', assetId: 'SIG-GZB-1275-DN' },
  { id: 'SIG-NDLS-1270-UP', km: 127.0, lng: 77.2210, lat: 28.6470, type: 'home', direction: 'UP', aspect: 'yellow', assetId: 'SIG-NDLS-1270-UP' },
  { id: 'SIG-TKJ-1276-DN', km: 127.6, lng: 77.2410, lat: 28.6270, type: 'starter', direction: 'DOWN', aspect: 'green', assetId: 'SIG-TKJ-1276-DN' },
];

// ---------- OHE MASTS (auto-distributed along main lines) ----------
// Real OHE mast spacing is ~30-72m. For visual clarity we sample every ~150m.
function sampleAlongGeometry(points: [number, number][], stepDeg: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  let cum = 0;
  let km = 0;
  let lastSampled = -1;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    let t = 0;
    while (t < 1) {
      const remaining = segLen * (1 - t);
      if (cum + remaining < stepDeg) {
        cum += remaining;
        t = 1;
        break;
      }
      const needed = stepDeg - cum;
      t += needed / segLen;
      cum = 0;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      km += stepDeg * 111;
      out.push([x, y, km]);
    }
  }
  return out;
}

export const oheMasts: OHEMast[] = (() => {
  const masts: OHEMast[] = [];
  const stepDeg = 0.0025; // ~250m visual
  segments.filter(s => s.type === 'main' || s.type === 'branch').forEach((seg, idx) => {
    const samples = sampleAlongGeometry(seg.geometry, stepDeg);
    samples.forEach(([lng, lat, km], i) => {
      masts.push({
        id: `OHE-MAST-${seg.id}-${i.toString().padStart(3, '0')}`,
        km: Math.round((seg.kmStart + (i * stepDeg * 111)) * 10) / 10,
        lng, lat,
        type: i % 8 === 0 ? 'portal' : 'cantilever',
        mastNo: `${seg.id.slice(-3)}-${(i + 1).toString().padStart(2, '0')}`,
        voltage: 25,
      });
    });
  });
  return masts;
})();

// ---------- LEVEL CROSSINGS ----------
export const levelCrossings: LevelCrossing[] = [
  { id: 'LC-1243', km: 124.3, lng: 77.2370, lat: 28.6652, name: 'Kishanganj Gate', status: 'manned' },
  { id: 'LC-1247', km: 124.7, lng: 77.2730, lat: 28.6790, name: 'Vivek Vihar Gate', status: 'interlocked' },
  { id: 'LC-1252', km: 125.2, lng: 77.3460, lat: 28.6690, name: 'Chanderpuri Gate', status: 'manned' },
  { id: 'LC-1262', km: 126.2, lng: 77.4020, lat: 28.6600, name: 'Behta Hajipur Gate', status: 'manned' },
  { id: 'LC-1273', km: 127.3, lng: 77.4660, lat: 28.6502, name: 'Hindon Crossing', status: 'interlocked' },
  { id: 'LC-1279', km: 127.9, lng: 77.4870, lat: 28.6478, name: 'Sahibabad Outer Gate', status: 'unmanned' },
  { id: 'LC-12702', km: 127.02, lng: 77.2355, lat: 28.6365, name: 'Pragati Maidan Gate', status: 'manned' },
];

// ---------- BRIDGES ----------
export const bridges: BridgeAsset[] = [
  { id: 'BRG-DLI-1248', km: 124.8, name: 'Yamuna River Bridge (UP/DN)', lng: 77.2820, lat: 28.6760, type: 'GIRDER', spans: 6, length: 612, assetId: 'BRG-DLI-1248' },
  { id: 'BRG-HZD-1273', km: 127.3, name: 'Hindon River Bridge',         lng: 77.4700, lat: 28.6500, type: 'RCC',    spans: 2, length: 84,  assetId: 'BRG-HZD-1273' },
];

// ---------- YARDS (siding networks) ----------
export const yards: Yard[] = [
  {
    id: 'YARD-DLI', station: 'DLI', name: 'Delhi Coaching Yard', lng: 77.2265, lat: 28.6605,
    tracks: [
      { id: 'Y1', lng: 77.2265, lat: 28.6608 },
      { id: 'Y2', lng: 77.2258, lat: 28.6608 },
      { id: 'Y3', lng: 77.2250, lat: 28.6608 },
      { id: 'Y4', lng: 77.2242, lat: 28.6608 },
      { id: 'Y5', lng: 77.2265, lat: 28.6600 },
      { id: 'Y6', lng: 77.2258, lat: 28.6600 },
      { id: 'Y7', lng: 77.2250, lat: 28.6600 },
      { id: 'Y8', lng: 77.2242, lat: 28.6600 },
    ],
  },
  {
    id: 'YARD-GZB', station: 'GZB', name: 'Ghaziabad Goods Yard', lng: 77.4425, lat: 28.6545,
    tracks: [
      { id: 'G1', lng: 77.4420, lat: 28.6548 },
      { id: 'G2', lng: 77.4430, lat: 28.6548 },
      { id: 'G3', lng: 77.4440, lat: 28.6548 },
      { id: 'G4', lng: 77.4450, lat: 28.6548 },
      { id: 'G5', lng: 77.4420, lat: 28.6540 },
      { id: 'G6', lng: 77.4430, lat: 28.6540 },
      { id: 'G7', lng: 77.4440, lat: 28.6540 },
      { id: 'G8', lng: 77.4450, lat: 28.6540 },
    ],
  },
  {
    id: 'YARD-NDLS', station: 'NDLS', name: 'New Delhi Coach Yard', lng: 77.2180, lat: 28.6410,
    tracks: [
      { id: 'N1', lng: 77.2180, lat: 28.6405 },
      { id: 'N2', lng: 77.2172, lat: 28.6405 },
      { id: 'N3', lng: 77.2164, lat: 28.6405 },
      { id: 'N4', lng: 77.2156, lat: 28.6405 },
    ],
  },
];

// ---------- SWITCHES / POINT MACHINES ----------
export const switches: SwitchPoint[] = [
  { id: 'PTM-DLI-001', km: 124.0, lng: 77.2285, lat: 28.6625, type: 'CLAMP_LOCK', assetId: 'PTM-DLI-1241-08' },
  { id: 'PTM-DLI-002', km: 124.5, lng: 77.2405, lat: 28.6665, type: 'CLAMP_LOCK', assetId: 'PTM-DLI-1245-12' },
  { id: 'PTM-SZM-003', km: 125.1, lng: 77.2085, lat: 28.6815, type: 'END_CLAMP',  assetId: 'PTM-SZM-1251-09' },
  { id: 'PTM-DSA-004', km: 125.8, lng: 77.2910, lat: 28.6740, type: 'CLAMP_LOCK', assetId: 'PTM-DSA-1258-11' },
  { id: 'PTM-VVB-005', km: 126.1, lng: 77.3180, lat: 28.6725, type: 'END_CLAMP',  assetId: 'PTM-VVB-1261-09' },
  { id: 'PTM-GZB-006', km: 127.5, lng: 77.4398, lat: 28.6535, type: 'CLAMP_LOCK', assetId: 'PTM-GZB-1275-07' },
  { id: 'PTM-NDLS-007', km: 127.0, lng: 77.2205, lat: 28.6435, type: 'CLAMP_LOCK', assetId: 'PTM-NDLS-1270-04' },
  { id: 'PTM-SBB-008', km: 128.1, lng: 77.5018, lat: 28.6460, type: 'END_CLAMP',  assetId: 'PTM-SBB-1281-02' },
  { id: 'PTM-DLI-009', km: 124.7, lng: 77.2300, lat: 28.6615, type: 'TRAILABLE',  assetId: 'PTM-DLI-1247-T1' },
  { id: 'PTM-GZB-010', km: 127.4, lng: 77.4380, lat: 28.6542, type: 'TRAILABLE',  assetId: 'PTM-GZB-1274-T2' },
];

// ---------- DEFECTS ----------
export const defectPoints: DefectPoint[] = [
  { id: 'DEF-2026-088', km: 124.5, lng: 77.2405, lat: 28.6660, assetType: 'TRACK', severity: 'critical', category: 'Gauge Widening', assetId: 'TRK-DLI-1245' },
  { id: 'DEF-2026-089', km: 124.5, lng: 77.2410, lat: 28.6668, assetType: 'TRACK', severity: 'critical', category: 'Ballast Pockets', assetId: 'TRK-DLI-1245' },
  { id: 'DEF-2026-091', km: 124.6, lng: 77.2450, lat: 28.6685, assetType: 'TRACK', severity: 'warning', category: 'Weld Lipping', assetId: 'TRK-DLI-1245' },
  { id: 'DEF-2026-094', km: 124.2, lng: 77.2340, lat: 28.6648, assetType: 'TRACK', severity: 'warning', category: 'Weld Surface', assetId: 'TRK-DLI-1242' },
  { id: 'DEF-2026-102', km: 125.3, lng: 77.3450, lat: 28.6690, assetType: 'TRACK', severity: 'warning', category: 'Sleeper Condition', assetId: 'TRK-DLI-1253' },
  { id: 'DEF-2026-OHE-1', km: 124.5, lng: 77.2408, lat: 28.6663, assetType: 'OHE', severity: 'critical', category: 'Contact Wire Stagger', assetId: 'OHE-DLI-1245-07' },
  { id: 'DEF-2026-SIG-1', km: 124.5, lng: 77.2412, lat: 28.6666, assetType: 'SIGNAL', severity: 'critical', category: 'Aspect Reliability', assetId: 'SIG-DLI-1245-UP' },
];

// ---------- INSPECTIONS ----------
export const inspectionPoints: InspectionPoint[] = [
  { id: 'INSP-2025-1120-0042', km: 124.5, lng: 77.2400, lat: 28.6660, assetType: 'TRACK', status: 'CRITICAL', assetId: 'TRK-DLI-1245' },
  { id: 'INSP-2026-0228-OHE-1245', km: 124.5, lng: 77.2407, lat: 28.6665, assetType: 'OHE', status: 'OVERDUE', assetId: 'OHE-DLI-1245-07' },
  { id: 'INSP-2026-0309-SIG-1245', km: 124.5, lng: 77.2413, lat: 28.6667, assetType: 'SIGNAL', status: 'DUE', assetId: 'SIG-DLI-1245-UP' },
  { id: 'INSP-2026-0210-BRG-1248', km: 124.8, lng: 77.2820, lat: 28.6760, assetType: 'BRIDGE', status: 'UPCOMING', assetId: 'BRG-DLI-1248' },
  { id: 'INSP-2026-0305-OHE-1245', km: 124.5, lng: 77.2406, lat: 28.6664, assetType: 'OHE', status: 'UPCOMING', assetId: 'OHE-DLI-1245-07' },
];

// ---------- WORK ORDERS ----------
export const workOrderPoints: WorkOrderPoint[] = [
  { id: 'WRK-2026-0831-018', km: 124.5, lng: 77.2403, lat: 28.6655, assetType: 'TRACK', status: 'ASSIGNED', priority: 'P1', assetId: 'TRK-DLI-1245' },
  { id: 'WRK-2026-0828-004', km: 124.5, lng: 77.2415, lat: 28.6672, assetType: 'SIGNAL', status: 'IN_PROGRESS', priority: 'P1', assetId: 'SIG-DLI-1245-UP' },
  { id: 'WRK-2026-0830-011', km: 124.5, lng: 77.2418, lat: 28.6658, assetType: 'OHE', status: 'BLOCKED', priority: 'P1', assetId: 'OHE-DLI-1245-07' },
  { id: 'WRK-2026-0831-022', km: 127.0, lng: 77.2200, lat: 28.6440, assetType: 'TRACK', status: 'OVERDUE', priority: 'P2', assetId: 'TRK-NDLS-TKJ-0021' },
  { id: 'WRK-2026-0902-009', km: 127.0, lng: 77.2203, lat: 28.6445, assetType: 'OHE', status: 'PLANNED', priority: 'P2', assetId: 'OHE-NDLS-TKJ-0021-03' },
];

// ---------- BLOCK SEGMENTS ----------
export const blockSegments: BlockSegment[] = [
  { id: 'BLK-DLI-2026-0831-03', segmentIds: ['SEG-ANVR-DSA', 'SEG-DSA-VVB'], startTime: '10:30', endTime: '13:30', status: 'APPROVED', workType: 'MAINTENANCE' },
  { id: 'BLK-DLI-2026-0903-01', segmentIds: ['SEG-DLI-CYZ', 'SEG-CYZ-SZM'],  startTime: '09:30', endTime: '17:00', status: 'ACTIVE', workType: 'SIGNALLING' },
];
