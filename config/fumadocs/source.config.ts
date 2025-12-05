import { remarkMdxFiles } from "fumadocs-core/mdx-plugins";
import { applyMdxPreset, defineCollections, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

import { auraDarkTheme, auraLightTheme } from "../../src/features/videos/shared/aura-theme";

export const videos = defineCollections({
  type: "doc",
  dir: "content/videos",
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
    youtubeVideoId: z.string(),
  }),
  mdxOptions: applyMdxPreset({
    preset: "fumadocs",
    remarkPlugins: [remarkMdxFiles],
    rehypeCodeOptions: {
      themes: {
        light: auraLightTheme,
        dark: auraDarkTheme,
      },
    },
  }),
});
