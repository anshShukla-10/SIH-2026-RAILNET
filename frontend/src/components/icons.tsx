// Small utility helpers reused across pages
import { Activity, AlertTriangle, Bell, CheckCircle2, Clock, Cpu, Wrench } from 'lucide-react';
import type { Status } from '../lib/types';

export const STATUS_COLORS: Record<Status, string> = {
  normal: '#2ecc71',
  warning: '#f5a623',
  critical: '#e53935',
  info: '#2196f3',
};

export const STATUS_CHIP: Record<Status, string> = {
  normal: 'chip chip-green',
  warning: 'chip chip-amber',
  critical: 'chip chip-red',
  info: 'chip chip-blue',
};

export const STATUS_LABEL: Record<Status, string> = {
  normal: 'NORMAL',
  warning: 'WARNING',
  critical: 'CRITICAL',
  info: 'INFO',
};

export const DomainIcon = ({ domain, size = 14 }: { domain: string; size?: number }) => {
  const d = domain.toLowerCase();
  if (d.includes('sig')) return <Activity size={size} />;
  if (d.includes('ohe') || d.includes('traction')) return <Cpu size={size} />;
  if (d.includes('maint')) return <Wrench size={size} />;
  if (d.includes('track')) return <Activity size={size} />;
  if (d.includes('bridge')) return <Wrench size={size} />;
  if (d.includes('alert')) return <Bell size={size} />;
  if (d.includes('train')) return <CheckCircle2 size={size} />;
  return <Clock size={size} />;
};

export function StatusDot({ status, pulse = false }: { status: Status; pulse?: boolean }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: STATUS_COLORS[status], boxShadow: `0 0 6px ${STATUS_COLORS[status]}99` }}
      />
      {pulse && (
        <span
          className="pulse-ring absolute inline-block w-2 h-2 rounded-full"
          style={{ background: STATUS_COLORS[status] }}
        />
      )}
    </span>
  );
}

export function StatusPill({ status, children }: { status: Status; children?: React.ReactNode }) {
  return <span className={STATUS_CHIP[status]}>{STATUS_LABEL[status]}{children ? ` · ${children}` : ''}</span>;
}

export function Metric({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="panel p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7a98] font-mono">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-2xl font-bold text-[#e3ecff] tabular-nums" style={{ color: accent }}>{value}</div>
        {sub && <div className="text-[10px] text-[#6b7a98] font-mono">{sub}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3 pb-2 border-b border-[#1e2a44]">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[#6b7a98] font-mono">Section</div>
        <h2 className="text-lg font-semibold text-[#e3ecff]">{title}</h2>
        {subtitle && <div className="text-xs text-[#6b7a98] mt-0.5">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
