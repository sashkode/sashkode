import type { MDXComponents } from "mdx/types";

import { Pre } from "../client/components/pre";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: Pre,
  };
}
