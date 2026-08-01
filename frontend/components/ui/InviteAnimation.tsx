"use client";

// InviteAnimation.tsx — Looping bouncing-balls animation for the invite page.
// Four balls (blue, red, yellow, green) bounce with staggered delays. Every few
// cycles the leading ball arcs up and over to the back of the line while the
// others slide forward, then the loop continues. Fully transparent background.
// Disabled for reduced-motion users.

import { useEffect, useState } from "react";

const BALLS = [
  { id: "blue", bg: "#4285F5", initialDelay: 0 },
  { id: "red", bg: "#EA4436", initialDelay: 0.2 },
  { id: "yellow", bg: "#FBBD06", initialDelay: 0.4 },
  { id: "green", bg: "#34A952", initialDelay: 0.6 },
];

export function InviteAnimation() {
  const [mounted, setMounted] = useState(false);

  // Track the current slot (0, 1, 2, or 3) for each ball.
  const [positions, setPositions] = useState({
    blue: 0,
    red: 1,
    yellow: 2,
    green: 3,
  });

  // Track which ball is currently making the jump.
  const [arcingId, setArcingId] = useState<string | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setMounted(true);

    const interval = window.setInterval(() => {
      setPositions((prev) => {
        // Find the ball currently at the front of the line (position 0).
        const leaderId = Object.keys(prev).find(
          (key) => prev[key as keyof typeof prev] === 0
        ) as keyof typeof prev;

        // Trigger the Y-axis arc animation for the leader.
        setArcingId(leaderId);
        setTimeout(() => setArcingId(null), 600);

        // The leader goes to the back (3); everyone else shifts forward (-1).
        return {
          blue: prev.blue === 0 ? 3 : prev.blue - 1,
          red: prev.red === 0 ? 3 : prev.red - 1,
          yellow: prev.yellow === 0 ? 3 : prev.yellow - 1,
          green: prev.green === 0 ? 3 : prev.green - 1,
        };
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  if (!mounted) return null;

  // Horizontal distance between each ball.
  const SPACING = 42;

  return (
    <div className="relative flex items-center justify-center h-[240px] w-full">
      {/* Local keyframes so the component stays drop-in. */}
      <style>{`
        @keyframes ball-bounce-y {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(20px); }
        }
        @keyframes ball-arc-y {
          0%   { transform: translateY(0) scale(1); animation-timing-function: ease-out; }
          50%  { transform: translateY(-56px) scale(1.1); animation-timing-function: ease-in; }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Container sized to exactly fit the 4 balls to keep them centered. */}
      <div className="relative h-[60px]" style={{ width: SPACING * 3 + 22 }}>
        {BALLS.map((ball) => {
          const pos = positions[ball.id as keyof typeof positions];
          const isArcing = arcingId === ball.id;
          return (
            // OUTER: smooth X-axis sliding via CSS transition.
            <div
              key={ball.id}
              className="absolute top-[20px] left-0"
              style={{
                transform: `translateX(${pos * SPACING}px)`,
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: isArcing ? 10 : 1,
              }}
            >
              {/* INNER: Y-axis bounce / arc via keyframes. */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: ball.bg,
                  animation: isArcing
                    ? "ball-arc-y 0.6s forwards"
                    : "ball-bounce-y 1.8s ease-in-out infinite",
                  animationDelay: isArcing ? "0s" : `${ball.initialDelay}s`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
