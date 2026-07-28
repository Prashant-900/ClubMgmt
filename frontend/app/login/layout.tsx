import type { Metadata } from "next";
import type { ReactNode } from "react";

// The login page is a client component and cannot export metadata itself
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to ClubMgmt to track and review club contributions.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
