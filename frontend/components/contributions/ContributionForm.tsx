"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { createContribution } from "@/lib/api/contribution.api";
import type { ContributionCategory, Club } from "@/types";

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

interface ContributionFormProps {
  clubs?: Club[]; // Only needed for ADMIN
}

export function ContributionForm({ clubs = [] }: ContributionFormProps) {
  const { token, user } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "DEVELOPMENT" as ContributionCategory,
    hours: "",
    datePerformed: new Date().toISOString().slice(0, 10),
    attachmentUrl: "",
    clubId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const hours = parseFloat(form.hours);
    if (!form.title.trim()) return setError("Title is required");
    if (isNaN(hours) || hours <= 0 || hours > 24)
      return setError("Hours must be between 0 and 24");
    if (!form.datePerformed) return setError("Date performed is required");
    if (isAdmin && !form.clubId) return setError("Please select a club");

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        hours,
        datePerformed: form.datePerformed,
        attachmentUrl: form.attachmentUrl.trim() || undefined,
        ...(isAdmin ? { clubId: form.clubId } : {}),
      };
      await createContribution(payload, token ?? undefined);
      router.push("/contributions");
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to submit contribution");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3.5 py-2.5 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl " +
    "text-gray-200 placeholder-gray-600 " +
    "focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] " +
    "transition-all duration-200";

  const labelClass = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className={labelClass}>Title *</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Conducted Git Workshop"
          className={inputClass}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Brief description of what was accomplished..."
          rows={3}
          className={inputClass + " resize-none"}
        />
      </div>

      {/* Category + Hours row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Category *</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#0f0d1a] text-gray-100">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Hours *</label>
          <input
            type="number"
            name="hours"
            value={form.hours}
            onChange={handleChange}
            placeholder="e.g. 2.5"
            min="0.25"
            max="24"
            step="0.25"
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Date + Attachment row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date Performed *</label>
          <input
            type="date"
            name="datePerformed"
            value={form.datePerformed}
            onChange={handleChange}
            className={inputClass + " [color-scheme:dark]"}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Attachment URL</label>
          <input
            type="url"
            name="attachmentUrl"
            value={form.attachmentUrl}
            onChange={handleChange}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Club selector — Admin only */}
      {isAdmin && clubs.length > 0 && (
        <div>
          <label className={labelClass}>Club *</label>
          <select
            name="clubId"
            value={form.clubId}
            onChange={handleChange}
            className={inputClass}
            required
          >
            <option value="" className="bg-[#0f0d1a]">Select a club…</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0f0d1a] text-gray-100">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Auto-approve notice */}
      {(user?.role === "COORDINATOR" || user?.role === "ADMIN") && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400/80">
            Your contributions are automatically approved.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     text-white shadow-lg shadow-violet-600/20
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 cursor-pointer"
        >
          {submitting ? "Submitting…" : "Submit Contribution"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400
                     bg-white/[0.03] border border-white/[0.08]
                     hover:bg-white/[0.06] hover:text-gray-200
                     transition-all duration-200 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
