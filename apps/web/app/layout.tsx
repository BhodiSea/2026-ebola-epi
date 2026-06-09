import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";

import { BottomTabNav } from "@/components/layout/bottom-tab-nav";
import { CommandBarLoader } from "@/components/layout/command-bar-loader";
import { NavRail } from "@/components/layout/nav-rail";
import { TopBar } from "@/components/layout/top-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/lib/env";

import "./globals.css";

const defaultUrl = siteUrl();

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

// Runs before React hydrates: reads localStorage and sets data-theme on <html>.
// Lives in <head> so React 19 does not emit the body-script warning.
const PREHYDRATION = `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.setAttribute("data-theme",r)}catch(e){}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- React's required API shape for dangerouslySetInnerHTML
  const prehydrationHtml = { __html: PREHYDRATION };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static string literal set at build time, not user input
          dangerouslySetInnerHTML={prehydrationHtml}
          {...(nonce !== undefined && { nonce })}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif4.variable} font-sans antialiased`}
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
        <ThemeProvider>
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
        <Analytics />
      </body>
    </html>
  );
}
