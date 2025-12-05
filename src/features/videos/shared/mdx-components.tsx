import type { ComponentProps } from "react";

import { Callout } from "fumadocs-ui/components/callout";
import { CodeBlock, CodeBlockTab, CodeBlockTabs, CodeBlockTabsList, CodeBlockTabsTrigger, Pre } from "fumadocs-ui/components/codeblock";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import type { MDXComponents } from "mdx/types";

import { H1, H2, H3, H4, H5, H6 } from "~/ui/videos/heading";

export function getMDXComponents(components: MDXComponents): MDXComponents {
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
    Callout,
    Tab,
    Tabs,
    CodeBlockTab,
    CodeBlockTabs,
    CodeBlockTabsList,
    CodeBlockTabsTrigger,
    File,
    Files,
    Folder,
  };
}
