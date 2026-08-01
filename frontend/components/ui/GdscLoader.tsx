"use client";

// GdscLoader.tsx — GDSC 7-dot morphing loader
// Ported from the Krackhack reference (loading/loading.css + Loading.jsx).
// Seven Google-colored dots run a single ~6s morph sequence (plays once).
// Keyframes live in globals.css (.dsc-dot*, @keyframes dsc-dot*).

export function GdscLoader() {
  return (
    <div className="dsc-loader" role="status" aria-label="Loading">
      <div className="dsc-dot dsc-dot1" />
      <div className="dsc-dot dsc-dot2" />
      <div className="dsc-dot dsc-dot3" />
      <div className="dsc-dot dsc-dot4" />
      <div className="dsc-dot dsc-dot5" />
      <div className="dsc-dot dsc-dot6" />
      <div className="dsc-dot dsc-dot7" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
