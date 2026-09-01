import { useMemo, useState } from 'react';
import { Database, Layers, Zap, Activity, Building2, GitBranch, MapPin, Search } from 'lucide-react';
import { bridges, defects, inspections, ohes, pointMachines, signals, trackCircuits, tracks, workOrders } from '../lib/data';
import { STATUS_CHIP } from '../components/icons';

export default function AssetIntelligence() {
  const [type, setType] = useState<'ALL' | 'TRACK' | 'OHE' | 'SIGNAL' | 'POINT' | 'BRIDGE' | 'TRACK_CIRCUIT'>('ALL');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const out: any[] = [];
    tracks.forEach(t => out.push({ id: t.id, type: 'TRACK', km: t.km, condition: t.condition, riskScore: t.riskScore, inspected: t.lastInspected, defects: t.defects.length }));
    ohes.forEach(o => out.push({ id: o.id, type: 'OHE', km: o.km, condition: o.condition, riskScore: o.riskScore, inspected: o.lastInspected, defects: o.faults.length }));
    signals.forEach(s => out.push({ id: s.id, type: 'SIGNAL', km: s.km, condition: s.status, riskScore: 0, inspected: s.lastInspected, defects: s.faults.length }));
    pointMachines.forEach(p => out.push({ id: p.id, type: 'POINT', km: p.km, condition: p.condition, riskScore: 0, inspected: p.lastOperation, defects: 0 }));
    bridges.forEach(b => out.push({ id: b.id, type: 'BRIDGE', km: b.km, condition: b.condition, riskScore: b.riskScore, inspected: b.lastInspected, defects: 0 }));
    trackCircuits.forEach(tc => out.push({ id: tc.id, type: 'TRACK_CIRCUIT', km: tc.km, condition: tc.healthy ? 'normal' : 'critical', riskScore: 0, inspected: tc.lastTested, defects: 0 }));
    return out;
  }, []);

  const filtered = rows.filter(r =>
    (type === 'ALL' || r.type === type) &&
    (search === '' || r.id.toLowerCase().includes(search.toLowerCase()) || r.km.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = { TRACK: 0, OHE: 0, SIGNAL: 0, POINT: 0, BRIDGE: 0, TRACK_CIRCUIT: 0 };
    rows.forEach(r => out[r.type] = (out[r.type] || 0) + 1);
    return out;
  }, [rows]);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Asset Intelligence</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Unified Asset Register · Cross-Domain</h1>
        </div>
        <span className="chip chip-amber">ASSET REGISTER DEMO</span>
      </div>

      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[#081428] border border-[#1e2a44] px-2 py-1 rounded-sm">
          <Search size={11} className="text-[#6b7a98]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search asset id or KM…" className="bg-transparent text-[11px] text-[#e3ecff] placeholder-[#6b7a98] outline-none w-[220px] font-mono" />
        </div>
        <div className="flex items-center gap-1">
          {(['ALL', 'TRACK', 'OHE', 'SIGNAL', 'POINT', 'TRACK_CIRCUIT', 'BRIDGE'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-2 py-1 text-[10px] font-mono ${type === t ? 'bg-[#112347] border border-[#f5a623] text-[#e3ecff]' : 'bg-[#081428] border border-[#1e2a44] text-[#a3b0cc]'} rounded-sm`}
            >
              {t.replace('_', ' ')} {t !== 'ALL' ? <span className="text-[#6b7a98]">({counts[t] || 0})</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2 hover:border-[#2a3650]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-[#e3ecff]">{r.id}</span>
                <span className="chip chip-grey" style={{ fontSize: 9 }}>{r.type.replace('_', ' ')}</span>
                <span className={`chip ${STATUS_CHIP[r.condition as keyof typeof STATUS_CHIP] || 'chip-grey'}`} style={{ fontSize: 9 }}>{r.condition}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div><span className="text-[#6b7a98]">KM:</span> <span className="text-[#c7d3e6]">{r.km}</span></div>
                <div><span className="text-[#6b7a98]">Inspected:</span> <span className="text-[#c7d3e6]">{r.inspected}</span></div>
                <div><span className="text-[#6b7a98]">Risk:</span> <span className={r.riskScore > 70 ? 'text-[#e53935]' : r.riskScore > 40 ? 'text-[#f5a623]' : 'text-[#2ecc71]'}>{r.riskScore || '—'}</span></div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1e2a44] text-[10px] font-mono">
                <span className="text-[#6b7a98]">Defects: <span className={r.defects > 0 ? 'text-[#e53935]' : 'text-[#2ecc71]'}>{r.defects}</span></span>
                <span className="text-[#5fb1ff]">View →</span>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center text-[#6b7a98] py-6 text-[12px]">No assets match.</div>}
      </div>
    </div>
  );
}
