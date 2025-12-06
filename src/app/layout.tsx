import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";

import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "sashkode.dev",
    template: "%s | sashkode.dev",
  },
  description: "Code tutorials, videos, and articles about modern web development with Next.js, TypeScript, and React.",
  keywords: ["Next.js", "TypeScript", "React", "Web Development", "Tutorials"],
  authors: [{ name: "sashkode" }],
  creator: "sashkode",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "sashkode.dev",
    title: "sashkode.dev",
    description: "Code tutorials, videos, and articles about modern web development with Next.js, TypeScript, and React.",
  },
  twitter: {
    card: "summary_large_image",
    title: "sashkode.dev",
    description: "Code tutorials, videos, and articles about modern web development with Next.js, TypeScript, and React.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
