// RAILNET AI original logo — train + track + connectivity
// Not an official Indian Railways emblem. Prototype only.

interface Props {
  size?: number;
  variant?: 'full' | 'mark';
  theme?: 'dark' | 'light';
}

export default function RailnetLogo({ size = 32, variant = 'full', theme = 'dark' }: Props) {
  const stroke = theme === 'dark' ? '#5fb1ff' : '#1d4ed8';
  const accent = theme === 'dark' ? '#f5a623' : '#b45309';
  const track = theme === 'dark' ? '#2a3650' : '#475569';
  const textMain = theme === 'dark' ? '#e3ecff' : '#0f172a';
  const textSub = theme === 'dark' ? '#6b7a98' : '#64748b';

  return (
    <div className="flex items-center gap-3 select-none">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer ring — connectivity */}
        <circle cx="32" cy="32" r="28" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
        <circle cx="32" cy="32" r="22" stroke={stroke} strokeWidth="0.8" opacity="0.4" />

        {/* Network nodes */}
        {[
          [32, 6], [55, 22], [55, 42], [32, 58], [9, 42], [9, 22]
        ].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="1.6" fill={stroke} />
            <circle cx={x} cy={y} r="3" stroke={stroke} strokeWidth="0.6" fill="none" opacity="0.4" />
          </g>
        ))}

        {/* Tracks (parallel rails) */}
        <line x1="10" y1="36" x2="54" y2="36" stroke={track} strokeWidth="3.2" strokeLinecap="round" />
        <line x1="10" y1="42" x2="54" y2="42" stroke={track} strokeWidth="3.2" strokeLinecap="round" />
        {/* Sleepers */}
        {[14, 20, 26, 32, 38, 44, 50].map((x) => (
          <rect key={x} x={x - 1} y="33" width="2" height="12" fill={track} opacity="0.55" />
        ))}

        {/* Train silhouette — locomotive */}
        <g>
          <rect x="20" y="22" width="24" height="12" rx="1" fill={stroke} />
          <rect x="40" y="24" width="6" height="8" fill={accent} />
          <rect x="22" y="24" width="6" height="4" fill={theme === 'dark' ? '#050b1a' : '#fff'} opacity="0.7" />
          <rect x="30" y="24" width="6" height="4" fill={theme === 'dark' ? '#050b1a' : '#fff'} opacity="0.7" />
          {/* Pantograph */}
          <line x1="28" y1="22" x2="28" y2="16" stroke={accent} strokeWidth="1" />
          <line x1="24" y1="16" x2="32" y2="16" stroke={accent} strokeWidth="1.4" />
        </g>

        {/* Headlight beam */}
        <line x1="46" y1="28" x2="58" y2="22" stroke={accent} strokeWidth="0.8" opacity="0.6" />
        <line x1="46" y1="28" x2="58" y2="34" stroke={accent} strokeWidth="0.8" opacity="0.6" />
      </svg>
      {variant === 'full' && (
        <div className="leading-tight">
          <div className="flex items-baseline gap-1">
            <span style={{ color: textMain }} className="font-bold text-[15px] tracking-wider">RAILNET</span>
            <span style={{ color: accent }} className="font-bold text-[15px] tracking-wider">AI</span>
          </div>
          <div style={{ color: textSub }} className="text-[9px] tracking-[0.18em] uppercase font-mono">
            Unified Railway Intelligence
          </div>
        </div>
      )}
    </div>
  );
}
