import { useState } from 'react';
import { Activity, ArrowRight, CircuitBoard, GitBranch } from 'lucide-react';
import { pointMachines, signals, trackCircuits } from '../lib/data';
import { STATUS_CHIP } from '../components/icons';
import RailwayMap from '../components/RailwayMap';

export default function SMMS() {
  const [selectedSig, setSelectedSig] = useState<string | null>(signals[0]?.id || null);
  const sig = signals.find(s => s.id === selectedSig);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">SMMS · Signalling Management</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Signalling Asset Register & Interlocking Map</h1>
        </div>
        <span className="chip chip-amber">SMMS DEMO</span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* MAP */}
        <div className="col-span-12 lg:col-span-7 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <CircuitBoard size={12} className="text-[#5fb1ff]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Signals, Point Machines & Track Circuits</span>
          </div>
          <div className="flex-1 relative">
            <RailwayMap selectionMode="asset" height="100%" />
          </div>
        </div>

        {/* INTERLOCKING CHAIN */}
        <div className="col-span-12 lg:col-span-5 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <GitBranch size={12} className="text-[#5fb1ff]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">SIGNAL → TRACK CIRCUIT → POINT → ROUTE → TRAIN</span>
          </div>

          <div className="px-3 py-2 border-b border-[#1e2a44] overflow-y-auto scroll-thin" style={{ maxHeight: 180 }}>
            <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1">Signals</div>
            <div className="grid grid-cols-1 gap-1">
              {signals.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSig(s.id)}
                  className={`text-left px-2 py-1.5 rounded-sm border ${selectedSig === s.id ? 'border-[#f5a623] bg-[#112347]' : 'border-[#1e2a44] bg-[#081428] hover:bg-[#0d1c36]'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#e3ecff]">{s.id}</span>
                    <span className="text-[9px] text-[#a3b0cc] font-mono">@ KM {s.km}</span>
                    <span className={`chip ${STATUS_CHIP[s.status]}`} style={{ fontSize: 9, marginLeft: 'auto' }}>{s.status}</span>
                  </div>
                  <div className="text-[9px] text-[#6b7a98] font-mono mt-0.5">{s.type} · Aspect {s.aspect}</div>
                </button>
              ))}
            </div>
          </div>

          {sig && (
            <div className="flex-1 overflow-y-auto scroll-thin">
              <div className="px-3 py-2 bg-[#081428] border-b border-[#1e2a44]">
                <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Selected signal</div>
                <div className="text-[12px] text-[#e3ecff] font-mono">{sig.id}</div>
              </div>
              {/* Chain */}
              <div className="p-3 space-y-1.5">
                {[
                  { icon: Activity, label: 'SIGNAL', value: `${sig.id} (${sig.type})`, status: sig.status },
                  { icon: CircuitBoard, label: 'TRACK CIRCUIT', value: sig.trackCircuit, status: trackCircuits.find(t => t.id === sig.trackCircuit)?.healthy ? 'normal' : 'critical' },
                  { icon: GitBranch, label: 'POINT', value: pointMachines.find(p => p.section === sig.section)?.id || '—', status: pointMachines.find(p => p.section === sig.section)?.condition || 'info' },
                  { icon: ArrowRight, label: 'ROUTE', value: `From KM ${sig.km} → Next block (TC-${sig.trackCircuit.split('-').slice(-1)[0].replace('DLI', 'NEXT')})`, status: 'info' },
                  { icon: ArrowRight, label: 'TRAIN', value: '12618 / 12952 (demo)', status: 'info' },
                ].map(({ icon: Icon, label, value, status }, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-[#1e2a44]"></div>
                    <div className="absolute left-1 top-2 w-2 h-2 rounded-full border-2 border-[#5fb1ff] bg-[#081428]"></div>
                    <div className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2">
                      <div className="flex items-center gap-2">
                        <Icon size={11} className="text-[#5fb1ff]" />
                        <span className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider">{label}</span>
                        <span className={`chip ${STATUS_CHIP[status as keyof typeof STATUS_CHIP]}`} style={{ fontSize: 9, marginLeft: 'auto' }}>{status}</span>
                      </div>
                      <div className="text-[11px] text-[#e3ecff] mt-0.5 font-mono">{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 border-t border-[#1e2a44]">
                <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1">Point Machines</div>
                {pointMachines.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[10px] py-0.5 font-mono">
                    <span className="text-[#c7d3e6]">{p.id}</span>
                    <span className={`chip ${STATUS_CHIP[p.condition as keyof typeof STATUS_CHIP]}`}>{p.condition}</span>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 border-t border-[#1e2a44]">
                <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1">Track Circuits</div>
                {trackCircuits.map(t => (
                  <div key={t.id} className="flex items-center justify-between text-[10px] py-0.5 font-mono">
                    <span className="text-[#c7d3e6]">{t.id}</span>
                    <span className={`chip ${t.healthy ? 'chip-green' : 'chip-red'}`}>{t.healthy ? 'healthy' : 'unhealthy'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
