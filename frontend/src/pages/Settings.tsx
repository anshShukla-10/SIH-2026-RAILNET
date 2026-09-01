import { useState } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [role, setRole] = useState('Section Controller');
  const [dept, setDept] = useState('Operations');
  const [autoAck, setAutoAck] = useState(false);
  const [aiAssist, setAiAssist] = useState(true);

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">Settings</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Platform Settings · User & Integration</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 max-w-3xl">
        <div className="panel p-4 mb-3">
          <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <SettingsIcon size={12} /> User Profile
          </div>
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div>
              <div className="text-[10px] text-[#6b7a98] font-mono uppercase mb-1">Role</div>
              <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono">
                <option>Section Controller</option>
                <option>DEN (North)/DLI</option>
                <option>Sr.DSTE/DLI</option>
                <option>Sr.TRD/DEE</option>
                <option>Bridge Engineer</option>
                <option>Divisional Engineer</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-[#6b7a98] font-mono uppercase mb-1">Department</div>
              <select value={dept} onChange={e => setDept(e.target.value)} className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] font-mono">
                <option>Operations</option>
                <option>TRACK</option>
                <option>TRD</option>
                <option>SIGNALLING</option>
                <option>BRIDGE</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-[#6b7a98] font-mono uppercase mb-1">Section</div>
              <input value="SEC-DLI-GZB · Delhi Jn – Ghaziabad" disabled className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#a3b0cc] font-mono" />
            </div>
            <div>
              <div className="text-[10px] text-[#6b7a98] font-mono uppercase mb-1">User ID</div>
              <input value="usr.ctrl.dli.0142" disabled className="w-full bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#a3b0cc] font-mono" />
            </div>
          </div>
        </div>

        <div className="panel p-4 mb-3">
          <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-3">Behaviour</div>
          <div className="space-y-2">
            {[
              { l: 'Auto-acknowledge info alerts after 5 minutes', v: autoAck, set: setAutoAck },
              { l: 'AI Assistant enabled (decision support)', v: aiAssist, set: setAiAssist },
              { l: 'Block conflict checks run on schedule change', v: true, set: () => {} },
              { l: 'Inspection reminders 24h before due date', v: true, set: () => {} },
            ].map((s, i) => (
              <label key={i} className="flex items-center gap-2 text-[12px] text-[#c7d3e6] cursor-pointer">
                <input type="checkbox" checked={s.v} onChange={() => s.set(!s.v)} className="appearance-none w-3.5 h-3.5 border border-[#2a3650] rounded-sm checked:bg-[#5fb1ff] checked:border-[#5fb1ff]" />
                <span>{s.l}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="panel p-4 mb-3">
          <div className="text-[10px] text-[#5fb1ff] font-mono uppercase tracking-wider mb-3">Integration Endpoints</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
            {[
              ['TMS API', 'https://tms.internal.nr.railnet/api/v2'],
              ['TDMS API', 'https://tdms.internal.nr.railnet/api/v1'],
              ['SMMS API', 'https://smms.internal.nr.railnet/api/v2'],
              ['COA API', 'https://coa.internal.nr.railnet/api/v3'],
              ['GIS Tile Server', 'https://gis.internal.nr.railnet/tiles/{z}/{x}/{y}.pbf'],
              ['AI Inference', 'https://ai.internal.nr.railnet/v1/infer'],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-2">
                <div className="text-[#6b7a98] text-[10px] uppercase tracking-wider">{k}</div>
                <div className="text-[#5fb1ff] truncate">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-[#2196f3] hover:bg-[#1976d2] text-white text-[12px] flex items-center gap-1.5">
            <Save size={12} /> Save Changes
          </button>
          <button className="px-3 py-2 bg-[#112347] border border-[#2a3650] text-[#e3ecff] text-[12px]">Cancel</button>
        </div>
      </div>
    </div>
  );
}
