import Image from "next/image";

import { blog } from "~/features/blog/server/source";
import { SubdomainLink } from "~/platform/client/components/subdomain-link";
import { Page } from "~/platform/server/safe-page";

export default Page.create({
  path: "/blog",
  name: "blog",
}).page(() => {
  const posts = blog.getPages().sort((a, b) => {
    const dateA = new Date(a.data.date ?? 0);
    const dateB = new Date(b.data.date ?? 0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col bg-white px-8 py-16 sm:px-16 sm:py-32 dark:bg-black">
        <header className="mb-12">
          <h1 className="font-semibold text-4xl text-black tracking-tight dark:text-zinc-50">Blog</h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Articles generated from YouTube videos with interactive code examples.</p>
        </header>

        <div className="grid gap-8">
          {posts.map((post) => (
            <article className="group" key={post.url}>
              <SubdomainLink className="block" params={{ slug: post.slugs[0] ?? "" }} pathname="/[slug]" subdomain="blog">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                  {post.data.youtubeThumbnailUrl ? (
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-48">
                      <Image alt={post.data.title} className="object-cover transition-transform group-hover:scale-105" fill={true} src={post.data.youtubeThumbnailUrl as `https://${string}`} unoptimized={true} />
                    </div>
                  ) : null}
                  <div className="flex-1">
                    <h2 className="font-semibold text-black text-xl transition-colors group-hover:text-zinc-600 dark:text-zinc-50 dark:group-hover:text-zinc-300">{post.data.title}</h2>
                    {post.data.description ? <p className="mt-2 line-clamp-2 text-zinc-600 dark:text-zinc-400">{post.data.description}</p> : null}
                    <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
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
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No posts yet. Check back soon!</p>
          </div>
        ) : null}
      </main>
    </div>
  );
});
