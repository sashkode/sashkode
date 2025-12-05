import type { MetadataRoute } from "next";

import { videos } from "~/features/videos/server/source";

const BASE_URL = "https://sashkode.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const videoPages = videos.getPages().map((page) => ({
    url: `https://videos.sashkode.dev/${page.slugs[0]}`,
    lastModified: page.data.date ? new Date(page.data.date) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://videos.sashkode.dev",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...videoPages,
  ];
}
