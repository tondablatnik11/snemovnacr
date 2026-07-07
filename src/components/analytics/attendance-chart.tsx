"use client";

// Attendance chart — horizontální bar chart s procenty attendance
// pro top N poslanců. Využívá Recharts (nainstalovaná knihovna).

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface AttendanceDatum {
  name: string; // "Jan Novák"
  attendance: number; // 0-100
  total: number;
  present: number;
  absent: number;
  abstain: number;
}

interface Props {
  data: AttendanceDatum[];
  /** Max počet zobrazených poslanců (default 15) */
  limit?: number;
}

export function AttendanceChart({ data, limit = 15 }: Props) {
  const top = data.slice(0, limit);

  if (top.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
        Žádná data o účasti.
      </div>
    );
  }

  return (
    <div className="w-full" role="img" aria-label="Účast poslanců na hlasováních">
      <ResponsiveContainer width="100%" height={Math.max(280, top.length * 32)}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            interval={0}
          />
          <Tooltip content={<AttendanceTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="attendance" radius={[0, 4, 4, 0]}>
            {top.map((d, i) => (
              <Cell key={i} fill={attendanceColor(d.attendance)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function attendanceColor(pct: number): string {
  // Gradient: < 60% red, 60-80% yellow, > 80% green
  if (pct >= 80) return "hsl(142 70% 45%)"; // zelená
  if (pct >= 60) return "hsl(38 92% 50%)"; // žlutá
  return "hsl(0 75% 55%)"; // červená
}

function AttendanceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AttendanceDatum }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm space-y-1">
      <div className="font-medium">{datum.name}</div>
      <div className="text-muted-foreground">
        Účast: <strong className="text-foreground">{datum.attendance.toFixed(1)}%</strong>
      </div>
      <div className="text-xs text-muted-foreground">
        {datum.present}/{datum.total} hlasování
      </div>
      <div className="text-xs text-muted-foreground">
        Z toho omluv: {datum.absent}, zdržení: {datum.abstain}
      </div>
    </div>
  );
}