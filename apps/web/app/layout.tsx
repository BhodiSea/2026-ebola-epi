import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";

import { NavRail } from "@/components/layout/nav-rail";
import { TopBar } from "@/components/layout/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";

import "./globals.css";

const CommandBar = dynamic(
  async () => {
    const m = await import("@/components/layout/command-bar");
    return m.CommandBar;
  },
  { ssr: false },
);

const defaultUrl =
  env.VERCEL_URL === undefined ? "http://localhost:3000" : `https://${env.VERCEL_URL}`;

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "ituri-sitrep",
  description: "2026 Ituri Bundibugyo virus outbreak situational awareness",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  display: "swap",
  subsets: ["latin"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  display: "swap",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif4.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          {...(nonce !== undefined && { nonce })}
        >
          <TooltipProvider>
            <TopBar />
            <div className="flex min-h-[calc(100vh-3.5rem)]">
              <NavRail />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
            <CommandBar />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
