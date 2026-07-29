"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { validateInviteLink } from "@/lib/api/invite-link.api";
import { register } from "@/lib/api/auth.api";
import { useAuth } from "@/components/providers/AuthProvider";
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

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const { setSession } = useAuth();
  const inviteToken = params.token as string;

  const [link, setLink] = useState<InviteLink | null>(null);
  const [validating, setValidating] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGoogleSignup = () => {
    window.location.href = `${API_BASE_URL}/auth/google?inviteToken=${encodeURIComponent(inviteToken)}`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("Name, email, and password are required.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await register({
        inviteToken,
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      if (res.success && res.data?.token) {
        // Seed the in-memory session — the HttpOnly refresh cookie is already
        // set by the backend response. No localStorage needed.
        await setSession(res.data.token);
        setSuccess(true);
        // Redirect to dashboard after a brief success display
        setTimeout(() => router.push("/"), 1800);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Registration failed. Please try again.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const errorId = "register-form-error";
  const describedBy = formError ? errorId : undefined;
  const inputClass = "gh-input py-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClass = "block text-xs font-medium text-gh-text-secondary";

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
            <div className="h-3 w-24 rounded-md skeleton mx-auto" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 rounded-md skeleton" />
                <div className="h-8 w-full rounded-md skeleton" />
              </div>
            ))}
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

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gh-success-muted border border-gh-success-emphasis/40 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gh-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gh-text-primary">Welcome aboard</h1>
          </div>

          <div className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-3 text-center">
            <p className="text-sm text-gh-text-secondary" role="status">
              Your account has been created.
              {link?.club && (
                <> You&apos;ve joined <span className="text-gh-text-primary font-medium">{link.club.name}</span>.</>
              )}
            </p>
            <p className="text-xs text-gh-text-tertiary">
              You can now log in with your credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Branding + invite context */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gh-canvas-subtle border border-gh-border-default rounded-lg flex items-center justify-center mb-4">
            <span className="text-base font-extrabold text-gh-text-primary font-mono tracking-tight">
              CM
            </span>
          </div>
          <h1 className="text-xl font-semibold text-gh-text-primary text-center">
            Join {link?.club?.name ?? "ClubMgmt"}
          </h1>
          <p className="text-sm text-gh-text-secondary mt-1.5 flex items-center gap-1.5">
            You&apos;ve been invited as
            {link?.role && <RoleBadge role={link.role} />}
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-gh-canvas-subtle border border-gh-border-default rounded-md p-5 space-y-4"
        >
          {/*
            Google's brand guidelines require the light button treatment, so
            these values intentionally sit outside the gh-* dark palette.
          */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white text-[#1f2328] text-sm font-semibold
                       rounded-md border border-[#d0d7de] cursor-pointer transition-colors hover:bg-[#f3f4f6]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                       focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-gh-text-tertiary uppercase tracking-wider">
            <span className="h-px flex-1 bg-gh-border-default" />
            or
            <span className="h-px flex-1 bg-gh-border-default" />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className={labelClass}>
              Full name <span className="text-gh-danger-fg">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={submitting}
              aria-describedby={describedBy}
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className={labelClass}>
              Email address <span className="text-gh-danger-fg">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={submitting}
              aria-describedby={describedBy}
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="reg-password" className={labelClass}>
              Password <span className="text-gh-danger-fg">*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
              disabled={submitting}
              aria-describedby={describedBy}
              className={inputClass}
            />
          </div>

          {/* Phone (optional) */}
          <div className="space-y-1.5">
            <label htmlFor="reg-phone" className={labelClass}>
              Phone <span className="text-gh-text-tertiary">(optional)</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91-9876543210"
              disabled={submitting}
              className={inputClass}
            />
          </div>

          {/* Error */}
          {formError && (
            <div
              id={errorId}
              role="alert"
              className="px-3 py-2 rounded-md bg-gh-danger-muted border border-gh-danger-emphasis/40 text-sm text-gh-danger-fg flex items-start gap-2"
            >
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {formError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="gh-btn gh-btn-primary w-full justify-center py-2 disabled:opacity-50 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gh-accent-emphasis
                       focus-visible:ring-offset-2 focus-visible:ring-offset-gh-canvas-subtle"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

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
