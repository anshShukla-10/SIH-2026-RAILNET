import { Building2, AlertTriangle } from 'lucide-react';
import { bridges } from '../lib/data';
import { STATUS_CHIP } from '../components/icons';

export default function Bridges() {
  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Bridges & Structures</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Bridge Asset Register · Delhi Section</h1>
        </div>
        <span className="chip chip-amber">BRIDGE DEMO</span>
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {bridges.map(b => (
            <div key={b.id} className="panel rounded-sm">
              <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center gap-2">
                <Building2 size={12} className="text-[#a3b0cc]" />
                <span className="text-[11px] text-[#e3ecff] font-mono">{b.id}</span>
                <span className={`chip ${STATUS_CHIP[b.condition]}`} style={{ marginLeft: 'auto' }}>{b.condition}</span>
              </div>
              <div className="p-3">
                <div className="text-[13px] text-[#e3ecff] font-semibold">{b.name}</div>
                <div className="text-[10px] text-[#a3b0cc] font-mono mt-0.5">@ KM {b.km} · {b.section}</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center bg-[#081428] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="text-[#6b7a98] text-[9px] uppercase tracking-wider font-mono">Type</div>
                    <div className="text-[12px] text-[#e3ecff] font-mono">{b.type}</div>
                  </div>
                  <div className="text-center bg-[#081428] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="text-[#6b7a98] text-[9px] uppercase tracking-wider font-mono">Spans</div>
                    <div className="text-[12px] text-[#e3ecff] font-mono">{b.spans}</div>
                  </div>
                  <div className="text-center bg-[#081428] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="text-[#6b7a98] text-[9px] uppercase tracking-wider font-mono">Length</div>
                    <div className="text-[12px] text-[#e3ecff] font-mono">{b.length}m</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono">
                  <div><span className="text-[#6b7a98]">Year:</span> <span className="text-[#c7d3e6]">{b.yearBuilt}</span></div>
                  <div><span className="text-[#6b7a98]">Inspected:</span> <span className="text-[#c7d3e6]">{b.lastInspected}</span></div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1e2a44]">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#6b7a98] uppercase tracking-wider">AI Risk Score</span>
                    <span className="text-[16px] font-bold" style={{ color: b.riskScore > 70 ? '#e53935' : b.riskScore > 40 ? '#f5a623' : '#2ecc71' }}>{b.riskScore}/100</span>
                  </div>
                  <div className="h-1.5 bg-[#1e2a44] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full" style={{ width: `${b.riskScore}%`, background: b.riskScore > 70 ? '#e53935' : b.riskScore > 40 ? '#f5a623' : '#2ecc71' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
