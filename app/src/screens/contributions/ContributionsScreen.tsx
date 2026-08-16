import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Screen, SegmentedControl } from '../../components';
import { useAuth } from '../../context/AuthContext';
import type { AppNavigation } from '../../navigation/types';
import type { Role } from '../../types';
import { colors, spacing, typography } from '../../theme';
import { MineTab } from './tabs/MineTab';
import { ApprovalQueue } from './tabs/ApprovalQueue';
import { ClubFeedTab } from './tabs/ClubFeedTab';

type HubTab = 'mine' | 'pending' | 'club';

interface TabDef {
  value: HubTab;
  label: string;
  roles?: Role[];
}

const TABS: TabDef[] = [
  { value: 'mine', label: 'Mine' },
  { value: 'pending', label: 'Pending', roles: ['ADMIN', 'COORDINATOR'] },
  { value: 'club', label: 'Domain feed', roles: ['ADMIN', 'COORDINATOR'] },
];

/**
 * Contributions hub. Everyone sees their own contributions; coordinators and
 * admins additionally get the approval queue and the club-wide feed.
 */
export function ContributionsScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { hasRole } = useAuth();

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => !tab.roles || hasRole(...tab.roles)),
    [hasRole],
  );

  const [tab, setTab] = useState<HubTab>('mine');
  const activeTab = visibleTabs.some((t) => t.value === tab) ? tab : 'mine';

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Contributions</Text>
        <Button
          title="Log"
          size="sm"
          fullWidth={false}
          onPress={() => navigation.navigate('SubmitContribution')}
        />
      </View>

      {visibleTabs.length > 1 ? (
        <SegmentedControl
          options={visibleTabs.map((t) => ({ value: t.value, label: t.label }))}
          value={activeTab}
          onChange={(v) => setTab(v)}
          style={styles.tabs}
        />
      ) : null}

      <View style={styles.body}>
        {activeTab === 'mine' ? (
          <MineTab
            onOpen={(c) => navigation.navigate('ContributionDetail', { id: c.id })}
          />
        ) : activeTab === 'pending' ? (
          <ApprovalQueue
            onOpen={(c) => navigation.navigate('ContributionDetail', { id: c.id })}
          />
        ) : (
          <ClubFeedTab
            onOpen={(c) => navigation.navigate('ContributionDetail', { id: c.id })}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  tabs: {
    marginBottom: spacing.md,
  },
  body: {
    flex: 1,
  },
});
