import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";

import { BottomTabNav } from "@/components/layout/bottom-tab-nav";
import { CommandBarLoader } from "@/components/layout/command-bar-loader";
import { NavRail } from "@/components/layout/nav-rail";
import { TopBar } from "@/components/layout/top-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/lib/env";

import "./globals.css";

const defaultUrl =
  env.VERCEL_URL === undefined ? "http://localhost:3000" : `https://${env.VERCEL_URL}`;

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "ituri-sitrep",
    template: "%s — ituri-sitrep",
  },
  description:
    "Public situational-awareness companion for the 2026 Ituri Bundibugyo virus outbreak. Every figure is anchored to a verbatim source sentence.",
  openGraph: {
    siteName: "ituri-sitrep",
    type: "website",
    locale: "en_US",
  },
  alternates: {
    languages: {
      en: `${defaultUrl}/`,
      fr: `${defaultUrl}/fr`,
    },
  },
  robots: { index: true, follow: true },
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
          <JsonLd
            schema={{
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "ituri-sitrep",
              url: defaultUrl,
              description:
                "Public situational-awareness companion for the 2026 Ituri Bundibugyo virus outbreak.",
              author: {
                "@type": "Person",
                name: "Thomas Nicklin",
                email: "tnicklin@hawaii.edu",
                affiliation: {
                  "@type": "Organization",
                  name: "University of Western Australia",
                },
                sameAs: ["https://github.com/BhodiSea"],
              },
            }}
          />
          <TooltipProvider>
            <TopBar />
            <div className="flex min-h-[calc(100vh-3.5rem)]">
              <NavRail />
              <main className="flex-1 overflow-auto pb-14 md:pb-0">{children}</main>
            </div>
            <BottomTabNav />
            <CommandBarLoader />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
