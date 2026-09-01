import { useState, useRef, useEffect } from 'react';
import { Send, X, Sparkles, ChevronRight } from 'lucide-react';
import { alerts, blocks, defects, inspections, riskRecords, sections, signals, stations, tracks, trains, workOrders } from '../lib/data';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: { label: string; id: string }[];
}

const STARTERS = [
  'Which track sections have the highest risk?',
  'Why is KM 124/5 critical?',
  'Which maintenance jobs are overdue?',
  'Which trains are affected by BLK-DLI-2026-0831-03?',
  'What assets are due for inspection?',
  'Show signalling faults near KM 124/5.',
];

function answerAI(q: string): Message {
  const ql = q.toLowerCase();
  const cites: { label: string; id: string }[] = [];

  if (ql.includes('highest risk') || ql.includes('high risk') || ql.includes('risk')) {
    const sorted = [...riskRecords].sort((a, b) => b.score - a.score);
    return {
      role: 'assistant',
      content:
        `Top risk locations (0–100 scale, from demonstration dataset):\n\n` +
        sorted.slice(0, 5).map(r =>
          `• ${r.domain} · ${r.location} — Risk ${r.score}\n  ${r.reasons[0]}\n  → ${r.recommendation.split('—')[0].trim()}`
        ).join('\n\n'),
      citations: sorted.slice(0, 5).map(r => ({ label: r.domain, id: r.assetId || r.location })),
    };
  }

  if (ql.includes('124/5') || ql.includes('124/4') || ql.includes('124/7') || ql.includes('km 124')) {
    const track = tracks.find(t => t.km.startsWith('124/'));
    const sig = signals.find(s => s.km.startsWith('124/5'));
    const rr = riskRecords.find(r => r.location.includes('124/5'));
    return {
      role: 'assistant',
      content:
        `Location Intelligence — KM 124/5 (SEC-DLI-GZB)\n\n` +
        `Track ${track?.id}: condition ${track?.condition.toUpperCase()}, gauge widened 6mm at 124/5, ballast cushion 90mm.\n` +
        `Signal ${sig?.id}: aspect reliability issue — 8 aspect drops in 30 days.\n` +
        `Combined AI risk score: ${rr?.score}/100.\n\n` +
        `Why critical:\n${rr?.reasons.map(r => `  • ${r}`).join('\n')}\n\n` +
        `Recommendation:\n${rr?.recommendation}\n\n` +
        `(AI decision support — final operational authority rests with Section Controller and Sr.DSTE/DLI.)`,
      citations: [
        { label: 'Track', id: track?.id || '' },
        { label: 'Signal', id: sig?.id || '' },
        { label: 'Risk', id: rr?.domain || '' },
      ],
    };
  }

  if (ql.includes('overdue') && (ql.includes('maint') || ql.includes('work'))) {
    const overdue = workOrders.filter(w => w.status === 'OVERDUE' || w.status === 'BLOCKED');
    return {
      role: 'assistant',
      content:
        `Overdue/Blocked work orders (${overdue.length}):\n\n` +
        overdue.map(w =>
          `• ${w.id} · ${w.assetType} · ${w.assetKm}\n  Status: ${w.status}\n  Team: ${w.team}\n  Problem: ${w.problem}`
        ).join('\n\n') +
        `\n\nDecision support: P1 overdue items dominate at KM 124/5 corridor. AI recommends combining track+OHE+signalling works in a single block on 2026-03-08.`,
      citations: overdue.map(w => ({ label: w.assetType, id: w.id })),
    };
  }

  if (ql.includes('affected') && ql.includes('train')) {
    const blk = blocks.find(b => b.id === 'BLK-DLI-2026-0831-03') || blocks[0];
    const tlist = blk.affectedTrains.map(tn => trains.find(t => t.number === tn)?.name || tn).join(', ');
    return {
      role: 'assistant',
      content:
        `Block ${blk.id} (${blk.section}, KM ${blk.fromKm} – ${blk.toKm}, ${blk.track}):\n\n` +
        `Affected trains (${blk.affectedTrains.length}): ${tlist}\n\n` +
        `Affected assets: ${blk.affectedAssets.join(', ')}\n\n` +
        `Estimated cumulative delay: ~35 minutes on UP corridor.\n` +
        `AI suggests 13:45–16:45 alternate window if Rajdhani slack available.`,
      citations: [{ label: 'Block', id: blk.id }],
    };
  }

  if (ql.includes('due') && ql.includes('inspection')) {
    const due = inspections.filter(i => i.status === 'DUE' || i.status === 'OVERDUE' || i.status === 'UPCOMING');
    return {
      role: 'assistant',
      content:
        `Inspections in next 14 days (${due.length}):\n\n` +
        due.map(i => `• ${i.id} · ${i.assetType} · ${i.assetKm} · ${i.status} · ${i.scheduledDate}`).join('\n') +
        `\n\nDepartment: ${[...new Set(due.map(d => d.department))].join(', ')}`,
      citations: due.map(i => ({ label: i.assetType, id: i.id })),
    };
  }

  if (ql.includes('signal')) {
    const faults = signals.filter(s => s.faults.length > 0);
    return {
      role: 'assistant',
      content:
        `Active signalling faults (${faults.length}):\n\n` +
        faults.map(s => `• ${s.id} @ KM ${s.km} · ${s.type} · status ${s.status.toUpperCase()}\n  Aspect: ${s.aspect} · Faults: ${s.faults.join(', ')}`).join('\n\n'),
      citations: faults.map(s => ({ label: 'Signal', id: s.id })),
    };
  }

  if (ql.includes('defect')) {
    return {
      role: 'assistant',
      content: `Active defects (${defects.length}):\n\n` +
        defects.slice(0, 6).map(d => `• ${d.id} · ${d.assetType} @ ${d.assetKm} · ${d.severity.toUpperCase()}\n  ${d.category} — ${d.description}`).join('\n\n'),
      citations: defects.slice(0, 6).map(d => ({ label: d.assetType, id: d.id })),
    };
  }

  if (ql.includes('alert')) {
    return {
      role: 'assistant',
      content: `Active alerts (${alerts.length}):\n\n` +
        alerts.slice(0, 6).map(a => `• [${a.level.toUpperCase()}] ${a.title}\n  ${a.detail}`).join('\n\n'),
      citations: alerts.slice(0, 6).map(a => ({ label: a.domain, id: a.id })),
    };
  }

  if (ql.includes('station') || ql.includes('where')) {
    return {
      role: 'assistant',
      content: `Sections in scope (${sections.length}):\n\n` +
        sections.map(s => `• ${s.code} — ${s.name} · ${s.km} km · ${s.electrified ? 'Electrified' : 'Non-electrified'} · max ${s.maxSpeed} km/h`).join('\n') +
        `\n\nStations: ${stations.map(s => s.code).join(', ')}`,
      citations: sections.map(s => ({ label: 'Section', id: s.code })),
    };
  }

  return {
    role: 'assistant',
    content:
      `I'm RAILNET AI — I work over the platform's synthetic relational dataset (TMS, TDMS, SMMS, COA, GIS, Inspections, Maintenance, Blocks).\n\n` +
      `Try asking:\n` +
      STARTERS.map(s => `• ${s}`).join('\n') +
      `\n\nI never fabricate railway facts outside this dataset, and I never independently control safety or operations.`,
  };
}

export default function AIAssistant({ open, onClose, contextLocation }: { open: boolean; onClose: () => void; contextLocation?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello — I am the RAILNET AI assistant. I work over the platform's TMS / TDMS / SMMS / COA / GIS / Inspection / Maintenance / Block datasets.${contextLocation ? `\n\nContext location: ${contextLocation}.` : ''}\n\nI am decision-support only — I never independently control railway safety or operations. Ask me about risks, inspections, delays, blocks, or any asset.`
    }
  ]);
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, open]);

  if (!open) return null;

  const send = () => {
    if (!input.trim()) return;
    const u = input.trim();
    setMessages(m => [...m, { role: 'user', content: u }]);
    setInput('');
    setTimeout(() => setMessages(m => [...m, answerAI(u)]), 220);
  };

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[420px] max-w-[92vw] h-[540px] max-h-[80vh] panel flex flex-col overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2a44] bg-[#0d1c36]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#f5a623]" />
          <div>
            <div className="text-[12px] font-semibold text-[#e3ecff]">RAILNET AI Assistant</div>
            <div className="text-[9px] text-[#6b7a98] font-mono uppercase tracking-wider">Decision Support · Live Data Scope</div>
          </div>
        </div>
        <button onClick={onClose} className="text-[#6b7a98] hover:text-white"><X size={14} /></button>
      </div>

      <div ref={ref} className="flex-1 overflow-y-auto scroll-thin p-3 space-y-2.5 bg-dot">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] text-[12px] leading-relaxed px-3 py-2 rounded-sm whitespace-pre-line ${
              m.role === 'user'
                ? 'bg-[#112347] border border-[#2a3650] text-[#e3ecff]'
                : 'bg-[#081428] border border-[#1e2a44] text-[#c7d3e6]'
            }`}>
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1 mb-1.5 pb-1 border-b border-[#1e2a44]">
                  <Sparkles size={10} className="text-[#f5a623]" />
                  <span className="text-[9px] text-[#f5a623] font-mono uppercase tracking-wider">AI · Decision Support</span>
                </div>
              )}
              {m.content}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1e2a44] flex flex-wrap gap-1">
                  {m.citations.map((c, j) => (
                    <span key={j} className="chip chip-grey" style={{ fontSize: 9 }}>{c.label}: {c.id}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-[#1e2a44]">
        <div className="flex flex-wrap gap-1 mb-2">
          {STARTERS.slice(0, 3).map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); }}
              className="text-[10px] text-[#a3b0cc] hover:text-[#e3ecff] border border-[#1e2a44] px-2 py-0.5 rounded-sm flex items-center gap-1 hover:bg-[#112347]"
            >
              <ChevronRight size={9} /> {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask RAILNET AI…"
            className="flex-1 bg-[#081428] border border-[#1e2a44] px-2 py-1.5 text-[12px] text-[#e3ecff] placeholder-[#6b7a98] focus:border-[#2196f3] outline-none font-mono"
          />
          <button onClick={send} className="px-2 py-1.5 bg-[#2196f3] hover:bg-[#1976d2] text-white text-[11px] flex items-center gap-1 rounded-sm">
            <Send size={11} /> Send
          </button>
        </div>
        <div className="text-[9px] text-[#6b7a98] mt-1.5 font-mono">
          AI is decision-support only · never controls safety or operations
        </div>
      </div>
    </div>
  );
}
