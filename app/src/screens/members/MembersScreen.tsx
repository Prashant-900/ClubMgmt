import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BlockedState,
  EmptyState,
  Input,
  Screen,
  SectionHeader,
  SegmentedControl,
  Spinner,
} from '../../components';
import { clubApi, memberApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { getApiErrorMessage } from '../../utils/format';
import type { AppNavigation } from '../../navigation/types';
import type { Club, Role, User } from '../../types';
import { colors, radius, spacing, typography } from '../../theme';
import { MemberCard } from './MemberCard';

const PAGE_SIZE = 20;

/** Prev / next pager shown under a member list. */
function Pager({
  page,
  totalPages,
  total,
  busy,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  busy: boolean;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pager}>
      <Pressable
        onPress={() => onChange(page - 1)}
        disabled={busy || page <= 1}
        style={[styles.pagerBtn, (busy || page <= 1) && styles.pagerBtnDisabled]}
      >
        <Text style={styles.pagerBtnText}>Previous</Text>
      </Pressable>
      <Text style={styles.pagerLabel}>
        Page {page} of {totalPages} · {total} members
      </Text>
      <Pressable
        onPress={() => onChange(page + 1)}
        disabled={busy || page >= totalPages}
        style={[
          styles.pagerBtn,
          (busy || page >= totalPages) && styles.pagerBtnDisabled,
        ]}
      >
        <Text style={styles.pagerBtnText}>Next</Text>
      </Pressable>
    </View>
  );
}

// ── Admin overview: assigned + pending-assignment sections ─────────────────────

function AdminMembers({
  search,
  clubs,
  onOpen,
}: {
  search: string;
  clubs: Club[];
  onOpen: (id: string) => void;
}) {
  const { user } = useAuth();
  const [assigned, setAssigned] = useState<User[]>([]);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedPages, setAssignedPages] = useState(1);
  const [assignedError, setAssignedError] = useState<string | null>(null);

  const [pending, setPending] = useState<User[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPages, setPendingPages] = useState(1);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // A new search resets both paginations.
  useEffect(() => {
    setAssignedPage(1);
    setPendingPage(1);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setAssignedError(null);
    setPendingError(null);
    const s = search.trim() || undefined;

    const [assignedRes, pendingRes] = await Promise.allSettled([
      memberApi.listMembers({
        clubStatus: 'assigned',
        page: assignedPage,
        limit: PAGE_SIZE,
        search: s,
      }),
      memberApi.listMembers({
        clubStatus: 'unassigned',
        page: pendingPage,
        limit: PAGE_SIZE,
        search: s,
      }),
    ]);

    if (assignedRes.status === 'fulfilled') {
      const data = assignedRes.value.data;
      setAssigned(data?.members ?? []);
      setAssignedTotal(data?.pagination.total ?? 0);
      setAssignedPages(data?.pagination.totalPages ?? 1);
    } else {
      setAssigned([]);
      setAssignedError(getApiErrorMessage(assignedRes.reason, 'Failed to load members'));
    }

    if (pendingRes.status === 'fulfilled') {
      const data = pendingRes.value.data;
      setPending(data?.members ?? []);
      setPendingTotal(data?.pagination.total ?? 0);
      setPendingPages(data?.pagination.totalPages ?? 1);
    } else {
      setPending([]);
      setPendingError(
        getApiErrorMessage(pendingRes.reason, 'Failed to load pending members'),
      );
    }

    setLoading(false);
  }, [search, assignedPage, pendingPage]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <Spinner label="Loading members…" />;
  }

  return (
    <View style={styles.sections}>
      <View>
        <SectionHeader title="Members" subtitle={`${assignedTotal} assigned to a domain`} />
        {assignedError ? (
          <BlockedState
            title="Could not load members"
            message={assignedError}
            actionLabel="Retry"
            onAction={load}
          />
        ) : assigned.length === 0 ? (
          <EmptyState title="No assigned members found." />
        ) : (
          <>
            {assigned.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                clubs={clubs}
                canRemove={m.id !== user?.id}
                onChanged={load}
                onOpen={onOpen}
              />
            ))}
            <Pager
              page={assignedPage}
              totalPages={assignedPages}
              total={assignedTotal}
              busy={loading}
              onChange={setAssignedPage}
            />
          </>
        )}
      </View>

      {pendingTotal > 0 || pendingError ? (
        <View>
          <SectionHeader
            title="Pending assignment"
            subtitle={`${pendingTotal} waiting for a domain`}
          />
          {pendingError ? (
            <BlockedState
              title="Could not load pending members"
              message={pendingError}
              actionLabel="Retry"
              onAction={load}
            />
          ) : (
            <>
              {pending.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  clubs={clubs}
                  canRemove={m.id !== user?.id}
                  onChanged={load}
                  onOpen={onOpen}
                />
              ))}
              <Pager
                page={pendingPage}
                totalPages={pendingPages}
                total={pendingTotal}
                busy={loading}
                onChange={setPendingPage}
              />
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

// ── Coordinator / member grid: single filtered, paginated list ─────────────────

type FilterTab = 'ALL' | Role;

function MemberGridList({
  search,
  clubs,
  onOpen,
}: {
  search: string;
  clubs: Club[];
  onOpen: (id: string) => void;
}) {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = search.trim();
      const res = await memberApi.listMembers({
        page,
        limit: PAGE_SIZE,
        ...(filter !== 'ALL' ? { role: filter } : {}),
        ...(s ? { search: s } : {}),
      });
      const data = res.data;
      const sorted = [...(data?.members ?? [])].sort((a, b) => {
        if (a.role === 'COORDINATOR' && b.role !== 'COORDINATOR') return -1;
        if (b.role === 'COORDINATOR' && a.role !== 'COORDINATOR') return 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
      setMembers(sorted);
      setTotalPages(data?.pagination.totalPages ?? 1);
      setTotal(data?.pagination.total ?? 0);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch members'));
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const canRemoveMember = (member: User): boolean => {
    if (!user || user.id === member.id) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'COORDINATOR') {
      return member.role === 'MEMBER' && member.club?.id === user.clubId;
    }
    return false;
  };

  return (
    <View>
      {isAdmin ? (
        <SegmentedControl
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'COORDINATOR', label: 'Coordinators' },
            { value: 'MEMBER', label: 'Members' },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as FilterTab)}
          style={styles.filter}
        />
      ) : null}

      {loading ? (
        <Spinner label="Loading members…" />
      ) : error ? (
        <BlockedState
          title="Could not load members"
          message={error}
          actionLabel="Retry"
          onAction={load}
        />
      ) : members.length === 0 ? (
        <EmptyState
          title="No members found"
          message={
            search.trim()
              ? `No members match “${search.trim()}”.`
              : 'Invite members to get started.'
          }
        />
      ) : (
        <>
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              clubs={clubs}
              canRemove={canRemoveMember(m)}
              onChanged={load}
              onOpen={onOpen}
            />
          ))}
          <Pager
            page={page}
            totalPages={totalPages}
            total={total}
            busy={loading}
            onChange={setPage}
          />
        </>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

/** Members directory. Admins get the assigned/pending overview; everyone else
 * gets a searchable, role-filterable grid. */
export function MembersScreen() {
  const navigation = useNavigation<AppNavigation>();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Admins need the club list to power assign / promote actions.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    clubApi
      .listClubs()
      .then((res) => {
        if (active && res.data) setClubs(res.data as Club[]);
      })
      .catch(() => {
        // Non-fatal — actions requiring a club simply won't render.
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const onOpen = useMemo(
    () => (id: string) => navigation.navigate('MemberProfile', { id }),
    [navigation],
  );

  return (
    <Screen>
      <Text style={styles.title}>Members</Text>
      <Input
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="Search members…"
        autoCapitalize="none"
        autoCorrect={false}
        containerStyle={styles.search}
      />
      {isAdmin ? (
        <AdminMembers search={debouncedSearch} clubs={clubs} onOpen={onOpen} />
      ) : (
        <MemberGridList search={debouncedSearch} clubs={clubs} onOpen={onOpen} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  search: {
    marginBottom: spacing.md,
  },
  sections: {
    gap: spacing.xl,
  },
  filter: {
    marginBottom: spacing.md,
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  pagerBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pagerBtnDisabled: {
    opacity: 0.4,
  },
  pagerBtnText: {
    ...typography.small,
    color: colors.text,
    fontWeight: '600',
  },
  pagerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
});
