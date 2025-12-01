import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

import { blog as blogPosts } from "../../../../.source/server";

export const blog = loader({
  baseUrl: "/blog",
  source: toFumadocsSource(blogPosts, []),
});
