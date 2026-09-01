import { Activity, Cpu, Database, Heart, Wifi } from 'lucide-react';

export default function SystemHealth() {
  const services = [
    { name: 'TMS Adapter', status: 'online', uptime: '99.98%', latency: '42ms' },
    { name: 'TDMS Adapter', status: 'online', uptime: '99.91%', latency: '67ms' },
    { name: 'SMMS Adapter', status: 'online', uptime: '99.85%', latency: '55ms' },
    { name: 'COA Adapter', status: 'online', uptime: '99.99%', latency: '38ms' },
    { name: 'GIS Service', status: 'online', uptime: '99.92%', latency: '48ms' },
    { name: 'Common Data Platform', status: 'online', uptime: '99.97%', latency: '24ms' },
    { name: 'AI Inference Engine', status: 'online', uptime: '99.40%', latency: '210ms' },
    { name: 'Alerting Service', status: 'online', uptime: '99.99%', latency: '15ms' },
    { name: 'Report Generator', status: 'online', uptime: '99.95%', latency: '78ms' },
    { name: 'Map Tile Cache', status: 'online', uptime: '99.99%', latency: '12ms' },
  ];

  return (
    <div className="flex flex-col h-full bg-grid bg-[#050b1a] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#1e2a44] flex items-center justify-between bg-[#081428]">
        <div>
          <div className="text-[10px] text-[#6b7a98] font-mono uppercase tracking-wider">System Health</div>
          <h1 className="text-lg font-semibold text-[#e3ecff]">Platform Services & Integration Status</h1>
        </div>
        <span className="chip chip-amber">DEMO HEALTH PANEL</span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { l: 'CPU', v: '32%', icon: Cpu, c: '#2ecc71' },
            { l: 'Memory', v: '4.1 GB', icon: Database, c: '#5fb1ff' },
            { l: 'Network I/O', v: '12 Mbps', icon: Wifi, c: '#00bcd4' },
            { l: 'Heartbeat', v: 'OK', icon: Heart, c: '#2ecc71' },
          ].map(({ l, v, icon: Icon, c }) => (
            <div key={l} className="panel p-3">
              <div className="flex items-center gap-2 text-[10px] text-[#6b7a98] uppercase font-mono tracking-wider">
                <Icon size={12} style={{ color: c }} /> {l}
              </div>
              <div className="text-[20px] font-bold mt-1" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {services.map(s => (
            <div key={s.name} className="bg-[#081428] border border-[#1e2a44] rounded-sm p-3 flex items-center gap-3">
              <Activity size={16} className="text-[#2ecc71]" />
              <div className="flex-1">
                <div className="text-[12px] text-[#e3ecff] font-mono">{s.name}</div>
                <div className="text-[10px] text-[#6b7a98] font-mono">Latency: {s.latency} · Uptime: {s.uptime}</div>
              </div>
              <span className="chip chip-green">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
