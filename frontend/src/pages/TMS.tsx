import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, ClipboardCheck, Layers, Search, Wrench } from 'lucide-react';
import { defects, inspections, tracks, workOrders } from '../lib/data';
import { STATUS_CHIP } from '../components/icons';

export default function TMS() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const filtered = useMemo(() => filter === 'all' ? tracks : tracks.filter(t => t.condition === filter), [filter]);

  const totalKm = tracks.reduce((acc, t) => acc + (t.endKm - t.startKm), 0);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">TMS · Track Management</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Track Asset Register · DLI–GZB Section</h1>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'critical', 'warning', 'normal'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${filter === f ? 'bg-[#112347] border border-[#f5a623] text-[#e3ecff]' : 'bg-[#081428] border border-[#1e2a44] text-[#a3b0cc]'} rounded-sm`}
            >
              {f}
            </button>
          ))}
          <span className="chip chip-amber">TMS DEMO · SYNTHETIC</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* LINEAR TRACK VIEW */}
        <div className="col-span-12 lg:col-span-8 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <BarChart3 size={12} className="text-[#5fb1ff]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Linear Track View · KM 124 – KM 132 (DLI–GZB Corridor)</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-3">
            <div className="relative">
              {/* track base */}
              <div className="absolute left-0 right-0 top-0 h-2 bg-[#1e2a44] rounded-sm"></div>
              <div className="absolute left-0 right-0 top-3 h-2 bg-[#1e2a44] rounded-sm"></div>
              <div className="absolute left-0 right-0 top-1.5 h-px bg-[#5fb1ff] opacity-30"></div>

              {/* KM markers */}
              {Array.from({ length: 9 }, (_, i) => 124 + i).map(km => {
                const pct = ((km - 124) / 8) * 100;
                return (
                  <div key={km} className="absolute top-0" style={{ left: `${pct}%` }}>
                    <div className="w-px h-5 bg-[#2a3650]"></div>
                    <div className="text-[9px] text-[#6b7a98] font-mono absolute top-6 -translate-x-1/2">{km}</div>
                  </div>
                );
              })}

              {/* Asset bars */}
              <div className="relative mt-12 space-y-1">
                {tracks.map(t => {
                  const startPct = ((t.startKm - 124) / 8) * 100;
                  const widthPct = ((t.endKm - t.startKm) / 8) * 100;
                  return (
                    <div key={t.id} className="relative h-5">
                      <div
                        className={`absolute top-0 h-5 rounded-sm border ${
                          t.condition === 'critical' ? 'bg-[rgba(229,57,53,0.25)] border-[#e53935]'
                          : t.condition === 'warning' ? 'bg-[rgba(245,166,35,0.2)] border-[#f5a623]'
                          : t.condition === 'info' ? 'bg-[rgba(33,150,243,0.15)] border-[#2196f3]'
                          : 'bg-[rgba(46,204,113,0.1)] border-[#2ecc71]'
                        }`}
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                      >
                        <div className="px-1.5 py-0.5 text-[9px] font-mono text-[#e3ecff] truncate">
                          {t.id.replace('TRK-DLI-', '').replace('TRK-GZB-SBB-', 'GZBSBB-').replace('TRK-NDLS-TKJ-', 'NDLSTKJ-')} · {t.km} · Risk {t.riskScore}
                        </div>
                      </div>
                      {/* Defect dots */}
                      {defects.filter(d => d.assetId === t.id).map((d, i) => (
                        <div
                          key={d.id}
                          className={`absolute top-1.5 w-2 h-2 rounded-full ${d.severity === 'critical' ? 'bg-[#e53935]' : 'bg-[#f5a623]'}`}
                          style={{ left: `calc(${startPct}% + ${(i + 1) * 8}px)` }}
                          title={d.description}
                        ></div>
                      ))}
                    </div>
                  );
                })}

                {/* Bridges row */}
                <div className="mt-3 text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Bridges</div>
                {[
                  { km: 124.8, name: 'Yamuna N Br', status: 'warning' },
                ].map((b, i) => {
                  const pct = ((b.km - 124) / 8) * 100;
                  return (
                    <div key={i} className="relative h-5">
                      <div
                        className="absolute top-0 h-5 w-1.5 bg-[#f5a623] rounded-sm"
                        style={{ left: `${pct}%` }}
                        title={`Bridge ${b.name}`}
                      ></div>
                      <div className="text-[9px] font-mono text-[#f5a623] absolute" style={{ left: `calc(${pct}% + 8px)`, top: 1 }}>{b.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ASSET REGISTER TABLE */}
        <div className="col-span-12 lg:col-span-4 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <Layers size={12} className="text-[#5fb1ff]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Track Asset Register ({filtered.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin">
            {filtered.map(t => (
              <div key={t.id} className="px-3 py-2 border-b border-[#1e2a44] hover:bg-[#0d1c36]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-[#e3ecff]">{t.id}</span>
                  <span className={`chip ${STATUS_CHIP[t.condition]}`}>{t.condition}</span>
                  <span className="ml-auto text-[10px] font-mono text-[#f5a623]">Risk {t.riskScore}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
                  <div><span className="text-[#6b7a98]">KM:</span> <span className="text-[#c7d3e6]">{t.km}</span></div>
                  <div><span className="text-[#6b7a98]">Rail:</span> <span className="text-[#c7d3e6]">{t.railType}</span></div>
                  <div><span className="text-[#6b7a98]">Sleeper:</span> <span className="text-[#c7d3e6]">{t.sleeperType}</span></div>
                  <div><span className="text-[#6b7a98]">Ballast:</span> <span className="text-[#c7d3e6]">{t.ballastDepth}mm</span></div>
                  <div><span className="text-[#6b7a98]">Inspected:</span> <span className="text-[#c7d3e6]">{t.lastInspected}</span></div>
                  <div><span className="text-[#6b7a98]">Defects:</span> <span className={t.defects.length ? 'text-[#e53935]' : 'text-[#2ecc71]'}>{t.defects.length}</span></div>
                </div>
                {t.maintenanceId && <div className="text-[9px] mt-1"><span className="text-[#f5a623]">▣ </span><span className="text-[#a3b0cc] font-mono">WO: {t.maintenanceId}</span></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
