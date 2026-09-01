import { useMemo, useState } from 'react';
import { Bell, CheckCircle2, ShieldAlert } from 'lucide-react';
import { alerts } from '../lib/data';
import { STATUS_CHIP, StatusDot } from '../components/icons';

export default function Alerts() {
  const [filter, setFilter] = useState<string>('ALL');
  const filtered = useMemo(() => filter === 'ALL' ? alerts : alerts.filter(a => a.level === filter), [filter]);
  const counts = useMemo(() => ({
    ALL: alerts.length,
    critical: alerts.filter(a => a.level === 'critical').length,
    warning: alerts.filter(a => a.level === 'warning').length,
    info: alerts.filter(a => a.level === 'info').length,
  }), []);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Alerts</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Operational Alerts & Notifications</h1>
        </div>
        <span className="chip chip-amber">DEMO FEED</span>
      </div>

      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center gap-2">
        {(['ALL', 'critical', 'warning', 'info'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 text-[10px] font-mono uppercase tracking-wider rounded-sm flex items-center gap-1.5 ${filter === f ? 'bg-[#112347] border border-[#f5a623] text-[#e3ecff]' : 'bg-[#081428] border border-[#1e2a44] text-[#a3b0cc]'}`}
          >
            {f}
            <span className={`px-1 rounded-sm text-[9px] ${
              f === 'critical' ? 'bg-[#e53935] text-white' :
              f === 'warning' ? 'bg-[#f5a623] text-[#050b1a]' :
              f === 'info' ? 'bg-[#2196f3] text-white' :
              'bg-[#2a3650] text-[#c7d3e6]'
            }`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
        {filtered.map(a => (
          <div key={a.id} className={`px-4 py-3 hover:bg-[#0d1c36] ${a.level === 'critical' ? 'bg-[rgba(229,57,53,0.04)]' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
              <StatusDot status={a.level} pulse={a.level === 'critical' && !a.acknowledged} />
              <span className={`chip ${STATUS_CHIP[a.level]}`} style={{ fontSize: 9 }}>{a.level}</span>
              <span className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">{a.domain}</span>
              <span className="text-[10px] text-[#6b7a98] font-mono ml-auto">{a.ts}</span>
            </div>
            <div className="text-[13px] text-[#e3ecff] font-medium">{a.title}</div>
            <div className="text-[12px] text-[#a3b0cc] mt-0.5">{a.detail}</div>
            <div className="flex items-center gap-2 mt-2">
              {a.relatedId && <span className="chip chip-grey" style={{ fontSize: 9 }}>ID: {a.relatedId}</span>}
              <button className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-sm ${a.acknowledged ? 'bg-[#1a2438] text-[#6b7a98]' : 'bg-[#2196f3] hover:bg-[#1976d2] text-white'}`}>
                <CheckCircle2 size={10} /> {a.acknowledged ? 'Acknowledged' : 'Acknowledge'}
              </button>
              <button className="text-[10px] px-2 py-0.5 bg-[#112347] hover:bg-[#1a2c5a] text-[#e3ecff] rounded-sm">View related →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
