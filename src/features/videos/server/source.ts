import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

import { videos as videosPosts } from "../../../../.source/server";

export const videos = loader({
  baseUrl: "/videos",
  source: toFumadocsSource(videosPosts, []),
});
