import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Footer } from "@/components/layout/Footer";
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
      <body className="min-h-screen bg-bg-primary text-gray-100 antialiased">
        <AuthProvider>
          <main className="pb-20">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
