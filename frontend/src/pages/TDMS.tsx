import { useState } from 'react';
import { Cpu, Search, Zap } from 'lucide-react';
import { ohes, defects } from '../lib/data';
import { STATUS_CHIP } from '../components/icons';
import RailwayMap from '../components/RailwayMap';

export default function TDMS() {
  const [filter, setFilter] = useState<string>('all');
  const filtered = filter === 'all' ? ohes : ohes.filter(o => o.condition === filter);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">TDMS · Traction Distribution Management</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">OHE / Traction Asset Register</h1>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'critical', 'warning', 'normal'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider ${filter === f ? 'bg-[#112347] border border-[#f5a623] text-[#e3ecff]' : 'bg-[#081428] border border-[#1e2a44] text-[#a3b0cc]'} rounded-sm`}
            >
              {f}
            </button>
          ))}
          <span className="chip chip-amber">TDMS DEMO</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* MAP */}
        <div className="col-span-12 lg:col-span-7 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <Zap size={12} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">OHE Masts on Map</span>
          </div>
          <div className="flex-1 relative">
            <RailwayMap selectionMode="asset" height="100%" />
          </div>
        </div>

        {/* OHE REGISTER */}
        <div className="col-span-12 lg:col-span-5 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center gap-2">
            <Cpu size={12} className="text-[#f5a623]" />
            <span className="text-[10px] text-[#e3ecff] font-mono uppercase tracking-wider">OHE Register ({filtered.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
            {filtered.map(o => (
              <div key={o.id} className="px-3 py-2 hover:bg-[#0d1c36]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-[#e3ecff]">{o.id}</span>
                  <span className={`chip ${STATUS_CHIP[o.condition]}`}>{o.condition}</span>
                  <span className="ml-auto text-[10px] font-mono text-[#f5a623]">Risk {o.riskScore}</span>
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px] font-mono">
                  <div><span className="text-[#6b7a98]">Type:</span> <span className="text-[#c7d3e6]">{o.type}</span></div>
                  <div><span className="text-[#6b7a98]">KM:</span> <span className="text-[#c7d3e6]">{o.km}</span></div>
                  <div><span className="text-[#6b7a98]">Mast:</span> <span className="text-[#c7d3e6]">{o.mastNo}</span></div>
                  <div><span className="text-[#6b7a98]">Voltage:</span> <span className="text-[#c7d3e6]">{o.voltage} kV</span></div>
                  <div><span className="text-[#6b7a98]">Wire Ht:</span> <span className="text-[#c7d3e6]">{o.contactWireHeight}m</span></div>
                  <div><span className="text-[#6b7a98]">Tension:</span> <span className="text-[#c7d3e6]">{o.tension} kN</span></div>
                </div>
                {o.faults.length > 0 && (
                  <div className="mt-1.5">
                    <div className="text-[10px] text-[#e53935] font-mono">Faults:</div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {o.faults.map(f => <span key={f} className="chip chip-red" style={{ fontSize: 9 }}>{f}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
