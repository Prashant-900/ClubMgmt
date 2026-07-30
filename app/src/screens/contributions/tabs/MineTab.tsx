import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ContributionList } from '../../../components';
import { contributionApi } from '../../../api';
import type { Contribution } from '../../../types';
import { spacing } from '../../../theme';

interface MineTabProps {
  onOpen: (contribution: Contribution) => void;
}

/** The signed-in member's own contributions, with status filtering. */
export function MineTab({ onOpen }: MineTabProps) {
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <ContributionList
        fetcher={contributionApi.listMyContributions}
        onOpen={onOpen}
        emptyTitle="No contributions yet"
        emptyMessage="Log your first contribution to get started."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
});
