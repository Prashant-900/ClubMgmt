"use client";

// CustomCursor.tsx — desktop-only two-tone arrow cursor.
// A tilted arrow (like a native pointer) built from two chevron arms: the upper
// arm is Google blue, the lower arm is Google red. It tracks the pointer with
// zero smoothing (position is written straight from the mousemove event, so
// there is no trailing lag) and nudges a little larger over clickable elements.
//
// Disabled entirely on touch / coarse pointers / narrow viewports and when the
// user prefers reduced motion — in those cases the native cursor is untouched.

import { useEffect, useRef, useState } from "react";

const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, summary';

export function CustomCursor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false); // hovering something clickable
  const [visible, setVisible] = useState(false); // pointer is inside the page

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.innerWidth > 768;
    if (!fine || reduce || !wide) return;

    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    // Write the position straight from the event — no lerp, no rAF — so the
    // cursor sits exactly under the pointer with no perceptible delay.
    const onMove = (e: MouseEvent) => {
      const node = wrapRef.current;
      if (node) {
        node.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      const el = e.target as Element | null;
      setActive(!!el?.closest(INTERACTIVE));
      setVisible(true);
    };

    // Smoothly fade out when the pointer leaves the viewport (and back in on
    // re-entry) instead of freezing the arrow at its last position.
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("blur", onLeave);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] select-none will-change-transform transition-opacity duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Tilted arrow pointer whose tip (vertex) sits at the top and points
          up. Built from two arms meeting at the top vertex (11,3): the left
          arm is Google blue, the right arm is Google red. The vertex is placed
          on the pointer hotspot. */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 26 26"
        fill="none"
        className="transition-transform duration-150 ease-out"
        style={{
          transform: `translate(-11px, -3px) rotate(-30deg) scale(${active ? 1.2 : 1})`,
          transformOrigin: "11px 3px",
        }}
      >
        {/* left arm — Google blue */}
        <path
          d="M11 3 L4 20"
          stroke="#4285f4"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* right arm — Google red */}
        <path
          d="M11 3 L18 20"
          stroke="#ea4335"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
