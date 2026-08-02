import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BlockedState,
  Button,
  Card,
  Input,
  RoleBadge,
  Screen,
  SectionHeader,
  SegmentedControl,
  Spinner,
} from '../../components';
import { clubApi, inviteLinkApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { ENV } from '../../config/env';
import { getApiErrorMessage } from '../../utils/format';
import type { Club, InviteLink, Role } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';

type InviteRole = Extract<Role, 'COORDINATOR' | 'MEMBER'>;

function registerUrl(token: string): string {
  return `${ENV.WEB_BASE_URL}/register/${token}`;
}

function isExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt);
}

function isMaxed(link: InviteLink): boolean {
  return link.usedCount >= link.maxUses;
}

function clampInt(raw: string, min: number, max: number): number {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Create and manage shareable invite links. Admins pick a role + club;
 * coordinators always invite Members into their own club. */
export function InvitesScreen() {
  const { user, isAdmin, isCoordinator } = useAuth();

  const [targetRole, setTargetRole] = useState<InviteRole>(
    isAdmin ? 'COORDINATOR' : 'MEMBER',
  );
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [maxUses, setMaxUses] = useState('10');
  const [expiresInDays, setExpiresInDays] = useState('7');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const [links, setLinks] = useState<InviteLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  const canManage = isAdmin || isCoordinator;

  // Admins choose which club the invite is for.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    clubApi
      .listClubs()
      .then((res) => {
        if (!active || !res.data) return;
        const list = res.data as Club[];
        setClubs(list);
        if (list.length > 0) setSelectedClubId((prev) => prev || list[0].id);
      })
      .catch(() => {
        // Non-fatal.
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await inviteLinkApi.listInviteLinks();
      setLinks(res.data ?? []);
    } catch {
      // Silent — the list simply stays empty.
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) fetchLinks();
  }, [canManage, fetchLinks]);

  const handleGenerate = async () => {
    setError(null);
    setGeneratedUrl(null);

    if (isAdmin && !selectedClubId) {
      setError('Please select a club.');
      return;
    }

    setCreating(true);
    try {
      const res = await inviteLinkApi.createInviteLink({
        role: targetRole,
        clubId: isAdmin ? selectedClubId : user?.club?.id,
        maxUses: clampInt(maxUses, 1, 100),
        expiresInDays: clampInt(expiresInDays, 1, 30),
      });
      if (res.data) {
        setGeneratedUrl(registerUrl(res.data.token));
        fetchLinks();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create invite link'));
    } finally {
      setCreating(false);
    }
  };

  const shareUrl = async (url: string) => {
    try {
      await Share.share({ message: url });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const doRevoke = async (id: string) => {
    setError(null);
    try {
      await inviteLinkApi.revokeInviteLink(id);
      fetchLinks();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to revoke link'));
    }
  };

  const requestRevoke = (id: string) => {
    Alert.alert(
      'Revoke invite link',
      'Anyone holding this link will no longer be able to register with it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revoke link', style: 'destructive', onPress: () => doRevoke(id) },
      ],
    );
  };

  if (!canManage) {
    return (
      <Screen>
        <Text style={styles.title}>Invite links</Text>
        <BlockedState
          title="Access denied"
          message="You don't have permission to create invite links."
        />
      </Screen>
    );
  }

  const activeCount = links.filter(
    (l) => !isExpired(l.expiresAt) && !isMaxed(l),
  ).length;

  return (
    <Screen>
      <Text style={styles.title}>Invite links</Text>
      <Text style={styles.lead}>
        {isAdmin
          ? 'As an Admin, create invite links for Coordinators or Members. Pick a club and role below.'
          : 'As a Coordinator, create invite links for Members. They join your club automatically.'}
      </Text>

      {/* Form */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Generate new invite link</Text>

        <Text style={styles.fieldLabel}>Inviting as</Text>
        {isAdmin ? (
          <SegmentedControl
            options={[
              { value: 'COORDINATOR', label: 'Coordinator' },
              { value: 'MEMBER', label: 'Member' },
            ]}
            value={targetRole}
            onChange={setTargetRole}
            style={styles.field}
          />
        ) : (
          <View style={[styles.readonlyRow, styles.field]}>
            <RoleBadge role="MEMBER" />
            <Text style={styles.readonlyText}>Basic club member access</Text>
          </View>
        )}

        {isAdmin ? (
          <>
            <Text style={styles.fieldLabel}>Club</Text>
            {clubs.length === 0 ? (
              <Text style={styles.muted}>No clubs available</Text>
            ) : (
              <View style={[styles.chips, styles.field]}>
                {clubs.map((club) => {
                  const selected = selectedClubId === club.id;
                  return (
                    <Pressable
                      key={club.id}
                      onPress={() => setSelectedClubId(club.id)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {club.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : user?.club ? (
          <>
            <Text style={styles.fieldLabel}>Club</Text>
            <View style={[styles.readonlyRow, styles.field]}>
              <Text style={styles.readonlyText}>{user.club.name}</Text>
              <Text style={styles.muted}>auto-assigned</Text>
            </View>
          </>
        ) : null}

        <View style={styles.settingsRow}>
          <Input
            label="Valid for (days)"
            value={expiresInDays}
            onChangeText={setExpiresInDays}
            onBlur={() => setExpiresInDays(String(clampInt(expiresInDays, 1, 30)))}
            keyboardType="number-pad"
            containerStyle={styles.settingsField}
          />
          <Input
            label="Max uses"
            value={maxUses}
            onChangeText={setMaxUses}
            onBlur={() => setMaxUses(String(clampInt(maxUses, 1, 100)))}
            keyboardType="number-pad"
            containerStyle={styles.settingsField}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {generatedUrl ? (
          <View style={styles.generated}>
            <Text style={styles.generatedTitle}>✓ Invite link created</Text>
            <Text style={styles.generatedUrl} numberOfLines={2}>
              {generatedUrl}
            </Text>
            <Button
              title="Share link"
              onPress={() => shareUrl(generatedUrl)}
              variant="secondary"
              size="sm"
            />
          </View>
        ) : null}

        <Button
          title="Generate invite link"
          onPress={handleGenerate}
          loading={creating}
          style={styles.submit}
        />
      </Card>

      {/* Active links */}
      <SectionHeader
        title="Active invite links"
        subtitle={`${activeCount} active`}
      />

      {linksLoading ? (
        <Spinner label="Loading links…" />
      ) : links.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No invite links created yet.</Text>
        </Card>
      ) : (
        links.map((link) => {
          const expired = isExpired(link.expiresAt);
          const maxed = isMaxed(link);
          const inactive = expired || maxed;
          const daysLeft = Math.ceil(
            (new Date(link.expiresAt).getTime() - Date.now()) / 86400000,
          );
          return (
            <Card
              key={link.id}
              style={[styles.linkRow, inactive && styles.linkInactive]}
              compact
            >
              <View style={styles.linkTop}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: inactive ? colors.textSubtle : colors.successEmphasis },
                  ]}
                />
                <RoleBadge role={link.role} />
                {link.club ? (
                  <Text style={styles.linkClub} numberOfLines={1}>
                    {link.club.name}
                  </Text>
                ) : null}
                <Text style={styles.linkUses}>
                  {link.usedCount}/{link.maxUses} used
                </Text>
              </View>
              <View style={styles.linkBottom}>
                <Text
                  style={[
                    styles.linkExpiry,
                    expired && { color: colors.dangerEmphasis },
                  ]}
                >
                  {expired ? 'Expired' : maxed ? 'Fully used' : `${daysLeft}d left`}
                </Text>
                <View style={styles.linkActions}>
                  {!expired ? (
                    <Pressable onPress={() => shareUrl(registerUrl(link.token))}>
                      <Text style={styles.linkAction}>Share</Text>
                    </Pressable>
                  ) : null}
                  {!inactive ? (
                    <Pressable onPress={() => requestRevoke(link.id)}>
                      <Text style={[styles.linkAction, styles.linkRevoke]}>
                        Revoke
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  lead: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  field: {
    marginBottom: spacing.md,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.inset,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  readonlyText: {
    ...typography.body,
    color: colors.text,
  },
  muted: {
    ...typography.small,
    color: colors.textMuted,
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
  settingsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  settingsField: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.small,
    color: colors.dangerEmphasis,
    backgroundColor: colors.dangerSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  generated: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.successEmphasis,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  generatedTitle: {
    ...typography.small,
    color: colors.successEmphasis,
    fontWeight: '600',
  },
  generatedUrl: {
    ...typography.mono,
    color: colors.textMuted,
  },
  submit: {
    marginTop: spacing.sm,
  },
  linkRow: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  linkInactive: {
    opacity: 0.5,
  },
  linkTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  linkClub: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
  },
  linkUses: {
    ...typography.caption,
    color: colors.textSubtle,
    marginLeft: 'auto',
  },
  linkBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkExpiry: {
    ...typography.caption,
    color: colors.textSubtle,
  },
  linkActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  linkAction: {
    ...typography.small,
    color: colors.roleCoordinator,
    fontWeight: '600',
  },
  linkRevoke: {
    color: colors.dangerEmphasis,
  },
});
