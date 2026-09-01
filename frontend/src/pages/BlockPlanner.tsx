import { useMemo, useState } from 'react';
import { Brain, Calendar, CheckCircle2, Sparkles, Wrench } from 'lucide-react';
import { blocks, sections, trains, workOrders } from '../lib/data';

export default function BlockPlanner() {
  const [section, setSection] = useState<string>('SEC-DLI-GZB');
  const [track, setTrack] = useState<string>('UP');
  const [start, setStart] = useState<string>('10:30');
  const [end, setEnd] = useState<string>('13:30');
  const [fromKm, setFromKm] = useState<string>('124/4');
  const [toKm, setToKm] = useState<string>('124/7');
  const [workType, setWorkType] = useState<string>('MAINTENANCE');
  const [checked, setChecked] = useState(false);
  const [generated, setGenerated] = useState<typeof blocks[number] | null>(null);

  // Compute conflicts and AI recommendation
  const result = useMemo(() => {
    const conflicting = blocks.filter(b =>
      b.section === section &&
      b.startTime.slice(11) < end &&
      b.endTime.slice(11) > start
    );
    const affected = trains.slice(0, 7).map((t, i) => ({
      number: t.number,
      name: t.name,
      delay: 15 + i * 5,
      blocked: i < 4,
    }));
    const risk = conflicting.length > 0 ? 'HIGH — schedule conflict' : conflicting.length === 0 && track === 'UP' ? 'MEDIUM — peak window' : 'LOW';
    return {
      conflicts: conflicting.map(c => `${c.id}: ${c.purpose}`),
      affected,
      aiNote:
        conflicting.length > 0
          ? `CONFLICT: ${conflicting.length} overlapping block(s) in the section. ${track === 'UP' ? 'UP line already under active signalling investigation BLK-DLI-2026-0903-01.' : ''} Recommend staggering by ≥45 min or shifting to 13:45–16:45.`
          : track === 'UP'
            ? `LOW CONFLICT. UP main through DLI–GZB has ~4 express services in this window. Consider deferring to 13:45–16:45 if Rajdhani slack available. Expected cumulative delay ~35 min.`
            : `LOW RISK. Off-peak window with minimal freight path. Safe to proceed.`,
      risk,
    };
  }, [section, track, start, end]);

  const generate = () => {
    setChecked(true);
    const id = `BLK-DLI-2026-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9)}`;
    setGenerated({
      id,
      section,
      fromKm,
      toKm,
      track: track as any,
      workType: workType as any,
      purpose: `Demo ${workType.toLowerCase()} block on ${track} main (${fromKm}–${toKm})`,
      requestedBy: 'Sr.DEN (North)/DLI',
      startTime: `2026-03-12 ${start}`,
      endTime: `2026-03-12 ${end}`,
      status: result.conflicts.length > 0 ? 'CONFLICT' : 'PROPOSED',
      workOrderIds: ['WRK-2026-0901-007'],
      affectedTrains: result.affected.filter(a => a.blocked).map(a => a.number),
      affectedAssets: ['TRK-DLI-1245', 'OHE-DLI-1245-07', 'SIG-DLI-1245-UP'],
      conflicts: result.conflicts,
      aiNote: result.aiNote,
    });
  };

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Block Planner</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Railway Block Timeline & Conflict Resolution</h1>
        </div>
        <span className="chip chip-amber">BLOCK PLANNING DEMO</span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* LEFT — input form */}
        <div className="col-span-12 lg:col-span-4 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <Wrench size={12} className="text-[#2196f3]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">New Block Request</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-3">
            {[
              { label: 'Section', el: (
                <select value={section} onChange={e => setSection(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono">
                  {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}
                </select>
              ) },
              { label: 'Track', el: (
                <div className="flex gap-1">
                  {['UP', 'DOWN', 'BOTH'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTrack(t)}
                      className={`flex-1 px-2 py-1.5 text-[11px] font-mono ${track === t ? 'bg-[#112347] border border-[#f5a623] text-[#e3ecff]' : 'bg-[#081428] border border-[#1e2a44] text-[#a3b0cc]'}`}
                    >{t}</button>
                  ))}
                </div>
              ) },
              { label: 'From KM', el: (
                <input value={fromKm} onChange={e => setFromKm(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono" />
              ) },
              { label: 'To KM', el: (
                <input value={toKm} onChange={e => setToKm(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono" />
              ) },
              { label: 'Work Type', el: (
                <select value={workType} onChange={e => setWorkType(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono">
                  {['MAINTENANCE', 'ENGINEERING', 'OHE', 'SIGNALLING', 'BRIDGE'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) },
              { label: 'Start Time', el: (
                <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono" />
              ) },
              { label: 'End Time', el: (
                <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono" />
              ) },
            ].map(({ label, el }, i) => (
              <div key={i}>
                <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1">{label}</div>
                {el}
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setChecked(true)} className="flex-1 px-3 py-2 bg-[#112347] border border-[#2a3650] text-[#e3ecff] text-[11px] flex items-center justify-center gap-1.5">
                <CheckCircle2 size={11} /> Check Conflicts
              </button>
              <button onClick={generate} className="flex-1 px-3 py-2 bg-[#f5a623] hover:bg-[#e69610] text-[#050b1a] text-[11px] font-semibold flex items-center justify-center gap-1.5">
                <Sparkles size={11} /> Generate AI Rec.
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE — timeline */}
        <div className="col-span-12 lg:col-span-5 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <Calendar size={12} className="text-[#5fb1ff]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Block Timeline — 2026-03-12 (24h)</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin p-3">
            <div className="relative">
              {/* Hours */}
              <div className="flex items-center justify-between text-[9px] font-mono text-[#6b7a98] mb-1">
                {[0, 6, 9, 12, 15, 18, 21, 24].map(h => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}
              </div>
              <div className="relative h-1 bg-[#1e2a44] rounded-full">
                <div className="absolute top-1/2 -translate-y-1/2 left-[37.5%] w-1 h-3 bg-[#f5a623]"></div>
                <div className="absolute top-1/2 -translate-y-1/2 left-[56.25%] w-1 h-3 bg-[#f5a623]"></div>
              </div>

              {/* Existing blocks */}
              <div className="mt-4 space-y-1.5">
                {blocks.map(b => {
                  const sh = parseInt(b.startTime.slice(11, 13));
                  const eh = parseInt(b.endTime.slice(11, 13));
                  const sm = parseInt(b.startTime.slice(14, 16));
                  const left = ((sh * 60 + sm) / (24 * 60)) * 100;
                  const width = (((eh - sh) * 60) / (24 * 60)) * 100;
                  return (
                    <div key={b.id} className="relative h-8 bg-[#081428] border border-[#1e2a44] rounded-sm">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-2 text-[10px] font-mono text-[#6b7a98] uppercase tracking-wider">{b.id.slice(-9)}</div>
                      <div
                        className={`absolute top-1 bottom-1 rounded-sm flex items-center px-2 text-[10px] font-mono text-white ${
                          b.status === 'ACTIVE' ? 'bg-[#e53935]' : b.status === 'APPROVED' ? 'bg-[#f5a623]' : b.status === 'PROPOSED' ? 'bg-[#2196f3]' : 'bg-[#6b7a98]'
                        }`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 5)}%` }}
                      >
                        {b.purpose.slice(0, 30)}
                      </div>
                    </div>
                  );
                })}

                {/* Current proposed block */}
                {checked && (
                  <div className="relative h-8 bg-[#081428] border border-[#f5a623] rounded-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-2 text-[10px] font-mono text-[#f5a623] uppercase tracking-wider">NEW BLOCK (PROPOSED)</div>
                    <div
                      className="absolute top-1 bottom-1 bg-[#f5a623]/60 border border-[#f5a623] rounded-sm flex items-center px-2 text-[10px] font-mono text-white"
                      style={{ left: `${(parseInt(start) * 60 + 0) / 14.4}%`, width: `${Math.max(((parseInt(end) - parseInt(start)) * 60) / 14.4, 4)}%` }}
                    >
                      {fromKm} → {toKm} · {workType}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2 text-center">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Existing</div>
                  <div className="text-[#e3ecff] text-[14px] font-bold">{blocks.length}</div>
                </div>
                <div className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2 text-center">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Conflicts</div>
                  <div className="text-[14px] font-bold" style={{ color: result.conflicts.length > 0 ? '#e53935' : '#2ecc71' }}>{result.conflicts.length}</div>
                </div>
                <div className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2 text-center">
                  <div className="text-[#6b7a98] uppercase tracking-wider">Risk</div>
                  <div className={`text-[14px] font-bold ${result.risk.startsWith('HIGH') ? 'text-[#e53935]' : result.risk.startsWith('MEDIUM') ? 'text-[#f5a623]' : 'text-[#2ecc71]'}`}>{result.risk.split(' — ')[0]}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — AI output + affected trains */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-2 overflow-hidden">
          <div className="panel flex flex-col overflow-hidden" style={{ maxHeight: 260 }}>
            <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
              <Brain size={12} className="text-[#f5a623]" />
              <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">AI · Decision Support</span>
            </div>
            <div className="p-3 text-[11px] text-[#c7d3e6] leading-relaxed flex-1 overflow-y-auto scroll-thin">
              {!checked ? (
                <div className="text-[#6b7a98]">Click <span className="text-[#f5a623]">Check Conflicts</span> or <span className="text-[#f5a623]">Generate AI Rec.</span> to analyse the proposed block window.</div>
              ) : (
                <>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#f5a623] mb-1">Recommendation</div>
                  <div className="bg-[#050b1a] border border-[#1e2a44] rounded-sm p-2 text-[11px]">{result.aiNote}</div>
                  {result.conflicts.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#e53935] mb-1">Conflicts</div>
                      {result.conflicts.map((c, i) => <div key={i} className="text-[10px] text-[#e53935]">• {c}</div>)}
                    </div>
                  )}
                  <div className="text-[9px] text-[#6b7a98] italic mt-3">Decision support only · final authority: Section Controller / DEN.</div>
                </>
              )}
            </div>
          </div>

          <div className="panel flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
              <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Affected Trains</span>
              <span className="text-[10px] text-[#f5a623] font-mono">{result.affected.filter(a => a.blocked).length} blocked</span>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
              {result.affected.map(t => (
                <div key={t.number} className="px-2 py-1.5 flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${t.blocked ? 'bg-[#e53935]' : 'bg-[#2ecc71]'}`}></span>
                  <span className="font-mono text-[#e3ecff]">{t.number}</span>
                  <span className="text-[#a3b0cc] truncate text-[10px] flex-1">{t.name}</span>
                  <span className={`text-[10px] font-mono ${t.delay > 30 ? 'text-[#e53935]' : 'text-[#f5a623]'}`}>+{t.delay}m</span>
                </div>
              ))}
            </div>
          </div>

          {generated && (
            <div className="panel border-[#f5a623]">
              <div className="px-3 py-1.5 border-b border-[#f5a623] bg-[#112347] flex items-center gap-2">
                <CheckCircle2 size={11} className="text-[#f5a623]" />
                <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">Work Order Created</span>
              </div>
              <div className="p-3 text-[11px]">
                <div className="font-mono text-[#5fb1ff]">{generated.id}</div>
                <div className="text-[#a3b0cc] mt-1">{generated.purpose}</div>
                <div className="text-[10px] text-[#6b7a98] mt-2 font-mono">{generated.startTime} → {generated.endTime}</div>
                <div className="text-[10px] text-[#6b7a98] font-mono">{generated.affectedTrains.length} trains · {generated.affectedAssets.length} assets</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
