import Image from 'next/image';

import { HelloButton } from '~/lib/home/client/components/hello-button';
import { WavyBackground } from '~/lib/home/client/components/wavy-background';
import { SubdomainLink } from '~/lib/navigation/client/components/subdomain-link';

export default async function Home() {
  return (
    <div className="flex min-h-dvh items-center justify-center font-sans">
      <main className="flex min-h-dvh w-full max-w-3xl flex-col items-center justify-between px-16 py-32 sm:items-start">
        <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority={true} />
        <HelloButton />
        <WavyBackground className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">Home</h1>
          <p className="max-w-md text-lg text-zinc-600 leading-8 dark:text-zinc-400">
            This is the home page. Head over to the{' '}
            <SubdomainLink subdomain="blog" className="font-medium text-zinc-950 dark:text-zinc-50">
              Blog
            </SubdomainLink>{' '}
            or a random{' '}
            <SubdomainLink subdomain={`/${Math.random().toString(36).substring(2, 15)}`} className="font-medium text-zinc-950 dark:text-zinc-50">
              Subdomain
            </SubdomainLink>
            .
          </p>
        </WavyBackground>
      </main>
    </div>
  );
}
