'use client';

import { createContext, type ReactNode, use, useContext } from 'react';

import type z from 'zod';

import type { AnyPage, ExtractPageHasFallback, ExtractPageName, ExtractPagePath, ExtractPageSchema, NextSearchParams, SearchParamsError } from '~/lib/navigation/server/next-safe-page';
import type { SearchParamsResultForSchema } from '~/lib/navigation/server/search-params';
import type { Prettify } from '~/lib/utils/shared/prettify';

/**
 * Context value type for page context with conditional types based on schema and fallback configuration.
 *
 * Three scenarios:
 * 1. Schema + Fallback: `searchParams` is the validated data
 * 2. Schema, no Fallback: `searchParamsResult` is the discriminated union result
 * 3. No Schema: `unsafeSearchParams` is the raw search params
 */
export type PageContextValue<Path extends string = string, Name extends string = string, Schema extends z.ZodTypeAny | undefined = undefined, HasFallback extends boolean = false> = {
  path: Path;
  name: Name;
} & (Schema extends undefined
  ? {
      /** Raw unvalidated search params (no schema provided) */
      unsafeSearchParams: NextSearchParams;
    }
  : HasFallback extends true
    ? {
        /** Validated and parsed search params (schema + fallback provided) */
        searchParams: z.output<Schema>;
      }
    : {
        /** Discriminated union result from parsing (schema provided, no fallback) */
        searchParamsResult: SearchParamsResultForSchema<Schema>;
      });

/**
 * Context value type for the search params validation fallback.
 *
 * This is available when a page has a schema with a fallback, and the fallback is being rendered
 * due to validation failure.
 */
export type PageFallbackContextValue<Path extends string = string, Name extends string = string, Schema extends z.ZodTypeAny = z.ZodTypeAny> = {
  path: Path;
  name: Name;
  /** The validation errors from the failed search params parsing */
  validationErrors: Prettify<SearchParamsError<Schema>>;
};

/**
 * Result type for usePageContext hook.
 *
 * Returns a discriminated union based on whether the component is rendered
 * in the page context or the validation fallback context.
 */
export type UsePageContextResult<Path extends string = string, Name extends string = string, Schema extends z.ZodTypeAny = z.ZodTypeAny> =
  | {
      /** Component is rendered in the page context (validation succeeded) */
      isValidationError: false;
      path: Path;
      name: Name;
      /** Validated and parsed search params */
      searchParams: z.output<Schema>;
      validationErrors?: undefined;
    }
  | {
      /** Component is rendered in the validation fallback context (validation failed) */
      isValidationError: true;
      path: Path;
      name: Name;
      searchParams?: undefined;
      /** The validation errors from the failed search params parsing */
      validationErrors: Prettify<SearchParamsError<Schema>>;
    };

// biome-ignore lint/suspicious/noExplicitAny: Allow any for generic context
const PageContext = createContext<PageContextValue<any, any, any, any> | undefined>(undefined);

// biome-ignore lint/suspicious/noExplicitAny: Allow any for generic context
const PageFallbackContext = createContext<PageFallbackContextValue<any, any, any> | undefined>(undefined);

export const PageContextProvider = <Path extends string, Name extends string, Schema extends z.ZodTypeAny | undefined = undefined, HasFallback extends boolean = false>({ value, children }: { value: PageContextValue<Path, Name, Schema, HasFallback>; children: ReactNode }) => {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

export const PageFallbackContextProvider = <Path extends string, Name extends string, Schema extends z.ZodTypeAny = z.ZodTypeAny>({ value, children }: { value: PageFallbackContextValue<Path, Name, Schema>; children: ReactNode }) => {
  return <PageFallbackContext.Provider value={value}>{children}</PageFallbackContext.Provider>;
};

/**
 * Hook to access page context within a page component.
 *
 * @param expectedName - Optional page name for runtime validation. If provided, throws if the context's page name doesn't match.
 *
 * @example
 * ```tsx
 * // Without runtime validation
 * const { searchParams } = usePage<typeof DemoPage>();
 *
 * // With runtime validation
 * const { searchParams } = usePage<typeof DemoPage>('demo');
 * ```
 */
export const usePage = <Page extends AnyPage>(expectedName?: ExtractPageName<Page>) => {
  const context = use(PageContext);
  if (context === undefined) {
    throw new Error('`usePage` must be used within a `PageContextProvider`. If you are in a validation error fallback, use `usePageFallback` or `usePageContext` instead.');
  }
  if (expectedName !== undefined && context.name !== expectedName) {
    throw new Error(`\`usePage\` expected page '${expectedName}' but was used in page '${context.name}'.`);
  }
  return context as unknown as Prettify<PageContextValue<ExtractPagePath<Page>, ExtractPageName<Page>, ExtractPageSchema<Page>, ExtractPageHasFallback<Page>>>;
};

/**
 * Hook to access page fallback context within a validation error fallback.
 *
 * @param expectedName - Optional page name for runtime validation. If provided, throws if the context's page name doesn't match.
 *
 * @example
 * ```tsx
 * // Without runtime validation
 * const { validationErrors } = usePageFallback<typeof DemoPage>();
 *
 * // With runtime validation
 * const { validationErrors } = usePageFallback<typeof DemoPage>('demo');
 * ```
 */
export const usePageFallback = <Page extends AnyPage>(expectedName?: ExtractPageName<Page>) => {
  const context = use(PageFallbackContext);
  if (context === undefined) {
    throw new Error('`usePageFallback` must be used within a `PageFallbackContextProvider`. If you are in a page component, use `usePage` or `usePageContext` instead.');
  }
  if (expectedName !== undefined && context.name !== expectedName) {
    throw new Error(`\`usePageFallback\` expected page '${expectedName}' but was used in page '${context.name}'.`);
  }
  return context as unknown as Prettify<PageFallbackContextValue<ExtractPagePath<Page>, ExtractPageName<Page>, NonNullable<ExtractPageSchema<Page>>>>;
};

/**
 * Hook that works in both the page context and the validation fallback context.
 *
 * Returns a discriminated union with an `isValidationError` flag to distinguish which context
 * the component is rendered in.
 *
 * @param expectedName - Optional page name for runtime validation. If provided, throws if the context's page name doesn't match.
 *
 * @example
 * ```tsx
 * const result = usePageContext<typeof MyPage>();
 *
 * if (result.isValidationError) {
 *   // Handle validation errors
 *   console.log(result.validationErrors);
 * } else {
 *   // Use parsed search params
 *   console.log(result.searchParams);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With runtime validation
 * const { searchParams, validationErrors } = usePageContext<typeof MyPage>('my-page');
 * ```
 *
 * @example
 * ```tsx
 * // Destructure with optional properties
 * const { name, isValidationError, searchParams, validationErrors } = usePageContext<typeof MyPage>();
 *
 * if (searchParams) {
 *   // TypeScript knows searchParams is defined here
 * }
 * ```
 */
export const usePageContext = <Page extends AnyPage>(expectedName?: ExtractPageName<Page>): UsePageContextResult<ExtractPagePath<Page>, ExtractPageName<Page>, NonNullable<ExtractPageSchema<Page>>> & {} => {
  const pageContext = useContext(PageContext);
  const fallbackContext = useContext(PageFallbackContext);

  if (pageContext !== undefined) {
    if (expectedName !== undefined && pageContext.name !== expectedName) {
      throw new Error(`\`usePageContext\` expected page '${expectedName}' but was used in page '${pageContext.name}'.`);
    }
    return {
      isValidationError: false as const,
      path: pageContext.path,
      name: pageContext.name,
      searchParams: (pageContext as PageContextValue<string, string, z.ZodTypeAny, true>).searchParams as z.output<NonNullable<ExtractPageSchema<Page>>>,
      validationErrors: undefined,
    };
  }

  if (fallbackContext !== undefined) {
    if (expectedName !== undefined && fallbackContext.name !== expectedName) {
      throw new Error(`\`usePageContext\` expected page '${expectedName}' but was used in page '${fallbackContext.name}'.`);
    }
    return {
      isValidationError: true as const,
      path: fallbackContext.path,
      name: fallbackContext.name,
      searchParams: undefined,
      validationErrors: fallbackContext.validationErrors as SearchParamsError<NonNullable<ExtractPageSchema<Page>>>,
    };
  }

  throw new Error('`usePageContext` must be used within a page component or its validation error fallback.');
};
