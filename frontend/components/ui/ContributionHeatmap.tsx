"use client";

// ContributionHeatmap.tsx — GitHub-style 52-week contribution heatmap
import { useState, useMemo } from "react";

export interface HeatmapDay {
  date: string;   // ISO "YYYY-MM-DD"
  count: number;
  hours: number;
}

interface ContributionHeatmapProps {
  data: HeatmapDay[];
  label?: string;
}

// 5-level color scale matching GitHub green palette
function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

const LEVEL_COLORS = [
  "#161b22", // 0 – empty
  "#0e4429", // 1 – light
  "#006d32", // 2 – medium
  "#26a641", // 3 – heavy
  "#39d353", // 4 – max
];

const LEVEL_LABELS = ["No activity", "1 contribution", "2–3", "4–6", "7+"];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["","Mon","","Wed","","Fri",""];

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function ContributionHeatmap({ data, label = "contributions" }: ContributionHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    day: HeatmapDay;
    x: number;
    y: number;
  } | null>(null);

  // Build a map from date-string to HeatmapDay
  const dataMap = useMemo(() => {
    const m = new Map<string, HeatmapDay>();
    data.forEach((d) => m.set(d.date, d));
    return m;
  }, [data]);

  // Generate last 52 weeks of dates, starting from the most recent Sunday
  const weeks = useMemo(() => {
    const today = new Date();
    // Find last Sunday
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - today.getDay()); // go back to Sunday
    // Go back 51 more weeks
    startDay.setDate(startDay.getDate() - 51 * 7);

    const result: { date: string; weekIdx: number; dayIdx: number }[][] = [];
    const current = new Date(startDay);

    for (let w = 0; w < 52; w++) {
      const week: { date: string; weekIdx: number; dayIdx: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = current.toISOString().slice(0, 10);
        week.push({ date: iso, weekIdx: w, dayIdx: d });
        current.setDate(current.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, []);

  // Compute month label positions
  const monthLabels = useMemo(() => {
    const seen = new Set<number>();
    const labels: { label: string; weekIdx: number }[] = [];
    weeks.forEach((week, wi) => {
      const month = new Date(week[0].date + "T00:00:00").getMonth();
      if (!seen.has(month)) {
        seen.add(month);
        labels.push({ label: MONTHS[month], weekIdx: wi });
      }
    });
    return labels;
  }, [weeks]);

  const totalContributions = data.reduce((s, d) => s + d.count, 0);
  const totalHours = data.reduce((s, d) => s + d.hours, 0);

  return (
    <div className="w-full">
      {/* Stats line */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[#8b949e]">
          <span className="font-semibold text-[#e6edf3]">{totalContributions}</span>{" "}
          {label} in the last year
          {totalHours > 0 && (
            <span className="ml-2 text-[#6e7681]">
              · <span className="text-[#e6edf3]">{totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}</span> hrs
            </span>
          )}
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="relative overflow-x-auto">
        <div className="flex gap-0.5" style={{ minWidth: "max-content" }}>
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-2 pt-5">
            {DAYS.map((d, i) => (
              <div key={i} className="h-[11px] flex items-center">
                <span className="text-[9px] text-[#6e7681] w-6 text-right leading-none">
                  {d}
                </span>
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex flex-col">
            {/* Month labels */}
            <div className="flex gap-0.5 h-5 mb-0.5 relative">
              {weeks.map((_, wi) => {
                const ml = monthLabels.find((m) => m.weekIdx === wi);
                return (
                  <div key={wi} className="w-[11px] relative">
                    {ml && (
                      <span
                        className="absolute text-[9px] text-[#8b949e] whitespace-nowrap leading-none top-0"
                        style={{ left: 0 }}
                      >
                        {ml.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Day cells (column = week, row = day) */}
            <div className="flex gap-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((day) => {
                    const entry = dataMap.get(day.date);
                    const count = entry?.count ?? 0;
                    const hours = entry?.hours ?? 0;
                    const level = getLevel(count);
                    const color = LEVEL_COLORS[level];
                    return (
                      <div
                        key={day.date}
                        className="w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-opacity hover:opacity-80"
                        style={{ backgroundColor: color }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            day: { date: day.date, count, hours },
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-[#6e7681]">Less</span>
          {LEVEL_COLORS.map((c, i) => (
            <div
              key={i}
              title={LEVEL_LABELS[i]}
              className="w-[11px] h-[11px] rounded-[2px]"
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="text-[10px] text-[#6e7681]">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          <div className="bg-[#1c2128] border border-[#30363d] rounded-md px-2.5 py-1.5 text-[11px] text-[#e6edf3] shadow-lg whitespace-nowrap">
            {tooltip.day.count === 0 ? (
              <span>No activity on {formatDate(tooltip.day.date)}</span>
            ) : (
              <>
                <span className="font-semibold">{tooltip.day.count} contribution{tooltip.day.count !== 1 ? "s" : ""}</span>
                {tooltip.day.hours > 0 && (
                  <span className="text-[#8b949e]">
                    {" "}·{" "}
                    {tooltip.day.hours % 1 === 0 ? tooltip.day.hours : tooltip.day.hours.toFixed(1)} hrs
                  </span>
                )}
                <div className="text-[#6e7681] mt-0.5">{formatDate(tooltip.day.date)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
