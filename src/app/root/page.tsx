import Image from "next/image";

import { SubdomainLink } from "~/lib/navigation/client/components/subdomain-link";

export default async function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">Home</h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            This is the home page. Head over to the{" "}
            <SubdomainLink subdomain="blog" className="font-medium text-zinc-950 dark:text-zinc-50">
              Blog
            </SubdomainLink>{" "}
            or a random{" "}
            <SubdomainLink subdomain={`/${Math.random().toString(36).substring(2, 15)}`} className="font-medium text-zinc-950 dark:text-zinc-50">
              Subdomain
            </SubdomainLink>{" "}
            .
          </p>
        </div>
      </main>
    </div>
  );
}
