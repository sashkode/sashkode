import Image from "next/image";
import type { Metadata } from "next";

import { videos } from "~/features/videos/server/source";
import { getYoutubeThumbnailUrl } from "~/features/videos/shared/youtube";
import { SubdomainLink } from "~/platform/client/components/subdomain-link";
import { Page } from "~/platform/server/safe-page";

export const metadata: Metadata = {
  title: "All Videos",
  description: "Browse all video tutorials and articles about modern web development with Next.js, TypeScript, and React.",
  openGraph: {
    title: "All Videos | sashkode",
    description: "Browse all video tutorials and articles about modern web development with Next.js, TypeScript, and React.",
  },
};

export const VideosPage = Page.create({
  path: "/videos",
  name: "videos",
}).page(() => {
  const posts = videos.getPages().sort((a, b) => {
    const dateA = new Date(a.data.date ?? 0);
    const dateB = new Date(b.data.date ?? 0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col bg-white px-8 py-16 sm:px-16 sm:py-32 dark:bg-black">
        <header className="mb-12">
          <h1 className="font-semibold text-4xl text-black tracking-tight dark:text-zinc-50">Videos</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">Articles generated from YouTube videos with interactive code examples.</p>
        </header>

        <div className="grid gap-6 overflow-hidden">
          {posts.map((post) => {
            const thumbnailUrl = getYoutubeThumbnailUrl(post.data.youtubeVideoId);
            return (
              <article className="group min-w-0" key={post.url}>
                <SubdomainLink className="block rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/50" params={{ slug: post.slugs[0] ?? "" }} pathname="/[slug]" subdomain="videos">
                  <div className="flex h-24 flex-row items-center gap-6">
                    <div className="relative h-full shrink-0 overflow-hidden rounded-lg" style={{ aspectRatio: "16/9" }}>
                      <Image alt={post.data.title} className="object-cover transition-transform group-hover:scale-105" fill={true} src={thumbnailUrl} unoptimized={true} />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h2 className="truncate font-semibold text-black text-xl transition-colors group-hover:text-zinc-600 dark:text-zinc-50 dark:group-hover:text-zinc-300">{post.data.title}</h2>
                      {post.data.description ? <p className="mt-1 line-clamp-1 text-sm text-zinc-600 dark:text-zinc-400">{post.data.description}</p> : null}
                      <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
                        {post.data.author ? <span>{post.data.author}</span> : null}
                        {post.data.date ? (
                          <time dateTime={String(post.data.date)}>
                            {new Date(post.data.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </time>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </SubdomainLink>
              </article>
            );
          })}
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No videos yet. Check back soon!</p>
          </div>
        ) : null}
      </main>
    </div>
  );
});
