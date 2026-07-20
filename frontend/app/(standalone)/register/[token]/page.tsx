"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { validateInviteLink } from "@/lib/api/invite-link.api";
import { register } from "@/lib/api/auth.api";
import type { InviteLink } from "@/types";

function getRoleBadgeClasses(role: string): string {
  switch (role) {
    case "COORDINATOR":
      return "text-cyan-400 bg-cyan-500/15 border border-cyan-500/30";
    case "MEMBER":
      return "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30";
    default:
      return "text-gray-400 bg-gray-500/10 border border-gray-500/30";
  }
}

export default function RegisterPage() {
  const params = useParams();
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
      if (res.success) {
        setSuccess(true);
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

  // ── Validating ──
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-sm text-gray-500">Validating invite link...</p>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ──
  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">Invalid Invite Link</h1>
            <p className="text-sm text-gray-500 mt-2">{linkError}</p>
          </div>
          <p className="text-xs text-gray-600">
            Contact your admin or coordinator to get a new invite link.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Welcome aboard! 🎉</h1>
            <p className="text-sm text-gray-400 mt-2">
              Your account has been created.
              {link?.club && (
                <> You&apos;ve joined <span className="text-gray-200 font-medium">{link.club.name}</span>.</>
              )}
            </p>
          </div>
          <p className="text-xs text-gray-600">You can now log in with your credentials.</p>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding + invite context */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700
                          flex items-center justify-center shadow-lg shadow-violet-600/20">
            <span className="text-white text-lg font-extrabold">CM</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              Join{" "}
              <span className="text-violet-400">
                {link?.club?.name ?? "ClubMgmt"}
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              You&apos;ve been invited as a{" "}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px]
                              font-semibold tracking-wider uppercase mx-0.5
                              ${getRoleBadgeClasses(link?.role ?? "MEMBER")}`}>
                {link?.role}
              </span>
            </p>
          </div>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4 backdrop-blur-xl"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="block text-xs font-medium text-gray-400">Full Name</label>
            <input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl
                         text-gray-100 placeholder:text-gray-600 text-sm
                         focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                         transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="block text-xs font-medium text-gray-400">Email Address</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl
                         text-gray-100 placeholder:text-gray-600 text-sm
                         focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                         transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="block text-xs font-medium text-gray-400">Password</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl
                         text-gray-100 placeholder:text-gray-600 text-sm
                         focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                         transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* Phone (optional) */}
          <div className="space-y-1.5">
            <label htmlFor="reg-phone" className="block text-xs font-medium text-gray-400">
              Phone <span className="text-gray-600">(optional)</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91-9876543210"
              disabled={submitting}
              className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl
                         text-gray-100 placeholder:text-gray-600 text-sm
                         focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                         transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {/* Error */}
          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {formError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                       hover:from-violet-500 hover:to-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30
                       transition-all duration-200 cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Expiry / usage info */}
        {link && (
          <p className="text-center text-[11px] text-gray-600">
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
