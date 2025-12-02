import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { applyMdxPreset, defineCollections, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

import { auraTheme } from "../../src/features/videos/shared/aura-theme";

export const videos = defineCollections({
  type: "doc",
  dir: "content/videos",
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
    youtubeVideoId: z.string().optional(),
    youtubeThumbnailUrl: z.string().url().optional(),
  }),
  mdxOptions: applyMdxPreset({
    preset: "fumadocs",
    rehypeCodeOptions: {
      themes: {
        light: auraTheme,
        dark: auraTheme,
      },
      transformers: [...(rehypeCodeDefaultOptions.transformers ?? [])],
    },
  }),
});
