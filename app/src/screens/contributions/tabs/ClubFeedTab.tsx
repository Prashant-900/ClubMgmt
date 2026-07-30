import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ContributionList } from '../../../components';
import { contributionApi } from '../../../api';
import type { Contribution } from '../../../types';
import { spacing } from '../../../theme';

interface ClubFeedTabProps {
  onOpen: (contribution: Contribution) => void;
}

/**
 * Club-wide contribution feed for coordinators and admins. Shows every
 * member's contributions with status filtering.
 */
export function ClubFeedTab({ onOpen }: ClubFeedTabProps) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ContributionList
        fetcher={contributionApi.listContributions}
        onOpen={onOpen}
        showUser
        emptyTitle="No contributions yet"
        emptyMessage="No one has logged a contribution in this scope yet."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
});
