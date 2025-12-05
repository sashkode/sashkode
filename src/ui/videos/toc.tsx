"use client";

import { useEffect, useRef, useState } from "react";

import { AnchorProvider, ScrollProvider, TOCItem, type TOCItemType, useActiveAnchors } from "fumadocs-core/toc";

type TOCProps = {
  items: TOCItemType[];
  hasVideo?: boolean;
};

export function TableOfContents({ items, hasVideo }: TOCProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Prepend video item if present
  const allItems: TOCItemType[] = hasVideo ? [{ title: "Video", url: "#video", depth: 2 }, ...items] : items;

  // Show empty state when no headings are found
  if (allItems.length === 0) {
    return (
      <nav aria-label="Table of contents" className="lg:block! sticky top-19 hidden h-fit w-64 shrink-0 py-16">
        <h2 className="mb-4 font-medium text-xs text-zinc-400 uppercase tracking-wide dark:text-zinc-500">On this page</h2>
        <p className="text-sm text-zinc-500">No headings found</p>
      </nav>
    );
  }

  return (
    <AnchorProvider toc={allItems}>
      <nav aria-label="Table of contents" className="lg:block! sticky top-19 hidden h-fit max-h-[calc(100vh-8rem)] w-64 shrink-0 py-16">
        <h2 className="mb-4 font-medium text-xs text-zinc-400 uppercase tracking-wide dark:text-zinc-500">On this page</h2>
        <div className="relative max-h-[calc(100vh-12rem)] overflow-y-auto pr-4" ref={containerRef}>
          <ScrollProvider containerRef={containerRef}>
            <div className="relative border-zinc-200 border-l dark:border-zinc-800">
              <TOCThumb containerRef={containerRef} />
              <ul className="flex flex-col">
                {allItems.map((item) => (
                  <TOCLink item={item} key={item.url} />
                ))}
              </ul>
            </div>
          </ScrollProvider>
        </div>
      </nav>
    </AnchorProvider>
  );
}

function TOCLink({ item }: { item: TOCItemType }) {
  const paddingLeft = Math.max(0, item.depth - 2) * 12 + 12;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetId = item.url.slice(1); // Remove the # prefix

    // For video link, scroll to top of page to show title
    if (targetId === "video") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", item.url);
      return;
    }

    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update URL hash without triggering scroll
      window.history.replaceState(null, "", item.url);
    }
  };

  return (
    <li>
      <TOCItem className="block py-1.25 text-sm text-zinc-500 transition-colors hover:text-zinc-900 data-[active=true]:font-medium data-[active=true]:text-aura-purple dark:text-zinc-400 dark:hover:text-zinc-100" href={item.url} onClick={handleClick} style={{ paddingLeft }}>
        {item.title}
      </TOCItem>
    </li>
  );
}

function TOCThumb({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const activeAnchors = useActiveAnchors();
  const [thumbStyle, setThumbStyle] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || activeAnchors.length === 0) {
      setThumbStyle({ top: 0, height: 0 });
      return;
    }

    let top = Number.MAX_VALUE;
    let bottom = 0;

    for (const anchor of activeAnchors) {
      const element = container.querySelector<HTMLAnchorElement>(`a[href="#${anchor}"]`);
      if (!element) {
        continue;
      }

      const elementTop = element.offsetTop;
      const elementBottom = elementTop + element.offsetHeight;

      top = Math.min(top, elementTop);
      bottom = Math.max(bottom, elementBottom);
    }

    if (top !== Number.MAX_VALUE) {
      setThumbStyle({ top, height: bottom - top });
    }
  }, [activeAnchors, containerRef]);

  if (thumbStyle.height === 0) {
    return null;
  }

  return (
    <div
      className="absolute left-0 w-0.5 bg-aura-purple transition-all duration-200"
      style={{
        top: `${thumbStyle.top}px`,
        height: `${thumbStyle.height}px`,
      }}
    />
  );
}
