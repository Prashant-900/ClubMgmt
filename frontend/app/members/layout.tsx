import type { Metadata } from "next";
import type { ReactNode } from "react";

// The member pages are client components and cannot export metadata themselves
export const metadata: Metadata = {
  title: "Member profile",
  description:
    "A member's contribution record, invite lineage, and activity heatmap.",
};

export default function MembersLayout({ children }: { children: ReactNode }) {
  return children;
}
