"use client";

// LoadingOverlay.tsx — full-screen white overlay that shows the GDSC loader once.
// Mirrors the Krackhack LoadingOverlay: renders the loader, then fades out and
// unmounts after ~4s. Shown on first app load (see layout.tsx). Respects
// prefers-reduced-motion by shortening to an instant dismiss.

import { useEffect, useState } from "react";
import { GdscLoader } from "./GdscLoader";

const VISIBLE_MS = 4000;
const FADE_MS = 500;

export function LoadingOverlay() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      // Skip the long animation for reduced-motion users.
      const t = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(t);
    }

    const leaveTimer = setTimeout(() => setLeaving(true), VISIBLE_MS);
    const hideTimer = setTimeout(() => setShow(false), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`dsc-loader-overlay${leaving ? " is-leaving" : ""}`}
      aria-hidden={leaving}
    >
      <GdscLoader />
    </div>
  );
}
