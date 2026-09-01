import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Train, Layers, Zap, Activity, Building2,
  ClipboardCheck, Wrench, Calendar, Brain, AlertTriangle, FileBarChart2,
  Database, Heart, Settings, Radar
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Command Centre', icon: LayoutDashboard },
  { to: '/map', label: 'Live Railway Map', icon: Map },
  { to: '/radar', label: 'Rail Radar', icon: Radar },
  { to: '/coa', label: 'Train Movement', icon: Train },
  { to: '/tms', label: 'TMS / Track', icon: Layers },
  { to: '/tdms', label: 'TDMS / Traction', icon: Zap },
  { to: '/smms', label: 'SMMS / Signalling', icon: Activity },
  { to: '/bridges', label: 'Bridges & Structures', icon: Building2 },
  { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/block-planner', label: 'Block Planner', icon: Calendar },
  { to: '/assets', label: 'Asset Intelligence', icon: Database },
  { to: '/risk', label: 'AI Risk Engine', icon: Brain },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/integration', label: 'Data Integration', icon: Database },
  { to: '/system-health', label: 'System Health', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-[#050b1a] border-r border-[#1e2a44] flex flex-col">
      <div className="px-3 py-3 border-b border-[#1e2a44] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-[#1e40af] to-[#0a1a3a] flex items-center justify-center border border-[#2a3650]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="9" width="11" height="6" rx="0.5" fill="#5fb1ff" />
              <rect x="14" y="10" width="3" height="4" fill="#f5a623" />
              <rect x="6" y="10" width="3" height="2" fill="#050b1a" />
              <rect x="10" y="10" width="3" height="2" fill="#050b1a" />
              <line x1="4" y1="17" x2="20" y2="17" stroke="#5fb1ff" strokeWidth="1.4" />
              <line x1="4" y1="15" x2="20" y2="15" stroke="#5fb1ff" strokeWidth="0.6" opacity="0.6" />
              <line x1="9" y1="9" x2="9" y2="7" stroke="#f5a623" strokeWidth="0.8" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold tracking-wider text-[#e3ecff] leading-none">RAILNET <span className="text-[#f5a623]">AI</span></div>
            <div className="text-[8px] text-[#6b7a98] tracking-[0.16em] uppercase font-mono mt-0.5">Railway Intelligence</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
        <span className="text-[9px] text-[#6b7a98] font-mono tracking-[0.18em] uppercase">Section · Delhi</span>
        <span className="chip chip-grey" style={{ padding: '1px 6px', fontSize: 9 }}>DEMO</span>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin py-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-[12px] border-l-2 transition-all
              ${isActive
                ? 'bg-[#0d1c36] border-l-[#f5a623] text-[#e3ecff]'
                : 'border-l-transparent text-[#a3b0cc] hover:bg-[#0d1c36] hover:text-[#e3ecff]'}`
            }
          >
            <Icon size={14} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-2 border-t border-[#1e2a44]">
        <div className="text-[9px] text-[#6b7a98] font-mono tracking-[0.15em] uppercase mb-1">System</div>
        <div className="flex items-center justify-between text-[10px] text-[#a3b0cc] font-mono">
          <span>v0.1.0 · build 2026.03</span>
        </div>
        <div className="text-[9px] text-[#6b7a98] mt-1.5 leading-tight">
          All data is <span className="text-[#f5a623]">synthetic</span> and for demonstration only.
        </div>
      </div>
    </aside>
  );
}
