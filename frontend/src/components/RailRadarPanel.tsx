// Rail Radar — counts operational trains and shows a compact, professional
// status board. Used both as a standalone panel and as an overlay on the
// Live Railway Map. All data is SYNTHETIC; counts derive from the train
// timetable and current simulated clock.

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, Gauge, Pause, Play, Radar, RefreshCw, Train } from 'lucide-react';
import {
  getRailRadarSnapshot, operationalChip, operationalLabel,
  type RailRadarSnapshot, type TrainRadarEntry, type TrainOperationalStatus,
} from '../lib/railRadar';
import { REF_TIME } from '../lib/trainRoutes';

export function RailRadarPanel() {
  const [snap, setSnap] = useState<RailRadarSnapshot>(() => getRailRadarSnapshot());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const i = setInterval(() => setSnap(getRailRadarSnapshot()), 5000);
    return () => clearInterval(i);
  }, [autoRefresh]);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      {/* HEADER */}
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Rail Radar · Operational Snapshot</div>
          <h1 className="text-lg font-semibold text-[#e3ecff] flex items-center gap-2">
            <Radar size={16} className="text-[#f5a623]" />
            RAILNET Rail Radar
          </h1>
          <div className="text-[10px] text-[#6b7a98] font-mono mt-0.5">
            How many trains are operational · SYNTHETIC DEMONSTRATION
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip chip-amber">ESTIMATED FROM TIMETABLE</span>
          <span className="chip chip-blue">
            <Clock size={10} className="mr-1" />
            {String(snap.refTime.hh).padStart(2, '0')}:{String(snap.refTime.mm).padStart(2, '0')} IST
          </span>
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className="px-2 py-1 bg-[#112347] hover:bg-[#1a2c5a] border border-[#2a3650] text-[#e3ecff] text-[10px] flex items-center gap-1 font-mono"
          >
            {autoRefresh ? <Pause size={10} /> : <Play size={10} />}
            {autoRefresh ? 'AUTO' : 'PAUSED'}
          </button>
          <button
            onClick={() => setSnap(getRailRadarSnapshot())}
            className="px-2 py-1 bg-[#112347] hover:bg-[#1a2c5a] border border-[#2a3650] text-[#e3ecff] text-[10px] flex items-center gap-1 font-mono"
          >
            <RefreshCw size={10} /> REFRESH
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto scroll-thin p-3 grid grid-cols-12 gap-3">
        {/* HEADLINE METRICS */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-5 gap-2">
          <HeadlineCard label="Operational Total" value={snap.totalOperational} sub={`${snap.totalInSection} in Delhi section`} color="#5fb1ff" />
          <HeadlineCard label="Running" value={snap.byStatus.RUNNING} color="#2ecc71" />
          <HeadlineCard label="At Station" value={snap.byStatus.AT_STATION} color="#5fb1ff" />
          <HeadlineCard label="Delayed" value={snap.delayedTrains.length} sub={`${snap.heldTrains.length} held`} color="#f5a623" />
          <HeadlineCard label="Scheduled" value={snap.byStatus.SCHEDULED} color="#a3b0cc" />
        </div>

        {/* HEALTH BREAKDOWN */}
        <div className="col-span-12 lg:col-span-4 panel rounded-sm p-3">
          <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2 flex items-center gap-1">
            <Activity size={11} /> Service Health
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <HealthBlock label="On time" value={snap.healthy} color="#2ecc71" />
            <HealthBlock label="Delayed" value={snap.warnings} color="#f5a623" />
            <HealthBlock label="Held" value={snap.criticals} color="#e53935" />
          </div>
          <div className="h-2 bg-[#1e2a44] rounded-full overflow-hidden flex">
            {snap.totalOperational > 0 && (
              <>
                <div className="h-full" style={{ width: `${(snap.healthy / snap.totalOperational) * 100}%`, background: '#2ecc71' }} />
                <div className="h-full" style={{ width: `${(snap.warnings / snap.totalOperational) * 100}%`, background: '#f5a623' }} />
                <div className="h-full" style={{ width: `${(snap.criticals / snap.totalOperational) * 100}%`, background: '#e53935' }} />
              </>
            )}
          </div>
          <div className="text-[9px] text-[#6b7a98] font-mono mt-2">
            Operational = RUNNING + AT_STATION. Delayed = +1..15 min. Held = &gt; 15 min.
          </div>
        </div>

        {/* OPERATIONAL STATUS DISTRIBUTION */}
        <div className="col-span-12 lg:col-span-4 panel rounded-sm p-3">
          <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">Operational Status</div>
          <div className="space-y-1.5">
            {(['RUNNING', 'AT_STATION', 'SCHEDULED', 'COMPLETED', 'DELAYED', 'HELD', 'OFFLINE'] as TrainOperationalStatus[]).map(k => {
              const count = snap.byStatus[k];
              const pct = snap.totalOperational > 0 ? (count / snap.totalOperational) * 100 : 0;
              const colors: Record<TrainOperationalStatus, string> = {
                RUNNING: '#2ecc71', AT_STATION: '#5fb1ff', SCHEDULED: '#6b7a98',
                COMPLETED: '#2a3650', DELAYED: '#f5a623', HELD: '#e53935', OFFLINE: '#1a2438',
              };
              return (
                <div key={k} className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="w-24 text-[#a3b0cc]">{operationalLabel(k)}</span>
                  <div className="flex-1 h-1.5 bg-[#1e2a44] rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: colors[k] }} />
                  </div>
                  <span className="w-8 text-right text-[#e3ecff]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PRIORITY MIX */}
        <div className="col-span-12 lg:col-span-4 panel rounded-sm p-3">
          <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">By Priority Class</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(snap.byPriority).map(([k, v]) => {
              const color =
                k === 'RAJDHANI' ? '#5fb1ff' :
                k === 'SHATABDI' ? '#00bcd4' :
                k === 'DURONTO'  ? '#a78bfa' :
                k === 'EXPRESS'  ? '#5fe09a' :
                k === 'MEMU'     ? '#a3b0cc' :
                k === 'PASSENGER'? '#fbbf24' :
                                    '#6b7a98';
              return (
                <div key={k} className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5">
                  <div className="text-[9px] text-[#6b7a98] uppercase tracking-wider">{k}</div>
                  <div className="text-[20px] font-bold tabular-nums" style={{ color }}>{v}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIVE TRAINS IN SECTION */}
        <div className="col-span-12 lg:col-span-8 panel rounded-sm flex flex-col">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <span className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider flex items-center gap-1">
              <Train size={11} /> Active Trains in Section ({snap.activeTrains.length})
            </span>
            <span className="text-[10px] text-[#6b7a98] font-mono">DELHI · DLI–GZB–SBB</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]" style={{ maxHeight: 380 }}>
            {snap.activeTrains.length === 0 && (
              <div className="px-3 py-4 text-center text-[#6b7a98] text-[11px]">
                No active trains in the Delhi section at this time.
              </div>
            )}
            {snap.activeTrains.map(t => <ActiveTrainRow key={t.id} t={t} />)}
          </div>
        </div>

        {/* DELAYED / HELD PANEL */}
        <div className="col-span-12 lg:col-span-4 panel rounded-sm flex flex-col">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <span className="text-[10px] text-[#f5a623] font-mono uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={11} /> Delayed &amp; Held ({snap.delayedTrains.length})
            </span>
            <span className="text-[10px] text-[#6b7a98] font-mono">{snap.heldTrains.length} held</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]" style={{ maxHeight: 380 }}>
            {snap.delayedTrains.length === 0 && (
              <div className="px-3 py-4 text-center text-[#6b7a98] text-[11px]">
                No trains currently delayed.
              </div>
            )}
            {snap.delayedTrains.map(t => (
              <div key={t.id} className="px-3 py-2 hover:bg-[#0d1c36]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-[#e3ecff]">{t.number}</span>
                  <span className={`chip ${operationalChip(t.operational)}`} style={{ fontSize: 9 }}>
                    {operationalLabel(t.operational)}
                  </span>
                  <span className="ml-auto text-[11px] font-mono font-bold" style={{ color: t.delayMin > 15 ? '#e53935' : '#f5a623' }}>+{t.delayMin}m</span>
                </div>
                <div className="text-[10px] text-[#a3b0cc] truncate">{t.name}</div>
                <div className="text-[10px] text-[#6b7a98] font-mono">{t.origin} → {t.destination}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DISCLAIMER */}
        <div className="col-span-12 panel rounded-sm p-3 bg-[#112347] border-[#f5a623]">
          <div className="text-[10px] text-[#f5a623] font-mono uppercase tracking-wider mb-1">Tracking Source · SYNTHETIC DEMONSTRATION</div>
          <div className="text-[11px] text-[#c7d3e6] leading-relaxed">
            All counts and statuses above are derived from the synthetic timetable dataset and a simulated clock.
            They are NOT a live feed of Indian Railways operations. To integrate a real-time source, replace
            the <code className="text-[#5fb1ff]">getTrainPosition()</code> and <code className="text-[#5fb1ff]">extendedTrains</code> modules
            with a backend API connection while preserving the same interface.
          </div>
        </div>
      </div>
    </div>
  );
}

function HeadlineCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className="panel rounded-sm p-3">
      <div className="text-[10px] text-[#6b7a98] uppercase tracking-wider font-mono">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-3xl font-bold tabular-nums" style={{ color }}>{value}</div>
        {sub && <div className="text-[10px] text-[#6b7a98] font-mono">{sub}</div>}
      </div>
    </div>
  );
}

function HealthBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-2 text-center">
      <div className="text-[9px] text-[#6b7a98] uppercase tracking-wider">{label}</div>
      <div className="text-[20px] font-bold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

function ActiveTrainRow({ t }: { t: TrainRadarEntry }) {
  return (
    <div className="px-3 py-2 hover:bg-[#0d1c36] grid grid-cols-12 gap-2 items-center">
      <div className="col-span-2 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${
          t.operational === 'RUNNING' ? 'bg-[#2ecc71]' :
          t.operational === 'AT_STATION' ? 'bg-[#5fb1ff]' :
          t.operational === 'DELAYED' ? 'bg-[#f5a623]' :
          t.operational === 'HELD' ? 'bg-[#e53935]' : 'bg-[#6b7a98]'
        }`}></span>
        <span className="text-[11px] font-mono text-[#e3ecff]">{t.number}</span>
      </div>
      <div className="col-span-3 text-[10px] text-[#a3b0cc] truncate">{t.name}</div>
      <div className="col-span-2">
        <span className={`chip ${operationalChip(t.operational)}`} style={{ fontSize: 9 }}>{operationalLabel(t.operational)}</span>
      </div>
      <div className="col-span-2 text-[10px] text-[#a3b0cc] font-mono">
        KM {t.km.toFixed(1)} · {Math.round(t.speed)}kph
      </div>
      <div className="col-span-2 text-[10px] text-[#a3b0cc] font-mono">
        {t.currentStation || '—'} → {t.nextStation || '—'}
      </div>
      <div className="col-span-1 text-right">
        <span className={`text-[10px] font-mono font-bold ${t.delayMin > 15 ? 'text-[#e53935]' : t.delayMin > 0 ? 'text-[#f5a623]' : 'text-[#2ecc71]'}`}>
          {t.delayMin > 0 ? `+${t.delayMin}m` : 'OK'}
        </span>
      </div>
    </div>
  );
}

// ===========================================================================
//  Live Map overlay widget — small floating card that shows the rail radar
//  snapshot. The user can collapse/expand it without leaving the Live Map.
// ===========================================================================

export function LiveMapRailRadarOverlay() {
  const [snap, setSnap] = useState<RailRadarSnapshot>(() => getRailRadarSnapshot());
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const i = setInterval(() => setSnap(getRailRadarSnapshot()), 4000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="absolute top-3 left-[410px] z-20">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-[#081428]/95 border border-[#f5a623] rounded-sm px-2 py-1.5 text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider backdrop-blur hover:bg-[#0d1c36] shadow-lg"
      >
        <Radar size={11} className="text-[#f5a623]" />
        Rail Radar
        <span className="text-[#2ecc71] font-bold tabular-nums">{snap.totalInSection}</span>
        <span className="text-[#6b7a98]">/ {snap.totalOperational}</span>
        <span className="text-[#f5a623]">{snap.delayedTrains.length} dly</span>
      </button>

      {open && (
        <div className="mt-1 w-[300px] bg-[#081428]/98 border border-[#2a3650] rounded-sm backdrop-blur shadow-2xl overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-[#1e2a44] bg-[#0d1c36] flex items-center justify-between">
            <span className="text-[10px] text-[#f5a623] font-mono uppercase tracking-wider flex items-center gap-1">
              <Radar size={10} /> Rail Radar Snapshot
            </span>
            <span className="text-[9px] text-[#6b7a98] font-mono">
              {String(snap.refTime.hh).padStart(2, '0')}:{String(snap.refTime.mm).padStart(2, '0')} IST
            </span>
          </div>
          <div className="p-2.5 grid grid-cols-3 gap-1.5">
            <MiniMetric label="Operational" value={snap.totalOperational} color="#5fb1ff" />
            <MiniMetric label="In Section" value={snap.totalInSection} color="#2ecc71" />
            <MiniMetric label="Delayed" value={snap.delayedTrains.length} color="#f5a623" />
            <MiniMetric label="Running" value={snap.byStatus.RUNNING} color="#2ecc71" />
            <MiniMetric label="At Station" value={snap.byStatus.AT_STATION} color="#5fb1ff" />
            <MiniMetric label="Held" value={snap.heldTrains.length} color="#e53935" />
          </div>
          <div className="px-2.5 pb-2">
            <div className="text-[9px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1">Service Health</div>
            <div className="h-1.5 bg-[#1e2a44] rounded-full overflow-hidden flex">
              {snap.totalOperational > 0 && (
                <>
                  <div className="h-full" style={{ width: `${(snap.healthy / snap.totalOperational) * 100}%`, background: '#2ecc71' }} />
                  <div className="h-full" style={{ width: `${(snap.warnings / snap.totalOperational) * 100}%`, background: '#f5a623' }} />
                  <div className="h-full" style={{ width: `${(snap.criticals / snap.totalOperational) * 100}%`, background: '#e53935' }} />
                </>
              )}
            </div>
            <div className="flex items-center justify-between text-[9px] text-[#6b7a98] font-mono mt-1">
              <span>On-time {snap.healthy}</span>
              <span>Delayed {snap.warnings}</span>
              <span>Held {snap.criticals}</span>
            </div>
          </div>
          <div className="border-t border-[#1e2a44] px-2.5 py-1.5 text-[9px] text-[#6b7a98] font-mono">
            All counts are SYNTHETIC — derived from timetable + simulated clock
          </div>
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5 text-center">
      <div className="text-[8px] text-[#6b7a98] uppercase tracking-wider font-mono leading-tight">{label}</div>
      <div className="text-[18px] font-bold tabular-nums leading-tight" style={{ color }}>{value}</div>
    </div>
  );
}
