import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { NavShell } from "@/components/nav/NavShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EK Wealth & Career Dashboard",
  description:
    "Personal wealth, investment and career-progress tracker. Not investment advice.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full">
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
