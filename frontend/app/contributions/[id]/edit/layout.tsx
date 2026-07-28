import type { Metadata } from "next";
import type { ReactNode } from "react";

// The edit page is a client component and cannot export metadata itself
export const metadata: Metadata = {
  title: "Edit contribution",
  description: "Update the details of a contribution that is awaiting review.",
};

export default function EditContributionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
