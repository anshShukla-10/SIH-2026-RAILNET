import { useEffect, useState } from 'react';
import { Play, Pause, FastForward, RotateCcw, Clock, MapPin, ArrowRight } from 'lucide-react';
import { trains } from '../lib/data';
import { STATUS_CHIP, StatusDot } from '../components/icons';

export default function COA() {
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>('12952');

  useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => setTick(t => (t + 1) % 100000), 1000);
    return () => clearInterval(i);
  }, [playing]);

  // Simulate movement: shift each train's km by small delta on each tick
  const simTrains = trains.map(t => ({
    ...t,
    currentKm: Math.max(0, t.currentKm + (t.direction === 'DOWN' ? 0.15 : -0.12) * (tick % 3 === 0 ? 1 : 0)),
    speed: Math.max(0, t.speed + Math.sin(tick / 5 + t.id.length) * 5),
    delayMin: Math.max(0, t.delayMin + Math.cos(tick / 7 + t.id.length) * 0.4 | 0),
  }));
  const selected = simTrains.find(t => t.id === selectedTrainId);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">COA · Train Movement</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Train Operations Board · Delhi Section</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPlaying(p => !p)} className="px-2 py-1 bg-[#112347] border border-[#2a3650] text-[#e3ecff] text-[10px] flex items-center gap-1">
            {playing ? <Pause size={10} /> : <Play size={10} />} {playing ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => setTick(t => t + 5)} className="px-2 py-1 bg-[#112347] border border-[#2a3650] text-[#e3ecff] text-[10px] flex items-center gap-1">
            <FastForward size={10} /> Step
          </button>
          <button onClick={() => setTick(0)} className="px-2 py-1 bg-[#112347] border border-[#2a3650] text-[#e3ecff] text-[10px] flex items-center gap-1">
            <RotateCcw size={10} /> Reset
          </button>
          <span className="chip chip-amber">SIMULATION · DEMO</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* TRAIN LIST */}
        <div className="col-span-12 lg:col-span-4 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider">Active Trains ({simTrains.length})</div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
            {simTrains.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTrainId(t.id)}
                className={`px-3 py-2 cursor-pointer hover:bg-[#0d1c36] ${selectedTrainId === t.id ? 'bg-[#0d1c36] border-l-2 border-l-[#f5a623]' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={t.status} />
                  <span className="text-[12px] font-mono text-[#e3ecff]">{t.number}</span>
                  <span className={`chip ${t.priority === 'RAJDHANI' ? 'chip-blue' : t.priority === 'FREIGHT' ? 'chip-grey' : 'chip-grey'}`}>{t.priority}</span>
                  <span className="ml-auto text-[10px] text-[#f5a623] font-mono">+{Math.round(t.delayMin)}m</span>
                </div>
                <div className="text-[11px] text-[#c7d3e6] mt-0.5">{t.name}</div>
                <div className="text-[10px] text-[#a3b0cc] font-mono mt-0.5">{t.origin} → {t.destination} · KM {t.currentKm.toFixed(1)} · {Math.round(t.speed)} km/h</div>
                <div className="text-[10px] text-[#6b7a98] font-mono mt-0.5">Next: {t.nextStation} · Loco: {t.loco}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DETAIL + TIMELINE */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-2 overflow-hidden">
          {selected && (
            <div className="panel flex-1 flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-[18px] font-mono text-[#e3ecff] font-bold">{selected.number}</div>
                  <div>
                    <div className="text-[12px] text-[#e3ecff]">{selected.name}</div>
                    <div className="text-[10px] text-[#a3b0cc] font-mono">{selected.origin} → {selected.destination} · via {selected.viaSection}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="chip chip-blue">{selected.direction}</span>
                  <span className="chip chip-grey">{selected.priority}</span>
                  <span className={`chip ${STATUS_CHIP[selected.status]}`}>{selected.status.toUpperCase()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-[#1e2a44] text-[10px] font-mono">
                <div className="p-2 border-r border-[#1e2a44]">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Current Location</div>
                  <div className="text-[#e3ecff] text-[13px] mt-0.5">KM {selected.currentKm.toFixed(1)}</div>
                  <div className="text-[#a3b0cc]">{selected.viaSection.split('-').slice(-2).join('–')}</div>
                </div>
                <div className="p-2 border-r border-[#1e2a44]">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Speed</div>
                  <div className="text-[#e3ecff] text-[13px] mt-0.5">{Math.round(selected.speed)} km/h</div>
                  <div className="text-[#a3b0cc]">Auto / WAP-{selected.loco.split('-')[1]?.split(' ')[0] || '5'}</div>
                </div>
                <div className="p-2 border-r border-[#1e2a44]">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Next Station</div>
                  <div className="text-[#e3ecff] text-[13px] mt-0.5">{selected.nextStation}</div>
                  <div className="text-[#a3b0cc]">ETA {selected.lastUpdate}</div>
                </div>
                <div className="p-2">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Delay</div>
                  <div className={`text-[13px] mt-0.5 ${selected.delayMin > 15 ? 'text-[#e53935]' : selected.delayMin > 0 ? 'text-[#f5a623]' : 'text-[#2ecc71]'}`}>+{Math.round(selected.delayMin)} min</div>
                  <div className="text-[#a3b0cc]">Guard: {selected.guard}</div>
                </div>
              </div>

              {/* TIMELINE */}
              <div className="px-3 py-2 border-b border-[#1e2a44]">
                <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">Route Timeline</div>
                <div className="relative flex items-center">
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-[#2a3650]"></div>
                  {selected.schedule.map((s, i) => (
                    <div key={i} className="relative flex-1 flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'bg-[#f5a623] border-[#f5a623]' : 'bg-[#081428] border-[#5fb1ff]'} z-10`}></div>
                      <div className="text-[10px] text-[#e3ecff] font-mono mt-1">{s.station}</div>
                      <div className="text-[9px] text-[#6b7a98] font-mono">{s.arrive}→{s.depart}</div>
                      <div className="text-[9px] text-[#a3b0cc] font-mono">KM {s.km}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
                <div className="col-span-2 p-3 border-r border-[#1e2a44] overflow-y-auto scroll-thin">
                  <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">Movement Log</div>
                  <div className="space-y-1.5 text-[10px] font-mono">
                    {[
                      { t: '14:42:08', e: `At KM ${selected.currentKm.toFixed(1)} — speed ${Math.round(selected.speed)} km/h` },
                      { t: '14:38:21', e: `Passed home signal SIG-DLI-${Math.floor(selected.currentKm)}-UP` },
                      { t: '14:31:09', e: `Looped out of DSA yard (KM 8.2)` },
                      { t: '14:24:55', e: `Departed DLI (KM 0.0) on schedule` },
                      { t: '13:50:42', e: `Rake linked · Loco ${selected.loco} · Guard ${selected.guard}` },
                    ].map((l, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[#6b7a98] w-16">{l.t}</span>
                        <span className="text-[#c7d3e6]">{l.e}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 overflow-y-auto scroll-thin">
                  <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">Rake & Crew</div>
                  <div className="space-y-1 text-[10px] font-mono">
                    <div><span className="text-[#6b7a98]">Rake:</span> <span className="text-[#e3ecff]">{selected.rake}</span></div>
                    <div><span className="text-[#6b7a98]">Loco:</span> <span className="text-[#e3ecff]">{selected.loco}</span></div>
                    <div><span className="text-[#6b7a98]">Guard:</span> <span className="text-[#e3ecff]">{selected.guard}</span></div>
                    <div><span className="text-[#6b7a98]">Last update:</span> <span className="text-[#e3ecff]">{selected.lastUpdate}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
