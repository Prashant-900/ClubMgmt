"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { validateInviteLink } from "@/lib/api/invite-link.api";
import { RoleBadge } from "@/components/ui/Badge";
import type { InviteLink } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function RegisterPage() {
  const params = useParams();
  const inviteToken = params.token as string;

  const [link, setLink] = useState<InviteLink | null>(null);
  const [validating, setValidating] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [attemptedAppOpen, setAttemptedAppOpen] = useState(false);

  const appDeepLink = `gdg://invite/${encodeURIComponent(inviteToken)}`;

  const handleGoogleSignup = () => {
    window.location.href = `${API_BASE_URL}/auth/google?inviteToken=${encodeURIComponent(inviteToken)}`;
  };

  const tryOpenApp = () => {
    window.location.href = appDeepLink;
  };

  // Validate invite link on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await validateInviteLink(inviteToken);
        if (res.success && res.data) {
          setLink(res.data);
        } else {
          setLinkError("This invite link is not valid.");
        }
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "This invite link is not valid.";
        setLinkError(message);
      } finally {
        setValidating(false);
      }
    }
    validate();
  }, [inviteToken]);

  // Auto-attempt to open the app on mobile after validation succeeds
  useEffect(() => {
    if (!validating && link && !linkError && isMobileDevice() && !attemptedAppOpen) {
      setAttemptedAppOpen(true);
      // Give the page a moment to render before the deep-link redirect
      const timer = setTimeout(() => {
        tryOpenApp();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [validating, link, linkError, attemptedAppOpen, appDeepLink]);

  // ── Validating ──
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm" aria-busy="true" aria-live="polite">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-lg skeleton mb-4" />
            <div className="h-5 w-48 rounded-md skeleton" />
          </div>
          <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4">
            <div className="h-9 w-full rounded-md skeleton" />
          </div>
          <p className="text-center text-xs text-gh-text-tertiary mt-6">
            Validating invite link…
          </p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ──
  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gh-danger-muted border border-gh-danger-emphasis/40 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gh-danger-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gh-text-primary">Invalid invite link</h1>
          </div>

          <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-3 text-center">
            <p role="alert" className="text-sm text-gh-danger-fg">{linkError}</p>
            <p className="text-xs text-gh-text-tertiary">
              Contact your admin or coordinator to get a new invite link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Invite accept (Google-only) ──
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Branding + invite context */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gh-canvas-subtle border border-gh-border-default rounded-lg flex items-center justify-center mb-4">
            <span className="text-base font-extrabold text-gh-text-primary font-mono tracking-tight">
              GDG
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gh-text-primary text-center">
            Join {link?.club?.name ?? "GDG"}
          </h1>
          <p className="text-sm text-gh-text-secondary mt-1.5 flex items-center gap-1.5">
            You&apos;ve been invited as
            {link?.role && <RoleBadge role={link.role} />}
          </p>
        </div>

        {/* Accept card */}
        <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4">
          {isMobileDevice() && (
            <>
              <button
                type="button"
                onClick={tryOpenApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gh-accent-emphasis text-white text-sm font-semibold
                           rounded-md cursor-pointer transition-colors hover:bg-gh-accent-emphasis/90
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                           focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Open in app
              </button>

              <div className="flex items-center gap-3 text-xs text-gh-text-tertiary uppercase tracking-wider">
                <span className="h-px flex-1 bg-gh-border-default" />
                or continue on web
                <span className="h-px flex-1 bg-gh-border-default" />
              </div>
            </>
          )}

          {/*
            Google's brand guidelines require the light button treatment, so
            these values intentionally sit outside the gh-* dark palette.
          */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white text-[#f1f3f4] text-sm font-semibold
                       rounded-md border border-[#dadce0] cursor-pointer transition-colors hover:bg-[#202124]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                       focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-center text-xs text-gh-text-tertiary">
            {isMobileDevice()
              ? "If the app is installed, it will open automatically. Otherwise sign in here."
              : "Sign in with the Google account you want to use for this domain."}
          </p>
        </div>

        {/* Expiry / usage info */}
        {link && (
          <p className="text-center text-xs text-gh-text-tertiary mt-6">
            Link expires{" "}
            {new Date(link.expiresAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {link.maxUses - link.usedCount} spot{link.maxUses - link.usedCount !== 1 ? "s" : ""} remaining
          </p>
        )}
      </div>
    </div>
  );
}
