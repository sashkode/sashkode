import type { Redirect, Rewrite } from "next/dist/lib/load-custom-routes";

type VercelEnv = Readonly<{
  VERCEL_ENV?: "development" | "preview" | "production" | undefined;
  VERCEL_URL?: string | undefined;
  VERCEL_PROJECT_PRODUCTION_URL?: string | undefined;
  VERCEL_BRANCH_URL?: string | undefined;
}>;

/**
 * Creates Next.js subdomain routing configuration for rewrites and redirects.
 *
 * @param env - Environment object that must contain Vercel environment properties (VERCEL_ENV, VERCEL_URL, VERCEL_BRANCH_URL, VERCEL_PROJECT_PRODUCTION_URL)
 * @param customDomains - Optional array of extra domains to support, useful for preview branches or environments with custom domains (e.g., ['example.com', 'staging.example.com'])
 *
 * @returns An object containing:
 *   - `rewrites`: Can be used as-is in Next.js config, or spread the `beforeFiles` property for custom configuration
 *   - `redirects`: Can be spread directly into Next.js config redirects array
 *
 * @example Basic Usage
 * ```typescript
 * // Use as-is
 * const { rewrites, redirects } = createSubdomainConfig(env, ["custom.com"]);
 * const config = { rewrites, redirects };
 *
 * // Or spread beforeFiles
 * const { rewrites, redirects } = createSubdomainConfig(env, ["custom.com"]);
 * const config = {
 *   rewrites: async () => ({
 *     beforeFiles: [...rewrites().beforeFiles, ...otherRewrites],
 *   }),
 *   redirects: async () => [...redirects(), ...otherRedirects],
 * };
 * ```
 *
 * @example App Directory Structure
 * ```
 * app/
 * ├── root/              // Routes for the root domain (example.com)
 * │   ├── page.tsx       // -> example.com/
 * │   ├── about/
 * │   │   └── page.tsx   // -> example.com/about
 * │   └── layout.tsx     // Shared layout for root domain
 * │
 * ├── blog/              // Routes for blog subdomain (blog.example.com)
 * │   ├── page.tsx       // -> blog.example.com/
 * │   ├── [slug]/
 * │   │   └── page.tsx   // -> blog.example.com/my-post
 * │   └── layout.tsx     // Shared layout for blog subdomain
 * │
 * ├── admin/             // Routes for admin subdomain (admin.example.com)
 * │   ├── page.tsx       // -> admin.example.com/
 * │   ├── dashboard/
 * │   │   └── page.tsx   // -> admin.example.com/dashboard
 * │   └── layout.tsx     // Shared layout for admin subdomain
 * │
 * └── layout.tsx         // Root layout (optional, shared by all)
 * ```
 *
 *
 * @example Dynamic Subdomain Routes
 * ```
 * app/
 * ├── [tenant]/          // Dynamic tenant subdomain
 * │   ├── page.tsx       // -> acme.example.com/
 * │   ├── dashboard/
 * │   │   └── page.tsx   // -> acme.example.com/dashboard
 * │   └── layout.tsx
 * ```
 *
 * ```typescript
 * // app/[tenant]/page.tsx
 * export default async function TenantPage({
 *   params,
 * }: {
 *   params: Promise<{ tenant: string }>;
 * }) {
 *   const { tenant } = await params;
 *   return <div>Welcome to {tenant}</div>;
 * }
 * ```
 *
 *
 * @remarks
 * - The `root` directory is reserved for the main domain
 * - Each subdomain gets its own top-level directory in `app/`
 * - Use `layout.tsx` in each subdomain directory for subdomain-specific layouts
 * - You can mix static subdomains (`blog/`) and dynamic ones (`[tenant]/`)
 * - In local development with SSL, `app.localhost` is your root domain and subdomains are like `blog.app.localhost`
 */
export const createSubdomainConfig = (env: VercelEnv, customDomains: string[] = []) => {
  // Determine root domain based on Vercel environment variables and custom domains for non-production builds
  const rootDomain = env.VERCEL_ENV ? `(${env.VERCEL_URL}|${env.VERCEL_BRANCH_URL}|${env.VERCEL_PROJECT_PRODUCTION_URL}|${customDomains.join("|")})` : "app.localhost";

  // biome-ignore lint/style/noProcessEnv: Required to detect dev mode and SSL mode
  const lifecycleEvent = process.env["npm_lifecycle_event"];
  const isDev = lifecycleEvent ? ["dev", "dev:ssl"].includes(lifecycleEvent) : false;
  const isDevSSL = lifecycleEvent === "dev:ssl";

  let rewritesLogged = false;

  return {
    rewrites: () => {
      if (!rewritesLogged) {
        console.log(` \x1b[36m✓\x1b[0m Valid rewrite domains: ${rootDomain}`);
        rewritesLogged = true;
      }
      return {
        beforeFiles: [
          {
            // Handle subdomain routing
            source: "/:path((?!api|_next|_static|_vercel|\\.well-known|.*\\.\\w+$).*)*",
            has: [{ type: "host", value: `(?<subdomain>.*).${rootDomain}` }],
            missing: [{ type: "host", value: `root.${rootDomain}` }],
            destination: "/:subdomain*/:path*",
          },
          {
            // Handle root domain routing
            source: "/:path((?!api|_next|_static|_vercel|\\.well-known|.*\\.\\w+$).*)*",
            has: [{ type: "host", value: `${rootDomain}` }],
            destination: "/root/:path*",
          },
        ],
      } satisfies { beforeFiles: Rewrite[] };
    },

    allowedDevOrigins: ["app.localhost", "*.app.localhost"],

    redirects: (() => {
      if (isDev) {
        return isDevSSL
          ? [
              {
                // Redirect root localhost to app.localhost (for better subdomain https support)
                permanent: false,
                source: "/:path((?!api|_next|_static|_vercel|\\.well-known|.*\\.\\w+$).*)*",
                has: [{ type: "host", value: "localhost" }],
                destination: "https://app.localhost:3000/:path*",
              },
            ]
          : [
              {
                // Non-SSL dev: redirect to http app.localhost
                permanent: false,
                source: "/:path((?!api|_next|_static|_vercel|\\.well-known|.*\\.\\w+$).*)*",
                has: [{ type: "host", value: "localhost" }],
                destination: "http://app.localhost:3000/:path*",
              },
            ];
      }

      return [];
    }) satisfies () => Redirect[],
  };
};
