import Image from "next/image";

import { WavyBackground } from "~/features/home/client/components/wavy-background";
import { SubdomainLink } from "~/platform/client/components/subdomain-link";
import { Page } from "~/platform/server/safe-page";

export default Page.create({
  path: "/root",
  name: "home",
}).page(() => (
  <div className="flex min-h-dvh items-center justify-center font-sans">
    <main className="flex min-h-dvh w-full max-w-3xl flex-col items-center justify-between px-16 py-32 sm:items-start">
      <Image alt="Next.js logo" className="dark:invert" height={20} priority={true} src="/next.svg" width={100} />
      <WavyBackground className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
        <h1 className="max-w-xs font-semibold text-3xl text-black leading-10 tracking-tight dark:text-zinc-50">Home</h1>
        <p className="max-w-md text-lg text-zinc-600 leading-8 dark:text-zinc-400">
          This is the home page. Head over to the{" "}
          <SubdomainLink className="font-medium text-zinc-950 dark:text-zinc-50" subdomain="blog">
            Blog
          </SubdomainLink>{" "}
          or a random{" "}
          <SubdomainLink className="font-medium text-zinc-950 dark:text-zinc-50" subdomain={`${Math.random().toString(36).substring(2, 15)}`}>
            Subdomain
          </SubdomainLink>
          .
        </p>
      </WavyBackground>
    </main>
  </div>
));
