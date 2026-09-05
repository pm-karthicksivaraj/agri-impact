"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/client/api";

interface ChartRow {
  label: string;
  rootzone: number;
  surface: number;
  precip: number;
  forecast: boolean;
}

function ChartTooltip({ active, payload, label, threshold }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string;
  threshold: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-border rounded-md bg-card p-3 text-[10px] shadow-lg max-w-[220px]">
      <p className="font-bold uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-1 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{p.value}{p.dataKey === "precip" ? " mm" : " %"}</span>
        </p>
      ))}
      <p className="mt-1.5 text-muted-foreground border-t border-border pt-1.5">
        stress below {threshold}% root-zone AWC
      </p>
    </div>
  );
}

export function MoistureChart({
  series,
  threshold,
  height = 300,
}: {
  series: DailyPoint[];
  threshold: number;
  height?: number;
}) {
  const past = series.filter((p) => p.phase === "past");
  const recentPast = past.slice(-14);
  const forecast = series.filter((p) => p.phase === "forecast").slice(0, 7);
  const rows: ChartRow[] = [...recentPast, ...forecast].map((p) => ({
    label: new Date(p.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    rootzone: p.rootzone,
    surface: p.surface,
    precip: p.precip,
    forecast: p.phase === "forecast",
  }));
  const firstForecastIdx = recentPast.length;
  const firstForecastLabel = rows[firstForecastIdx]?.label;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#8B9683" strokeOpacity={0.2} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "currentColor" }}
            className="text-muted-foreground"
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="pct"
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "currentColor" }}
            className="text-muted-foreground"
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis yAxisId="rain" orientation="right" domain={[0, 80]} hide />
          <Tooltip
            content={<ChartTooltip threshold={threshold} />}
            cursor={{ stroke: "#8B9683", strokeOpacity: 0.4 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 6 }}
            formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
          />
          {firstForecastLabel ? (
            <ReferenceArea x1={firstForecastLabel} x2={rows[rows.length - 1]?.label} yAxisId="pct" fill="#2E7F25" fillOpacity={0.06} />
          ) : null}
          {firstForecastLabel ? (
            <ReferenceLine x={firstForecastLabel} yAxisId="pct" stroke="#8B9683" strokeDasharray="4 4" label={{ value: "today", fontSize: 9, fill: "currentColor", position: "top" }} className="text-muted-foreground" />
          ) : null}
          <ReferenceLine
            yAxisId="pct"
            y={threshold}
            stroke="#B3491F"
            strokeDasharray="6 3"
            label={{ value: `stress < ${threshold}%`, fontSize: 9, fill: "#B3491F", position: "insideBottomRight" }}
          />
          <Bar yAxisId="rain" dataKey="precip" name="rain" fill="#3C8C7C" fillOpacity={0.55} barSize={7} radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="rootzone"
            name="root zone"
            stroke="#2E7F25"
            strokeWidth={2.5}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="pct"
            type="monotone"
            dataKey="surface"
            name="surface (0–10cm)"
            stroke="#C9971E"
            strokeWidth={1.6}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
