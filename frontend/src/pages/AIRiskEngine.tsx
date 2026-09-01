import { useMemo, useState } from 'react';
import { Brain, Filter } from 'lucide-react';
import { riskRecords } from '../lib/data';

export default function AIRiskEngine() {
  const [domain, setDomain] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'domain'>('risk');

  const sorted = useMemo(() => {
    let r = [...riskRecords];
    if (domain !== 'ALL') r = r.filter(x => x.domain === domain);
    r.sort((a, b) => sortBy === 'risk' ? b.score - a.score : a.domain.localeCompare(b.domain));
    return r;
  }, [domain, sortBy]);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">AI Risk Engine · Decision Support</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Risk Intelligence · Track, OHE, Signalling, Bridges, Trains & Maintenance</h1>
        </div>
        <span className="chip chip-amber">AI OUTPUT IS DECISION-SUPPORT ONLY</span>
      </div>

      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center gap-2">
        <Brain size={12} className="text-[#f5a623]" />
        <span className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Domain</span>
        <select value={domain} onChange={e => setDomain(e.target.value)} className="bg-[#081428] border border-[#1e2a44] px-2 py-1 text-[11px] text-[#e3ecff] font-mono">
          <option value="ALL">All domains</option>
          <option value="TRACK">Track</option>
          <option value="OHE">OHE / Traction</option>
          <option value="SIGNALLING">Signalling</option>
          <option value="BRIDGE">Bridge</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        <span className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider ml-3">Sort by</span>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-[#081428] border border-[#1e2a44] px-2 py-1 text-[11px] text-[#e3ecff] font-mono">
          <option value="risk">Risk score</option>
          <option value="domain">Domain</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2">
        {sorted.map((r, i) => (
          <div key={i} className="bg-[#081428] border border-[#1e2a44] rounded-sm">
            <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center gap-3">
              <span className="text-[10px] font-mono text-[#5fb1ff] uppercase tracking-wider">{r.domain}</span>
              <span className="text-[12px] text-[#e3ecff]">{r.location}</span>
              <span className="text-[10px] text-[#6b7a98] font-mono">· {r.updatedAt}</span>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-32 h-1.5 bg-[#1e2a44] rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${r.score}%`, background: r.score > 75 ? '#e53935' : r.score > 50 ? '#f5a623' : '#2ecc71' }}></div>
                </div>
                <span className="text-[18px] font-bold tabular-nums" style={{ color: r.score > 75 ? '#e53935' : r.score > 50 ? '#f5a623' : '#2ecc71' }}>{r.score}</span>
                <span className="text-[10px] text-[#6b7a98] font-mono">/100</span>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="p-3 border-r border-[#1e2a44]">
                <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1.5">Reasons</div>
                <ul className="space-y-1 text-[11px] text-[#c7d3e6]">
                  {r.reasons.map((rs, i) => <li key={i} className="leading-snug">• {rs}</li>)}
                </ul>
              </div>
              <div className="p-3 border-r border-[#1e2a44]">
                <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider mb-1.5">Affected</div>
                <div className="text-[10px] font-mono text-[#a3b0cc] mb-1">Assets:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {r.affectedAssets.map(a => <span key={a} className="chip chip-grey" style={{ fontSize: 9 }}>{a}</span>)}
                </div>
                {r.affectedTrains.length > 0 && (
                  <>
                    <div className="text-[10px] font-mono text-[#a3b0cc] mb-1">Trains:</div>
                    <div className="flex flex-wrap gap-1">
                      {r.affectedTrains.map(t => <span key={t} className="chip chip-blue" style={{ fontSize: 9 }}>{t}</span>)}
                    </div>
                  </>
                )}
              </div>
              <div className="p-3">
                <div className="text-[10px] text-[#f5a623] font-mono uppercase tracking-wider mb-1.5">Recommendation</div>
                <div className="text-[11px] text-[#e3ecff] leading-relaxed">{r.recommendation}</div>
                <div className="text-[9px] text-[#6b7a98] italic mt-2 pt-2 border-t border-[#1e2a44]">Decision support only — operational authority rests with Section Controller / DEN.</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
