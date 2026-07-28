import type { Metadata } from "next";
import type { ReactNode } from "react";

// The submit page is a client component and cannot export metadata itself
export const metadata: Metadata = {
  title: "Submit a contribution",
  description: "Log the hours you have contributed to your club for review.",
};

export default function SubmitContributionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
