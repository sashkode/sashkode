import type { ComponentProps } from "react";

import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: ({ children, ...props }: ComponentProps<"pre">) => (
      <CodeBlock keepBackground={true} {...props}>
        <Pre>{children}</Pre>
      </CodeBlock>
    ),
  };
}
