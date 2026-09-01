import { useMemo, useState } from 'react';
import { Wrench, Plus } from 'lucide-react';
import { defects, inspections, workOrders } from '../lib/data';
import { SectionHeader, STATUS_CHIP } from '../components/icons';

const STATUS = ['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'OVERDUE'] as const;
const STATUS_COLOR: Record<string, string> = {
  PLANNED: '#2196f3',
  ASSIGNED: '#00bcd4',
  IN_PROGRESS: '#f5a623',
  BLOCKED: '#e53935',
  COMPLETED: '#2ecc71',
  OVERDUE: '#e53935',
};

export default function Maintenance() {
  const [filter, setFilter] = useState<string>('ALL');
  const filtered = useMemo(() => filter === 'ALL' ? workOrders : workOrders.filter(w => w.status === filter), [filter]);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Maintenance</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Work Order Lifecycle · Installation → Inspection → Defect → Maintenance → Repair → Re-inspection</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1.5 bg-[#2196f3] hover:bg-[#1976d2] text-white text-[11px] flex items-center gap-1">
            <Plus size={11} /> New Work Order
          </button>
          <span className="chip chip-amber">MAINTENANCE DEMO</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-2 p-2 overflow-hidden">
        {/* Lifecycle + Status */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-2 overflow-hidden">
          <div className="panel p-3">
            <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-2">Asset Lifecycle</div>
            <div className="space-y-0.5">
              {['Installation', 'Inspection', 'Defect', 'Maintenance', 'Repair', 'Re-inspection'].map((s, i, arr) => (
                <div key={s} className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="w-4 h-4 rounded-full bg-[#112347] border border-[#2a3650] flex items-center justify-center text-[9px] text-[#5fb1ff]">{i + 1}</span>
                  <span className="text-[#c7d3e6]">{s}</span>
                  {i < arr.length - 1 && <span className="text-[#6b7a98] ml-auto">→</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="panel flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 border-b border-[#1e2a44]"><SectionHeader title="Filter by Status" /></div>
            <div className="p-2 space-y-1">
              {['ALL', ...STATUS].map(s => {
                const count = s === 'ALL' ? workOrders.length : workOrders.filter(w => w.status === s).length;
                const isActive = filter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`w-full text-left px-2 py-1.5 border rounded-sm flex items-center gap-2 ${
                      isActive ? 'border-[#f5a623] bg-[#112347]' : 'border-[#1e2a44] bg-[#081428] hover:bg-[#0d1c36]'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-[#e3ecff]">{s.replace('_', ' ')}</span>
                    <span className="ml-auto text-[12px] font-bold" style={{ color: STATUS_COLOR[s] || '#5fb1ff' }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Work Orders table */}
        <div className="col-span-12 lg:col-span-9 panel flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#1e2a44] flex items-center justify-between">
            <SectionHeader title={`Work Orders (${filtered.length})`} subtitle="Sorted by priority P1 first" />
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin">
            <table className="w-full text-[11px]">
              <thead className="bg-[#081428] sticky top-0 border-b border-[#1e2a44]">
                <tr className="text-[9px] uppercase tracking-wider text-[#6b7a98] font-mono text-left">
                  <th className="px-2 py-1.5">ID</th>
                  <th className="px-2 py-1.5">P</th>
                  <th className="px-2 py-1.5">Asset</th>
                  <th className="px-2 py-1.5">KM</th>
                  <th className="px-2 py-1.5">Problem</th>
                  <th className="px-2 py-1.5">Team</th>
                  <th className="px-2 py-1.5">Window</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2a44]">
                {filtered.map(w => (
                  <tr key={w.id} className="hover:bg-[#0d1c36]">
                    <td className="px-2 py-2 font-mono text-[#5fb1ff]">{w.id}</td>
                    <td className="px-2 py-2"><span className={`chip ${w.priority === 'P1' ? 'chip-red' : w.priority === 'P2' ? 'chip-amber' : 'chip-blue'}`}>{w.priority}</span></td>
                    <td className="px-2 py-2 font-mono text-[10px]">
                      <div className="text-[#e3ecff]">{w.assetId}</div>
                      <div className="text-[#6b7a98]">{w.assetType}</div>
                    </td>
                    <td className="px-2 py-2 font-mono text-[#a3b0cc]">{w.assetKm}</td>
                    <td className="px-2 py-2 text-[#c7d3e6] max-w-[260px]">{w.problem}</td>
                    <td className="px-2 py-2 text-[10px] text-[#a3b0cc]">{w.team}</td>
                    <td className="px-2 py-2 font-mono text-[10px] text-[#c7d3e6]">
                      {w.plannedStart}<br />
                      <span className="text-[#6b7a98]">→ {w.plannedEnd}</span>
                    </td>
                    <td className="px-2 py-2"><span className={`chip ${STATUS_CHIP[w.status === 'OVERDUE' || w.status === 'BLOCKED' ? 'critical' : w.status === 'IN_PROGRESS' ? 'warning' : w.status === 'COMPLETED' ? 'normal' : 'info']}`}>{w.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
