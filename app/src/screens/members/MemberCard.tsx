import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, RoleBadge, SegmentedControl } from '../../components';
import { memberApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import {
  formatMonthYear,
  getApiErrorMessage,
} from '../../utils/format';
import type { Club, User } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';

interface MemberCardProps {
  member: User;
  clubs?: Club[];
  /** Whether the current user may remove this member (parent decides the rule). */
  canRemove?: boolean;
  /** Called after a successful assign / promote / remove so the parent can refetch. */
  onChanged?: () => void;
  onOpen: (id: string) => void;
}

/** Small selectable club pill. */
function ClubChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One member row with an expandable admin action panel (assign / promote /
 * remove). Mirrors the web MemberCard, using native Alerts for confirmations.
 */
export function MemberCard({
  member,
  clubs = [],
  canRemove = false,
  onChanged,
  onOpen,
}: MemberCardProps) {
  const { isAdmin, user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(
    member.club?.id ?? clubs[0]?.id ?? '',
  );
  const [selectedRole, setSelectedRole] = useState<'COORDINATOR' | 'MEMBER'>(
    'MEMBER',
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canPromote = isAdmin && member.role !== 'ADMIN' && !!member.club;
  const canAssign = isAdmin && member.role !== 'ADMIN' && !member.club;
  // Defense-in-depth: never allow removing yourself, even if a parent passes
  // canRemove={true}. The API also rejects self-removal, but this keeps the
  // action out of the UI entirely.
  const effectiveCanRemove = canRemove && user?.id !== member.id;
  const hasActions = canPromote || canAssign || effectiveCanRemove;

  const displayName = member.name ?? member.email;
  const currentClub = member.club ?? null;
  const targetClub = clubs.find((c) => c.id === selectedClubId) ?? null;
  const isCrossClubPromotion =
    !!currentClub && !!selectedClubId && selectedClubId !== currentClub.id;

  const doPromote = async () => {
    if (!selectedClubId) return;
    setBusy(true);
    setActionError(null);
    try {
      await memberApi.promoteMember(member.id, { clubId: selectedClubId });
      setExpanded(false);
      onChanged?.();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to promote member'));
    } finally {
      setBusy(false);
    }
  };

  const requestPromote = () => {
    if (!selectedClubId) return;
    if (isCrossClubPromotion && currentClub) {
      Alert.alert(
        'Move member to another club?',
        `${displayName} is currently in ${currentClub.name}. Promoting them to Coordinator of ${
          targetClub?.name ?? 'the selected club'
        } will move them out of ${currentClub.name}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Move and promote', style: 'destructive', onPress: doPromote },
        ],
      );
      return;
    }
    doPromote();
  };

  const handleAssign = async () => {
    if (!selectedClubId) return;
    setBusy(true);
    setActionError(null);
    try {
      await memberApi.assignMember(member.id, {
        clubId: selectedClubId,
        role: selectedRole,
      });
      setExpanded(false);
      onChanged?.();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to assign member'));
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await memberApi.removeMember(member.id);
      setExpanded(false);
      onChanged?.();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to remove member'));
    } finally {
      setBusy(false);
    }
  };

  const requestRemove = () => {
    // Defense-in-depth: silently no-op if somehow invoked for the current user
    if (member.id === user?.id) return;

    Alert.alert(
      'Remove member',
      'This member will lose access to the club. You can invite them again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove member', style: 'destructive', onPress: doRemove },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Pressable
          style={styles.identity}
          onPress={() => onOpen(member.id)}
          accessibilityRole="button"
        >
          <Avatar
            name={member.name}
            email={member.email}
            role={member.role}
            size={40}
          />
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {member.name ?? 'Pending setup'}
              </Text>
              <RoleBadge role={member.role} />
              {member.isVerified ? (
                <Text style={styles.verified}>✓</Text>
              ) : null}
              {canAssign ? (
                <View style={styles.pendingChip}>
                  <Text style={styles.pendingText}>pending</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.email} numberOfLines={1}>
              {member.email}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {member.club?.name ?? 'No club'} · Joined{' '}
              {formatMonthYear(member.createdAt)}
            </Text>
          </View>
        </Pressable>

        {hasActions ? (
          <Pressable
            onPress={() => {
              setExpanded((v) => !v);
              setActionError(null);
            }}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel="Member actions"
          >
            <Text style={styles.toggleGlyph}>{expanded ? '×' : '⋯'}</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <View style={styles.actions}>
          {actionError ? (
            <Text style={styles.actionError}>{actionError}</Text>
          ) : null}

          {canAssign && clubs.length > 0 ? (
            <View style={styles.actionBlock}>
              <Text style={styles.actionLabel}>Assign to club</Text>
              <View style={styles.chips}>
                {clubs.map((club) => (
                  <ClubChip
                    key={club.id}
                    label={club.name}
                    selected={selectedClubId === club.id}
                    onPress={() => setSelectedClubId(club.id)}
                  />
                ))}
              </View>
              <SegmentedControl
                options={[
                  { value: 'MEMBER', label: 'As Member' },
                  { value: 'COORDINATOR', label: 'As Coordinator' },
                ]}
                value={selectedRole}
                onChange={setSelectedRole}
                style={styles.roleToggle}
              />
              <Button
                title="Assign"
                onPress={handleAssign}
                loading={busy}
                disabled={!selectedClubId}
                size="sm"
              />
            </View>
          ) : null}

          {canPromote && clubs.length > 0 ? (
            <View style={styles.actionBlock}>
              <Text style={styles.actionLabel}>Promote to coordinator</Text>
              <View style={styles.chips}>
                {clubs.map((club) => (
                  <ClubChip
                    key={club.id}
                    label={club.name}
                    selected={selectedClubId === club.id}
                    onPress={() => setSelectedClubId(club.id)}
                  />
                ))}
              </View>
              {isCrossClubPromotion && currentClub ? (
                <Text style={styles.warning}>
                  Different club. {displayName} is currently in{' '}
                  {currentClub.name} — promoting them here will move them out of
                  it.
                </Text>
              ) : null}
              <Button
                title="Make coordinator"
                onPress={requestPromote}
                loading={busy}
                disabled={!selectedClubId}
                variant="secondary"
                size="sm"
              />
            </View>
          ) : null}

          {effectiveCanRemove ? (
            <Button
              title="Remove member"
              onPress={requestRemove}
              variant="danger"
              size="sm"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  verified: {
    ...typography.caption,
    color: colors.successEmphasis,
    fontWeight: '700',
  },
  pendingChip: {
    backgroundColor: colors.warningSubtle,
    borderColor: `${colors.warningEmphasis}4d`,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  pendingText: {
    ...typography.caption,
    color: colors.warningEmphasis,
    fontWeight: '600',
  },
  email: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  sub: {
    ...typography.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  toggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  toggleGlyph: {
    ...typography.h3,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderMuted,
    backgroundColor: colors.inset,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionError: {
    ...typography.caption,
    color: colors.dangerEmphasis,
    backgroundColor: colors.dangerSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionBlock: {
    gap: spacing.sm,
  },
  actionLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.accentEmphasis,
  },
  chipText: {
    ...typography.small,
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.accentEmphasis,
    fontWeight: '600',
  },
  roleToggle: {
    marginTop: spacing.xs,
  },
  warning: {
    ...typography.caption,
    color: colors.warningEmphasis,
    backgroundColor: colors.warningSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
