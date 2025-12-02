"use client";

import type { ComponentProps } from "react";

import { Hash } from "lucide-react";

import { cn } from "~/ui/shared/utils";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends ComponentProps<"h1"> {
  level: HeadingLevel;
}

export function Heading({ level, children, className, id, ...props }: HeadingProps) {
  const Tag = level;

  if (!id) {
    return (
      <Tag className={className} {...props}>
        {children}
      </Tag>
    );
  }

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <Tag className={cn("group scroll-mt-24", className)} id={id} {...props}>
      <a aria-label={`Link to ${typeof children === "string" ? children : "section"}`} className="inline-flex items-center gap-2 text-inherit no-underline hover:text-inherit hover:no-underline" href={`#${id}`} onClick={handleClick}>
        <span>{children}</span>
        <Hash className="h-4 w-4 shrink-0 text-aura-purple opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    </Tag>
  );
}

export function H1(props: ComponentProps<"h1">) {
  return <Heading level="h1" {...props} />;
}

export function H2(props: ComponentProps<"h2">) {
  return <Heading level="h2" {...props} />;
}

export function H3(props: ComponentProps<"h3">) {
  return <Heading level="h3" {...props} />;
}

export function H4(props: ComponentProps<"h4">) {
  return <Heading level="h4" {...props} />;
}

export function H5(props: ComponentProps<"h5">) {
  return <Heading level="h5" {...props} />;
}

export function H6(props: ComponentProps<"h6">) {
  return <Heading level="h6" {...props} />;
}
