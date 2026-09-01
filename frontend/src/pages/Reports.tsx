import { FileBarChart2, Download } from 'lucide-react';

const reports = [
  { id: 'RPT-001', title: 'Daily Command Centre Summary', desc: 'Active trains, delays, blocks, top risks — auto-generated 06:00 IST.', schedule: 'Daily', lastRun: '2026-03-05 06:00', category: 'Operations' },
  { id: 'RPT-002', title: 'Asset Risk Heatmap', desc: 'Risk score distribution across Track / OHE / Signalling / Bridge domains.', schedule: 'On-demand', lastRun: '2026-03-04 22:14', category: 'AI / Risk' },
  { id: 'RPT-003', title: 'Block Utilisation — Last 30 days', desc: 'Block window utilisation by section, conflicts, traffic impact.', schedule: 'Monthly', lastRun: '2026-03-01 08:00', category: 'Operations' },
  { id: 'RPT-004', title: 'Inspection Compliance', desc: 'Overdue / due / completed inspections by department.', schedule: 'Weekly', lastRun: '2026-03-03 09:00', category: 'Maintenance' },
  { id: 'RPT-005', title: 'Maintenance KPIs', desc: 'P1 closure time, overdue WOs, team performance.', schedule: 'Weekly', lastRun: '2026-03-03 09:00', category: 'Maintenance' },
  { id: 'RPT-006', title: 'Train Delay Root Cause (AI)', desc: 'Delay attribution by section, infrastructure, weather, congestion.', schedule: 'Daily', lastRun: '2026-03-05 06:00', category: 'AI / Operations' },
  { id: 'RPT-007', title: 'Bridge Inspection Summary', desc: 'Biennial inspections, fatigue cracks, scour, bearing condition.', schedule: 'Quarterly', lastRun: '2026-01-31 09:00', category: 'Bridges' },
  { id: 'RPT-008', title: 'OHE Power Block Compliance', desc: 'Power block requests vs approvals, energy not-supplied minutes.', schedule: 'Monthly', lastRun: '2026-03-01 09:00', category: 'Traction' },
];

export default function Reports() {
  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Reports</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Operational, Maintenance & AI Reports</h1>
        </div>
        <span className="chip chip-amber">REPORTS DEMO</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {reports.map(r => (
            <div key={r.id} className="panel rounded-sm flex flex-col">
              <div className="px-3 py-2 border-b border-[#1e2a44] flex items-center gap-2">
                <FileBarChart2 size={14} className="text-[#5fb1ff]" />
                <span className="text-[10px] text-[#5fb1ff] font-mono">{r.id}</span>
                <span className="ml-auto text-[9px] text-[#6b7a98] font-mono">{r.category}</span>
              </div>
              <div className="p-3 flex-1">
                <div className="text-[13px] text-[#e3ecff] font-semibold">{r.title}</div>
                <div className="text-[11px] text-[#a3b0cc] mt-1.5 leading-snug">{r.desc}</div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-[#081428] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="text-[9px] text-[#6b7a98] uppercase font-mono">Schedule</div>
                    <div className="text-[11px] text-[#e3ecff] font-mono">{r.schedule}</div>
                  </div>
                  <div className="bg-[#081428] border border-[#1e2a44] rounded-sm p-1.5">
                    <div className="text-[9px] text-[#6b7a98] uppercase font-mono">Last run</div>
                    <div className="text-[11px] text-[#e3ecff] font-mono">{r.lastRun}</div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-t border-[#1e2a44] flex items-center gap-2">
                <button className="flex-1 px-2 py-1.5 bg-[#112347] hover:bg-[#1a2c5a] text-[#e3ecff] text-[11px] flex items-center justify-center gap-1.5">
                  <Download size={11} /> Download
                </button>
                <button className="flex-1 px-2 py-1.5 bg-[#081428] hover:bg-[#0d1c36] border border-[#1e2a44] text-[#a3b0cc] text-[11px]">Schedule →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
