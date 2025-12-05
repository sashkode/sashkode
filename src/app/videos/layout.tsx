import type { ReactNode } from "react";

import { RootProvider } from "fumadocs-ui/provider/next";

type VideosLayoutProps = {
  children: ReactNode;
};

export default function VideosLayout({ children }: VideosLayoutProps) {
  return <RootProvider>{children}</RootProvider>;
}
