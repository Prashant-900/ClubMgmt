"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { inviteMember } from "@/lib/api/member.api";
import { RoleGate } from "@/components/ui/RoleGate";
import type { Role } from "@/types";

interface InvitedUser {
  email: string;
  role: string;
  id: string;
}

const ROLE_OPTIONS: { label: string; value: Role; description: string; color: string }[] = [
  {
    label: "Coordinator",
    value: "COORDINATOR",
    description: "Can manage members and view all data",
    color: "cyan",
  },
  {
    label: "Member",
    value: "MEMBER",
    description: "Basic access to club features",
    color: "emerald",
  },
];

function getRoleClasses(role: string, isSelected: boolean): string {
  if (role === "COORDINATOR") {
    return isSelected
      ? "border-cyan-500/50 bg-cyan-500/10 ring-2 ring-cyan-500/20"
      : "border-white/[0.06] bg-white/[0.02] hover:border-cyan-500/30 hover:bg-cyan-500/5";
  }
  return isSelected
    ? "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/20"
    : "border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/5";
}

export function InviteForm() {
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invited, setInvited] = useState<InvitedUser[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await inviteMember({ email: email.trim(), role }, token ?? undefined);
      if (res.success && res.data) {
        setSuccess(`Successfully invited ${email} as ${role}`);
        setInvited((prev) => [
          { email: email.trim(), role, id: res.data!.id },
          ...prev,
        ]);
        setEmail("");
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to invite member";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGate
      allowedRoles={["ADMIN", "COORDINATOR"]}
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">Access Denied</p>
          <p className="text-xs text-gray-600 mt-1">You don&apos;t have permission to invite members</p>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Invite form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@example.com"
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl
                         text-gray-100 placeholder:text-gray-600 text-sm
                         focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10
                         transition-all duration-200"
              disabled={loading}
            />
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Assign Role
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
                    ${getRoleClasses(option.value, role === option.value)}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        option.value === "COORDINATOR" ? "bg-cyan-400" : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-sm font-semibold text-gray-200">
                      {option.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-4">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold
                       bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                       hover:from-violet-500 hover:to-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30
                       transition-all duration-200 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Inviting...
              </span>
            ) : (
              "Send Invite"
            )}
          </button>
        </form>

        {/* Recently invited list */}
        {invited.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">
              Recently Invited ({invited.length})
            </h3>
            <div className="space-y-2">
              {invited.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 
                             bg-white/[0.02] border border-white/[0.06] rounded-xl animate-fade-in"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                    <span className="text-sm text-gray-300 truncate">{user.email}</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase shrink-0
                      ${
                        user.role === "COORDINATOR"
                          ? "text-cyan-400 bg-cyan-500/15 border border-cyan-500/30"
                          : "text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                      }`}
                  >
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-600">
              Run <code className="px-1.5 py-0.5 bg-white/5 rounded text-gray-500">npm run seed:register</code> in the backend to auto-register these users
            </p>
          </div>
        )}
      </div>
    </RoleGate>
  );
}
