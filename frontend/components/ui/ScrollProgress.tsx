"use client";

// ScrollProgress.tsx — vertical scroll fill rail (replaces the native scrollbar).
//
// A slim indicator pinned to the right edge that fills top-to-bottom with the
// four Google hues (blue → red → green → yellow) as the page scrolls. It is
// purely decorative: pointer-events are disabled so it can never be clicked.
// Hidden entirely for reduced-motion users and whenever the page is too short
// to scroll — the visibility is re-measured on every route change so it can't
// get stuck visible after navigating from a long page to a short one.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ScrollProgress() {
  const [pct, setPct] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setMounted(true);

    const measure = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollable(max > 40);
      setPct(max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
    };

    measure();
    // Re-measure a couple of frames after mount/route change so late-loading
    // content (data fetches, images) is accounted for.
    const t1 = window.setTimeout(measure, 100);
    const t2 = window.setTimeout(measure, 400);

    // Track content-size changes (async data loads) so the rail hides itself
    // the moment the page no longer needs to scroll.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-3 top-1/2 z-40 -translate-y-1/2 transition-opacity duration-300"
      style={{
        height: "42vh",
        maxHeight: 420,
        opacity: scrollable ? 1 : 0,
      }}
    >
      {/* rail track */}
      <div className="relative h-full w-[6px] overflow-hidden rounded-full bg-[#e8eaed]">
        {/* colored fill — revealed top-down by clipping height to scroll pct.
            The inner bar stays full-height so the four segments hold position. */}
        <div
          className="absolute left-0 top-0 w-full overflow-hidden"
          style={{ height: `${pct * 100}%`, transition: "height 0.15s ease-out" }}
        >
          <div
            className="absolute left-0 top-0 w-full"
            style={{
              height: "42vh",
              maxHeight: 420,
              background:
                "linear-gradient(to bottom, #4285f4 0 25%, #ea4335 25% 50%, #34a853 50% 75%, #fbbc05 75% 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
