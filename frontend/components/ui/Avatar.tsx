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
  ADMIN:       "bg-[rgba(66,133,244,0.2)] text-[#1a73e8] ring-[#1a73e8]/30",
  COORDINATOR: "bg-[rgba(66,133,244,0.2)] text-[#1a73e8] ring-[#1a73e8]/30",
  MEMBER:      "bg-[rgba(52,168,83,0.2)]   text-[#188038] ring-[#188038]/30",
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
