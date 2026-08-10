// icons/index.tsx — inline SVG icon system for GDG (Google-style, stroke-based).
// All icons accept standard SVG props (className, strokeWidth, etc.) and inherit
// `currentColor`, so color them with Tailwind text-* utilities.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// ── Navigation ──────────────────────────────────────────────────────────────
export const OverviewIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Base>
);

export const ContributionsIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <path d="M14 3v5h5" />
    <path d="M8 13h6M8 16.5h4" />
  </Base>
);

export const InviteIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M18 8v6M15 11h6" />
  </Base>
);

export const EventsIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Base>
);

// ── Notification bell ────────────────────────────────────────────────────────
export const BellIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10.5 20a2 2 0 0 0 3 0" />
  </Base>
);

// ── Search ───────────────────────────────────────────────────────────────────
export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
);

// ── Status ───────────────────────────────────────────────────────────────────
export const CheckCircleIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Base>
);

export const XCircleIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Base>
);

// ── Misc UI ──────────────────────────────────────────────────────────────────
export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);

export const SignOutIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" />
  </Base>
);

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5a3 3 0 0 1 0 6M17.5 20a6.5 6.5 0 0 0-3-5.5" />
  </Base>
);

export const TrophyIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    <path d="M12 13v4M9 21h6M10 17h4" />
  </Base>
);

// ── Brand mark: "</>" logo tile ──────────────────────────────────────────────
// Four-color "</>" bracket. Each bracket is a two-stick chevron split by color:
//   "<"  → red top stick, blue bottom stick
//   ">"  → green top stick, yellow bottom stick
// Rendered with no fill so it sits inside a transparent, outlined box.
export const LogoMark = (p: IconProps) => (
  <Base strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {/* "<" */}
    <path d="M8 8 L4 12" stroke="#ea4335" /> {/* top stick — red */}
    <path d="M4 12 L8 16" stroke="#4285f4" /> {/* bottom stick — blue */}
    {/* ">" */}
    <path d="M16 8 L20 12" stroke="#34a853" /> {/* top stick — green */}
    <path d="M20 12 L16 16" stroke="#fbbc05" /> {/* bottom stick — yellow */}
  </Base>
);
