"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TOKEN_STORAGE_KEY = "clubmgmt.auth.token";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    const error = searchParams.get("error");
    const token = searchParams.get("token");

    if (error) {
      setMessage(error);
      return;
    }

    if (!token) {
      setMessage("Missing session token from Google sign-in.");
      return;
    }

    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    router.replace("/");
  }, [router, searchParams]);

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[rgba(12,12,18,0.92)] backdrop-blur-2xl p-8 shadow-2xl shadow-black/40 text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/70 mb-3">
          Auth callback
        </p>
        <h1 className="text-2xl font-bold text-gray-50 mb-3">Google sign-in</h1>
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  );
}