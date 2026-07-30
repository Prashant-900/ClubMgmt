import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, Spinner } from './ui';
import { ContributionCard } from './ContributionCard';
import { colors, radius, spacing, typography } from '../theme';
import { getApiErrorMessage } from '../utils/format';
import type {
  Contribution,
  ContributionCategory,
  ContributionListResponse,
  ContributionStatus,
  Pagination,
} from '../types';

type ListFetcher = (params: {
  status?: ContributionStatus;
  category?: ContributionCategory;
  page?: number;
  limit?: number;
}) => Promise<{ success: boolean; data?: ContributionListResponse; message?: string }>;

interface ContributionListProps {
  fetcher: ListFetcher;
  onOpen: (contribution: Contribution) => void;
  /** Render the contributor identity row on each card. */
  showUser?: boolean;
  /** Re-fetch whenever any value in this array changes. */
  refreshKey?: unknown[];
  pageSize?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Header rendered above the filter row (e.g. a SectionHeader). */
  header?: React.ReactNode;
}

const STATUS_FILTERS: { label: string; value?: ContributionStatus }[] = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export function ContributionList({
  fetcher,
  onOpen,
  showUser = false,
  refreshKey = [],
  pageSize = 20,
  emptyTitle = 'No contributions yet',
  emptyMessage,
  header,
}: ContributionListProps) {
  const [status, setStatus] = useState<ContributionStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Contribution[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialise the external refresh signal so it can join the effect deps.
  const refreshSignal = useMemo(() => JSON.stringify(refreshKey), [refreshKey]);

  // Reset to page 1 whenever the status filter or an external dependency changes.
  useEffect(() => {
    setPage(1);
  }, [status, refreshSignal]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetcher({ status, page, limit: pageSize });
    if (res.success && res.data) {
      setItems(res.data.contributions);
      setPagination(res.data.pagination);
    } else {
      setItems([]);
      setPagination(null);
      setError(getApiErrorMessage(res, 'Could not load contributions.'));
    }
    setLoading(false);
  }, [fetcher, status, page, pageSize]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  const totalPages = pagination?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <View>
      {header}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((filter) => {
          const active = filter.value === status;
          return (
            <Text
              key={filter.label}
              onPress={() => setStatus(filter.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              {filter.label}
            </Text>
          );
        })}
      </ScrollView>

      {loading ? (
        <Spinner label="Loading contributions…" />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={load} />
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <View>
          {items.map((item) => (
            <ContributionCard
              key={item.id}
              contribution={item}
              showUser={showUser}
              onPress={() => onOpen(item)}
            />
          ))}

          {totalPages > 1 ? (
            <View style={styles.pager}>
              <Button
                title="Previous"
                variant="secondary"
                size="sm"
                fullWidth={false}
                disabled={!canPrev}
                onPress={() => canPrev && setPage((p) => p - 1)}
              />
              <Text style={styles.pageLabel}>
                Page {page} of {totalPages}
              </Text>
              <Button
                title="Next"
                variant="secondary"
                size="sm"
                fullWidth={false}
                disabled={!canNext}
                onPress={() => canNext && setPage((p) => p + 1)}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    ...typography.small,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    overflow: 'hidden',
  },
  chipActive: {
    color: colors.white,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  pageLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
});
