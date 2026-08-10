"use client";

import { useEffect } from "react";
// global-error replaces the root layout, so it must pull in global styles itself
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Next.js 16.2+ — re-fetches and re-renders the segment. */
  unstable_retry?: () => void;
  /** Clears the error state without re-fetching (legacy fallback). */
  reset?: () => void;
}

/**
 * Last-resort error boundary — catches failures in the root layout itself,
 * which app/error.tsx cannot see. Must render its own <html>/<body>.
 * Error boundaries must be Client Components, so `metadata` is unavailable;
 * the React <title> component is used instead.
 */
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: GlobalErrorProps) {
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleRetry() {
    if (unstable_retry) {
      unstable_retry();
      return;
    }
    reset?.();
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gh-canvas-default text-gh-text-primary antialiased">
        <title>Something went wrong · GDG</title>
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-gh-canvas-subtle border border-gh-border-default rounded-lg p-6 animate-scale-in">
            <h1 className="text-base font-semibold text-gh-text-primary">
              Something went wrong
            </h1>
            <p className="mt-1 text-sm text-gh-text-secondary">
              {isDev
                ? "The application shell failed to render."
                : "GDG could not load. Trying again usually fixes it."}
            </p>

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
              {/* Plain anchor — the router is unavailable once the shell has failed */}
              <a href="/" className="gh-btn gh-btn-default">
                Back to dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
