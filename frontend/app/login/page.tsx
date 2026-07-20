"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[rgba(12,12,18,0.92)] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-10 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-600" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">
              ClubMgmt Access
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-50 tracking-tight mt-1">
              Sign in with Google
            </h1>
          </div>
        </div>

        <p className="text-sm sm:text-base text-gray-400 leading-6 max-w-prose">
          Use your Google account to create or access your club profile. After
          Google approves the sign-in, you will be redirected back into the app
          with a JWT session.
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="mt-8 inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full
                     bg-white text-slate-950 font-semibold hover:bg-slate-100 transition-colors"
        >
          <span className="text-lg">G</span>
          Continue with Google
        </button>

        <p className="mt-5 text-xs text-gray-500">
          Backend redirect: <span className="text-gray-300">{API_BASE_URL}/auth/google</span>
        </p>
      </div>
    </div>
  );
}