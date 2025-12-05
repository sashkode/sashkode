"use client";

import { useCallback, useState } from "react";

import { Share2 } from "lucide-react";

import { cn } from "~/ui/shared/utils";

type ShareButtonProps = {
  title: string;
  className?: string;
};

export function ShareButton({ title, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const shareText = `You may find this sashkode.dev article useful:\n\n${title} ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
      } catch {
        // User cancelled or share failed - silently ignore
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Copy failed - silently ignore
      }
    }
  }, [title]);

  return (
    <button className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100", className)} onClick={handleShare} type="button">
      <Share2 className="h-4 w-4" />
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
