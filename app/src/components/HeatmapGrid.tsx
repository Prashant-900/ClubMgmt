import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, heatmapColor, heatmapRamp, radius, spacing, typography } from '../theme';
import { formatHours } from '../utils/format';
import type { HeatmapDay, HeatmapResponse } from '../types';

interface HeatmapGridProps {
  data: HeatmapResponse;
  /** Phrase inserted into the summary, e.g. "you" or a member's name. */
  subjectPrefix?: string;
}

const CELL = 11;
const GAP = 2;
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

/** Parse an ISO date (YYYY-MM-DD) as a local calendar day. */
function parseDay(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Intensity bucket 0–4 for a day, matching the web heatmap. */
function levelFor(day: HeatmapDay, maxHours: number): number {
  if (day.count === 0) return 0;
  if (maxHours <= 0) return 1;
  const ratio = day.hours / maxHours;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** GitHub-style contribution calendar (7 rows Sun→Sat, weeks as columns). */
export function HeatmapGrid({ data, subjectPrefix = 'you' }: HeatmapGridProps) {
  const { days, totalContributions, totalHours, maxHours } = data;

  const columns = useMemo(() => {
    if (!days || days.length === 0) return [] as (HeatmapDay | null)[][];
    // Leading blanks so the first day lands on its correct weekday row.
    const leading = parseDay(days[0].date).getDay();
    const cells: (HeatmapDay | null)[] = [
      ...Array.from({ length: leading }, () => null),
      ...days,
    ];
    const cols: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }
    return cols;
  }, [days]);

  if (!days || days.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No contribution history yet.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.chart}>
        <View style={styles.weekdayCol}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text key={i} style={styles.weekdayLabel} numberOfLines={1}>
              {label}
            </Text>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.grid}>
            {columns.map((col, ci) => (
              <View key={ci} style={styles.column}>
                {col.map((day, ri) => (
                  <View
                    key={ri}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: day
                          ? heatmapColor(levelFor(day, maxHours))
                          : 'transparent',
                      },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        <Text style={styles.legendText}>Less</Text>
        {heatmapRamp.map((color, i) => (
          <View key={i} style={[styles.cell, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>

      <Text style={styles.summary}>
        {totalContributions} contributions · {formatHours(totalHours)} hours logged by{' '}
        {subjectPrefix} in the last year
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    gap: GAP,
  },
  weekdayCol: {
    marginRight: spacing.xs,
    justifyContent: 'space-between',
  },
  weekdayLabel: {
    ...typography.caption,
    fontSize: 9,
    lineHeight: CELL + GAP,
    color: colors.textSubtle,
    height: CELL + GAP,
  },
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    gap: GAP,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    marginTop: spacing.md,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSubtle,
    marginHorizontal: spacing.xs,
  },
  summary: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  empty: {
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  emptyText: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
