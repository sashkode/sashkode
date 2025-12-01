import { defineCollections, frontmatterSchema } from "fumadocs-mdx/config";
import { z } from "zod";

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
    youtubeVideoId: z.string().optional(),
    youtubeThumbnailUrl: z.string().url().optional(),
  }),
});
