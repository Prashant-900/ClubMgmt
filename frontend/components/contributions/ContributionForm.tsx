"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  createContribution,
  updateContribution,
} from "@/lib/api/contribution.api";
import type { Contribution, ContributionCategory, Club } from "@/types";

const CATEGORIES: { value: ContributionCategory; label: string }[] = [
  { value: "DEVELOPMENT", label: "Development" },
  { value: "WORKSHOP", label: "Workshop" },
  { value: "PRESENTATION", label: "Presentation" },
  { value: "DESIGN", label: "Design" },
  { value: "EVENT_SUPPORT", label: "Event Support" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "MEETING", label: "Meeting" },
  { value: "OTHER", label: "Other" },
];

// ── Limits, mirrored from the server-side validation ──────────────────────────

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const ATTACHMENT_MAX = 2048;
const HOURS_MIN = 0.25;
const HOURS_MAX = 24;
const HOURS_STEP = 0.25;

/** Today in the user's local timezone, as `YYYY-MM-DD`. */
function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** The editable shape of a contribution, all values held as form strings. */
export interface ContributionFormValues {
  title: string;
  description: string;
  category: ContributionCategory;
  hours: string;
  datePerformed: string;
  attachmentUrl: string;
  /** Only meaningful when an ADMIN creates a contribution. */
  clubId: string;
}

function emptyValues(): ContributionFormValues {
  return {
    title: "",
    description: "",
    category: "DEVELOPMENT",
    hours: "",
    datePerformed: todayISO(),
    attachmentUrl: "",
    clubId: "",
  };
}

/** Build form values from an existing contribution, for the edit flow. */
export function toFormValues(
  contribution: Contribution
): ContributionFormValues {
  return {
    title: contribution.title,
    description: contribution.description ?? "",
    category: contribution.category,
    hours: String(contribution.hours),
    datePerformed: contribution.datePerformed.slice(0, 10),
    attachmentUrl: contribution.attachmentUrl ?? "",
    clubId: contribution.club?.id ?? "",
  };
}

interface ContributionFormProps {
  /** Club options — only needed when an ADMIN is creating. */
  clubs?: Club[];
  /** `create` (default) posts a new contribution; `edit` patches an existing one. */
  mode?: "create" | "edit";
  /** Prefilled values; anything omitted falls back to the create defaults. */
  initialValues?: Partial<ContributionFormValues>;
  /** Required when `mode` is `edit`. */
  contributionId?: string;
}

/**
 * Contribution submit/edit form.
 *
 * The same component backs both `/contributions/submit` (create) and
 * `/contributions/[id]/edit` (edit); the mode only changes which endpoint is
 * called, where the user lands afterwards, and the club selector's visibility.
 * Client-side validation mirrors the server so mistakes surface immediately,
 * but server messages are still rendered inline verbatim.
 */
export function ContributionForm({
  clubs = [],
  mode = "create",
  initialValues,
  contributionId,
}: ContributionFormProps) {
  const { token, user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<ContributionFormValues>({
    ...emptyValues(),
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = mode === "edit";
  const isAdmin = user?.role === "ADMIN";
  const maxDate = todayISO();

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  /** Returns the first validation problem, or null when the form is valid. */
  function validate(): string | null {
    const title = form.title.trim();
    if (!title) return "Title is required";
    if (title.length > TITLE_MAX)
      return `Title must be ${TITLE_MAX} characters or fewer`;

    if (form.description.length > DESCRIPTION_MAX)
      return `Description must be ${DESCRIPTION_MAX} characters or fewer`;

    const hours = parseFloat(form.hours);
    if (Number.isNaN(hours)) return "Hours is required";
    if (hours < HOURS_MIN || hours > HOURS_MAX)
      return `Hours must be between ${HOURS_MIN} and ${HOURS_MAX}`;
    // 0.25 steps — compare in quarter-hours to dodge float noise
    if (Math.abs(hours / HOURS_STEP - Math.round(hours / HOURS_STEP)) > 1e-9)
      return `Hours must be in increments of ${HOURS_STEP}`;

    if (!form.datePerformed) return "Date performed is required";
    if (form.datePerformed > maxDate)
      return "Date performed cannot be in the future";

    const attachment = form.attachmentUrl.trim();
    if (attachment) {
      if (attachment.length > ATTACHMENT_MAX)
        return `Attachment URL must be ${ATTACHMENT_MAX} characters or fewer`;
      let parsed: URL;
      try {
        parsed = new URL(attachment);
      } catch {
        return "Attachment must be a valid http:// or https:// URL";
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        return "Attachment must be a valid http:// or https:// URL";
    }

    if (!isEdit && isAdmin && clubs.length > 0 && !form.clubId)
      return "Please select a domain";

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    if (isEdit && !contributionId) {
      setError("Missing contribution id — cannot save changes");
      return;
    }

    const hours = parseFloat(form.hours);
    const attachmentUrl = form.attachmentUrl.trim();

    setSubmitting(true);
    try {
      if (isEdit && contributionId) {
        await updateContribution(
          contributionId,
          {
            title: form.title.trim(),
            // Sent even when empty so the description can be cleared
            description: form.description.trim(),
            category: form.category,
            hours,
            datePerformed: form.datePerformed,
            ...(attachmentUrl ? { attachmentUrl } : {}),
          },
          token ?? undefined
        );
        router.push(`/contributions/${contributionId}`);
      } else {
        await createContribution(
          {
            title: form.title.trim(),
            description: form.description.trim() || undefined,
            category: form.category,
            hours,
            datePerformed: form.datePerformed,
            ...(attachmentUrl ? { attachmentUrl } : {}),
            ...(isAdmin ? { clubId: form.clubId } : {}),
          },
          token ?? undefined
        );
        router.push("/contributions");
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(
        e?.message ??
          (isEdit
            ? "Failed to save changes"
            : "Failed to submit contribution")
      );
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-xs font-medium text-gh-text-secondary";
  const counterClass = "text-[11px] text-gh-text-tertiary tabular-nums";
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle";
  const errorId = "contribution-form-error";
  const describedBy = error ? errorId : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Title */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="contribution-title" className={labelClass}>
            Title <span className="text-gh-danger-fg">*</span>
          </label>
          <span className={counterClass} aria-hidden="true">
            {form.title.length}/{TITLE_MAX}
          </span>
        </div>
        <input
          id="contribution-title"
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Conducted Git Workshop"
          maxLength={TITLE_MAX}
          className="gh-input py-2"
          aria-describedby={describedBy}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="contribution-description" className={labelClass}>
            Description{" "}
            <span className="text-gh-text-tertiary">(optional)</span>
          </label>
          <span className={counterClass} aria-hidden="true">
            {form.description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="contribution-description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Brief description of what was accomplished…"
          rows={3}
          maxLength={DESCRIPTION_MAX}
          className="gh-input py-2 resize-none"
          aria-describedby={describedBy}
        />
      </div>

      {/* Category + Hours row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="contribution-category" className={labelClass}>
            Category <span className="text-gh-danger-fg">*</span>
          </label>
          <select
            id="contribution-category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className="gh-select w-full py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contribution-hours" className={labelClass}>
            Hours <span className="text-gh-danger-fg">*</span>
          </label>
          <input
            id="contribution-hours"
            type="number"
            name="hours"
            value={form.hours}
            onChange={handleChange}
            placeholder="e.g. 2.5"
            min={HOURS_MIN}
            max={HOURS_MAX}
            step={HOURS_STEP}
            className="gh-input py-2"
            aria-describedby={`contribution-hours-hint${
              describedBy ? ` ${describedBy}` : ""
            }`}
            required
          />
          <p
            id="contribution-hours-hint"
            className="text-[11px] text-gh-text-tertiary"
          >
            {HOURS_MIN}–{HOURS_MAX}, in {HOURS_STEP}h steps
          </p>
        </div>
      </div>

      {/* Date + Attachment row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="contribution-date" className={labelClass}>
            Date performed <span className="text-gh-danger-fg">*</span>
          </label>
          <input
            id="contribution-date"
            type="date"
            name="datePerformed"
            value={form.datePerformed}
            onChange={handleChange}
            max={maxDate}
            className="gh-input py-2 [color-scheme:dark]"
            aria-describedby={`contribution-date-hint${
              describedBy ? ` ${describedBy}` : ""
            }`}
            required
          />
          <p
            id="contribution-date-hint"
            className="text-[11px] text-gh-text-tertiary"
          >
            Cannot be in the future
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="contribution-attachment" className={labelClass}>
            Attachment URL{" "}
            <span className="text-gh-text-tertiary">(optional)</span>
          </label>
          <input
            id="contribution-attachment"
            type="url"
            name="attachmentUrl"
            value={form.attachmentUrl}
            onChange={handleChange}
            placeholder="https://…"
            maxLength={ATTACHMENT_MAX}
            className="gh-input py-2"
            aria-describedby={describedBy}
          />
        </div>
      </div>

      {/* Club selector — ADMIN, create only. A contribution never changes club. */}
      {!isEdit && isAdmin && clubs.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="contribution-club" className={labelClass}>
            Domain <span className="text-gh-danger-fg">*</span>
          </label>
          <select
            id="contribution-club"
            name="clubId"
            value={form.clubId}
            onChange={handleChange}
            className="gh-select w-full py-2"
            aria-describedby={describedBy}
            required
          >
            <option value="">Select a domain…</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Auto-approve notice — create only */}
      {!isEdit &&
        (user?.role === "COORDINATOR" || user?.role === "ADMIN") && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-gh-success-muted border border-gh-success-emphasis/40">
            <svg
              className="w-4 h-4 shrink-0 mt-px text-gh-success-fg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gh-success-fg">
              Your contributions are automatically approved.
            </p>
          </div>
        )}

      {/* Edit notice */}
      {isEdit && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-gh-accent-subtle border border-gh-accent-emphasis/40">
          <svg
            className="w-4 h-4 shrink-0 mt-px text-role-coordinator"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-gh-text-secondary">
            Edits are only possible while this contribution is still pending
            review.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-start gap-2 px-3 py-2 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg"
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className={`gh-btn gh-btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`}
        >
          {submitting
            ? isEdit
              ? "Saving…"
              : "Submitting…"
            : isEdit
              ? "Save changes"
              : "Submit contribution"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={submitting}
          className={`gh-btn gh-btn-default disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
