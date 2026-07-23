// Avatar.tsx — Reusable initials avatar, GitHub-style
import React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
type AvatarRole = "ADMIN" | "COORDINATOR" | "MEMBER" | string;

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:       "bg-[rgba(163,113,247,0.2)] text-[#a371f7] ring-[#a371f7]/30",
  COORDINATOR: "bg-[rgba(121,192,255,0.2)] text-[#79c0ff] ring-[#79c0ff]/30",
  MEMBER:      "bg-[rgba(63,185,80,0.2)]   text-[#3fb950] ring-[#3fb950]/30",
};

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}

interface AvatarProps {
  name?: string | null;
  email?: string;
  role?: AvatarRole;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({
  name,
  email = "",
  role = "MEMBER",
  size = "md",
  className = "",
}: AvatarProps) {
  const initials = getInitials(name, email);
  const colorClass = ROLE_COLORS[role] ?? ROLE_COLORS.MEMBER;

  return (
    <div
      className={`
        rounded-full flex items-center justify-center font-bold
        ring-2 shrink-0
        ${SIZE_CLASSES[size]} ${colorClass} ${className}
      `}
    >
      {initials}
    </div>
  );
}
