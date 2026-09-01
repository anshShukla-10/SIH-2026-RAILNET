import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Brain, CheckCircle2, ChevronRight, ClipboardCheck, Layers, MapPin, Wrench, Zap } from 'lucide-react';
import RailwayMap from '../components/RailwayMap';
import { bridges, defects, inspections, kpiMetrics, ohes, riskRecords, signals, tracks, workOrders } from '../lib/data';
import { Metric, SectionHeader, STATUS_CHIP, StatusDot } from '../components/icons';

export default function LocationIntelligence() {
  const [params, setParams] = useSearchParams();
  const km = params.get('km') || '124/5';
  const setKm = (v: string) => setParams({ km: v });

  const kmNum = parseFloat(km.split('/')[0]) + (parseFloat(km.split('/')[1]?.split('-')?.[0] || '0')) / 10;
  const nearKm = (k: string) => Math.abs(parseFloat(k.split('/')[0]) - kmNum) < 2;

  const track = tracks.find(t => nearKm(t.km));
  const ohe = ohes.find(o => nearKm(o.km));
  const signal = signals.find(s => nearKm(s.km));
  const bridge = bridges.find(b => nearKm(b.km));
  const localInspections = inspections.filter(i => nearKm(i.assetKm));
  const localDefects = defects.filter(d => nearKm(d.assetKm));
  const localWO = workOrders.filter(w => nearKm(w.assetKm));
  const localRisk = riskRecords.filter(r => r.location.includes(km));

  // Trains near KM (within 3 km)
  const nearbyTrains: any[] = [];

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      {/* HEADER */}
      <div className="px-5 py-3 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-[#a3b0cc] hover:text-[#e3ecff] flex items-center gap-1 text-[11px]">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span className="text-[#1e2a44]">/</span>
          <div>
            <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Location Intelligence</div>
            <h1 className="text-lg font-semibold text-[#e3ecff]">KM {km} · DLI–GZB Section</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip chip-grey">Demonstration data</span>
          <span className="chip chip-blue">Unified View</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* MAP */}
        <div className="col-span-12 lg:col-span-7 panel rounded-sm flex flex-col">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <span className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider">Digital Twin · KM {km}</span>
            <span className="text-[9px] text-[#6b7a98] font-mono">MapLibre · OpenStreetMap</span>
          </div>
          <div className="flex-1 relative">
            <RailwayMap selectedKm={km} selectionMode="asset" />
          </div>
        </div>

        {/* LOC INFO PANEL */}
        <div className="col-span-12 lg:col-span-5 panel rounded-sm flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <span className="text-[10px] text-[#f5a623] font-mono uppercase tracking-wider">KM {km} · Unified Asset View</span>
            <select
              value={km}
              onChange={e => setKm(e.target.value)}
              className="bg-[#081428] border border-[#2a3650] text-[10px] text-[#e3ecff] px-1.5 py-0.5 font-mono"
            >
              <option value="124/2-3">124/2-3 · TRK-DLI-1242</option>
              <option value="124/4-7">124/4-7 · TRK-DLI-1245</option>
              <option value="124/5">124/5 · (selected)</option>
              <option value="124/8-9">124/8-9 · TRK-DLI-1248</option>
              <option value="125/0-2">125/0-2 · TRK-DLI-1250</option>
              <option value="125/3-5">125/3-5 · TRK-DLI-1253</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin">
            {/* TRACK */}
            {track && (
              <div className="border-b border-[#1e2a44]">
                <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                  <Layers size={12} className="text-[#5fb1ff]" />
                  <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Track · {track.id}</span>
                  <span className={`chip ${STATUS_CHIP[track.condition as keyof typeof STATUS_CHIP]}`}>{track.condition}</span>
                  <span className="ml-auto text-[10px] font-mono text-[#f5a623]">Risk {track.riskScore}/100</span>
                </div>
                <div className="px-3 py-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] font-mono">
                  <div><span className="text-[#6b7a98]">KM:</span> <span className="text-[#e3ecff]">{track.km}</span></div>
                  <div><span className="text-[#6b7a98]">Rail:</span> <span className="text-[#e3ecff]">{track.railType}</span></div>
                  <div><span className="text-[#6b7a98]">Sleeper:</span> <span className="text-[#e3ecff]">{track.sleeperType}</span></div>
                  <div><span className="text-[#6b7a98]">Ballast:</span> <span className="text-[#e3ecff]">{track.ballastDepth}mm</span></div>
                  <div><span className="text-[#6b7a98]">Curve:</span> <span className="text-[#e3ecff]">{track.curveDeg}°</span></div>
                  <div><span className="text-[#6b7a98]">Gradient:</span> <span className="text-[#e3ecff]">1/{track.gradient}</span></div>
                  <div><span className="text-[#6b7a98]">Built:</span> <span className="text-[#e3ecff]">{track.commissionedYear}</span></div>
                  <div><span className="text-[#6b7a98]">Inspected:</span> <span className="text-[#e3ecff]">{track.lastInspected}</span></div>
                  <div><span className="text-[#6b7a98]">Defects:</span> <span className="text-[#e53935]">{track.defects.length}</span></div>
                </div>
              </div>
            )}

            {/* OHE */}
            {ohe && (
              <div className="border-b border-[#1e2a44]">
                <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                  <Zap size={12} className="text-[#f5a623]" />
                  <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">OHE · {ohe.id}</span>
                  <span className={`chip ${STATUS_CHIP[ohe.condition as keyof typeof STATUS_CHIP]}`}>{ohe.condition}</span>
                  <span className="ml-auto text-[10px] font-mono text-[#f5a623]">Risk {ohe.riskScore}/100</span>
                </div>
                <div className="px-3 py-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] font-mono">
                  <div><span className="text-[#6b7a98]">Type:</span> <span className="text-[#e3ecff]">{ohe.type}</span></div>
                  <div><span className="text-[#6b7a98]">Voltage:</span> <span className="text-[#e3ecff]">{ohe.voltage} kV</span></div>
                  <div><span className="text-[#6b7a98]">Mast:</span> <span className="text-[#e3ecff]">{ohe.mastNo}</span></div>
                  <div><span className="text-[#6b7a98]">Wire Ht:</span> <span className="text-[#e3ecff]">{ohe.contactWireHeight}m</span></div>
                  <div><span className="text-[#6b7a98]">Tension:</span> <span className="text-[#e3ecff]">{ohe.tension} kN</span></div>
                  <div><span className="text-[#6b7a98]">Inspected:</span> <span className="text-[#e3ecff]">{ohe.lastInspected}</span></div>
                </div>
                {ohe.faults.length > 0 && (
                  <div className="px-3 pb-2 text-[10px] font-mono text-[#e53935]">Faults: {ohe.faults.join(', ')}</div>
                )}
              </div>
            )}

            {/* SIGNAL */}
            {signal && (
              <div className="border-b border-[#1e2a44]">
                <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                  <MapPin size={12} className="text-[#2196f3]" />
                  <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Signal · {signal.id}</span>
                  <span className={`chip ${STATUS_CHIP[signal.status as keyof typeof STATUS_CHIP]}`}>{signal.status}</span>
                </div>
                <div className="px-3 py-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[10px] font-mono">
                  <div><span className="text-[#6b7a98]">Type:</span> <span className="text-[#e3ecff]">{signal.type}</span></div>
                  <div><span className="text-[#6b7a98]">Aspect:</span> <span className="text-[#e3ecff]">{signal.aspect}</span></div>
                  <div><span className="text-[#6b7a98]">Track Cir.:</span> <span className="text-[#e3ecff]">{signal.trackCircuit}</span></div>
                  <div><span className="text-[#6b7a98]">Interlock.:</span> <span className="text-[#e3ecff]">{signal.interlockingId}</span></div>
                  <div><span className="text-[#6b7a98]">Inspected:</span> <span className="text-[#e3ecff]">{signal.lastInspected}</span></div>
                  <div><span className="text-[#6b7a98]">Faults:</span> <span className="text-[#e53935]">{signal.faults.length}</span></div>
                </div>
                {signal.history.length > 0 && (
                  <div className="px-3 pb-2 text-[10px]">
                    <div className="text-[#6b7a98] font-mono uppercase tracking-wider mb-1">History</div>
                    {signal.history.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex gap-2 font-mono">
                        <span className="text-[#6b7a98]">{h.date}</span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${h.severity === 'critical' ? 'bg-[#e53935]' : h.severity === 'warning' ? 'bg-[#f5a623]' : 'bg-[#2ecc71]'}`}></span>
                        <span className="text-[#c7d3e6]">{h.event}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BRIDGE */}
            {bridge && (
              <div className="border-b border-[#1e2a44]">
                <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                  <ChevronRight size={12} className="text-[#a3b0cc]" />
                  <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Bridge · {bridge.id}</span>
                  <span className={`chip ${STATUS_CHIP[bridge.condition as keyof typeof STATUS_CHIP]}`}>{bridge.condition}</span>
                </div>
                <div className="px-3 py-2 text-[10px] font-mono">
                  <div className="text-[#c7d3e6]">{bridge.name}</div>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 mt-1">
                    <div><span className="text-[#6b7a98]">Type:</span> <span className="text-[#e3ecff]">{bridge.type}</span></div>
                    <div><span className="text-[#6b7a98]">Spans:</span> <span className="text-[#e3ecff]">{bridge.spans}</span></div>
                    <div><span className="text-[#6b7a98]">Length:</span> <span className="text-[#e3ecff]">{bridge.length} m</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* INSPECTIONS */}
            <div className="border-b border-[#1e2a44]">
              <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                <ClipboardCheck size={12} className="text-[#00bcd4]" />
                <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Inspections ({localInspections.length})</span>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {localInspections.length === 0 && <div className="text-[10px] text-[#6b7a98] font-mono">No inspections within 2 km corridor</div>}
                {localInspections.map(i => (
                  <div key={i.id} className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5 text-[10px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5fb1ff]">{i.id}</span>
                      <span className={`chip ${STATUS_CHIP[i.status === 'COMPLETED' ? 'normal' : i.status === 'DUE' ? 'warning' : i.status === 'OVERDUE' || i.status === 'CRITICAL' ? 'critical' : 'info']}`}>{i.status}</span>
                    </div>
                    <div className="text-[#a3b0cc] mt-0.5">{i.department} · {i.inspector}</div>
                    <div className="text-[#c7d3e6] mt-0.5 text-[10px] leading-snug">{i.findings}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEFECTS */}
            <div className="border-b border-[#1e2a44]">
              <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                <AlertTriangle size={12} className="text-[#e53935]" />
                <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Defects ({localDefects.length})</span>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {localDefects.length === 0 && <div className="text-[10px] text-[#6b7a98] font-mono">No defects within 2 km corridor</div>}
                {localDefects.map(d => (
                  <div key={d.id} className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#e53935]">{d.id} · {d.assetType}</span>
                      <span className={`chip ${STATUS_CHIP[d.severity]}`}>{d.severity}</span>
                    </div>
                    <div className="text-[10px] text-[#a3b0cc] mt-0.5">{d.category}</div>
                    <div className="text-[10px] text-[#c7d3e6] mt-0.5">{d.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* MAINTENANCE */}
            <div className="border-b border-[#1e2a44]">
              <div className="px-3 py-1.5 bg-[#081428] flex items-center gap-2">
                <Wrench size={12} className="text-[#2196f3]" />
                <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Maintenance ({localWO.length})</span>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {localWO.length === 0 && <div className="text-[10px] text-[#6b7a98] font-mono">No work orders</div>}
                {localWO.map(w => (
                  <div key={w.id} className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#5fb1ff]">{w.id}</span>
                      <span className={`chip ${w.status === 'OVERDUE' || w.status === 'BLOCKED' ? 'chip-red' : w.status === 'IN_PROGRESS' ? 'chip-amber' : w.status === 'COMPLETED' ? 'chip-green' : 'chip-blue'}`}>{w.status}</span>
                    </div>
                    <div className="text-[10px] text-[#c7d3e6] mt-0.5 leading-snug">{w.problem}</div>
                    <div className="text-[10px] text-[#a3b0cc] mt-0.5 font-mono">{w.team} · {w.plannedStart}</div>
                    {w.blockId && <Link to="/block-planner" className="text-[9px] text-[#5fb1ff] hover:underline mt-0.5 inline-block">Block: {w.blockId}</Link>}
                  </div>
                ))}
              </div>
            </div>

            {/* AI RISK */}
            <div>
              <div className="px-3 py-1.5 bg-[#112347] flex items-center gap-2">
                <Brain size={12} className="text-[#f5a623]" />
                <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">AI Risk & Recommendation · Decision Support</span>
              </div>
              <div className="px-3 py-2 space-y-2">
                {localRisk.length === 0 && <div className="text-[10px] text-[#6b7a98] font-mono">No elevated risk at this KM.</div>}
                {localRisk.map(r => (
                  <div key={r.domain} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider">{r.domain}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[16px] font-bold tabular-nums" style={{ color: r.score > 75 ? '#e53935' : r.score > 50 ? '#f5a623' : '#2ecc71' }}>{r.score}</span>
                        <span className="text-[9px] text-[#6b7a98] font-mono">/100</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-[#a3b0cc] uppercase tracking-wider mb-1">Reasons</div>
                    <ul className="text-[10px] text-[#c7d3e6] space-y-0.5 mb-1.5">
                      {r.reasons.map((rs, i) => <li key={i} className="leading-snug">• {rs}</li>)}
                    </ul>
                    <div className="text-[10px] font-mono text-[#f5a623] uppercase tracking-wider mb-0.5">Recommendation</div>
                    <div className="text-[10px] text-[#e3ecff] leading-snug">{r.recommendation}</div>
                    <div className="text-[9px] text-[#6b7a98] mt-1.5 italic">Decision support only — final authority rests with Section Controller / Sr.DSTE.</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
