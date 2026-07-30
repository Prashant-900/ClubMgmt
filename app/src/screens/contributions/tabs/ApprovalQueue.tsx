import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ContributionList } from '../../../components';
import { contributionApi } from '../../../api';
import type {
  Contribution,
  ContributionCategory,
  ContributionListResponse,
  ContributionStatus,
} from '../../../types';
import { spacing } from '../../../theme';

interface ApprovalQueueProps {
  onOpen: (contribution: Contribution) => void;
}

/**
 * Moderation queue for coordinators and admins: contributions awaiting
 * review. Opening one leads to the detail screen where it can be approved
 * or rejected.
 */
export function ApprovalQueue({ onOpen }: ApprovalQueueProps) {
  // Pin the fetch to PENDING so the queue only ever shows items that need a
  // decision, regardless of the list's own status filter.
  const fetchPending = useCallback(
    (params: {
      status?: ContributionStatus;
      category?: ContributionCategory;
      page?: number;
      limit?: number;
    }): Promise<{
      success: boolean;
      data?: ContributionListResponse;
      message?: string;
    }> => contributionApi.listContributions({ ...params, status: 'PENDING' }),
    [],
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ContributionList
        fetcher={fetchPending}
        onOpen={onOpen}
        showUser
        emptyTitle="Nothing to review"
        emptyMessage="There are no contributions waiting for approval."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
});
