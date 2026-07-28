"use client";

/**
 * HeatmapGrid — GitHub-style contribution heatmap rendered from the
 * `GET /api/contributions/heatmap` response.
 *
 * No charting library is available in this project, so the grid is plain CSS
 * grid + divs: one column per week, seven rows (Sun→Sat), coloured from the
 * `--color-heatmap-*` design tokens. Every cell carries both a `title` and an
 * `aria-label` so the data is reachable without hovering.
 */

import { useMemo } from "react";
import type { HeatmapDay } from "@/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Only every other weekday is labelled, the same way GitHub does it. */
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/** Tailwind classes generated from the `--color-heatmap-0…4` tokens. */
const LEVEL_CLASSES = [
  "bg-heatmap-0",
  "bg-heatmap-1",
  "bg-heatmap-2",
  "bg-heatmap-3",
  "bg-heatmap-4",
] as const;

const LEVEL_LEGEND = [
  "No contributions",
  "Light activity",
  "Moderate activity",
  "Heavy activity",
  "Busiest days",
];

/** Cell geometry, kept in one place so the grid and its labels stay aligned. */
const CELL = 11;
const GAP = 2;

/**
 * Map a day onto the 5-step colour ramp. Scaling is relative to the busiest
 * day in the window (`maxHours`) so a light month still shows contrast.
 */
function levelFor(day: HeatmapDay, maxHours: number): 0 | 1 | 2 | 3 | 4 {
  if (day.count === 0) return 0;
  if (maxHours <= 0) return 1;
  const ratio = day.hours / maxHours;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatHours(hours: number): string {
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

function describeDay(day: HeatmapDay): string {
  if (day.count === 0) return `No contributions on ${day.date}`;
  const plural = day.count === 1 ? "contribution" : "contributions";
  return `${day.count} ${plural}, ${formatHours(day.hours)} hours on ${day.date}`;
}

/** `YYYY-MM-DD` → local `Date`, avoiding the UTC shift of `new Date(iso)`. */
function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

interface HeatmapGridProps {
  days: HeatmapDay[];
  totalContributions: number;
  totalHours: number;
  maxHours: number;
  /** Sentence fragment describing whose data this is, e.g. "Priya has". */
  subjectPrefix?: string;
}

export function HeatmapGrid({
  days,
  totalContributions,
  totalHours,
  maxHours,
  subjectPrefix,
}: HeatmapGridProps) {
  /**
   * Chunk the flat day list into week columns. The window rarely starts on a
   * Sunday, so the first column is padded with blanks to keep weekday rows
   * lined up; the final column is padded the same way.
   */
  const weeks = useMemo(() => {
    if (days.length === 0) return [];

    const cells: (HeatmapDay | null)[] = [];
    const leadingBlanks = parseDay(days[0].date).getDay();
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    cells.push(...days);
    while (cells.length % 7 !== 0) cells.push(null);

    const columns: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      columns.push(cells.slice(i, i + 7));
    }
    return columns;
  }, [days]);

  /** First column of each calendar month, used to place the month captions. */
  const monthLabels = useMemo(() => {
    const labels: (string | null)[] = [];
    let lastMonth = -1;
    for (const week of weeks) {
      const firstReal = week.find((cell): cell is HeatmapDay => cell !== null);
      if (!firstReal) {
        labels.push(null);
        continue;
      }
      const month = parseDay(firstReal.date).getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        labels.push(MONTH_NAMES[month]);
      } else {
        labels.push(null);
      }
    }
    return labels;
  }, [weeks]);

  const columnStyle = {
    display: "grid",
    gridAutoFlow: "column",
    gridAutoColumns: `${CELL}px`,
    gap: `${GAP}px`,
  } as const;

  if (days.length === 0) {
    return (
      <p className="text-sm text-gh-text-secondary">
        No contribution history yet.
      </p>
    );
  }

  const summary = `${totalContributions} contribution${
    totalContributions === 1 ? "" : "s"
  } and ${formatHours(totalHours)} hours in the last year`;

  return (
    <div>
      <p className="text-sm text-gh-text-secondary mb-4">
        <span className="font-semibold text-gh-text-primary">
          {totalContributions}
        </span>{" "}
        contribution{totalContributions === 1 ? "" : "s"}
        <span className="text-gh-text-tertiary">
          {" · "}
          <span className="text-gh-text-primary">{formatHours(totalHours)}</span>{" "}
          hours
        </span>{" "}
        {subjectPrefix ? `logged by ${subjectPrefix}` : "logged"} in the last year
      </p>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2" style={{ minWidth: "max-content" }}>
          {/* Weekday captions */}
          <div
            className="flex flex-col shrink-0"
            style={{ gap: `${GAP}px`, paddingTop: `${CELL + GAP + 6}px` }}
            aria-hidden="true"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="flex items-center justify-end text-[10px] leading-none text-gh-text-tertiary w-6"
                style={{ height: `${CELL}px` }}
              >
                {label}
              </div>
            ))}
          </div>

          <div>
            {/* Month captions — one slot per week column so they stay aligned */}
            <div
              style={{ ...columnStyle, marginBottom: `${GAP}px` }}
              aria-hidden="true"
            >
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="relative"
                  style={{ height: `${CELL + 6}px` }}
                >
                  {label && (
                    <span className="absolute left-0 top-0 text-[10px] leading-none text-gh-text-secondary whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day cells — column = week, row = weekday */}
            <div
              role="group"
              aria-label={summary}
              style={{
                ...columnStyle,
                gridTemplateRows: `repeat(7, ${CELL}px)`,
              }}
            >
              {weeks.flatMap((week, wi) =>
                week.map((cell, di) =>
                  cell === null ? (
                    <div
                      key={`${wi}-${di}-blank`}
                      style={{ width: CELL, height: CELL }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      key={cell.date}
                      role="img"
                      title={describeDay(cell)}
                      aria-label={describeDay(cell)}
                      className={`rounded-[2px] ring-1 ring-inset ring-gh-border-subtle ${
                        LEVEL_CLASSES[levelFor(cell, maxHours)]
                      }`}
                      style={{ width: CELL, height: CELL }}
                    />
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend — each swatch is labelled so colour is not the only signal */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-gh-text-tertiary">Less</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <div
            key={cls}
            title={LEVEL_LEGEND[i]}
            aria-label={LEVEL_LEGEND[i]}
            role="img"
            className={`rounded-[2px] ring-1 ring-inset ring-gh-border-subtle ${cls}`}
            style={{ width: CELL, height: CELL }}
          />
        ))}
        <span className="text-[10px] text-gh-text-tertiary">More</span>
      </div>
    </div>
  );
}
