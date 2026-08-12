import type { Metadata } from "next";
import type { ReactNode } from "react";

// The invite page is a client component and cannot export metadata itself
export const metadata: Metadata = {
  title: "Invite links",
  description:
    "Create and revoke invite links for coordinators and domain members.",
};

export default function InviteLayout({ children }: { children: ReactNode }) {
  return children;
}
