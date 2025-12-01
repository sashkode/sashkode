"use client";

import { type ComponentProps, useRef } from "react";

import { CopyButton } from "./copy-button";

type PreProps = ComponentProps<"pre">;

export function Pre({ children, ...props }: PreProps) {
  const preRef = useRef<HTMLPreElement>(null);

  const getCodeText = () => {
    if (!preRef.current) {
      return "";
    }
    const codeElement = preRef.current.querySelector("code");
    return codeElement?.textContent ?? "";
  };

  return (
    <div className="group relative">
      <pre ref={preRef} {...props}>
        {children}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton text={getCodeText()} />
      </div>
    </div>
  );
}
