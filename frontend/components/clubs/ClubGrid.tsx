"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ClubEditModal } from "@/components/clubs/ClubEditModal";
import { deleteClub } from "@/lib/api/club.api";
import {
  useClubApi,
  CLUB_NAME_MAX,
  CLUB_DESCRIPTION_MAX,
} from "@/lib/hooks/useClubApi";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { getApiErrorMessage } from "@/lib/hooks/apiError";
import type { Club, EnrichedClub } from "@/types";

interface ClubGridProps {
  /** Clubs from `GET /api/clubs?enriched=true` — counts already included. */
  clubs: EnrichedClub[];
  loading: boolean;
  /** Message from a failed clubs request; renders an inline retry instead of the grid. */
  error?: string | null;
  /** Re-run the clubs request (retry, and after a create/delete). */
  onRefresh: () => void;
  /** Merge an edited club into the caller's list without a refetch. */
  onClubUpdated: (club: Club) => void;
}

// ── Single club card ───────────────────────────────────────────────────────────

interface ClubCardProps {
  club: EnrichedClub;
  isAdmin: boolean;
  deleting: boolean;
  onEdit: (club: EnrichedClub) => void;
  onDelete: (club: EnrichedClub) => void;
}

function ClubCard({ club, isAdmin, deleting, onEdit, onDelete }: ClubCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-md p-4 hover:border-[#5f6368] transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => router.push(`/?clubId=${club.id}`)}
        >
          <div className="flex items-center gap-2">
            {/* Repo icon */}
            <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm font-semibold text-[#1a73e8] group-hover:underline truncate">
              {club.name}
            </span>
          </div>

          {/* Description — two lines max, falls back to the coordinator line */}
          <p className="text-xs text-[#5f6368] mt-2 line-clamp-2 leading-relaxed">
            {club.description?.trim()
              ? club.description
              : club.coordinatorName
              ? `Coordinated by ${club.coordinatorName}`
              : "No description yet"}
          </p>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            aria-label={`Actions for ${club.name}`}
            aria-expanded={menuOpen}
            className="w-7 h-7 flex items-center justify-center text-[#80868b] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-md transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM1.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm13 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#f8f9fa] border border-[#dadce0] rounded-md shadow-lg z-20 animate-scale-in py-1">
              <button
                type="button"
                onClick={() => {
                  router.push(`/?clubId=${club.id}`);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
              >
                View Club
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(club);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer"
                >
                  Edit club
                </button>
              )}
              {isAdmin && (
                <>
                  <div className="border-t border-[#f1f3f4] my-1" />
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      onDelete(club);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#c5221f] hover:bg-[rgba(234,67,53,0.1)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Delete Club"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer stats — all straight from the enriched payload */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-[#5f6368]">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {club.contributionCount} contribution{club.contributionCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1 min-w-0">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="truncate">{club.coordinatorName ?? "No coordinator"}</span>
        </span>
      </div>
    </div>
  );
}

// ── Grid ───────────────────────────────────────────────────────────────────────

/**
 * Club cards for the admin home.
 *
 * Every number on a card comes from the single enriched clubs request the
 * parent makes — there is deliberately no per-club fetching here.
 */
export function ClubGrid({
  clubs,
  loading,
  error = null,
  onRefresh,
  onClubUpdated,
}: ClubGridProps) {
  const { user, token } = useAuth();
  const { createClub } = useClubApi();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<EnrichedClub | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedClub | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const filteredClubs = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return clubs;
    return clubs.filter(
      (club) =>
        club.name.toLowerCase().includes(term) ||
        (club.description ?? "").toLowerCase().includes(term)
    );
  }, [clubs, debouncedSearch]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newName.trim();
    const description = newDescription.trim();

    if (!name) {
      setCreateError("Club name is required");
      return;
    }
    if (name.length > CLUB_NAME_MAX) {
      setCreateError(`Club name must be ${CLUB_NAME_MAX} characters or fewer`);
      return;
    }
    if (description.length > CLUB_DESCRIPTION_MAX) {
      setCreateError(
        `Description must be ${CLUB_DESCRIPTION_MAX} characters or fewer`
      );
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await createClub({
        name,
        ...(description ? { description } : {}),
      });
      if (res.success) {
        setNewName("");
        setNewDescription("");
        setShowCreateForm(false);
        onRefresh();
      }
    } catch (err: unknown) {
      setCreateError(getApiErrorMessage(err, "Failed to create club"));
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    const club = deleteTarget;
    if (!club) return;

    setDeletingId(club.id);
    setDeleteError(null);
    try {
      await deleteClub(club.id, token ?? undefined);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete club"));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  const newNameCount = newName.length;
  const newDescriptionCount = newDescription.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#202124]">
          Clubs
          <span className="ml-2 text-xs text-[#5f6368] font-normal">
            {loading ? "…" : clubs.length}
          </span>
        </h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setCreateError(null);
            }}
            className="gh-btn gh-btn-primary gh-btn-sm min-h-[36px]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Club
          </button>
        )}
      </div>

      {/* Create club form */}
      {isAdmin && showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#f8f9fa] border border-[#dadce0] rounded-md p-4 animate-fade-in"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-[#5f6368] font-medium">Club name</span>
            <span
              className={`text-[11px] tabular-nums ${
                newNameCount > CLUB_NAME_MAX ? "text-[#c5221f]" : "text-[#80868b]"
              }`}
            >
              {newNameCount}/{CLUB_NAME_MAX}
            </span>
          </div>
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setCreateError(null);
            }}
            placeholder="e.g. GDG on Campus"
            className="gh-input mt-1.5"
            autoFocus
          />

          <div className="flex items-baseline justify-between gap-2 mt-3">
            <span className="text-xs text-[#5f6368] font-medium">
              Description <span className="text-[#80868b]">(optional)</span>
            </span>
            <span
              className={`text-[11px] tabular-nums ${
                newDescriptionCount > CLUB_DESCRIPTION_MAX
                  ? "text-[#c5221f]"
                  : "text-[#80868b]"
              }`}
            >
              {newDescriptionCount}/{CLUB_DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            value={newDescription}
            onChange={(e) => {
              setNewDescription(e.target.value);
              setCreateError(null);
            }}
            rows={3}
            placeholder="What does this club do?"
            className="gh-input mt-1.5 resize-y leading-relaxed"
          />

          {createError && <p className="text-xs text-[#c5221f] mt-2">{createError}</p>}

          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={creating}
              className="gh-btn gh-btn-primary gh-btn-sm min-h-[36px]"
            >
              {creating ? "Creating…" : "Create club"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="gh-btn gh-btn-default gh-btn-sm min-h-[36px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search — only worth showing once there is something to filter */}
      {!loading && !error && clubs.length > 1 && (
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#80868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs…"
            aria-label="Search clubs"
            className="gh-input pl-9"
          />
        </div>
      )}

      {/* Delete failure */}
      {deleteError && (
        <div className="px-4 py-3 rounded-md bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f]">
          {deleteError}
        </div>
      )}

      {/* Body: error → loading → empty → grid */}
      {error ? (
        <div className="px-4 py-3 rounded-md bg-[rgba(234,67,53,0.1)] border border-[rgba(234,67,53,0.3)] text-sm text-[#c5221f] flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Could not load clubs</p>
            <p className="text-xs text-[#c5221f]/70 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="gh-btn gh-btn-default gh-btn-sm min-h-[36px] shrink-0"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-md" />
          ))}
        </div>
      ) : clubs.length === 0 ? (
        <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-md p-12 text-center">
          <p className="text-sm text-[#5f6368]">
            No clubs yet.{isAdmin ? " Create one to get started." : ""}
          </p>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-md p-12 text-center">
          <p className="text-sm text-[#5f6368]">
            No clubs match “{debouncedSearch.trim()}”.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredClubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              isAdmin={isAdmin}
              deleting={deletingId === club.id}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ClubEditModal
        club={editTarget}
        onCancel={() => setEditTarget(null)}
        onSaved={(updated) => {
          onClubUpdated(updated);
          setEditTarget(null);
        }}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete club"
        message={
          <>
            Delete <span className="text-gh-text-primary font-medium">{deleteTarget?.name}</span>?
            This will remove the club, unassign its members, and delete related
            invite links and contributions.
          </>
        }
        confirmLabel="Delete club"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
