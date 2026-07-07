// Cross-party heatmapa — vizualizace shody mezi poslaneckými kluby.
// Čím tmavší zelená, tím vyšší shoda. Diagonála je vždy 100% (klub sám se sebou).

"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "~/lib/utils";

export interface CrossPartyMatrixData {
  kluby: string[];
  matrix: number[][];
  totalHlasovani: number;
}

interface Props {
  data: CrossPartyMatrixData;
  /** Volitelná velikost buňky (default 64px) */
  cellSize?: number;
}

/** Intenzita barvy podle hodnoty 0-100. lineární interpolace z šedé po zelenou. */
function heatColor(value: number): string {
  // 0-40 → šedá, 40-70 → žlutá, 70-100 → zelená
  if (value >= 70) return `hsl(142 70% ${45 - (value - 70) * 0.15}%)`;
  if (value >= 40) return `hsl(38 92% ${50 + (70 - value) * 0.3}%)`;
  return `hsl(220 14% ${70 - value * 0.3}%)`;
}

export function CrossPartyMatrix({ data, cellSize = 64 }: Props) {
  const { kluby, matrix, totalHlasovani } = data;
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);

  if (kluby.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground border border-dashed rounded-md">
        Nedostatek dat pro výpočet cross-party matice.
      </div>
    );
  }

  const gridCols = `auto repeat(${kluby.length}, ${cellSize}px)`;
  const labelHeight = 120; // prostor pro šikmé popisky

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Shoda mezi kluby na základě {totalHlasovani.toLocaleString("cs-CZ")} hlasování.
        Tmavší zelená = vyšší shoda, žlutá = střední, šedá = nízká.
      </div>

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-px bg-border border border-border rounded"
          style={{
            gridTemplateColumns: gridCols,
            paddingTop: labelHeight,
          }}
          role="table"
          aria-label="Cross-party matrix shody mezi kluby"
        >
          {/* Header row — popisky sloupců (šikmé) */}
          <div /> {/* prázdný roh */}
          {kluby.map((klub, j) => (
            <div
              key={`h-${j}`}
              className="text-xs font-medium text-center origin-bottom-left -rotate-45 whitespace-nowrap"
              style={{
                position: "relative",
                left: cellSize / 2,
                bottom: 0,
                height: labelHeight,
                paddingTop: 8,
              }}
            >
              <span className="inline-block">{klub}</span>
            </div>
          ))}

          {/* Data rows */}
          {kluby.map((rowKlub, i) => (
            <RowFragment
              key={`r-${i}`}
              rowKlub={rowKlub}
              row={matrix[i] ?? []}
              kluby={kluby}
              cellSize={cellSize}
              hover={hover}
              onHover={setHover}
              rowIndex={i}
            />
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>0%</span>
        <div className="flex h-2 flex-1 max-w-[200px] rounded-full overflow-hidden">
          <div className="flex-1" style={{ background: heatColor(0) }} />
          <div className="flex-1" style={{ background: heatColor(25) }} />
          <div className="flex-1" style={{ background: heatColor(50) }} />
          <div className="flex-1" style={{ background: heatColor(75) }} />
          <div className="flex-1" style={{ background: heatColor(100) }} />
        </div>
        <span>100%</span>
      </div>

      {/* Tooltip pro hover */}
      {hover && (
        <div className="text-xs text-muted-foreground">
          <strong>{kluby[hover.row]}</strong> × <strong>{kluby[hover.col]}</strong>:{" "}
          <span className="font-mono font-medium">
            {(matrix[hover.row]?.[hover.col] ?? 0).toFixed(1)}%
          </span>{" "}
          shoda
        </div>
      )}
    </div>
  );
}

function RowFragment({
  rowKlub,
  row,
  kluby,
  cellSize,
  hover,
  onHover,
  rowIndex,
}: {
  rowKlub: string;
  row: number[];
  kluby: string[];
  cellSize: number;
  hover: { row: number; col: number } | null;
  onHover: (v: { row: number; col: number } | null) => void;
  rowIndex: number;
}) {
  return (
    <>
      <div
        className="text-xs font-medium flex items-center justify-end pr-2 bg-card"
        style={{ height: cellSize }}
      >
        {rowKlub}
      </div>
      {kluby.map((_, j) => {
        const value = row[j] ?? 0;
        const isDiagonal = rowIndex === j;
        const isHover = hover?.row === rowIndex && hover?.col === j;
        return (
          <div
            key={`c-${j}`}
            onMouseEnter={() => onHover({ row: rowIndex, col: j })}
            onMouseLeave={() => onHover(null)}
            className={cn(
              "flex items-center justify-center text-xs font-mono font-medium transition-all cursor-default",
              isHover && "ring-2 ring-foreground z-10 scale-110"
            )}
            style={{
              background: heatColor(value),
              width: cellSize,
              height: cellSize,
              color: value > 50 ? "white" : "hsl(var(--foreground))",
              opacity: isDiagonal ? 1 : 0.95,
            }}
            role="cell"
            aria-label={`${rowKlub} × ${kluby[j]}: ${value.toFixed(1)}%`}
          >
            {value.toFixed(0)}
          </div>
        );
      })}
    </>
  );
}