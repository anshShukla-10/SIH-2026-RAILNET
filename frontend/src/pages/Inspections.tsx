import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { inspections } from '../lib/data';
import { SectionHeader, STATUS_CHIP } from '../components/icons';

const STATUS_GROUPS: { key: string; label: string; status: string; color: string }[] = [
  { key: 'UPCOMING', label: 'Upcoming', status: 'UPCOMING', color: '#00bcd4' },
  { key: 'DUE', label: 'Due', status: 'DUE', color: '#f5a623' },
  { key: 'OVERDUE', label: 'Overdue', status: 'OVERDUE', color: '#e53935' },
  { key: 'CRITICAL', label: 'Critical', status: 'CRITICAL', color: '#e53935' },
  { key: 'COMPLETED', label: 'Completed', status: 'COMPLETED', color: '#2ecc71' },
];

export default function Inspections() {
  const [active, setActive] = useState<string>('OVERDUE');
  const grouped = useMemo(() => {
    const out: Record<string, typeof inspections> = {};
    inspections.forEach(i => {
      out[i.status] = out[i.status] || [];
      out[i.status].push(i);
    });
    return out;
  }, []);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Inspections</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Inspection Management · Connected to Assets & Locations</h1>
        </div>
        <span className="chip chip-amber">INSPECTION DEMO</span>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* STATUS CARDS */}
        <div className="col-span-12 lg:col-span-3 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44]">
            <SectionHeader title="Inspection Status" />
          </div>
          <div className="p-2 space-y-1.5">
            {STATUS_GROUPS.map(g => {
              const count = grouped[g.status]?.length || 0;
              const isActive = active === g.status;
              return (
                <button
                  key={g.key}
                  onClick={() => setActive(g.status)}
                  className={`w-full text-left p-2.5 border rounded-sm transition-all ${
                    isActive ? 'border-[#f5a623] bg-[#112347]' : 'border-[#1e2a44] bg-[#081428] hover:bg-[#0d1c36]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#e3ecff] font-semibold">{g.label}</span>
                    <span className="text-[18px] font-bold tabular-nums" style={{ color: g.color }}>{count}</span>
                  </div>
                  <div className="h-1 mt-1.5 bg-[#1e2a44] rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${Math.min(100, count * 25)}%`, background: g.color }}></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DETAIL */}
        <div className="col-span-12 lg:col-span-9 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <SectionHeader title={active.charAt(0) + active.slice(1).toLowerCase() + ' Inspections'} subtitle={`Linked to asset id, location and section`} />
            <span className="chip chip-blue">{grouped[active]?.length || 0} records</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-[#1e2a44]">
            {(grouped[active] || []).length === 0 && (
              <div className="p-6 text-center text-[#6b7a98] text-[12px]">No inspections in this category.</div>
            )}
            {(grouped[active] || []).map(i => (
              <div key={i.id} className="px-3 py-3 hover:bg-[#0d1c36]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12px] font-mono text-[#5fb1ff]">{i.id}</span>
                  <span className="chip chip-grey" style={{ fontSize: 9 }}>{i.department}</span>
                  <span className={`chip ${STATUS_CHIP[i.status === 'COMPLETED' ? 'normal' : i.status === 'DUE' ? 'warning' : i.status === 'OVERDUE' || i.status === 'CRITICAL' ? 'critical' : 'info']}`} style={{ fontSize: 9 }}>{i.status}</span>
                  <span className="ml-auto text-[10px] text-[#6b7a98] font-mono">{i.scheduledDate}</span>
                </div>
                <div className="grid grid-cols-12 gap-3 text-[11px]">
                  <div className="col-span-12 md:col-span-4">
                    <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Asset</div>
                    <div className="text-[12px] text-[#e3ecff] font-mono">{i.assetId}</div>
                    <div className="text-[10px] text-[#a3b0cc] font-mono">{i.assetType} @ KM {i.assetKm}</div>
                    <div className="text-[10px] text-[#a3b0cc] font-mono">{i.section}</div>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Inspector</div>
                    <div className="text-[12px] text-[#e3ecff]">{i.inspector}</div>
                    <div className="text-[10px] text-[#a3b0cc] font-mono">{i.completedDate ? `Completed ${i.completedDate}` : 'Pending'}</div>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Parameters</div>
                    <div className="text-[10px] font-mono text-[#c7d3e6]">
                      {Object.entries(i.parameters).slice(0, 3).map(([k, v]) => (
                        <div key={k}>{k}: <span className="text-[#e3ecff]">{String(v)}</span></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#c7d3e6] mt-2 italic">"{i.findings}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
