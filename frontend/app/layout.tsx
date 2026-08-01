import type { Metadata, Viewport } from "next";
import { Inter, Poppins, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import "./globals.css";

// Body / UI typeface.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display / heading typeface (Product Sans stand-in).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

// Mono — code, stats, and the GDG "</>" brand motifs.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
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
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${jetbrains.variable} ${inter.className}`}
    >
      <body className="min-h-screen bg-canvas text-fg antialiased">
        <LoadingOverlay />
        <CustomCursor />
        <ScrollProgress />
        <AuthProvider>
          <Navbar />
          {/* pt-28 accounts for 64px navbar top bar + 44px tab row */}
          <main className="pt-28 min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
