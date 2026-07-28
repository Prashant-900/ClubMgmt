import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

const APP_DESCRIPTION =
  "Track and approve club contributions across your college organization. " +
  "ClubMgmt gives admins, coordinators, and members a shared, role-based view " +
  "of who is contributing, how much, and when.";

export const metadata: Metadata = {
  title: {
    default: "ClubMgmt",
    template: "%s · ClubMgmt",
  },
  description: APP_DESCRIPTION,
  applicationName: "ClubMgmt",
  openGraph: {
    type: "website",
    siteName: "ClubMgmt",
    title: "ClubMgmt",
    description: APP_DESCRIPTION,
  },
};

// themeColor / colorScheme belong in the viewport export, not metadata
export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-[#0d1117] text-[#e6edf3] antialiased">
        <AuthProvider>
          <Navbar />
          {/* pt-28 accounts for 64px navbar top bar + 44px tab row */}
          <main className="pt-28 min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
