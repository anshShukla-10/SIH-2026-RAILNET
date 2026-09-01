import { ArrowDown, Database, GitMerge, Cpu, BarChart2, Sparkles } from 'lucide-react';

export default function DataIntegration() {
  const sys = [
    { id: 'TMS', name: 'TMS — Track Management', icon: Database, color: '#5fb1ff', desc: 'Track asset register, inspections, geometry, defects' },
    { id: 'TDMS', name: 'TDMS — Traction Distribution', icon: Database, color: '#f5a623', desc: 'OHE masts, contact wire, power block, TRD assets' },
    { id: 'SMMS', name: 'SMMS — Signalling Management', icon: Database, color: '#00bcd4', desc: 'Signals, point machines, track circuits, interlocking' },
    { id: 'COA', name: 'COA — Train Movement', icon: BarChart2, color: '#2ecc71', desc: 'Running room, control office, sectional running' },
    { id: 'GIS', name: 'GIS — Geographic Layer', icon: Database, color: '#a3b0cc', desc: 'Spatial layer for stations, tracks, terrain, assets' },
  ];

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Data Integration</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Interoperability Pipeline · TMS ↓ TDMS ↓ SMMS ↓ COA ↓ GIS ↓ Common Data Platform ↓ AI / Alerts / Reports</h1>
        </div>
        <span className="chip chip-amber">SIMULATED · PROTOTYPE CONNECTIONS</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4">
        {/* PIPELINE */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 mb-6">
          {sys.map((s, i) => (
            <div key={s.id} className="relative panel p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={16} style={{ color: s.color }} />
                <span className="text-[12px] font-semibold text-[#e3ecff]">{s.id}</span>
                <span className="ml-auto chip chip-grey" style={{ fontSize: 9 }}>SIMULATED SOURCE</span>
              </div>
              <div className="text-[10px] text-[#a3b0cc]">{s.name}</div>
              <div className="text-[10px] text-[#6b7a98] mt-1.5">{s.desc}</div>
              <div className="text-[9px] text-[#6b7a98] font-mono mt-2">proto://{s.id.toLowerCase()}-svc:8443</div>
              {i < sys.length - 1 && <ArrowDown size={12} className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[#5fb1ff]" />}
            </div>
          ))}
        </div>

        {/* Common data platform */}
        <div className="panel p-4 mb-6 border-[#5fb1ff]">
          <div className="flex items-center gap-2 mb-3">
            <GitMerge size={16} className="text-[#5fb1ff]" />
            <span className="text-[13px] font-semibold text-[#e3ecff]">Target Common Data Platform (PostgreSQL + PostGIS)</span>
            <span className="ml-auto chip chip-amber" style={{ fontSize: 9 }}>TARGET · NOT CONNECTED</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
            {['asset', 'track_segment', 'ohe_segment', 'signal', 'track_circuit', 'point', 'bridge', 'inspection', 'defect', 'work_order', 'block', 'train', 'alert', 'risk_score', 'audit'].map(t => (
              <div key={t} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-1.5">
                <div className="text-[9px] text-[#6b7a98] font-mono uppercase tracking-wider">TABLE</div>
                <div className="text-[12px] text-[#5fb1ff] font-mono">{t}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] font-mono text-[#a3b0cc]">
            Joined on <span className="text-[#f5a623]">LOCATION</span> + <span className="text-[#f5a623]">TIME</span> + <span className="text-[#f5a623]">ASSET ID</span> — enables cross-domain correlation.
          </div>
        </div>

        {/* AI / Alerts / Reports */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="panel p-3 border-[#f5a623]">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-[#f5a623]" />
              <span className="text-[12px] font-semibold text-[#e3ecff]">AI / ML</span>
            </div>
            <div className="text-[10px] text-[#a3b0cc] space-y-0.5">
              <div>· Planned: scikit-learn / XGBoost risk models</div>
              <div>· Planned: LLM API for natural-language summaries</div>
              <div>· Planned: embeddings for semantic asset search</div>
            </div>
          </div>
          <div className="panel p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Database size={14} className="text-[#e53935]" />
              <span className="text-[12px] font-semibold text-[#e3ecff]">Alerts & Events</span>
            </div>
            <div className="text-[10px] text-[#a3b0cc] space-y-0.5">
              <div>· Prototype: threshold-based alert generation</div>
              <div>· Planned: event bus / streaming layer</div>
              <div>· Prototype: P1 acknowledgement workflow</div>
            </div>
          </div>
          <div className="panel p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <BarChart2 size={14} className="text-[#2196f3]" />
              <span className="text-[12px] font-semibold text-[#e3ecff]">Reports</span>
            </div>
            <div className="text-[10px] text-[#a3b0cc] space-y-0.5">
              <div>· Scheduled and on-demand reports</div>
              <div>· Natural-language narratives via LLM</div>
              <div>· Export PDF / CSV / JSON</div>
            </div>
          </div>
        </div>

        {/* Source legend */}
        <div className="panel p-4">
          <div className="text-[11px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">Open-source technical references</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            {[
              ['MapLibre GL JS', 'Vector tile rendering for the railway map'],
              ['OpenRailwayMap', 'Open railway infrastructure data concepts'],
              ['OpenRailwayMap Vector', 'Vector tile schema reference'],
              ['OpenRailwayMap API', 'API patterns for railway data'],
              ['railpull', 'Train timetable / data structures'],
              ['openSignalBox', 'Signalling visualisation concepts'],
            ].map(([n, d]) => (
              <div key={n} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2">
                <div className="text-[12px] text-[#e3ecff] font-mono">{n}</div>
                <div className="text-[10px] text-[#a3b0cc] mt-0.5">{d}</div>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-[#6b7a98] mt-3 italic">
            These are technical references only — not official Indian Railways systems. UI, branding and data are original to this prototype.
          </div>
        </div>
      </div>
    </div>
  );
}
