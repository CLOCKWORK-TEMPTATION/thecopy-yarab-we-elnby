import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Cairo } from "next/font/google";

import { DESKTOP_WEB_APP_BODY_CLASS } from "@/lib/desktop-shell";

import "../styles/globals.css";
import { Providers } from "./providers";

import type { Metadata } from "next";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "النسخة - منصة الإبداع السينمائي",
  description: " اهداء ليسري نصر الله",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

// Enable ISR with 24-hour revalidation (86400 seconds)
export const revalidate = 86400;

const shouldRenderVercelTelemetry = process.env["VERCEL"] === "1";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} dark`}
      style={{ colorScheme: "dark" }}
    >
      <head>
        {/* Preconnect to Pixabay CDN used for the intro video */}
        <link rel="preconnect" href="https://cdn.pixabay.com" />
        <link rel="dns-prefetch" href="https://cdn.pixabay.com" />
      </head>
      <body
        className={`${DESKTOP_WEB_APP_BODY_CLASS} ${cairo.className} antialiased`}
      >
        <Providers>{children}</Providers>
        {shouldRenderVercelTelemetry ? (
          <>
            <SpeedInsights />
            <Analytics />
          </>
        ) : null}
      </body>
    </html>
  );
}
