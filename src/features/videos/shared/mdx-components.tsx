import type { ComponentProps } from "react";

import { CodeBlock, CodeBlockTab, CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger, Pre } from "fumadocs-ui/components/codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { H1, H2, H3, H4, H5, H6 } from "~/features/videos/client/components/heading";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: ({ children, ...props }: ComponentProps<"pre">) => (
      <CodeBlock keepBackground={true} {...props}>
        <Pre>{children}</Pre>
      </CodeBlock>
    ),
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    h5: H5,
    h6: H6,
    Tab,
    Tabs,
    CodeBlockTab,
    CodeBlockTabs,
    CodeBlockTabsList,
    CodeBlockTabsTrigger,
  };
}
