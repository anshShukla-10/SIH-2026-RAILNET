import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Brain, Building2, ClipboardCheck, Layers, MapPin, ShieldAlert, Sparkles, Train, Wrench, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import RailwayMap from '../components/RailwayMap';
import { alerts, blocks, bridges, defects, kpiMetrics, ohes, riskRecords, signals, tracks, trains, workOrders } from '../lib/data';
import { Metric, SectionHeader, STATUS_CHIP, STATUS_COLORS, StatusDot } from '../components/icons';

export default function CommandCentre() {
  const [selectedKm, setSelectedKm] = useState<string | null>('124/5');

  const criticalAlerts = useMemo(() => alerts.filter(a => a.level === 'critical' && !a.acknowledged), []);
  const maintenancePriority = useMemo(() =>
    workOrders
      .filter(w => w.status !== 'COMPLETED')
      .sort((a, b) => {
        const order = { P1: 0, P2: 1, P3: 2, P4: 3 } as any;
        return order[a.priority] - order[b.priority];
      })
  , []);

  const gotoLocation = () => setSelectedKm('124/5');

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-y-auto scroll-thin">
      {/* HERO STRIP */}
      <div className="px-5 pt-4 pb-3 border-b border-[#1e2a44] bg-gradient-to-b from-[#081428] to-[#050b1a]">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] text-[#6b7a98] font-mono tracking-[0.2em] uppercase">Command Centre · Live Railway Map · Delhi Division</div>
            <h1 className="text-2xl font-bold text-[#e3ecff] mt-0.5">Unified Railway Command & Intelligence</h1>
            <p className="text-[12px] text-[#a3b0cc] mt-0.5 max-w-[920px]">
              Correlating <span className="text-[#5fb1ff]">TRACK</span> · <span className="text-[#f5a623]">OHE</span> · <span className="text-[#00bcd4]">SIGNALLING</span> · <span className="text-[#2ecc71]">TRAINS</span> · <span className="text-[#a3b0cc]">BRIDGES</span> · <span className="text-[#2196f3]">INSPECTIONS</span> · <span className="text-[#f5a623]">DEFECTS</span> · <span className="text-[#2196f3]">MAINTENANCE</span> · <span className="text-[#f5a623]">BLOCKS</span> · <span className="text-[#e3ecff]">AI</span>
              <span className="text-[#6b7a98]"> — through LOCATION + TIME + ASSET ID.</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={gotoLocation}
              className="px-3 py-1.5 bg-[#2196f3] hover:bg-[#1976d2] text-white text-[11px] flex items-center gap-1.5 rounded-sm font-medium"
            >
              <MapPin size={11} /> Open KM 124/5 Location Intelligence
            </button>
            <Link to="/block-planner" className="px-3 py-1.5 bg-[#112347] hover:bg-[#1a2c5a] text-[#e3ecff] text-[11px] border border-[#2a3650] flex items-center gap-1.5 rounded-sm">
              <Wrench size={11} /> Block Planner
            </Link>
            <Link to="/risk" className="px-3 py-1.5 bg-[#112347] hover:bg-[#1a2c5a] text-[#e3ecff] text-[11px] border border-[#2a3650] flex items-center gap-1.5 rounded-sm">
              <Brain size={11} /> AI Risk Engine
            </Link>
          </div>
        </div>

        {/* KPI METRICS */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          <Metric label="Active Trains" value={kpiMetrics.activeTrains} accent="#5fb1ff" />
          <Metric label="Delayed" value={kpiMetrics.delayedTrains} sub={`/ ${kpiMetrics.activeTrains}`} accent="#f5a623" />
          <Metric label="Active Blocks" value={kpiMetrics.activeBlocks} accent="#2196f3" />
          <Metric label="Track Issues" value={kpiMetrics.trackIssues} accent="#e53935" />
          <Metric label="OHE Issues" value={kpiMetrics.oheIssues} accent="#f5a623" />
          <Metric label="Signalling Faults" value={kpiMetrics.signallingFaults} accent="#e53935" />
          <Metric label="Overdue Inspect." value={kpiMetrics.overdueInspections} accent="#f5a623" />
          <Metric label="Open Maintenance" value={kpiMetrics.openMaintenance} accent="#e53935" />
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-3 p-4 flex-1 min-h-0">
        {/* MAP */}
        <div className="col-span-12 lg:col-span-8 panel rounded-sm flex flex-col" style={{ minHeight: 540 }}>
          <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#5fb1ff] animate-pulse"></span>
              <span className="text-[11px] text-[#e3ecff] font-semibold tracking-wider uppercase font-mono">Railway Digital Twin — DLI–GZB Corridor</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#6b7a98] font-mono">
              <span>SELECTED: <span className="text-[#f5a623]">KM {selectedKm || '—'}</span></span>
              <span className="text-[#1e2a44]">|</span>
              <span>DEMONSTRATION DATA</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <RailwayMap
              selectedKm={selectedKm}
              onSelect={(s) => { if (s && (s as any).km) setSelectedKm((s as any).km); }}
              selectionMode="asset"
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 min-h-0">
          {/* Critical Alerts */}
          <div className="panel rounded-sm flex flex-col" style={{ maxHeight: 260 }}>
            <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center justify-between">
              <span className="text-[10px] text-[#e53935] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={12} /> Critical Alerts ({criticalAlerts.length})
              </span>
              <Link to="/alerts" className="text-[10px] text-[#5fb1ff] hover:underline">View all →</Link>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
              {alerts.filter(a => a.level === 'critical').slice(0, 6).map(a => (
                <div key={a.id} className="px-3 py-2 hover:bg-[#0d1c36]">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={a.level} pulse />
                    <span className="text-[10px] text-[#a3b0cc] font-mono">{a.ts}</span>
                    <span className="text-[10px] text-[#6b7a98] font-mono uppercase">· {a.domain}</span>
                  </div>
                  <div className="text-[12px] text-[#e3ecff] font-medium">{a.title}</div>
                  <div className="text-[11px] text-[#a3b0cc]">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Risk Snapshot */}
          <div className="panel rounded-sm flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center justify-between">
              <span className="text-[10px] text-[#f5a623] font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} /> AI Risk Snapshot · Decision Support
              </span>
              <Link to="/risk" className="text-[10px] text-[#5fb1ff] hover:underline">Full risk engine →</Link>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin p-2 space-y-1.5">
              {riskRecords.slice(0, 4).map(r => (
                <div key={r.location + r.domain} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-[#5fb1ff] uppercase tracking-wider">{r.domain}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-bold tabular-nums" style={{ color: r.score > 75 ? '#e53935' : r.score > 50 ? '#f5a623' : '#2ecc71' }}>{r.score}</span>
                      <span className="text-[9px] text-[#6b7a98] font-mono">/100</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#e3ecff]">{r.location}</div>
                  <div className="text-[10px] text-[#a3b0cc] mt-1 leading-snug line-clamp-2">{r.reasons[0]}</div>
                  <div className="mt-1.5 h-1 bg-[#1e2a44] rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${r.score}%`,
                        background: r.score > 75 ? '#e53935' : r.score > 50 ? '#f5a623' : '#2ecc71',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECOND ROW — Maintenance Priority + Active Trains */}
        <div className="col-span-12 lg:col-span-6 panel rounded-sm flex flex-col">
          <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center justify-between">
            <SectionHeader title="Maintenance Priority Queue" subtitle="Open work orders, sorted by P-level and asset criticality" />
            <Link to="/maintenance" className="text-[10px] text-[#5fb1ff] hover:underline">View all →</Link>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
            {maintenancePriority.slice(0, 6).map(w => (
              <div key={w.id} className="px-3 py-2 hover:bg-[#0d1c36] grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2">
                  <span className={`chip ${w.priority === 'P1' ? 'chip-red' : w.priority === 'P2' ? 'chip-amber' : 'chip-blue'}`}>{w.priority}</span>
                </div>
                <div className="col-span-2 text-[11px] text-[#e3ecff] font-mono">{w.id.slice(-9)}</div>
                <div className="col-span-2 text-[11px] text-[#a3b0cc] font-mono">{w.assetType} @ {w.assetKm}</div>
                <div className="col-span-4 text-[11px] text-[#c7d3e6] line-clamp-1">{w.problem}</div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className={`chip ${w.status === 'OVERDUE' || w.status === 'BLOCKED' ? 'chip-red' : w.status === 'IN_PROGRESS' ? 'chip-amber' : w.status === 'COMPLETED' ? 'chip-green' : 'chip-blue'}`} style={{ fontSize: 9 }}>
                    {w.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active trains */}
        <div className="col-span-12 lg:col-span-6 panel rounded-sm flex flex-col">
          <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center justify-between">
            <SectionHeader title="Train Movement (COA) — Demo Feed" subtitle="Simulated movement on the Delhi section" />
            <Link to="/coa" className="text-[10px] text-[#5fb1ff] hover:underline">Train ops view →</Link>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
            {trains.slice(0, 8).map(t => (
              <div key={t.id} className="px-3 py-2 hover:bg-[#0d1c36] grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'critical' ? 'bg-[#e53935]' : t.status === 'warning' ? 'bg-[#f5a623]' : 'bg-[#2ecc71]'}`}></span>
                  <span className="text-[11px] text-[#e3ecff] font-mono">{t.number}</span>
                </div>
                <div className="col-span-3 text-[10px] text-[#a3b0cc] line-clamp-1">{t.name}</div>
                <div className="col-span-2 text-[10px] text-[#a3b0cc] font-mono">KM {t.currentKm.toFixed(1)} · {t.speed}kph</div>
                <div className="col-span-2 text-[10px] text-[#a3b0cc] font-mono">{t.origin} → {t.destination}</div>
                <div className="col-span-1 text-[10px] text-[#a3b0cc] font-mono text-center">{t.nextStation}</div>
                <div className="col-span-2 text-right">
                  <span className={`text-[11px] font-mono font-bold ${t.delayMin > 15 ? 'text-[#e53935]' : t.delayMin > 0 ? 'text-[#f5a623]' : 'text-[#2ecc71]'}`}>+{t.delayMin}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DEMO FLOW STRIP — SIHandcrafted */}
        <div className="col-span-12 panel rounded-sm">
          <div className="px-3 py-2 border-b border-[#1e2a44]">
            <SectionHeader title="SIH Demo Flow · KM 124/5 Correlation Walk-through" subtitle="From a single location → unified intelligence → AI decision support" />
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-[11px]">
            {[
              { icon: MapPin, label: '1. Select location', value: 'KM 124/5 · DLI–GZB', color: '#5fb1ff' },
              { icon: Layers, label: '2. Correlate assets', value: 'Track + OHE + Signal + PTM + TC', color: '#2196f3' },
              { icon: ClipboardCheck, label: '3. Inspect history', value: 'INSP-2025-1120-0042 (Critical)', color: '#f5a623' },
              { icon: Wrench, label: '4. Plan work', value: 'BLK-DLI-2026-0831-03 (3hr)', color: '#00bcd4' },
              { icon: Brain, label: '5. AI risk + rec.', value: 'Risk 87/100 · consolidate blocks', color: '#e53935' },
            ].map(({ icon: Icon, label, value, color }, i) => (
              <div key={i} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2.5 hover:bg-[#0d1c36] transition-colors">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color }} />
                  <span className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">{label}</span>
                </div>
                <div className="text-[12px] text-[#e3ecff]">{value}</div>
                {i < 4 && <ArrowRight size={11} className="absolute right-[-12px] top-1/2 -translate-y-1/2 text-[#2a3650] hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
