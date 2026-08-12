import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Join a domain",
  description: "Register with your invite link to join a domain.",
};

/**
 * Standalone root layout for the registration flow.
 * Uses a route group (standalone) to bypass the main app layout.
 * No footer, no AuthProvider, no navigation — clean public page.
 */
export default function StandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <div
      lang="en"
      className={`${inter.className} min-h-screen bg-[#ffffff] text-gray-100 antialiased`}
      style={{ background: "linear-gradient(168deg, #ffffff 0%, #ffffff 50%, #ffffff 100%)" }}
    >
        {children}
    </div>
  );
}
