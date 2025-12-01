import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { blog } from "~/features/blog/server/source";
import { useMDXComponents } from "~/features/blog/shared/mdx-components";
import { SubdomainLink } from "~/platform/client/components/subdomain-link";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return blog.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) {
    return {};
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function BlogPostPage(props: PageProps) {
  const params = await props.params;
  const page = blog.getPage([params.slug]);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const components = useMDXComponents({});

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans dark:bg-black">
      <article className="w-full max-w-3xl bg-white px-8 py-16 sm:px-16 sm:py-24 dark:bg-black">
        <header className="mb-12">
          <SubdomainLink className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" pathname="/" subdomain="blog">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            Back to Blog
          </SubdomainLink>

          <h1 className="font-bold text-3xl text-black tracking-tight sm:text-4xl dark:text-zinc-50">{page.data.title}</h1>

          {page.data.description ? <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{page.data.description}</p> : null}

          <div className="mt-6 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
            {page.data.author ? <span className="font-medium">{page.data.author}</span> : null}
            {page.data.date ? (
              <time dateTime={String(page.data.date)}>
                {new Date(page.data.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            ) : null}
          </div>

          {page.data.youtubeVideoId ? (
            <div className="mt-8 aspect-video overflow-hidden rounded-xl">
              <iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen={true} className="h-full w-full" src={`https://www.youtube.com/embed/${page.data.youtubeVideoId}`} title={page.data.title} />
            </div>
          ) : null}
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-headings:tracking-tight prose-code:before:content-none prose-code:after:content-none dark:prose-a:text-blue-400">
          <MDX components={components} />
        </div>
      </article>
    </div>
  );
}
