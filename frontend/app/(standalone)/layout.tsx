import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Join ClubMgmt — Register",
  description: "Register with your invite link to join a club.",
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
      className={`${inter.className} min-h-screen bg-[#0a0a0f] text-gray-100 antialiased`}
      style={{ background: "linear-gradient(168deg, #0a0a0f 0%, #0f0d1a 50%, #0a0a0f 100%)" }}
    >
        {children}
    </div>
  );
}
