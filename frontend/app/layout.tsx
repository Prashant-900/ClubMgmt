import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "ClubMgmt — Member Management",
  description:
    "Role-based club management system. Manage members, coordinators, and admins with hierarchical permissions.",
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
