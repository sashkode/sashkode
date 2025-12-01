"use client";

import { useCallback, useState } from "react";

import { Check, Copy } from "lucide-react";

type CopyButtonProps = {
  text: string;
  className?: string;
};

export function CopyButton({ text, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail if clipboard is not available
    }
  }, [text]);

  return (
    <button aria-label={copied ? "Copied" : "Copy code"} className={`inline-flex items-center justify-center rounded-md p-2 text-sm transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#a277ff]/50 ${className}`} onClick={handleCopy} type="button">
      {copied ? <Check className="h-4 w-4 text-[#61ffca]" /> : <Copy className="h-4 w-4 text-[#6d6d6d]" />}
    </button>
  );
}
