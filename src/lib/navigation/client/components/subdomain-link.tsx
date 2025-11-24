'use client';

import Link from 'next/link';
import type { AppRoutes, ParamMap } from 'next/types/routes';
import { type ComponentProps, useEffect, useState } from 'react';

// --- Helpers ---

type StripPrefix<Path extends string, Prefix extends string> = Path extends Prefix ? '/' : Path extends `${Prefix}/${infer Rest}` ? `/${Rest}` : never;

type FirstPathSegment<Path extends string> = Path extends `/${infer Rest}` ? (Rest extends `${infer Segment}/${string}` ? Segment : Rest) : never;

// --- Subdomain Identification ---

type AllSubdomains = FirstPathSegment<AppRoutes>;
type DynamicSubdomain = Extract<AllSubdomains, `[${string}]`>;
type StaticSubdomains = Exclude<AllSubdomains, DynamicSubdomain | 'root'>;

// --- Route Identification ---

type RootRoutes = StripPrefix<Extract<AppRoutes, `/root` | `/root/${string}`>, '/root'>;
type StaticRoutes<Subdomain extends string> = StripPrefix<Extract<AppRoutes, `/${Subdomain}` | `/${Subdomain}/${string}`>, `/${Subdomain}`>;
type DynamicRoutes = StripPrefix<Extract<AppRoutes, `/${DynamicSubdomain}` | `/${DynamicSubdomain}/${string}`>, `/${DynamicSubdomain}`>;

type RoutesFor<Subdomain extends string | undefined> = Subdomain extends 'root' | undefined ? RootRoutes : Subdomain extends StaticSubdomains ? StaticRoutes<Subdomain> : DynamicRoutes;

// --- Param Identification ---

type ReconstructRoute<Subdomain extends string | undefined, Pathname extends string> = Subdomain extends 'root' | undefined
  ? Pathname extends '/'
    ? '/root'
    : `/root${Pathname}`
  : Subdomain extends StaticSubdomains
    ? Pathname extends '/'
      ? `/${Subdomain}`
      : `/${Subdomain}${Pathname}`
    : Pathname extends '/'
      ? `/${DynamicSubdomain}`
      : `/${DynamicSubdomain}${Pathname}`;

type DynamicParam = DynamicSubdomain extends `[${infer P}]` ? P : never;

type ParamsFor<Subdomain extends string | undefined, Pathname extends string> = ReconstructRoute<Subdomain, Pathname> extends keyof ParamMap
  ? Subdomain extends StaticSubdomains | 'root' | undefined
    ? ParamMap[ReconstructRoute<Subdomain, Pathname> & keyof ParamMap]
    : Omit<ParamMap[ReconstructRoute<Subdomain, Pathname> & keyof ParamMap], DynamicParam>
  : never;

// --- Component Props ---

type SubdomainLinkProps<Subdomain extends string | undefined, Pathname extends string> = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** The subdomain to link to. Use "root" for the root domain. If not provided, uses the current domain. */
  subdomain?: Subdomain | StaticSubdomains | (string & {});
  /** The pathname to append to the subdomain URL. Defaults to "/". */
  pathname?: Pathname extends RoutesFor<Subdomain> ? Pathname : RoutesFor<Subdomain>;
} & (Pathname extends RoutesFor<Subdomain> ? (keyof ParamsFor<Subdomain, Pathname> extends never ? { params?: undefined } : { params: ParamsFor<Subdomain, Pathname> }) : { params?: undefined });

/**
 * A client-side Link component that navigates to different subdomains.
 *
 * @example
 * ```tsx
 * <SubdomainLink subdomain="blog" pathname="/posts/[postId]" params={{ postId: "1" }}>
 *   View Post
 * </SubdomainLink>
 * ```
 *
 * @param subdomain - The subdomain to link to (omit or use "root" for root domain)
 * @param pathname - The path on the subdomain (defaults to "/")
 * @param params - The parameters for the path (required if path has params)
 * @param children - The link content
 * @param props - Additional Next.js Link props
 */
export function SubdomainLink<Subdomain extends string | undefined = undefined, Pathname extends string = '/'>({ subdomain, pathname, params, children, prefetch: originalPrefetch, ...props }: SubdomainLinkProps<Subdomain, Pathname>) {
  const [computedHref, setComputedHref] = useState<string>('/');
  const [prefetch, setPrefetch] = useState<Parameters<typeof Link>['0']['prefetch']>(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const parts = hostname.split('.');
    const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
    const portSegment = window.location.port ? `:${window.location.port}` : '';

    let resolvedPathname = (pathname ?? '/') as string;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        resolvedPathname = resolvedPathname.replace(`[${key}]`, String(value));
      });
    }

    if (!subdomain || subdomain === 'root') {
      setComputedHref(`${protocol}//${rootDomain}${portSegment}${resolvedPathname}`);
    } else {
      setComputedHref(`${protocol}//${subdomain}.${rootDomain}${portSegment}${resolvedPathname}`);
    }

    setPrefetch(originalPrefetch);
  }, [subdomain, pathname, params, originalPrefetch]);

  return (
    <Link prefetch={prefetch} href={computedHref as ComponentProps<typeof Link>['href']} {...props}>
      {children}
    </Link>
  );
}
