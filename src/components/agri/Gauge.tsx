"use client";

// Compact SVG radial gauge for % available water values.

export function Gauge({
  value,
  threshold,
  label,
  sub,
  size = 132,
}: {
  value: number | null;
  threshold?: number | null;
  label: string;
  sub?: string;
  size?: number;
}) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const unknown = value === null;
  const stroke = 10;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const frac = v / 100;
  const color = unknown ? "#8B9683" : v < (threshold ?? 50) ? "#B3491F" : v < (threshold ?? 50) + 10 ? "#C9971E" : "#2E7F25";

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${label}: ${unknown ? "no data" : `${Math.round(v)} percent`}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        {threshold != null && threshold > 0 && threshold < 100 ? (
          <line
            x1={size / 2 + Math.cos((2 * Math.PI * (1 - threshold / 100)) - Math.PI / 2) * (r + stroke / 2 + 1)}
            y1={size / 2 + Math.sin((2 * Math.PI * (1 - threshold / 100)) - Math.PI / 2) * (r + stroke / 2 + 1)}
            x2={size / 2 + Math.cos((2 * Math.PI * (1 - threshold / 100)) - Math.PI / 2) * (r + stroke / 2 + 5)}
            y2={size / 2 + Math.sin((2 * Math.PI * (1 - threshold / 100)) - Math.PI / 2) * (r + stroke / 2 + 5)}
            stroke="#B3491F"
            strokeWidth={2}
          />
        ) : null}
        <text
          x="50%"
          y="49%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.22}
          fontWeight="700"
          fill="currentColor"
          className="text-foreground"
        >
          {unknown ? "—" : Math.round(v)}
        </text>
        <text x="50%" y="66%" textAnchor="middle" fontSize={size * 0.1} fill="currentColor" className="text-muted-foreground">
          % AWC
        </text>
      </svg>
      <p className="text-xs font-bold uppercase tracking-wider mt-1">{label}</p>
      {sub ? <p className="text-[10px] text-muted-foreground mt-0.5 text-center leading-snug">{sub}</p> : null}
    </div>
  );
}
