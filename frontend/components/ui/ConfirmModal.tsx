"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Controlled, accessible confirmation dialog.
 * Replaces `window.confirm` so destructive actions match the design system.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Escape closes the dialog
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  // Lock body scroll while the dialog is open
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Move focus to the confirm button on open
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop — clicking it cancels */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm bg-gh-canvas-subtle border border-gh-border-default
                   rounded-lg shadow-2xl shadow-black/50 p-5 animate-scale-in"
      >
        <h2
          id={titleId}
          className="text-base font-semibold text-gh-text-primary"
        >
          {title}
        </h2>

        <div className="mt-2 text-sm text-gh-text-secondary">{message}</div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="gh-btn gh-btn-default disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`gh-btn ${
              variant === "danger" ? "gh-btn-danger" : "gh-btn-primary"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
