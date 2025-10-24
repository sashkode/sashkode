'use client';

import Link from 'next/link';
import { type ComponentProps, useEffect, useState } from 'react';

/**
 * Props for the SubdomainLink component.
 * Extends Next.js Link props but replaces href with subdomain and pathname.
 */
interface SubdomainLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  /** The subdomain to link to. Use "root" for the root domain. If not provided, uses the current domain. */
  subdomain?: string;
  /** The pathname to append to the subdomain URL. Defaults to "/". */
  pathname?: `/${string}`;
}

/**
 * A client-side Link component that navigates to different subdomains.
 *
 * @example
 * ```tsx
 * <SubdomainLink subdomain="blog" pathname="/posts/1">
 *   View Post
 * </SubdomainLink>
 * ```
 *
 * @param subdomain - The subdomain to link to (omit or use "root" for root domain)
 * @param pathname - The path on the subdomain (defaults to "/")
 * @param children - The link content
 * @param props - Additional Next.js Link props
 */
export function SubdomainLink({ subdomain, pathname = '/', children, prefetch: originalPrefetch, ...props }: SubdomainLinkProps) {
  const [computedHref, setComputedHref] = useState<string>(pathname);
  const [prefetch, setPrefetch] = useState<Parameters<typeof Link>['0']['prefetch']>(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const parts = hostname.split('.');
    const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
    const portSegment = window.location.port ? `:${window.location.port}` : '';

    if (!subdomain || subdomain === 'root') {
      setComputedHref(`${protocol}//${rootDomain}${portSegment}${pathname}`);
    } else {
      setComputedHref(`${protocol}//${subdomain}.${rootDomain}${portSegment}${pathname}`);
    }

    setPrefetch(originalPrefetch);
  }, [subdomain, pathname, originalPrefetch]);

  return (
    <Link prefetch={prefetch} href={computedHref} {...props}>
      {children}
    </Link>
  );
}
