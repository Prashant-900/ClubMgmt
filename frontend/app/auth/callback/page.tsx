"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
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

    // The backend has already set the HttpOnly refresh cookie; seed the access
    // token into memory (never localStorage) and continue into the app.
    setSession(token).finally(() => router.replace("/"));
  }, [router, searchParams, setSession]);

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-[#dadce0] bg-white p-8 shadow-sm text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-[#1a73e8] mb-3">
          Auth callback
        </p>
        <h1 className="text-2xl font-bold text-[#202124] mb-3 font-display">Google sign-in</h1>
        <p className="text-sm text-[#5f6368]">{message}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-5rem)] px-4 sm:px-6 flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#dadce0] bg-white p-8 shadow-sm text-center">
            <p className="text-sm text-[#5f6368]">Completing sign-in...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}