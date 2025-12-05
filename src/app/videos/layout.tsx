import type { Metadata } from "next";
import type { ReactNode } from "react";

import { RootProvider } from "fumadocs-ui/provider/next";

export const metadata: Metadata = {
  title: {
    default: "Videos",
    template: "%s | Videos | sashkode",
  },
  description: "Video tutorials and articles about modern web development with Next.js, TypeScript, and React.",
  openGraph: {
    title: "Videos | sashkode",
    description: "Video tutorials and articles about modern web development with Next.js, TypeScript, and React.",
  },
};

type VideosLayoutProps = {
  children: ReactNode;
};

export default function VideosLayout({ children }: VideosLayoutProps) {
  return <RootProvider>{children}</RootProvider>;
}
