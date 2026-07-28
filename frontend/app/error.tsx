"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  /** Next.js 16.2+ — re-fetches and re-renders the segment. */
  unstable_retry?: () => void;
  /** Clears the error state without re-fetching (legacy fallback). */
  reset?: () => void;
}

/**
 * Route-level error boundary for the whole app segment.
 * Error boundaries must be Client Components.
 */
export default function Error({ error, unstable_retry, reset }: ErrorPageProps) {
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleRetry() {
    // Prefer retry (re-fetches the segment); fall back to reset
    if (unstable_retry) {
      unstable_retry();
      return;
    }
    reset?.();
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-gh-canvas-subtle border border-gh-border-default rounded-lg p-6 animate-scale-in">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-full bg-gh-danger-muted flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gh-danger-fg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gh-text-primary">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-gh-text-secondary">
              {isDev
                ? "An unexpected error was thrown while rendering this page."
                : "We hit an unexpected problem loading this page. Trying again usually fixes it."}
            </p>
          </div>
        </div>

        {isDev && error.message ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-gh-canvas-inset border border-gh-border-muted p-3 text-xs font-mono text-gh-danger-fg whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        ) : null}

        {error.digest ? (
          <p className="mt-3 text-xs font-mono text-gh-text-tertiary">
            Error ID: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="gh-btn gh-btn-primary"
          >
            Try again
          </button>
          {/* The dashboard lives at "/" in this app — there is no /dashboard route */}
          <Link href="/" className="gh-btn gh-btn-default">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
