import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";

import { TableOfContents } from "~/features/blog/client/components/toc";
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
  const toc = page.data.toc;

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex w-full max-w-6xl gap-8">
        <article className="min-w-0 flex-1 bg-white px-8 py-16 sm:px-16 sm:py-24 dark:bg-black">
          <header className="mb-12">
            <SubdomainLink className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100" pathname="/" subdomain="blog">
              <ChevronLeft className="h-4 w-4" />
              Back to Blog
            </SubdomainLink>

            <h1 className="font-bold text-4xl text-black tracking-tight sm:text-5xl dark:text-zinc-50">{page.data.title}</h1>

            {page.data.description ? <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">{page.data.description}</p> : null}

            <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-500">
              {page.data.author ? <span className="font-medium">{page.data.author}</span> : null}
              {page.data.date ? <time dateTime={String(page.data.date)}>{format(new Date(page.data.date), "MMMM d, yyyy")}</time> : null}
            </div>

            {page.data.youtubeVideoId ? (
              <div className="mt-8 aspect-video scroll-mt-24 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800" id="video">
                <iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen={true} className="h-full w-full" src={`https://www.youtube.com/embed/${page.data.youtubeVideoId}`} title={page.data.title} />
              </div>
            ) : null}
          </header>

          <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-headings:tracking-tight prose-code:before:content-none prose-code:after:content-none dark:prose-a:text-blue-400 [&_h1_a]:text-inherit [&_h1_a]:no-underline [&_h2_a]:text-inherit [&_h2_a]:no-underline [&_h3_a]:text-inherit [&_h3_a]:no-underline [&_h4_a]:text-inherit [&_h4_a]:no-underline [&_h5_a]:text-inherit [&_h5_a]:no-underline [&_h6_a]:text-inherit [&_h6_a]:no-underline">
            <MDX components={components} />
          </div>
        </article>

        <TableOfContents hasVideo={Boolean(page.data.youtubeVideoId)} items={toc} />
      </div>
    </div>
  );
}
