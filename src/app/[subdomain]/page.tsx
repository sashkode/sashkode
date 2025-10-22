import Image from 'next/image';

import { SubdomainLink } from '~/lib/navigation/client/components/subdomain-link';

export default async function Subdomain({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between bg-white px-16 py-32 sm:items-start dark:bg-black">
        <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority={true} />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">Subdomain ({subdomain})</h1>
          <p className="max-w-md text-lg text-zinc-600 leading-8 dark:text-zinc-400">
            This is the wildcard subdomain page. Head over to the <SubdomainLink className="font-medium text-zinc-950 dark:text-zinc-50">Home</SubdomainLink> page or the{' '}
            <SubdomainLink subdomain="blog" className="font-medium text-zinc-950 dark:text-zinc-50">
              Blog
            </SubdomainLink>{' '}
            .
          </p>
        </div>
      </main>
    </div>
  );
}
