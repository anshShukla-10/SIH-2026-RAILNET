// Synthetic relational demonstration dataset for the SIH prototype.
// All identifiers are fabricated for demonstration purposes only.

import type {
  Section, Station, Train, TrackAsset, OHEAsset, SignalAsset,
  PointMachine, TrackCircuit, BridgeAsset, Inspection, Defect,
  WorkOrder, BlockRequest, RiskRecord, Alert
} from './types';

// ---------- SECTIONS ----------
export const sections: Section[] = [
  { id: 'SEC-DLI-GZB', code: 'DLI-GZB', name: 'Delhi Jn – Ghaziabad Jn', fromStation: 'DLI', toStation: 'GZB', km: 25.5, electrified: true, maxSpeed: 130 },
  { id: 'SEC-GZB-SBB', code: 'GZB-SBB', name: 'Ghaziabad Jn – Sahibabad', fromStation: 'GZB', toStation: 'SBB', km: 12.8, electrified: true, maxSpeed: 110 },
  { id: 'SEC-DLI-NDLS', code: 'DLI-NDLS', name: 'Delhi Jn – New Delhi', fromStation: 'DLI', toStation: 'NDLS', km: 4.2, electrified: true, maxSpeed: 50 },
  { id: 'SEC-NDLS-TKJ', code: 'NDLS-TKJ', name: 'New Delhi – Tilak Bridge', fromStation: 'NDLS', toStation: 'TKJ', km: 8.6, electrified: true, maxSpeed: 100 },
];

// ---------- STATIONS ----------
export const stations: Station[] = [
  { id: 'STN-DLI', code: 'DLI', name: 'Delhi Junction', km: 0, lat: 28.6620, lng: 77.2280, platforms: 16, zone: 'NR' },
  { id: 'STN-NDLS', code: 'NDLS', name: 'New Delhi', km: 2.4, lat: 28.6431, lng: 77.2197, platforms: 16, zone: 'NR' },
  { id: 'STN-SZM', code: 'SZM', name: 'Subzi Mandi', km: 5.1, lat: 28.6811, lng: 77.2089, platforms: 4, zone: 'NR' },
  { id: 'STN-DSA', code: 'DSA', name: 'Delhi Shahdara', km: 8.2, lat: 28.6736, lng: 77.2906, platforms: 4, zone: 'NR' },
  { id: 'STN-VVB', code: 'VVB', name: 'Vivek Vihar', km: 11.0, lat: 28.6720, lng: 77.3176, platforms: 2, zone: 'NR' },
  { id: 'STN-GZB', code: 'GZB', name: 'Ghaziabad Jn', km: 25.5, lat: 28.6531, lng: 77.4393, platforms: 9, zone: 'NR' },
  { id: 'STN-SBB', code: 'SBB', name: 'Sahibabad', km: 32.1, lat: 28.6457, lng: 77.5012, platforms: 3, zone: 'NR' },
  { id: 'STN-TKJ', code: 'TKJ', name: 'Tilak Bridge', km: 6.0, lat: 28.6270, lng: 77.2410, platforms: 6, zone: 'NR' },
  { id: 'STN-CYZ', code: 'CYZ', name: 'Delhi Kishanganj', km: 7.4, lat: 28.6658, lng: 77.2395, platforms: 2, zone: 'NR' },
  { id: 'STN-PWL', code: 'PWL', name: 'Patel Nagar', km: 4.8, lat: 28.6521, lng: 77.1793, platforms: 3, zone: 'NR' },
];

// ---------- TRACK ASSETS (TMS) ----------
export const tracks: TrackAsset[] = [
  {
    id: 'TRK-DLI-1241', section: 'SEC-DLI-GZB', km: '124/1', startKm: 124.1, endKm: 124.3, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 350, curveDeg: 0.4, gradient: 200, commissionedYear: 2008,
    lastInspected: '2026-01-12', condition: 'normal', riskScore: 22,
    defects: [], inspectionId: 'INSP-2026-0112-0012', maintenanceId: 'WRK-2025-1015-007'
  },
  {
    id: 'TRK-DLI-1242', section: 'SEC-DLI-GZB', km: '124/2-3', startKm: 124.2, endKm: 124.4, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 340, curveDeg: 0.8, gradient: 200, commissionedYear: 2008,
    lastInspected: '2025-12-04', condition: 'warning', riskScore: 54,
    defects: ['DEF-2026-091', 'DEF-2026-094'], inspectionId: 'INSP-2025-1204-0031'
  },
  {
    id: 'TRK-DLI-1245', section: 'SEC-DLI-GZB', km: '124/4-7', startKm: 124.4, endKm: 124.7, type: 'MAINLINE', railType: '52KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 300, curveDeg: 1.2, gradient: 180, commissionedYear: 2002,
    lastInspected: '2025-11-20', condition: 'critical', riskScore: 87,
    defects: ['DEF-2026-088', 'DEF-2026-089', 'DEF-2026-091'], inspectionId: 'INSP-2025-1120-0042',
    maintenanceId: 'WRK-2026-0831-018'
  },
  {
    id: 'TRK-DLI-1248', section: 'SEC-DLI-GZB', km: '124/8-9', startKm: 124.8, endKm: 124.95, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 360, curveDeg: 0.3, gradient: 200, commissionedYear: 2011,
    lastInspected: '2026-02-18', condition: 'normal', riskScore: 18,
    defects: []
  },
  {
    id: 'TRK-DLI-1250', section: 'SEC-DLI-GZB', km: '125/0-2', startKm: 125.0, endKm: 125.2, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 340, curveDeg: 0.5, gradient: 220, commissionedYear: 2011,
    lastInspected: '2026-02-18', condition: 'normal', riskScore: 25,
    defects: []
  },
  {
    id: 'TRK-DLI-1253', section: 'SEC-DLI-GZB', km: '125/3-5', startKm: 125.3, endKm: 125.55, type: 'LOOP', railType: '52KG_90UTR',
    sleeperType: 'Wooden', ballastDepth: 280, curveDeg: 1.8, gradient: 195, commissionedYear: 1997,
    lastInspected: '2025-09-11', condition: 'warning', riskScore: 61,
    defects: ['DEF-2026-102']
  },
  {
    id: 'TRK-DLI-1310', section: 'SEC-DLI-GZB', km: '131/0-2', startKm: 131.0, endKm: 131.25, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 380, curveDeg: 0.2, gradient: 200, commissionedYear: 2015,
    lastInspected: '2026-03-01', condition: 'normal', riskScore: 12,
    defects: []
  },
  {
    id: 'TRK-GZB-SBB-0085', section: 'SEC-GZB-SBB', km: '8/5-6', startKm: 8.5, endKm: 8.65, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 350, curveDeg: 0.6, gradient: 210, commissionedYear: 2010,
    lastInspected: '2025-12-19', condition: 'info', riskScore: 34,
    defects: []
  },
  {
    id: 'TRK-NDLS-TKJ-0021', section: 'SEC-NDLS-TKJ', km: '2/1-2', startKm: 2.1, endKm: 2.25, type: 'MAINLINE', railType: '60KG_90UTR',
    sleeperType: 'PSC', ballastDepth: 320, curveDeg: 1.4, gradient: 220, commissionedYear: 2005,
    lastInspected: '2025-10-22', condition: 'warning', riskScore: 58,
    defects: ['DEF-2026-115']
  },
];

// ---------- OHE ASSETS (TDMS) ----------
export const ohes: OHEAsset[] = [
  {
    id: 'OHE-DLI-1241-04', section: 'SEC-DLI-GZB', km: '124/1', type: 'CANTILEVER', voltage: 25,
    mastNo: 'M-1241-04', contactWireHeight: 5.55, tension: 14.0, lastInspected: '2026-02-04',
    condition: 'normal', riskScore: 23, faults: []
  },
  {
    id: 'OHE-DLI-1242-05', section: 'SEC-DLI-GZB', km: '124/2', type: 'CANTILEVER', voltage: 25,
    mastNo: 'M-1242-05', contactWireHeight: 5.50, tension: 13.8, lastInspected: '2026-01-28',
    condition: 'normal', riskScore: 28, faults: []
  },
  {
    id: 'OHE-DLI-1245-07', section: 'SEC-DLI-GZB', km: '124/5', type: 'PORTAL', voltage: 25,
    mastNo: 'M-1245-07', contactWireHeight: 5.45, tension: 13.2, lastInspected: '2025-11-22',
    condition: 'critical', riskScore: 84,
    faults: ['FAT-2026-019', 'FAT-2026-022']
  },
  {
    id: 'OHE-DLI-1245-08', section: 'SEC-DLI-GZB', km: '124/5', type: 'CANTILEVER', voltage: 25,
    mastNo: 'M-1245-08', contactWireHeight: 5.46, tension: 13.0, lastInspected: '2025-11-22',
    condition: 'warning', riskScore: 62, faults: ['FAT-2026-019']
  },
  {
    id: 'OHE-DLI-1248-10', section: 'SEC-DLI-GZB', km: '124/8', type: 'CANTILEVER', voltage: 25,
    mastNo: 'M-1248-10', contactWireHeight: 5.55, tension: 14.0, lastInspected: '2026-02-15',
    condition: 'normal', riskScore: 20, faults: []
  },
  {
    id: 'OHE-DLI-1250-12', section: 'SEC-DLI-GZB', km: '125/0', type: 'CANTILEVER', voltage: 25,
    mastNo: 'M-1250-12', contactWireHeight: 5.52, tension: 13.8, lastInspected: '2026-02-15',
    condition: 'normal', riskScore: 18, faults: []
  },
  {
    id: 'OHE-GZB-SBB-0085-21', section: 'SEC-GZB-SBB', km: '8/5', type: 'CROSSOVER', voltage: 25,
    mastNo: 'M-0085-21', contactWireHeight: 5.48, tension: 13.5, lastInspected: '2025-12-09',
    condition: 'normal', riskScore: 30, faults: []
  },
  {
    id: 'OHE-NDLS-TKJ-0021-03', section: 'SEC-NDLS-TKJ', km: '2/1', type: 'CANTILEVER', voltage: 25,
    mastNo: 'M-0021-03', contactWireHeight: 5.50, tension: 13.9, lastInspected: '2025-12-30',
    condition: 'warning', riskScore: 55, faults: ['FAT-2026-024']
  },
];

// ---------- SIGNALLING ASSETS (SMMS) ----------
export const signals: SignalAsset[] = [
  {
    id: 'SIG-DLI-1241-UP', section: 'SEC-DLI-GZB', km: '124/1', type: 'COLOUR_LED_3ASP',
    aspect: 'GREEN', trackCircuit: 'TC-DLI-1241', interlockingId: 'PI-DLI-GZB-12',
    lastInspected: '2026-02-10', status: 'normal', faults: [],
    history: [
      { date: '2026-02-10', event: 'Routine test passed', severity: 'normal' },
      { date: '2025-11-04', event: 'Lamp unit replaced', severity: 'info' },
    ]
  },
  {
    id: 'SIG-DLI-1245-UP', section: 'SEC-DLI-GZB', km: '124/5', type: 'COLOUR_LED_4ASP',
    aspect: 'YELLOW', trackCircuit: 'TC-DLI-1245', interlockingId: 'PI-DLI-GZB-12',
    lastInspected: '2025-12-18', status: 'critical', faults: ['SIG-FLT-2026-031'],
    history: [
      { date: '2026-03-04', event: 'Aspect drop to YELLOW without route clearance', severity: 'critical' },
      { date: '2025-12-18', event: 'Lamp unit test passed', severity: 'normal' },
    ]
  },
  {
    id: 'SIG-DLI-1245-DN', section: 'SEC-DLI-GZB', km: '124/5', type: 'COLOUR_LED_3ASP',
    aspect: 'RED', trackCircuit: 'TC-DLI-1245-DN', interlockingId: 'PI-DLI-GZB-12',
    lastInspected: '2026-01-09', status: 'warning', faults: ['SIG-FLT-2026-033'],
    history: [
      { date: '2026-02-22', event: 'Aspects mismatch logged', severity: 'warning' },
    ]
  },
  {
    id: 'SIG-DLI-1248-DN', section: 'SEC-DLI-GZB', km: '124/8', type: 'COLOUR_LED_3ASP',
    aspect: 'GREEN', trackCircuit: 'TC-DLI-1248-DN', interlockingId: 'PI-DLI-GZB-12',
    lastInspected: '2026-02-12', status: 'normal', faults: [], history: []
  },
  {
    id: 'SIG-DLI-1253-LP', section: 'SEC-DLI-GZB', km: '125/3', type: 'SHUNT',
    aspect: 'RED', trackCircuit: 'TC-DLI-1253', interlockingId: 'PI-DLI-GZB-LOOP1',
    lastInspected: '2025-11-29', status: 'normal', faults: [], history: []
  },
  {
    id: 'SIG-NDLS-TKJ-0021-UP', section: 'SEC-NDLS-TKJ', km: '2/1', type: 'COLOUR_LED_3ASP',
    aspect: 'GREEN', trackCircuit: 'TC-NDLS-TKJ-0021', interlockingId: 'PI-NDLS-TKJ-04',
    lastInspected: '2026-01-15', status: 'warning', faults: ['SIG-FLT-2026-038'],
    history: [
      { date: '2026-02-28', event: 'Earth fault detected', severity: 'warning' }
    ]
  },
];

export const pointMachines: PointMachine[] = [
  { id: 'PTM-DLI-1245-12', section: 'SEC-DLI-GZB', km: '124/5', type: 'CLAMP_LOCK', throwTime: 4.2, lastOperation: '2026-03-02 11:42', condition: 'critical' },
  { id: 'PTM-DLI-1253-09', section: 'SEC-DLI-GZB', km: '125/3', type: 'END_CLAMP', throwTime: 3.8, lastOperation: '2026-03-03 08:11', condition: 'warning' },
  { id: 'PTM-DLI-1241-08', section: 'SEC-DLI-GZB', km: '124/1', type: 'CLAMP_LOCK', throwTime: 3.6, lastOperation: '2026-03-04 14:09', condition: 'normal' },
];

export const trackCircuits: TrackCircuit[] = [
  { id: 'TC-DLI-1241', section: 'SEC-DLI-GZB', km: '124/1', length: 720, freq: 1700, healthy: true, lastTested: '2026-02-10' },
  { id: 'TC-DLI-1245', section: 'SEC-DLI-GZB', km: '124/5', length: 850, freq: 1700, healthy: false, lastTested: '2026-02-18' },
  { id: 'TC-DLI-1245-DN', section: 'SEC-DLI-GZB', km: '124/5', length: 850, freq: 2300, healthy: true, lastTested: '2026-02-10' },
  { id: 'TC-DLI-1248-DN', section: 'SEC-DLI-GZB', km: '124/8', length: 700, freq: 2300, healthy: true, lastTested: '2026-02-12' },
  { id: 'TC-DLI-1253', section: 'SEC-DLI-GZB', km: '125/3', length: 480, freq: 1700, healthy: true, lastTested: '2026-02-19' },
  { id: 'TC-NDLS-TKJ-0021', section: 'SEC-NDLS-TKJ', km: '2/1', length: 600, freq: 2300, healthy: true, lastTested: '2026-01-15' },
];

// ---------- BRIDGES ----------
export const bridges: BridgeAsset[] = [
  {
    id: 'BRG-DLI-1248', section: 'SEC-DLI-GZB', km: '124/8',
    name: 'Yamuna North Up-line Bridge', type: 'GIRDER', spans: 4, length: 198, yearBuilt: 1986,
    lastInspected: '2025-08-19', condition: 'warning', riskScore: 64
  },
  {
    id: 'BRG-GZB-0008', section: 'SEC-GZB-SBB', km: '8/0',
    name: 'Sahibabad Flyover Br.No.209', type: 'PSC', spans: 2, length: 78, yearBuilt: 2011,
    lastInspected: '2026-01-22', condition: 'normal', riskScore: 22
  },
];

// ---------- INSPECTIONS ----------
export const inspections: Inspection[] = [
  {
    id: 'INSP-2025-1120-0042', assetId: 'TRK-DLI-1245', assetType: 'TRACK', assetKm: '124/4-7',
    section: 'SEC-DLI-GZB', scheduledDate: '2025-11-20', completedDate: '2025-11-20',
    inspector: 'Sr. Section Engineer (P.Way) — V.K. Sharma', department: 'TRACK',
    status: 'CRITICAL', findings: 'Gauge widening at 124/5-6, sleeper attrition observed. Ballast pockets inadequate on left side.',
    parameters: { gauge: '1675mm (high: 1681mm at 124/5)', crossLevel: '4mm', twist: '2.1mm/m', railTemp: '32°C' }
  },
  {
    id: 'INSP-2025-1204-0031', assetId: 'TRK-DLI-1242', assetType: 'TRACK', assetKm: '124/2-3',
    section: 'SEC-DLI-GZB', scheduledDate: '2025-12-04', completedDate: '2025-12-04',
    inspector: 'JE (P.Way) — R. Mathur', department: 'TRACK',
    status: 'COMPLETED', findings: 'Minor weld lipping detected, monitor. No speed restriction warranted.',
    parameters: { gauge: '1676mm', crossLevel: '3mm', twist: '1.5mm/m' }
  },
  {
    id: 'INSP-2026-0228-OHE-1245', assetId: 'OHE-DLI-1245-07', assetType: 'OHE', assetKm: '124/5',
    section: 'SEC-DLI-GZB', scheduledDate: '2026-02-28', inspector: 'Sr.TRD Inspector — A. P. Singh', department: 'TRD',
    status: 'OVERDUE', findings: 'Pending — last inspection 2025-11-22 reported stagger beyond tolerance and CATA flashover marks.',
    parameters: { stagger: 'pending re-measure', contactWireWear: '3.4mm of 7mm', mastsAlignment: 'deviation 38mm' }
  },
  {
    id: 'INSP-2026-0305-OHE-1245', assetId: 'OHE-DLI-1245-07', assetType: 'OHE', assetKm: '124/5',
    section: 'SEC-DLI-GZB', scheduledDate: '2026-03-05', inspector: 'Sr.TRD Inspector — A. P. Singh', department: 'TRD',
    status: 'UPCOMING', findings: 'Scheduled — focus on contact wire profile and insulator condition.',
    parameters: {}
  },
  {
    id: 'INSP-2025-1218-SIG-1245', assetId: 'SIG-DLI-1245-UP', assetType: 'SIGNAL', assetKm: '124/5',
    section: 'SEC-DLI-GZB', scheduledDate: '2025-12-18', completedDate: '2025-12-18',
    inspector: 'JE (Signal) — S. Bose', department: 'SIGNALLING',
    status: 'COMPLETED', findings: 'Aspect voltage within tolerance; recorded intermittent drop during winter fog.',
    parameters: { mainAspectV: '110V DC', earthLeak: '0.04mA' }
  },
  {
    id: 'INSP-2026-0309-SIG-1245', assetId: 'SIG-DLI-1245-UP', assetType: 'SIGNAL', assetKm: '124/5',
    section: 'SEC-DLI-GZB', scheduledDate: '2026-03-09', inspector: 'JE (Signal) — S. Bose', department: 'SIGNALLING',
    status: 'DUE', findings: 'Critical — root cause analysis required after aspect drop incident 2026-03-04.',
    parameters: {}
  },
  {
    id: 'INSP-2026-0210-BRG-1248', assetId: 'BRG-DLI-1248', assetType: 'BRIDGE', assetKm: '124/8',
    section: 'SEC-DLI-GZB', scheduledDate: '2026-03-15', inspector: 'Bridge Engineer — K. Iyer', department: 'BRIDGE',
    status: 'UPCOMING', findings: 'Routine biennial inspection.',
    parameters: {}
  },
  {
    id: 'INSP-2026-0128-PTM-1253', assetId: 'PTM-DLI-1253-09', assetType: 'POINT', assetKm: '125/3',
    section: 'SEC-DLI-GZB', scheduledDate: '2026-01-28', completedDate: '2026-01-28',
    inspector: 'JE (Signal) — S. Bose', department: 'SIGNALLING',
    status: 'COMPLETED', findings: 'Throw time within limit, slight rough detection noted.',
    parameters: { throwTime: '3.8s', detectionCurrent: '180mA' }
  },
];

// ---------- DEFECTS ----------
export const defects: Defect[] = [
  {
    id: 'DEF-2026-088', inspectionId: 'INSP-2025-1120-0042', assetId: 'TRK-DLI-1245', assetType: 'TRACK',
    assetKm: '124/4-7', section: 'SEC-DLI-GZB', reportedDate: '2025-11-20', severity: 'critical',
    category: 'Gauge Widening', description: 'Gauge widening of 6mm over 18 sleeper bays, sleeper screws loose.',
    measurement: '1681mm vs 1675mm nominal', photo: true, resolved: false, workOrderId: 'WRK-2026-0831-018'
  },
  {
    id: 'DEF-2026-089', inspectionId: 'INSP-2025-1120-0042', assetId: 'TRK-DLI-1245', assetType: 'TRACK',
    assetKm: '124/5', section: 'SEC-DLI-GZB', reportedDate: '2025-11-20', severity: 'critical',
    category: 'Ballast Pockets', description: 'Inadequate ballast cushion on left rail, mud pumping observed.',
    measurement: 'Cushion 90mm vs 250mm required', photo: true, resolved: false
  },
  {
    id: 'DEF-2026-091', inspectionId: 'INSP-2025-1120-0042', assetId: 'TRK-DLI-1245', assetType: 'TRACK',
    assetKm: '124/5-6', section: 'SEC-DLI-GZB', reportedDate: '2025-11-20', severity: 'warning',
    category: 'Weld Lipping', description: 'AT weld lipping 0.8mm; monitor and plan AT welding rectification.',
    measurement: 'Lipping 0.8mm', photo: true, resolved: false
  },
  {
    id: 'DEF-2026-094', inspectionId: 'INSP-2025-1204-0031', assetId: 'TRK-DLI-1242', assetType: 'TRACK',
    assetKm: '124/2-3', section: 'SEC-DLI-GZB', reportedDate: '2025-12-04', severity: 'warning',
    category: 'Weld Surface', description: 'Lipping 0.6mm at weld 124/2-4; plan grinding.',
    measurement: '0.6mm lipping', photo: true, resolved: false
  },
  {
    id: 'DEF-2026-102', inspectionId: 'INSP-2025-0911-0009', assetId: 'TRK-DLI-1253', assetType: 'TRACK',
    assetKm: '125/3-5', section: 'SEC-DLI-GZB', reportedDate: '2025-09-11', severity: 'warning',
    category: 'Sleeper Condition', description: 'Wooden sleeper renewal overdue — 14% defective.',
    measurement: '14% defective sleepers', photo: true, resolved: false
  },
  {
    id: 'DEF-2026-115', inspectionId: 'INSP-2025-1022-0018', assetId: 'TRK-NDLS-TKJ-0021', assetType: 'TRACK',
    assetKm: '2/1-2', section: 'SEC-NDLS-TKJ', reportedDate: '2025-10-22', severity: 'warning',
    category: 'Rail Wear', description: 'Vertical wear 7.2mm approaching limit on curves.',
    measurement: '7.2mm of 10mm', photo: true, resolved: false
  },
  {
    id: 'DEF-2026-OHE-1245-1', inspectionId: 'INSP-2026-0228-OHE-1245', assetId: 'OHE-DLI-1245-07', assetType: 'OHE',
    assetKm: '124/5', section: 'SEC-DLI-GZB', reportedDate: '2025-11-22', severity: 'critical',
    category: 'Contact Wire Stagger', description: 'Stagger deviation 65mm vs tolerance 200±15mm; CATA marks indicate flashover risk.',
    measurement: 'Stagger 265mm vs target 200mm', photo: true, resolved: false
  },
  {
    id: 'DEF-2026-SIG-1245-1', inspectionId: 'INSP-2026-0309-SIG-1245', assetId: 'SIG-DLI-1245-UP', assetType: 'SIGNAL',
    assetKm: '124/5', section: 'SEC-DLI-GZB', reportedDate: '2026-03-04', severity: 'critical',
    category: 'Aspect Reliability', description: 'Aspect dropped from GREEN to YELLOW without route clearance; root cause being investigated.',
    measurement: '8 events in 30 days', photo: true, resolved: false
  },
];

// ---------- WORK ORDERS ----------
export const workOrders: WorkOrder[] = [
  {
    id: 'WRK-2026-0831-018', defectId: 'DEF-2026-088', assetId: 'TRK-DLI-1245', assetType: 'TRACK',
    assetKm: '124/4-7', section: 'SEC-DLI-GZB',
    problem: 'Rectify gauge widening — insert gauge tie plates, replenish ballast, retighten sleeper fastenings.',
    priority: 'P1', status: 'ASSIGNED', team: 'P.Way Gang-DLI-04 (Gang Leader: A. Yadav)',
    plannedStart: '2026-03-08 10:30', plannedEnd: '2026-03-08 13:30',
    blockId: 'BLK-DLI-2026-0831-03', estimatedDelay: 35
  },
  {
    id: 'WRK-2026-0829-007', defectId: 'DEF-2026-102', assetId: 'TRK-DLI-1253', assetType: 'TRACK',
    assetKm: '125/3-5', section: 'SEC-DLI-GZB',
    problem: 'Renew 14% defective wooden sleepers; supplement ballast cushion.',
    priority: 'P2', status: 'PLANNED', team: 'P.Way Gang-DLI-04',
    plannedStart: '2026-03-14 09:00', plannedEnd: '2026-03-14 15:00', estimatedDelay: 25
  },
  {
    id: 'WRK-2026-0830-011', defectId: 'DEF-2026-OHE-1245-1', assetId: 'OHE-DLI-1245-07', assetType: 'OHE',
    assetKm: '124/5', section: 'SEC-DLI-GZB',
    problem: 'Re-tension contact wire, replace steady arm, restore stagger tolerance.',
    priority: 'P1', status: 'BLOCKED', team: 'TRD OHE Gang-GZB-02',
    plannedStart: '2026-03-09 11:00', plannedEnd: '2026-03-09 14:00', estimatedDelay: 50
  },
  {
    id: 'WRK-2026-0828-004', defectId: 'DEF-2026-SIG-1245-1', assetId: 'SIG-DLI-1245-UP', assetType: 'SIGNAL',
    assetKm: '124/5', section: 'SEC-DLI-GZB',
    problem: 'Investigate aspect drop; replace signal relay K-50; verify cable insulation.',
    priority: 'P1', status: 'IN_PROGRESS', team: 'Signal Maint. Team-DSA',
    plannedStart: '2026-03-05 09:30', plannedEnd: '2026-03-05 17:00', estimatedDelay: 20
  },
  {
    id: 'WRK-2026-0831-022', assetId: 'TRK-NDLS-TKJ-0021', assetType: 'TRACK',
    assetKm: '2/1-2', section: 'SEC-NDLS-TKJ',
    problem: 'Rail grinding on sharp curve to restore profile.',
    priority: 'P2', status: 'OVERDUE', team: 'Track Relaying Team-NDLS',
    plannedStart: '2026-02-28 10:00', plannedEnd: '2026-02-28 16:00', estimatedDelay: 30
  },
  {
    id: 'WRK-2026-0902-009', assetId: 'OHE-NDLS-TKJ-0021-03', assetType: 'OHE',
    assetKm: '2/1', section: 'SEC-NDLS-TKJ',
    problem: 'Earth fault rectification on cantilever.',
    priority: 'P2', status: 'PLANNED', team: 'TRD OHE Gang-NDLS-01',
    plannedStart: '2026-03-12 10:00', plannedEnd: '2026-03-12 13:00', estimatedDelay: 15
  },
  {
    id: 'WRK-2026-0825-014', assetId: 'BRG-DLI-1248', assetType: 'BRIDGE',
    assetKm: '124/8', section: 'SEC-DLI-GZB',
    problem: 'Routine bearing inspection and painting touch-up.',
    priority: 'P3', status: 'COMPLETED', team: 'Bridge Maint. Squad',
    plannedStart: '2026-02-15 09:00', plannedEnd: '2026-02-15 17:00',
    actualStart: '2026-02-15 09:12', actualEnd: '2026-02-15 16:48', estimatedDelay: 0
  },
];

// ---------- BLOCK REQUESTS ----------
export const blocks: BlockRequest[] = [
  {
    id: 'BLK-DLI-2026-0831-03', section: 'SEC-DLI-GZB', fromKm: '124/4', toKm: '124/7', track: 'UP',
    workType: 'MAINTENANCE', purpose: 'Gauge rectification & ballast replenishment (TRK-DLI-1245)',
    requestedBy: 'Sr.DEN (North)/DLI', startTime: '2026-03-08 10:30', endTime: '2026-03-08 13:30',
    status: 'APPROVED', workOrderIds: ['WRK-2026-0831-018'],
    affectedTrains: ['12952', '12309', '14005', '04430'],
    affectedAssets: ['TRK-DLI-1245', 'OHE-DLI-1245-07', 'SIG-DLI-1245-UP', 'PTM-DLI-1245-12'],
    conflicts: [],
    aiNote: 'No conflicting blocks identified. Window coincides with 12 freight path + 4 express UP services — consider deferring to 13:45–16:45 if Rajdhani slack available.'
  },
  {
    id: 'BLK-DLI-2026-0901-07', section: 'SEC-DLI-GZB', fromKm: '125/3', toKm: '125/5', track: 'BOTH',
    workType: 'ENGINEERING', purpose: 'Sleeper renewal on loop line (TRK-DLI-1253)',
    requestedBy: 'DEN (East)/GZB', startTime: '2026-03-14 09:00', endTime: '2026-03-14 15:00',
    status: 'PROPOSED', workOrderIds: ['WRK-2026-0829-007'],
    affectedTrains: ['04430', '54309', '12419'],
    affectedAssets: ['TRK-DLI-1253', 'PTM-DLI-1253-09'],
    conflicts: [],
    aiNote: 'Loop line block — only 3 passenger paths affected. No interlocking conflict with adjacent block BLK-DLI-2026-0831-03.'
  },
  {
    id: 'BLK-DLI-2026-0902-04', section: 'SEC-NDLS-TKJ', fromKm: '2/1', toKm: '2/2', track: 'UP',
    workType: 'OHE', purpose: 'OHE earth fault rectification',
    requestedBy: 'Sr.TRD/DEE', startTime: '2026-03-12 10:00', endTime: '2026-03-12 13:00',
    status: 'PROPOSED', workOrderIds: ['WRK-2026-0902-009'],
    affectedTrains: ['12952', '12309', '22691'],
    affectedAssets: ['OHE-NDLS-TKJ-0021-03'],
    conflicts: ['BLK-DLI-2026-0831-03 (downstream corridor dependency)'],
    aiNote: 'CONFLICT: simultaneous OHE work may overlap signalling investigation on same UP main. Stagger by ≥45 min or shift to 2026-03-13.'
  },
  {
    id: 'BLK-DLI-2026-0903-01', section: 'SEC-DLI-GZB', fromKm: '124/5', toKm: '124/6', track: 'UP',
    workType: 'SIGNALLING', purpose: 'Signal relay replacement & cable test',
    requestedBy: 'Sr.DSTE/DLI', startTime: '2026-03-05 09:30', endTime: '2026-03-05 17:00',
    status: 'ACTIVE', workOrderIds: ['WRK-2026-0828-004'],
    affectedTrains: ['12952', '12309', '22691', '14005'],
    affectedAssets: ['SIG-DLI-1245-UP', 'TC-DLI-1245', 'PTM-DLI-1245-12'],
    conflicts: [],
    aiNote: 'Currently active. AI advises monitoring PTM-DLI-1245-12 throw time and aspect drop recurrence post-rectification.'
  },
];

// ---------- TRAINS ----------
export const trains: Train[] = [
  {
    id: '12952', number: '12952', name: 'Mumbai Rajdhani Express', origin: 'NDLS', destination: 'MMCT',
    viaSection: 'NDLS-DLI-GZB-CNB', direction: 'DOWN', currentKm: 124.5, lat: 28.6581, lng: 77.3406,
    speed: 102, delayMin: 12, nextStation: 'GZB', status: 'warning',
    priority: 'RAJDHANI', rake: 'LHB-22', loco: 'WAP-5 #30012', guard: 'N.K. Pillai',
    lastUpdate: '14:42:08', schedule: [
      { station: 'NDLS', arrive: '16:25', depart: '16:55', km: 2.4 },
      { station: 'DLI', arrive: '17:05', depart: '17:08', km: 0 },
      { station: 'GZB', arrive: '17:48', depart: '17:50', km: 25.5 },
      { station: 'CNB', arrive: '22:10', depart: '22:15', km: 432.5 },
    ]
  },
  {
    id: '12953', number: '12953', name: 'Mumbai Garib Rath', origin: 'NDLS', destination: 'MMCT',
    viaSection: 'DLI-GZB-CNB', direction: 'DOWN', currentKm: 131.0, lat: 28.6543, lng: 77.4612,
    speed: 85, delayMin: 0, nextStation: 'GZB', status: 'normal',
    priority: 'EXPRESS', rake: 'LHB-26', loco: 'WAP-7 #30417', guard: 'S.K. Singh',
    lastUpdate: '14:42:08', schedule: [
      { station: 'NDLS', arrive: '17:35', depart: '17:55', km: 2.4 },
      { station: 'DLI', arrive: '18:02', depart: '18:04', km: 0 },
      { station: 'GZB', arrive: '18:38', depart: '18:40', km: 25.5 },
    ]
  },
  {
    id: '12309', number: '12309', name: 'Rajdhani Express', origin: 'NDLS', destination: 'HWH',
    viaSection: 'DLI-GZB-ALD', direction: 'DOWN', currentKm: 124.7, lat: 28.6570, lng: 77.3580,
    speed: 0, delayMin: 35, nextStation: 'GZB', status: 'critical',
    priority: 'RAJDHANI', rake: 'LHB-22', loco: 'WAP-5 #30089', guard: 'V. Bhatt',
    lastUpdate: '14:42:08', schedule: [
      { station: 'NDLS', arrive: '19:00', depart: '19:25', km: 2.4 },
      { station: 'GZB', arrive: '20:08', depart: '20:10', km: 25.5 },
    ]
  },
  {
    id: '14005', number: '14005', name: 'Lichchavi Express', origin: 'DLI', destination: 'RXL',
    viaSection: 'DLI-GZB-CPR', direction: 'DOWN', currentKm: 8.5, lat: 28.6471, lng: 77.5093,
    speed: 65, delayMin: 7, nextStation: 'GZB', status: 'warning',
    priority: 'EXPRESS', rake: 'ICF-24', loco: 'WAP-4 #22517', guard: 'M. Yadav',
    lastUpdate: '14:42:08', schedule: [{ station: 'DLI', arrive: '--', depart: '16:00', km: 0 }, { station: 'GZB', arrive: '17:00', depart: '17:02', km: 25.5 }]
  },
  {
    id: '12419', number: '12419', name: 'Gomti Express', origin: 'DLI', destination: 'LKO',
    viaSection: 'DLI-GZB-CNB', direction: 'DOWN', currentKm: 125.3, lat: 28.6525, lng: 77.3796,
    speed: 78, delayMin: 3, nextStation: 'GZB', status: 'normal',
    priority: 'EXPRESS', rake: 'ICF-22', loco: 'WAP-5 #30123', guard: 'D. Khanna',
    lastUpdate: '14:42:08', schedule: []
  },
  {
    id: '04430', number: '04430', name: 'MEMU Passenger', origin: 'DLI', destination: 'GZB',
    viaSection: 'DLI-GZB', direction: 'DOWN', currentKm: 11.0, lat: 28.6719, lng: 77.3208,
    speed: 45, delayMin: 0, nextStation: 'DSA', status: 'normal',
    priority: 'PASSENGER', rake: 'MEMU-12', loco: 'MEMU-4 #40017', guard: 'P. Rawat',
    lastUpdate: '14:42:08', schedule: []
  },
  {
    id: '54309', number: '54309', name: 'Delhi-Saharanpur Passenger', origin: 'DLI', destination: 'SRE',
    viaSection: 'DLI-GZB', direction: 'DOWN', currentKm: 25.5, lat: 28.6531, lng: 77.4393,
    speed: 0, delayMin: 8, nextStation: 'GZB', status: 'info',
    priority: 'PASSENGER', rake: 'ICF-16', loco: 'WAP-1 #22004', guard: 'A. Sharma',
    lastUpdate: '14:42:08', schedule: []
  },
  {
    id: '22691', number: '22691', name: 'Rajdhani Express', origin: 'NDLS', destination: 'SBC',
    viaSection: 'NDLS-DLI-GZB', direction: 'DOWN', currentKm: 4.2, lat: 28.6410, lng: 77.2215,
    speed: 90, delayMin: 0, nextStation: 'GZB', status: 'normal',
    priority: 'RAJDHANI', rake: 'LHB-22', loco: 'WAP-7 #30488', guard: 'R. Saxena',
    lastUpdate: '14:42:08', schedule: []
  },
  {
    id: '12618', number: '12618', name: 'MNGLA Lakshadweep Exp', origin: 'ERS', destination: 'NZM',
    viaSection: 'DLI-GZB-CNB', direction: 'UP', currentKm: 124.6, lat: 28.6565, lng: 77.3542,
    speed: 70, delayMin: 5, nextStation: 'DLI', status: 'warning',
    priority: 'EXPRESS', rake: 'LHB-24', loco: 'WAP-5 #30067', guard: 'J. Thomas',
    lastUpdate: '14:42:08', schedule: []
  },
  {
    id: '12302', number: '12302', name: 'Kolkata Rajdhani', origin: 'HWH', destination: 'NDLS',
    viaSection: 'CNB-GZB-DLI', direction: 'UP', currentKm: 131.2, lat: 28.6539, lng: 77.4631,
    speed: 110, delayMin: 2, nextStation: 'GZB', status: 'normal',
    priority: 'RAJDHANI', rake: 'LHB-22', loco: 'WAP-7 #30404', guard: 'B.N. Jha',
    lastUpdate: '14:42:08', schedule: []
  },
];

// ---------- AI RISK RECORDS ----------
export const riskRecords: RiskRecord[] = [
  {
    domain: 'TRACK', assetId: 'TRK-DLI-1245', location: 'KM 124/4-7, SEC-DLI-GZB',
    score: 87,
    reasons: [
      'Gauge widening 6mm > 1675mm limit at 124/5 — three consecutive inspections',
      '52kg rail on a 130 km/h corridor with 18-year service life (commissioned 2002)',
      'Ballast cushion 90mm vs required 250mm — mud pumping observed',
      'Curve of 1.2° increases lateral wheel-rail forces ~22% over tangent',
      'Open P1 maintenance window scheduled 2026-03-08'
    ],
    affectedAssets: ['TRK-DLI-1245', 'OHE-DLI-1245-07', 'OHE-DLI-1245-08', 'SIG-DLI-1245-UP', 'PTM-DLI-1245-12', 'TC-DLI-1245'],
    affectedTrains: ['12952', '12953', '12309', '14005', '12419', '04430', '12618'],
    recommendation: 'CRITICAL — Continue 30 km/h speed restriction until gauge rectification completed. Combine OHE & Signalling works under single block window to minimise cumulative delay. AI decision support only — final authority rests with Section Controller.',
    updatedAt: '2026-03-05 14:30'
  },
  {
    domain: 'OHE', assetId: 'OHE-DLI-1245-07', location: 'KM 124/5, SEC-DLI-GZB',
    score: 84,
    reasons: [
      'Stagger deviation 65mm outside ±15mm tolerance — flashover risk',
      'Last inspection 110 days ago (overdue cycle)',
      'Adjacent track asset in critical condition increases grounding risk',
      'Three flashover marks visible on CATA insulator',
      'Power block dependency on same UP main as signalling investigation'
    ],
    affectedAssets: ['OHE-DLI-1245-07', 'OHE-DLI-1245-08', 'TRK-DLI-1245', 'SIG-DLI-1245-UP'],
    affectedTrains: ['12952', '12953', '12309', '12618'],
    recommendation: 'High — schedule power block in coordination with track gauge rectification 2026-03-08 to share traffic disruption window. Replace steady arm; verify stagger post-tensioning. Decision support output — operational control remains with TRD.',
    updatedAt: '2026-03-05 14:30'
  },
  {
    domain: 'SIGNALLING', assetId: 'SIG-DLI-1245-UP', location: 'KM 124/5, SEC-DLI-GZB',
    score: 91,
    reasons: [
      '8 aspect drop events in 30 days without route clearance',
      'Adjacent TC-DLI-1245 marked unhealthy on last test',
      'Cable insulation degradation suspected due to ballast mud contact',
      'Same location as P1 track works — risk of work-area collision',
      'Interlocking relay K-50 reaching mean-time-between-failure threshold'
    ],
    affectedAssets: ['SIG-DLI-1245-UP', 'SIG-DLI-1245-DN', 'TC-DLI-1245', 'PTM-DLI-1245-12'],
    affectedTrains: ['12952', '12309', '22691', '14005'],
    recommendation: 'CRITICAL — Failure of safety-critical signalling asset requires immediate replacement. Currently under block BLK-DLI-2026-0903-01. AI advises segregated working window with track gang to avoid procedural conflict. Final authority: Sr.DSTE/DLI.',
    updatedAt: '2026-03-05 14:30'
  },
  {
    domain: 'BRIDGE', assetId: 'BRG-DLI-1248', location: 'KM 124/8, SEC-DLI-GZB',
    score: 64,
    reasons: [
      'Bridge age 40 years vs design life 60 years',
      'Last biennial inspection 2025-08-19 — fatigue cracks flagged',
      'UP & DOWN lines both routed over same structure',
      'High train density (~140/day) elevates fatigue accumulation',
      'Abutment drainage partially blocked — scour monitoring required'
    ],
    affectedAssets: ['BRG-DLI-1248'],
    affectedTrains: [],
    recommendation: 'Monitor — schedule detailed fatigue assessment Q2 2026. Coordinate any speed restrictions with adjacent track corridors. AI decision support only.',
    updatedAt: '2026-03-04 09:00'
  },
  {
    domain: 'MAINTENANCE', location: 'SEC-DLI-GZB',
    score: 72,
    reasons: [
      '6 overdue work orders across TRACK/OHE/SIGNALLING',
      'Two P1 jobs open: gauge rectification (TRK-DLI-1245) and signal relay (SIG-DLI-1245-UP)',
      'Resource contention: same TRD gang needed at multiple sites',
      'Block scheduling conflicts not auto-resolved',
      'Average P1 closure time 4.2 days vs target 2.0 days'
    ],
    affectedAssets: ['TRK-DLI-1245', 'OHE-DLI-1245-07', 'SIG-DLI-1245-UP', 'TRK-NDLS-TKJ-0021'],
    affectedTrains: ['12952', '12953', '12309', '14005', '12419'],
    recommendation: 'Consolidate TRK + OHE + SIG works at KM 124/5 into a single combined block window. Reschedule NDLS-TKJ grinding to 2026-03-16 to avoid resource overlap. Decision support output — engineering authority approves final plan.',
    updatedAt: '2026-03-05 14:30'
  },
];

// ---------- ALERTS ----------
export const alerts: Alert[] = [
  { id: 'ALT-001', ts: '2026-03-05 14:38', level: 'critical', domain: 'SIGNALLING', title: 'Aspect drop — SIG-DLI-1245-UP', detail: 'Aspect dropped GREEN→YELLOW without route clearance. 8th event in 30 days. Block active.', relatedId: 'SIG-DLI-1245-UP', acknowledged: false },
  { id: 'ALT-002', ts: '2026-03-05 14:21', level: 'critical', domain: 'TRACK', title: 'Gauge widening — KM 124/5', detail: 'Gauge measured 1681mm at KM 124/5. Speed restriction 30 km/h active.', relatedId: 'TRK-DLI-1245', acknowledged: true },
  { id: 'ALT-003', ts: '2026-03-05 13:55', level: 'warning', domain: 'TRAIN', title: 'Train delay — 12309 Rajdhani', detail: 'Train 12309 holding at KM 124/7 due to signalling block. Delay +35 min.', relatedId: '12309', acknowledged: false },
  { id: 'ALT-004', ts: '2026-03-05 12:08', level: 'warning', domain: 'OHE', title: 'Stagger deviation — OHE-DLI-1245-07', detail: 'Stagger deviation 65mm noted; flashover risk pending power block.', relatedId: 'OHE-DLI-1245-07', acknowledged: false },
  { id: 'ALT-005', ts: '2026-03-05 11:42', level: 'warning', domain: 'INSPECTION', title: 'Inspection overdue — OHE-DLI-1245-07', detail: 'OHE inspection 110 days overdue. Last on 2025-11-22.', relatedId: 'INSP-2026-0228-OHE-1245', acknowledged: true },
  { id: 'ALT-006', ts: '2026-03-05 10:10', level: 'info', domain: 'BLOCK', title: 'Block active — BLK-DLI-2026-0903-01', detail: 'Signalling block active on UP main, KM 124/5 to 124/6.', relatedId: 'BLK-DLI-2026-0903-01', acknowledged: true },
  { id: 'ALT-007', ts: '2026-03-04 22:15', level: 'warning', domain: 'TRACK', title: 'Inspection due — TRK-NDLS-TKJ-0021', detail: 'Quarterly inspection due; rail wear at 7.2mm approaching limit.', relatedId: 'TRK-NDLS-TKJ-0021', acknowledged: false },
  { id: 'ALT-008', ts: '2026-03-04 18:40', level: 'info', domain: 'MAINTENANCE', title: 'WO completed — WRK-2026-0825-014', detail: 'Bridge inspection and painting completed at BRG-DLI-1248.', relatedId: 'WRK-2026-0825-014', acknowledged: true },
];

// ---------- KPI metrics for Command Centre ----------
export const kpiMetrics = {
  activeTrains: 47,
  delayedTrains: 9,
  activeBlocks: 1,
  trackIssues: 3,
  oheIssues: 2,
  signallingFaults: 2,
  overdueInspections: 4,
  openMaintenance: 6,
};

// ---------- Layer toggles ----------
export const defaultLayers = [
  { key: 'tracks', label: 'Tracks', visible: true },
  { key: 'stations', label: 'Stations', visible: true },
  { key: 'signals', label: 'Signals', visible: true },
  { key: 'ohe', label: 'OHE Masts', visible: true },
  { key: 'bridges', label: 'Bridges', visible: true },
  { key: 'defects', label: 'Defects', visible: true },
  { key: 'inspections', label: 'Inspections', visible: false },
  { key: 'blocks', label: 'Blocks', visible: true },
  { key: 'trains', label: 'Trains', visible: true },
  { key: 'workOrders', label: 'Work Orders', visible: false },
];
