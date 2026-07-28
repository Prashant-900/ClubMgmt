"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useClubApi, CLUB_NAME_MAX, CLUB_DESCRIPTION_MAX } from "@/lib/hooks/useClubApi";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/hooks/apiError";
import type { Club } from "@/types";

interface ClubEditModalProps {
  /** The club being edited — `null` keeps the modal closed. */
  club: Club | null;
  onCancel: () => void;
  /** Called with the patched club so the caller can update its list in place. */
  onSaved: (club: Club) => void;
}

/**
 * ADMIN-only editor for a club's name and description.
 *
 * Saves with `PATCH /api/clubs/:id` and hands the updated club back to the
 * caller — the grid merges it in place rather than refetching.
 */
export function ClubEditModal({ club, onCancel, onSaved }: ClubEditModalProps) {
  const { updateClub } = useClubApi();
  const titleId = useId();
  const nameId = useId();
  const descriptionId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const open = club !== null;

  // Re-seed the fields whenever a different club is opened
  useEffect(() => {
    if (!club) return;
    setName(club.name);
    setDescription(club.description ?? "");
    setNameError(null);
    setDescriptionError(null);
    setFormError(null);
  }, [club]);

  // Escape closes
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus the name field on open
  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    nameRef.current?.select();
  }, [open]);

  if (!club) return null;

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const nameChanged = trimmedName !== club.name;
  const descriptionChanged = trimmedDescription !== (club.description ?? "");
  const dirty = nameChanged || descriptionChanged;

  const validate = (): boolean => {
    let valid = true;

    if (!trimmedName) {
      setNameError("Club name is required");
      valid = false;
    } else if (trimmedName.length > CLUB_NAME_MAX) {
      setNameError(`Club name must be ${CLUB_NAME_MAX} characters or fewer`);
      valid = false;
    } else {
      setNameError(null);
    }

    if (trimmedDescription.length > CLUB_DESCRIPTION_MAX) {
      setDescriptionError(
        `Description must be ${CLUB_DESCRIPTION_MAX} characters or fewer`
      );
      valid = false;
    } else {
      setDescriptionError(null);
    }

    return valid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    // Nothing to send — just close
    if (!dirty) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      const payload: { name?: string; description?: string | null } = {};
      if (nameChanged) payload.name = trimmedName;
      if (descriptionChanged) {
        payload.description = trimmedDescription ? trimmedDescription : null;
      }

      const res = await updateClub(club.id, payload);
      if (res.success && res.data) {
        onSaved(res.data);
      } else {
        // Optimistically merge what we sent if the server echoed nothing back
        onSaved({ ...club, ...payload });
      }
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to update club");
      // 409 = duplicate name; surface it on the field, not as a page banner
      if (getApiErrorStatus(err) === 409) {
        setNameError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const nameCount = name.length;
  const descriptionCount = description.length;
  const nameOverLimit = nameCount > CLUB_NAME_MAX;
  const descriptionOverLimit = descriptionCount > CLUB_DESCRIPTION_MAX;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop — clicking it cancels */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={saving ? undefined : onCancel}
        aria-hidden="true"
      />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-gh-canvas-subtle border border-gh-border-default
                   rounded-lg shadow-2xl shadow-black/50 p-5 animate-scale-in"
      >
        <h2 id={titleId} className="text-base font-semibold text-gh-text-primary">
          Edit club
        </h2>
        <p className="mt-1 text-xs text-gh-text-tertiary">
          Members, contributions and invite links are unaffected.
        </p>

        {/* Name */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={nameId} className="text-xs font-medium text-gh-text-secondary">
              Club name
            </label>
            <span
              className={`text-[11px] tabular-nums ${
                nameOverLimit ? "text-[#f85149]" : "text-gh-text-tertiary"
              }`}
            >
              {nameCount}/{CLUB_NAME_MAX}
            </span>
          </div>
          <input
            id={nameId}
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            placeholder="e.g. Robotics Club"
            aria-invalid={nameError ? true : undefined}
            className="gh-input mt-1.5"
          />
          {nameError && <p className="mt-1 text-xs text-[#f85149]">{nameError}</p>}
        </div>

        {/* Description */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor={descriptionId}
              className="text-xs font-medium text-gh-text-secondary"
            >
              Description <span className="text-gh-text-tertiary">(optional)</span>
            </label>
            <span
              className={`text-[11px] tabular-nums ${
                descriptionOverLimit ? "text-[#f85149]" : "text-gh-text-tertiary"
              }`}
            >
              {descriptionCount}/{CLUB_DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setDescriptionError(null);
            }}
            rows={4}
            placeholder="What does this club do?"
            aria-invalid={descriptionError ? true : undefined}
            className="gh-input mt-1.5 resize-y leading-relaxed"
          />
          {descriptionError && (
            <p className="mt-1 text-xs text-[#f85149]">{descriptionError}</p>
          )}
        </div>

        {/* Non-field errors */}
        {formError && (
          <p className="mt-3 px-3 py-2 rounded-md bg-[rgba(248,81,73,0.1)] border border-[rgba(248,81,73,0.3)] text-xs text-[#f85149]">
            {formError}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="gh-btn gh-btn-default disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !dirty || nameOverLimit || descriptionOverLimit}
            className="gh-btn gh-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
