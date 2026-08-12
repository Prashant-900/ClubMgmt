import type { Metadata } from "next";
import type { ReactNode } from "react";

// The contributions pages are client components and cannot export metadata
export const metadata: Metadata = {
  title: "Contributions",
  description:
    "Browse, filter, and review contributions submitted by domain members.",
};

export default function ContributionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
