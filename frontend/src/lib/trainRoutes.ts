// Train routes and complete schedules for the Delhi section.
// Each train's route polyline is resolved by walking the segment graph,
// ensuring the highlighted route follows actual railway track geometry
// (no straight city-to-city lines).

import {
  stations as netStations,
  defectPoints as netDefects,
  inspectionPoints as netInspections,
  workOrderPoints as netWorkOrders,
  signalPoints as netSignals,
  switches as netSwitches,
  resolvePolyline,
  getStationByCode,
} from './railwayNetwork';

export interface TrainStop {
  code: string;
  name: string;
  arrive: string; // HH:MM
  depart: string; // HH:MM
  km: number;
  halt?: number; // minutes
  platform?: string;
  lng: number;
  lat: number;
}

export type TrainPriority = 'RAJDHANI' | 'SHATABDI' | 'DURONTO' | 'EXPRESS' | 'PASSENGER' | 'MEMU' | 'FREIGHT';
export type TrainStatus = 'normal' | 'warning' | 'critical' | 'info';

export interface ExtendedTrain {
  id: string;
  number: string;
  name: string;
  origin: string;
  destination: string;
  via: string;
  direction: 'UP' | 'DOWN';
  priority: TrainPriority;
  status: TrainStatus;
  delayMin: number;
  speed: number;
  rake: string;
  loco: string;
  guard: string;
  baseSpeed: number;
  // Ordered list of stops (full schedule)
  schedule: TrainStop[];
  // Total route distance (km)
  totalKm: number;
}

export interface TrainPosition {
  lat: number;
  lng: number;
  km: number;
  previousStation: TrainStop | null;
  currentStation: TrainStop | null;
  nextStation: TrainStop | null;
  completedKm: number;
  remainingKm: number;
  progress: number; // 0..1
  routePolyline: [number, number][];
  trackedPolyline: [number, number][];
  remainingPolyline: [number, number][];
  source: 'ESTIMATED' | 'TIMETABLE_DERIVATION';
}

// ---------- DEMO REFERENCE TIME ----------
export const REF_TIME = { hh: 14, mm: 42, ss: 8 }; // 14:42:08 IST
export const REF_DATE = '2026-08-31';

function toMin(t: string): number {
  if (!t || t === '--') return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const OFF_SECTION_STATIONS: Record<string, { name: string; km: number; lng: number; lat: number }> = {
  // These stations are outside the synthetic Delhi network. They are kept
  // as timetable metadata so a long-distance service never crashes the app.
  // Full geometry for such stations is intentionally supplied by a future
  // network/route data provider rather than fabricated here.
  CNB: { name: 'Kanpur Central', km: 432.5, lng: 80.3499, lat: 26.4499 },
};

function stop(code: string, arrive: string, depart: string, km?: number, platform?: string, halt?: number): TrainStop {
  const st = getStationByCode(code);
  const offSection = OFF_SECTION_STATIONS[code];
  const name = st?.name ?? offSection?.name ?? code;
  const stationKm = st?.km ?? offSection?.km ?? km ?? 0;
  const lng = st?.lng ?? offSection?.lng ?? 0;
  const lat = st?.lat ?? offSection?.lat ?? 0;
  return {
    code, name, arrive, depart,
    km: km ?? stationKm,
    platform, halt,
    lng, lat,
  };
}

// ---------- TRAINS WITH COMPLETE SCHEDULES ----------
export const extendedTrains: ExtendedTrain[] = [
  // ============ DOWN TRAINS (leaving Delhi eastward) ============
  {
    id: 't-12951', number: '12951', name: 'Mumbai Central Rajdhani Express',
    origin: 'MMCT', destination: 'NDLS', via: 'BRC·KOTA·CNB·GZB·DLI', direction: 'UP',
    priority: 'RAJDHANI', status: 'normal', delayMin: 0, speed: 105, baseSpeed: 130,
    rake: 'LHB-22', loco: 'WAP-5 #30011', guard: 'R.K. Verma',
    schedule: [
      stop('SBB',  '05:50', '05:52', 32.1),
      stop('HZD',  '06:02', '06:03', 28.6),
      stop('GZB',  '06:25', '06:28', 25.5, 'PF-2'),
      stop('VVB',  '07:00', '07:01', 11.0),
      stop('DSA',  '07:10', '07:12', 8.2),
      stop('SZM',  '07:24', '07:25', 5.1),
      stop('DLI',  '07:36', '07:38', 0.0, 'PF-7'),
      stop('NDLS', '07:48', '--',    2.4, 'PF-9'),
    ],
    totalKm: 1384,
  },
  {
    id: 't-12952', number: '12952', name: 'New Delhi-Mumbai Central Rajdhani Express',
    origin: 'NDLS', destination: 'MMCT', via: 'DLI·GZB·CNB·KOTA·BRC', direction: 'DOWN',
    priority: 'RAJDHANI', status: 'warning', delayMin: 12, speed: 102, baseSpeed: 110,
    rake: 'LHB-22', loco: 'WAP-5 #30012', guard: 'N.K. Pillai',
    schedule: [
      stop('NDLS', '16:25', '16:55', 2.4, 'PF-9'),
      stop('DLI',  '17:05', '17:08', 0.0, 'PF-7'),
      stop('SZM',  '17:18', '17:19', 5.1),
      stop('DSA',  '17:31', '17:32', 8.2),
      stop('GZB',  '17:48', '17:50', 25.5, 'PF-3'),
      stop('HZD',  '18:02', '18:03', 28.6),
      stop('SBB',  '18:12', '18:13', 32.1),
      stop('CNB',  '22:10', '22:15', 432.5, 'PF-2'),
    ],
    totalKm: 1384,
  },
  {
    id: 't-12953', number: '12953', name: 'Mumbai Garib Rath Express',
    origin: 'NDLS', destination: 'MMCT', via: 'DLI·GZB·CNB·BRC', direction: 'DOWN',
    priority: 'EXPRESS', status: 'normal', delayMin: 0, speed: 95, baseSpeed: 100,
    rake: 'LHB-26', loco: 'WAP-7 #30417', guard: 'S.K. Singh',
    schedule: [
      stop('NDLS', '17:35', '17:55', 2.4, 'PF-5'),
      stop('DLI',  '18:02', '18:04', 0.0),
      stop('GZB',  '18:38', '18:40', 25.5, 'PF-1'),
      stop('SBB',  '18:55', '18:56', 32.1),
    ],
    totalKm: 1384,
  },
  {
    id: 't-12309', number: '12309', name: 'Howrah Rajdhani Express',
    origin: 'NDLS', destination: 'HWH', via: 'DLI·GZB·CNB·MGS·HWH', direction: 'DOWN',
    priority: 'RAJDHANI', status: 'critical', delayMin: 35, speed: 0, baseSpeed: 130,
    rake: 'LHB-22', loco: 'WAP-5 #30089', guard: 'V. Bhatt',
    schedule: [
      stop('NDLS', '19:00', '19:25', 2.4, 'PF-10'),
      stop('DLI',  '19:33', '19:35', 0.0),
      stop('GZB',  '20:08', '20:10', 25.5, 'PF-5'),
      stop('SBB',  '20:23', '20:24', 32.1),
    ],
    totalKm: 1447,
  },
  {
    id: 't-14005', number: '14005', name: 'Lichchavi Express',
    origin: 'DLI', destination: 'RXL', via: 'GZB·CNB·CPR', direction: 'DOWN',
    priority: 'EXPRESS', status: 'warning', delayMin: 7, speed: 65, baseSpeed: 80,
    rake: 'ICF-24', loco: 'WAP-4 #22517', guard: 'M. Yadav',
    schedule: [
      stop('DLI',  '--',    '16:00', 0.0, 'PF-3'),
      stop('SZM',  '16:09', '16:10', 5.1),
      stop('DSA',  '16:21', '16:22', 8.2),
      stop('VVB',  '16:31', '16:32', 11.0),
      stop('GZB',  '17:00', '17:02', 25.5, 'PF-2'),
      stop('HZD',  '17:14', '17:15', 28.6),
      stop('SBB',  '17:22', '17:23', 32.1),
    ],
    totalKm: 952,
  },
  {
    id: 't-12419', number: '12419', name: 'Gomti Express',
    origin: 'DLI', destination: 'LKO', via: 'GZB·CNB·LKO', direction: 'DOWN',
    priority: 'EXPRESS', status: 'normal', delayMin: 3, speed: 78, baseSpeed: 80,
    rake: 'ICF-22', loco: 'WAP-5 #30123', guard: 'D. Khanna',
    schedule: [
      stop('DLI',  '--',    '12:25', 0.0, 'PF-1'),
      stop('SZM',  '12:34', '12:35', 5.1),
      stop('DSA',  '12:46', '12:47', 8.2),
      stop('VVB',  '12:56', '12:57', 11.0),
      stop('GZB',  '13:25', '13:27', 25.5, 'PF-4'),
      stop('SBB',  '13:42', '13:43', 32.1),
    ],
    totalKm: 497,
  },
  {
    id: 't-22691', number: '22691', name: 'Bengaluru Rajdhani Express',
    origin: 'NDLS', destination: 'SBC', via: 'DLI·GZB·JHS·HYB', direction: 'DOWN',
    priority: 'RAJDHANI', status: 'normal', delayMin: 0, speed: 92, baseSpeed: 110,
    rake: 'LHB-22', loco: 'WAP-7 #30488', guard: 'R. Saxena',
    schedule: [
      stop('NDLS', '20:00', '20:30', 2.4, 'PF-11'),
      stop('DLI',  '20:38', '20:40', 0.0),
      stop('GZB',  '21:13', '21:15', 25.5, 'PF-2'),
      stop('SBB',  '21:30', '21:31', 32.1),
    ],
    totalKm: 2388,
  },
  {
    id: 't-04430', number: '04430', name: 'MEMU Passenger',
    origin: 'DLI', destination: 'GZB', via: 'SZM·DSA·VVB', direction: 'DOWN',
    priority: 'MEMU', status: 'normal', delayMin: 0, speed: 45, baseSpeed: 50,
    rake: 'MEMU-12', loco: 'MEMU-4 #40017', guard: 'P. Rawat',
    schedule: [
      stop('DLI',  '--',    '14:30', 0.0),
      stop('CYZ',  '14:34', '14:35', 1.4),
      stop('DBSI', '14:39', '14:40', 3.8),
      stop('SZM',  '14:43', '14:45', 5.1),
      stop('ANVR', '14:50', '14:51', 6.6),
      stop('DSA',  '14:55', '14:57', 8.2),
      stop('VVB',  '15:02', '15:03', 11.0),
      stop('GZB',  '15:25', '--',   25.5),
    ],
    totalKm: 25.5,
  },
  {
    id: 't-54309', number: '54309', name: 'Delhi-Saharanpur Passenger',
    origin: 'DLI', destination: 'SRE', via: 'SZM·DSA·GZB', direction: 'DOWN',
    priority: 'PASSENGER', status: 'info', delayMin: 8, speed: 0, baseSpeed: 50,
    rake: 'ICF-16', loco: 'WAP-1 #22004', guard: 'A. Sharma',
    schedule: [
      stop('DLI',  '--',    '14:00', 0.0, 'PF-5'),
      stop('SZM',  '14:11', '14:13', 5.1),
      stop('DSA',  '14:24', '14:26', 8.2),
      stop('GZB',  '15:00', '15:05', 25.5, 'PF-6'),
      stop('SBB',  '15:20', '15:22', 32.1),
    ],
    totalKm: 159,
  },

  // ============ UP TRAINS (entering Delhi from east) ============
  {
    id: 't-12618', number: '12618', name: 'MNGLA Lakshadweep Express',
    origin: 'ERS', destination: 'NZM', via: 'GZB·NDLS', direction: 'UP',
    priority: 'EXPRESS', status: 'warning', delayMin: 5, speed: 70, baseSpeed: 90,
    rake: 'LHB-24', loco: 'WAP-5 #30067', guard: 'J. Thomas',
    schedule: [
      stop('SBB',  '12:00', '12:02', 32.1),
      stop('HZD',  '12:12', '12:13', 28.6),
      stop('GZB',  '12:35', '12:38', 25.5, 'PF-4'),
      stop('VVB',  '13:08', '13:09', 11.0),
      stop('DSA',  '13:18', '13:20', 8.2),
      stop('SZM',  '13:32', '13:34', 5.1),
      stop('DLI',  '13:45', '13:48', 0.0, 'PF-2'),
      stop('NDLS', '13:58', '--',    2.4, 'PF-3'),
    ],
    totalKm: 2938,
  },
  {
    id: 't-12302', number: '12302', name: 'Kolkata Rajdhani Express',
    origin: 'HWH', destination: 'NDLS', via: 'MGS·CNB·GZB·DLI', direction: 'UP',
    priority: 'RAJDHANI', status: 'normal', delayMin: 2, speed: 110, baseSpeed: 130,
    rake: 'LHB-22', loco: 'WAP-7 #30404', guard: 'B.N. Jha',
    schedule: [
      stop('SBB',  '09:30', '09:32', 32.1),
      stop('GZB',  '10:00', '10:02', 25.5, 'PF-2'),
      stop('DSA',  '10:18', '10:19', 8.2),
      stop('SZM',  '10:30', '10:31', 5.1),
      stop('DLI',  '10:42', '10:44', 0.0, 'PF-6'),
      stop('NDLS', '10:52', '--',    2.4, 'PF-7'),
    ],
    totalKm: 1447,
  },
  {
    id: 't-12617', number: '12617', name: 'MNGLA Lakshadweep Express (DN)',
    origin: 'NZM', destination: 'ERS', via: 'DLI·GZB', direction: 'DOWN',
    priority: 'EXPRESS', status: 'normal', delayMin: 0, speed: 88, baseSpeed: 90,
    rake: 'LHB-24', loco: 'WAP-5 #30068', guard: 'P. Iyer',
    schedule: [
      stop('NZM',  '--',    '11:00', 7.6, 'PF-2'),
      stop('DLI',  '11:20', '11:23', 0.0),
      stop('SZM',  '11:35', '11:36', 5.1),
      stop('DSA',  '11:48', '11:49', 8.2),
      stop('GZB',  '12:30', '12:33', 25.5, 'PF-5'),
      stop('SBB',  '12:50', '12:51', 32.1),
    ],
    totalKm: 2938,
  },

  // ============ NDLS-TKJ BRANCH TRAINS ============
  {
    id: 't-12002', number: '12002', name: 'New Delhi-Bhopal Shatabdi',
    origin: 'NDLS', destination: 'BPL', via: 'TKJ·NZM·AGC', direction: 'DOWN',
    priority: 'SHATABDI', status: 'normal', delayMin: 0, speed: 130, baseSpeed: 150,
    rake: 'LHB-18', loco: 'WAP-5 #30051', guard: 'S. Mehra',
    schedule: [
      stop('NDLS', '--',    '15:50', 2.4, 'PF-1'),
      stop('LPN',  '15:55', '15:56', 5.6),
      stop('PGMD', '15:59', '16:00', 4.0),
      stop('TKJ',  '16:03', '16:05', 6.0, 'PF-3'),
    ],
    totalKm: 707,
  },
  {
    id: 't-12001', number: '12001', name: 'Bhopal-New Delhi Shatabdi',
    origin: 'BPL', destination: 'NDLS', via: 'AGC·NZM·TKJ', direction: 'UP',
    priority: 'SHATABDI', status: 'normal', delayMin: 4, speed: 105, baseSpeed: 150,
    rake: 'LHB-18', loco: 'WAP-5 #30052', guard: 'V. Khurana',
    schedule: [
      stop('TKJ',  '11:20', '11:22', 6.0),
      stop('PGMD', '11:25', '11:26', 4.0),
      stop('LPN',  '11:30', '11:31', 5.6),
      stop('NDLS', '11:38', '--',    2.4, 'PF-1'),
    ],
    totalKm: 707,
  },
  {
    id: 't-64078', number: '64078', name: 'Delhi Jind MEMU',
    origin: 'NDLS', destination: 'PWL', via: 'SJ·PWL', direction: 'DOWN',
    priority: 'MEMU', status: 'normal', delayMin: 0, speed: 32, baseSpeed: 40,
    rake: 'MEMU-8', loco: 'MEMU-4 #40025', guard: 'R. Singh',
    schedule: [
      stop('NDLS', '--',    '14:15', 2.4),
      stop('SJ',   '14:22', '14:23', 4.2),
      stop('PWL',  '14:32', '--',   6.4),
    ],
    totalKm: 6.4,
  },

  // ============ ADDITIONAL FREIGHT & EXPRESS TRAINS ============
  {
    id: 't-12137', number: '12137', name: 'Punjab Mail',
    origin: 'DLI', destination: 'CSMT', via: 'GZB·AGC·CNB·BPL·JL·MMCT', direction: 'DOWN',
    priority: 'EXPRESS', status: 'normal', delayMin: 4, speed: 78, baseSpeed: 110,
    rake: 'ICF-22', loco: 'WAP-4 #22506', guard: 'S. Tyagi',
    schedule: [
      stop('DLI',  '--',    '19:35', 0.0, 'PF-8'),
      stop('SZM',  '19:44', '19:45', 5.1),
      stop('DSA',  '19:55', '19:56', 8.2),
      stop('GZB',  '20:30', '20:33', 25.5, 'PF-3'),
      stop('SBB',  '20:48', '20:49', 32.1),
    ],
    totalKm: 1529,
  },
  {
    id: 't-11057', number: '11057', name: 'Amritsar-Dadar Express',
    origin: 'ASR', destination: 'DDR', via: 'DLI·GZB', direction: 'DOWN',
    priority: 'EXPRESS', status: 'warning', delayMin: 18, speed: 60, baseSpeed: 110,
    rake: 'ICF-24', loco: 'WAP-4 #22541', guard: 'A. Khan',
    schedule: [
      stop('NDLS', '20:25', '20:28', 2.4, 'PF-4'),
      stop('DLI',  '20:36', '20:38', 0.0),
      stop('DSA',  '20:55', '20:56', 8.2),
      stop('GZB',  '21:32', '21:34', 25.5, 'PF-2'),
      stop('SBB',  '21:50', '21:51', 32.1),
    ],
    totalKm: 1758,
  },
  {
    id: 't-14217', number: '14217', name: 'Unchahar Express',
    origin: 'DLI', destination: 'CDG', via: 'GZB·SRE·UMB', direction: 'DOWN',
    priority: 'EXPRESS', status: 'normal', delayMin: 0, speed: 82, baseSpeed: 100,
    rake: 'ICF-22', loco: 'WAP-5 #30118', guard: 'M. Lal',
    schedule: [
      stop('DLI',  '--',    '21:50', 0.0, 'PF-4'),
      stop('SZM',  '21:59', '22:00', 5.1),
      stop('GZB',  '22:35', '22:38', 25.5, 'PF-5'),
      stop('SBB',  '22:53', '22:54', 32.1),
    ],
    totalKm: 259,
  },
  {
    id: 't-18101', number: '18101', name: 'Tata-Rourkela Express',
    origin: 'TATA', destination: 'ROU', via: 'CNB·GZB·DLI', direction: 'UP',
    priority: 'EXPRESS', status: 'info', delayMin: 12, speed: 0, baseSpeed: 90,
    rake: 'ICF-20', loco: 'WAP-4 #22555', guard: 'V. Tiwari',
    schedule: [
      stop('SBB',  '17:50', '17:52', 32.1),
      stop('GZB',  '18:22', '18:24', 25.5, 'PF-1'),
      stop('DSA',  '18:46', '18:47', 8.2),
      stop('SZM',  '19:00', '19:01', 5.1),
      stop('DLI',  '19:14', '19:17', 0.0, 'PF-1'),
      stop('NDLS', '19:28', '--',    2.4, 'PF-5'),
    ],
    totalKm: 1681,
  },
  {
    id: 't-12259', number: '12259', name: 'Sealdah-Duronto Express',
    origin: 'SDAH', destination: 'DLI', via: 'MGS·CNB·GZB', direction: 'UP',
    priority: 'DURONTO', status: 'normal', delayMin: 0, speed: 122, baseSpeed: 130,
    rake: 'LHB-20', loco: 'WAP-7 #30420', guard: 'A. Bose',
    schedule: [
      stop('SBB',  '07:00', '07:02', 32.1),
      stop('GZB',  '07:35', '07:37', 25.5, 'PF-7'),
      stop('VVB',  '08:08', '08:09', 11.0),
      stop('DSA',  '08:18', '08:20', 8.2),
      stop('SZM',  '08:32', '08:33', 5.1),
      stop('DLI',  '08:45', '--',    0.0, 'PF-6'),
    ],
    totalKm: 1462,
  },
  {
    id: 't-12260', number: '12260', name: 'Delhi-Sealdah Duronto Express',
    origin: 'DLI', destination: 'SDAH', via: 'GZB·CNB·MGS', direction: 'DOWN',
    priority: 'DURONTO', status: 'warning', delayMin: 8, speed: 115, baseSpeed: 130,
    rake: 'LHB-20', loco: 'WAP-7 #30421', guard: 'P. Roy',
    schedule: [
      stop('DLI',  '--',    '22:55', 0.0, 'PF-6'),
      stop('SZM',  '23:04', '23:05', 5.1),
      stop('DSA',  '23:15', '23:16', 8.2),
      stop('GZB',  '23:50', '23:52', 25.5, 'PF-7'),
      stop('SBB',  '00:08', '00:09', 32.1),
    ],
    totalKm: 1462,
  },
  {
    id: 't-54075', number: '54075', name: 'Delhi-Saharanpur Passenger',
    origin: 'DLI', destination: 'SRE', via: 'GZB', direction: 'DOWN',
    priority: 'PASSENGER', status: 'normal', delayMin: 0, speed: 38, baseSpeed: 50,
    rake: 'ICF-12', loco: 'WAP-1 #22007', guard: 'H. Lal',
    schedule: [
      stop('DLI',  '--',    '13:30', 0.0),
      stop('SZM',  '13:38', '13:39', 5.1),
      stop('DSA',  '13:49', '13:50', 8.2),
      stop('VVB',  '14:00', '14:01', 11.0),
      stop('GZB',  '14:30', '14:32', 25.5),
      stop('SBB',  '14:48', '14:50', 32.1),
    ],
    totalKm: 159,
  },
  {
    id: 't-12301', number: '12301', name: 'Howrah-New Delhi Rajdhani',
    origin: 'HWH', destination: 'NDLS', via: 'CNB·GZB·DLI', direction: 'UP',
    priority: 'RAJDHANI', status: 'normal', delayMin: 0, speed: 125, baseSpeed: 130,
    rake: 'LHB-22', loco: 'WAP-7 #30402', guard: 'S. Mukherjee',
    schedule: [
      stop('SBB',  '06:05', '06:07', 32.1),
      stop('GZB',  '06:38', '06:40', 25.5, 'PF-1'),
      stop('DSA',  '07:00', '07:01', 8.2),
      stop('SZM',  '07:12', '07:13', 5.1),
      stop('DLI',  '07:24', '07:26', 0.0, 'PF-7'),
      stop('NDLS', '07:35', '--',    2.4, 'PF-9'),
    ],
    totalKm: 1447,
  },
  {
    id: 't-14317', number: '14317', name: 'Indore-New Delhi Express',
    origin: 'INDB', destination: 'NDLS', via: 'BPL·JHS·CNB·GZB', direction: 'UP',
    priority: 'EXPRESS', status: 'normal', delayMin: 0, speed: 72, baseSpeed: 90,
    rake: 'ICF-22', loco: 'WAP-4 #22571', guard: 'R. Sharma',
    schedule: [
      stop('SBB',  '14:10', '14:12', 32.1),
      stop('HZD',  '14:22', '14:23', 28.6),
      stop('GZB',  '14:48', '14:50', 25.5, 'PF-4'),
      stop('VVB',  '15:22', '15:23', 11.0),
      stop('DSA',  '15:32', '15:34', 8.2),
      stop('SZM',  '15:46', '15:47', 5.1),
      stop('DLI',  '15:58', '16:01', 0.0, 'PF-1'),
      stop('NDLS', '16:10', '--',    2.4, 'PF-2'),
    ],
    totalKm: 941,
  },
  {
    id: 't-64011', number: '64011', name: 'Ghaziabad-Saharanpur MEMU',
    origin: 'GZB', destination: 'SRE', via: 'SBB·HZD', direction: 'DOWN',
    priority: 'MEMU', status: 'normal', delayMin: 0, speed: 42, baseSpeed: 50,
    rake: 'MEMU-8', loco: 'MEMU-4 #40031', guard: 'K. Yadav',
    schedule: [
      stop('GZB',  '--',    '15:00', 25.5),
      stop('GZBO', '15:04', '15:05', 27.0),
      stop('HZD',  '15:09', '15:10', 28.6),
      stop('SBB',  '15:18', '--',   32.1),
    ],
    totalKm: 6.6,
  },
  {
    id: 't-22210', number: '22210', name: 'New Delhi-Mumbai Central Duronto',
    origin: 'NDLS', destination: 'MMCT', via: 'DLI·GZB·CNB·BRC', direction: 'DOWN',
    priority: 'DURONTO', status: 'normal', delayMin: 0, speed: 120, baseSpeed: 130,
    rake: 'LHB-20', loco: 'WAP-7 #30455', guard: 'S. Joshi',
    schedule: [
      stop('NDLS', '--',    '23:25', 2.4, 'PF-12'),
      stop('DLI',  '23:33', '23:35', 0.0),
      stop('GZB',  '00:08', '00:10', 25.5, 'PF-4'),
      stop('SBB',  '00:25', '00:26', 32.1),
    ],
    totalKm: 1384,
  },
  {
    id: 't-12471', number: '12471', name: 'Swaraj Express',
    origin: 'DLI', destination: 'SWMR', via: 'GZB·LDH·JAT', direction: 'DOWN',
    priority: 'EXPRESS', status: 'normal', delayMin: 0, speed: 68, baseSpeed: 90,
    rake: 'ICF-20', loco: 'WAP-4 #22533', guard: 'H. Singh',
    schedule: [
      stop('DLI',  '--',    '21:10', 0.0, 'PF-3'),
      stop('SZM',  '21:19', '21:20', 5.1),
      stop('DSA',  '21:30', '21:31', 8.2),
      stop('GZB',  '22:05', '22:08', 25.5, 'PF-2'),
      stop('SBB',  '22:22', '22:23', 32.1),
    ],
    totalKm: 547,
  },
];

// ---------- COMPUTE CURRENT POSITION ----------
function totalPolylineLen(p: [number, number][]): number {
  let len = 0;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    len += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  return len;
}

export function getTrainPosition(train: ExtendedTrain, refHH?: number, refMM?: number): TrainPosition | null {
  const nowMin = (refHH ?? REF_TIME.hh) * 60 + (refMM ?? REF_TIME.mm);

  // Build route polyline from the local railway graph.
  const codes = train.schedule.map(s => s.code);
  const routePolyline = resolvePolyline(codes);
  if (routePolyline.length < 2) return null;

  // Normalise schedule times so services crossing midnight remain monotonic.
  // Example: 23:55 -> 00:08 becomes 1435 -> 1448.
  const firstDeparture = toMin(train.schedule[0].depart === '--' ? train.schedule[0].arrive : train.schedule[0].depart);
  const scheduleMinutes: { arrive: number; depart: number }[] = [];
  let dayOffset = 0;
  let previous = firstDeparture;
  for (const s of train.schedule) {
    let arrive = toMin(s.arrive === '--' ? s.depart : s.arrive);
    let depart = toMin(s.depart === '--' ? s.arrive : s.depart);
    while (arrive + dayOffset * 1440 < previous - 720) dayOffset++;
    while (arrive + dayOffset * 1440 > previous + 720) dayOffset--;
    arrive += dayOffset * 1440;
    if (depart < toMin(s.arrive === '--' ? s.depart : s.arrive)) depart += dayOffset * 1440;
    if (depart < arrive) depart += 1440;
    previous = Math.max(previous, depart);
    scheduleMinutes.push({ arrive, depart });
  }

  // Keep post-midnight services attached to the previous evening while
  // preserving normal same-day services such as a 05:50–07:48 journey.
  const journeyEnd = scheduleMinutes[scheduleMinutes.length - 1].arrive;
  let nowAbs = nowMin;
  if (journeyEnd >= 1440 && nowMin < firstDeparture) nowAbs += 1440;

  let prev: TrainStop | null = null;
  let curr: TrainStop | null = null;
  let next: TrainStop | null = null;
  let t = 0;
  let source: 'ESTIMATED' | 'TIMETABLE_DERIVATION' = 'ESTIMATED';

  for (let i = 0; i < train.schedule.length; i++) {
    const s = train.schedule[i];
    const tm = scheduleMinutes[i];

    if (nowAbs >= tm.arrive && nowAbs <= tm.depart + 2) {
      curr = s;
      prev = i > 0 ? train.schedule[i - 1] : null;
      next = i < train.schedule.length - 1 ? train.schedule[i + 1] : null;
      t = 0;
      source = 'TIMETABLE_DERIVATION';
      break;
    }

    if (i < train.schedule.length - 1) {
      const nextTm = scheduleMinutes[i + 1];
      if (nowAbs > tm.depart && nowAbs < nextTm.arrive) {
        prev = s;
        curr = s;
        next = train.schedule[i + 1];
        t = (nowAbs - tm.depart) / Math.max(nextTm.arrive - tm.depart, 1);
        source = 'ESTIMATED';
        break;
      }
    }
  }

  // Before departure: keep the marker at origin. After arrival: keep it at
  // destination. The UI clearly labels these positions as timetable-derived.
  if (!curr) {
    const first = train.schedule[0];
    const last = train.schedule[train.schedule.length - 1];
    if (nowAbs < scheduleMinutes[0].depart) {
      curr = first;
      next = train.schedule[1] || null;
      t = 0;
      source = 'TIMETABLE_DERIVATION';
    } else if (nowAbs > scheduleMinutes[scheduleMinutes.length - 1].arrive) {
      curr = last;
      prev = train.schedule[train.schedule.length - 2] || last;
      t = 1;
      source = 'TIMETABLE_DERIVATION';
    } else {
      return null;
    }
  }

  // Compute the marker on the actual resolved track geometry rather than on
  // a straight line between station coordinates.
  const totalLen = totalPolylineLen(routePolyline);
  const schedStartKm = train.schedule[0].km;
  const schedEndKm = train.schedule[train.schedule.length - 1].km;
  const kmRange = Math.max(Math.abs(schedEndKm - schedStartKm), 1);

  const currKm = curr.km;
  const nextKm = next?.km ?? currKm;
  let elapsedKm = currKm;
  if (next && t > 0) elapsedKm = currKm + (nextKm - currKm) * t;

  // For branches whose chainage decreases in the travel direction, preserve
  // the correct signed progress instead of forcing it to increase.
  const progressSigned = (elapsedKm - schedStartKm) / (schedEndKm - schedStartKm || 1);
  const progress = Math.max(0, Math.min(1, progressSigned));
  const targetLen = progress * totalLen;

  let running = 0;
  let foundPoint: [number, number] | null = null;
  let trackedPolyline: [number, number][] = [];
  let remainingPolyline: [number, number][] = [];

  for (let i = 0; i < routePolyline.length - 1; i++) {
    const [x1, y1] = routePolyline[i];
    const [x2, y2] = routePolyline[i + 1];
    const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (running + d >= targetLen) {
      const tt = d > 0 ? Math.max(0, Math.min(1, (targetLen - running) / d)) : 0;
      const splitPt: [number, number] = [x1 + (x2 - x1) * tt, y1 + (y2 - y1) * tt];
      trackedPolyline = [...routePolyline.slice(0, i + 1), splitPt];
      remainingPolyline = [splitPt, ...routePolyline.slice(i + 1)];
      foundPoint = splitPt;
      break;
    }
    running += d;
  }

  if (!foundPoint) {
    const lastPt = routePolyline[routePolyline.length - 1];
    trackedPolyline = [...routePolyline];
    remainingPolyline = [lastPt];
    foundPoint = lastPt;
  }

  const lng = foundPoint[0];
  const lat = foundPoint[1];
  const completedKm = Math.max(0, progress * kmRange);
  const remainingKm = Math.max(Math.abs(schedEndKm - elapsedKm), 0);

  return {
    lat, lng, km: elapsedKm,
    previousStation: prev, currentStation: curr, nextStation: next,
    completedKm, remainingKm, progress, routePolyline, trackedPolyline, remainingPolyline, source,
  };
}

// ---------- SEARCH ----------
export interface SearchResult {
  type: 'TRAIN' | 'STATION' | 'ASSET';
  id: string;
  label: string;
  sub: string;
  refId: string;
  meta?: any;
}

export function searchAll(q: string): SearchResult[] {
  if (!q || q.trim().length === 0) return [];
  const Q = q.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Trains — exact number/name matches are returned first.
  const trainMatches = extendedTrains
    .filter(t => {
      const haystack = `${t.number} ${t.name} ${t.origin} ${t.destination} ${t.via}`.toLowerCase();
      return haystack.includes(Q);
    })
    .sort((a, b) => {
      const aExact = a.number.toLowerCase() === Q ? 0 : a.name.toLowerCase().startsWith(Q) ? 1 : 2;
      const bExact = b.number.toLowerCase() === Q ? 0 : b.name.toLowerCase().startsWith(Q) ? 1 : 2;
      return aExact - bExact || a.number.localeCompare(b.number);
    });

  for (const t of trainMatches) {
    results.push({
      type: 'TRAIN',
      id: t.id,
      label: `${t.number} · ${t.name}`,
      sub: `${t.origin} → ${t.destination} · ${t.direction} · ${t.priority}`,
      refId: t.id,
      meta: t,
    });
  }

  // Stations
  for (const s of netStations) {
    if (
      s.code.toLowerCase().includes(Q) ||
      s.name.toLowerCase().includes(Q)
    ) {
      results.push({
        type: 'STATION',
        id: s.id,
        label: `${s.code} · ${s.name}`,
        sub: `${s.type.toUpperCase()} · KM ${s.km} · ${s.platforms} PF`,
        refId: s.code,
        meta: s,
      });
    }
  }

  // Assets — match by ID or KM
  const assetPatterns = ['TRK-', 'OHE-', 'SIG-', 'PTM-', 'TC-', 'BRG-', 'INSP-', 'DEF-', 'WRK-', 'BLK-'];
  const assetWords = ['track', 'ohe', 'signal', 'point', 'bridge', 'inspection', 'defect', 'work order', 'block'];
  const startsWithPattern = assetPatterns.some(p => Q.toUpperCase().startsWith(p));
  const hasAssetWord = assetWords.some(word => Q.includes(word));
  const hasKm = Q.includes('/');
  if (startsWithPattern || hasAssetWord || hasKm) {
    const kmMatch = Q.match(/(\d+)\/(\d+)/);
    const kmTarget = kmMatch ? parseFloat(kmMatch[1]) + parseFloat(kmMatch[2]) / 10 : null;

    const all: any[] = [
      ...netDefects.map((d: any) => ({ id: d.id, km: d.km, label: `${d.id} · Defect @ KM ${d.km}`, sub: `${d.assetType} · ${d.category}`, kind: 'DEFECT' })),
      ...netInspections.map((d: any) => ({ id: d.id, km: d.km, label: `${d.id} · Inspection @ KM ${d.km}`, sub: `${d.assetType} · ${d.status}`, kind: 'INSPECTION' })),
      ...netWorkOrders.map((d: any) => ({ id: d.id, km: d.km, label: `${d.id} · Work Order @ KM ${d.km}`, sub: `${d.priority} · ${d.status}`, kind: 'WORK_ORDER' })),
      ...netSignals.map((d: any) => ({ id: d.id, km: d.km, label: `${d.id} · Signal @ KM ${d.km}`, sub: `${d.type} · aspect ${d.aspect}`, kind: 'SIGNAL' })),
      ...netSwitches.map((d: any) => ({ id: d.id, km: d.km, label: `${d.id} · Point @ KM ${d.km}`, sub: `${d.type}`, kind: 'SWITCH' })),
    ];

    for (const a of all) {
      const idMatch = a.id.toLowerCase().includes(Q.toLowerCase());
      const kmMatchHit = kmTarget !== null && Math.abs(a.km - kmTarget) < 2;
      if (idMatch || kmMatchHit) {
        results.push({
          type: 'ASSET',
          id: a.id,
          label: a.label,
          sub: a.sub,
          refId: a.id,
          meta: { kind: a.kind, km: a.km },
        });
      }
    }
  }

  // Deduplicate by id (keep first occurrence)
  const seen = new Set<string>();
  const uniq = results.filter(r => {
    const k = `${r.type}:${r.refId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return uniq.slice(0, 30);
}
