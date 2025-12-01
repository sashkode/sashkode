import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { applyMdxPreset, defineCollections, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

import { auraTheme } from "../../src/features/blog/shared/aura-theme";

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
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
