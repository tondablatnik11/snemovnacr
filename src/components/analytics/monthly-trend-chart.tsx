"use client";

// Monthly voting trend — area chart zobrazující počet hlasování za měsíc.
// Využívá Recharts.

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export interface MonthlyDatum {
  mesic: string; // "2025-07"
  pocet: number;
}

interface Props {
  data: MonthlyDatum[];
}

export function MonthlyTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
        Žádná data za poslední období.
      </div>
    );
  }

  return (
    <div className="w-full" role="img" aria-label="Měsíční počet hlasování">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="mesic"
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            tickFormatter={(v: string) => {
              const [year, month] = v.split("-");
              if (!year || !month) return v;
              return `${month}/${year.slice(2)}`;
            }}
          />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
          <Tooltip
            content={<TrendTooltip />}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
            }}
          />
          <Area
            type="monotone"
            dataKey="pocet"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#trendGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground">
        Hlasování: <strong className="text-foreground">{payload[0]?.value ?? 0}</strong>
      </div>
    </div>
  );
}