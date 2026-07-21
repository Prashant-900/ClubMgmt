"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listClubs } from "@/lib/api/club.api";
import type { Club } from "@/types";

function ClubSkeletonCard() {
  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 h-32 cursor-pointer transition-transform hover:scale-105 active:scale-95 group">
      <div className="h-5 w-32 skeleton rounded-full" />
      <div className="h-3 w-16 skeleton rounded-full" />
    </div>
  );
}

export function ClubGrid() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listClubs();
      if (res.success && res.data) {
        setClubs(res.data);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to fetch clubs";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ClubSkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-center gap-3">
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <p className="font-medium">Could not load clubs</p>
          <p className="text-xs text-red-400/60 mt-0.5">{error}</p>
        </div>
        <button
          onClick={fetchClubs}
          className="ml-auto px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium">No clubs found</p>
        <p className="text-xs text-gray-600 mt-1">Create clubs in the system to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clubs.map((club) => (
        <div
          key={club.id}
          onClick={() => router.push(`/?clubId=${club.id}`)}
          className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 flex flex-col items-center justify-center h-32 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/30 group"
        >
          <h3 className="text-lg font-semibold text-gray-200 group-hover:text-violet-300 transition-colors">
            {club.name}
          </h3>
          <span className="text-xs text-gray-500 mt-2 flex items-center gap-1 group-hover:text-gray-400">
            View Members
            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      ))}
    </div>
  );
}
