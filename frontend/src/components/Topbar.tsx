import { useEffect, useState } from 'react';
import { Bell, Search, ShieldCheck, Wifi } from 'lucide-react';
import { alerts, kpiMetrics } from '../lib/data';

function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return t;
}

export default function Topbar({ subtitle }: { subtitle?: string }) {
  const t = useClock();
  const time = t.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = t.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const unack = alerts.filter(a => !a.acknowledged).length;
  const critical = alerts.filter(a => a.level === 'critical').length;

  return (
    <header className="h-14 shrink-0 bg-[#050b1a] border-b border-[#1e2a44] flex items-center justify-between px-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex flex-col leading-tight min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6b7a98] uppercase font-mono tracking-[0.2em]">Delhi Division · NR</span>
            <span className="chip chip-amber" style={{ padding: '1px 6px', fontSize: 9 }}>PROTOTYPE ENVIRONMENT</span>
          </div>
          <div className="text-[13px] text-[#e3ecff] font-semibold truncate">
            {subtitle || 'Railway Command & Intelligence Platform'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-[#0d1c36] border border-[#1e2a44] rounded-sm">
          <Search size={12} className="text-[#6b7a98]" />
          <input
            placeholder="Search trains, assets, locations, work orders…"
            className="bg-transparent text-[11px] text-[#c7d3e6] placeholder-[#6b7a98] outline-none w-[260px] font-mono"
          />
          <span className="kbd">⌘K</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#0d1c36] border border-[#1e2a44] rounded-sm">
          <Wifi size={12} className="text-[#2ecc71]" />
          <span className="text-[10px] text-[#c7d3e6] font-mono">TMS</span>
          <span className="w-px h-3 bg-[#1e2a44]" />
          <Wifi size={12} className="text-[#2ecc71]" />
          <span className="text-[10px] text-[#c7d3e6] font-mono">SMMS</span>
          <span className="w-px h-3 bg-[#1e2a44]" />
          <Wifi size={12} className="text-[#f5a623]" />
          <span className="text-[10px] text-[#c7d3e6] font-mono">TDMS</span>
        </div>

        <div className="flex items-center gap-2 px-2 py-1 bg-[#0d1c36] border border-[#1e2a44] rounded-sm">
          <ShieldCheck size={12} className="text-[#2ecc71]" />
          <span className="text-[10px] text-[#c7d3e6] font-mono">DECISION-SUPPORT MODE</span>
        </div>

        <button className="relative flex items-center gap-1.5 px-2 py-1 bg-[#0d1c36] border border-[#1e2a44] rounded-sm hover:bg-[#112347]">
          <Bell size={12} className="text-[#f5a623]" />
          <span className="text-[10px] text-[#c7d3e6] font-mono">{unack} unack</span>
          {critical > 0 && (
            <span className="ml-1 px-1.5 text-[9px] bg-[#e53935] text-white rounded-sm font-mono">{critical} CRIT</span>
          )}
        </button>

        <div className="flex flex-col items-end leading-tight pl-2 ml-1 border-l border-[#1e2a44]">
          <div className="text-[12px] text-[#e3ecff] font-mono tabular-nums">{time}</div>
          <div className="text-[9px] text-[#6b7a98] font-mono">{date} · IST</div>
        </div>

        <div className="hidden md:flex flex-col items-end leading-tight">
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Trains · {kpiMetrics.activeTrains}</div>
          <div className="text-[9px] text-[#f5a623] font-mono">{kpiMetrics.delayedTrains} delayed</div>
        </div>
      </div>
    </header>
  );
}
