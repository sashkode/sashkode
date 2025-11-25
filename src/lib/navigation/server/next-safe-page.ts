import type { AppRoutes } from 'next/types/routes';
import type { ReactElement } from 'react';

import z from 'zod';

import { Logger } from '~/lib/logging/server/logger';
import type { KebabCase } from '~/lib/validation/shared/kebab-case';

import { parseSearchParams, type SearchParamsResultForSchema } from './search-params';

export type NextSearchParams = Record<string, string | string[] | undefined>;

type PathParams = Record<string, string>;

type SearchParamsError<S> = Extract<SearchParamsResultForSchema<S>, { success: false }>['errors'];

type ValidationErrorFallback<Schema extends z.ZodTypeAny, Path extends AppRoutes> = (props: { errors: SearchParamsError<Schema>; getUnsafeSearchParams: () => Promise<NextSearchParams>; getPathParams: () => PageProps<Path>['params']; logger: ReturnType<typeof Logger.child> }) => Promise<ReactElement> | ReactElement;

// The only props Next.js App Router pages receive
type NextPageProps = {
  params: Promise<PathParams>;
  searchParams: Promise<NextSearchParams>;
};

type PageFn = (props: NextPageProps) => Promise<ReactElement> | ReactElement;

type EnhancedProps<Schema extends z.ZodObject<z.ZodRawShape> | undefined, Path extends AppRoutes, HasErrorHandler extends boolean> = {
  /**
   * Retrieves the route parameters (e.g., `slug` from `/blog/[slug]`).
   * These are the dynamic segments of the URL path.
   */
  getPathParams: () => PageProps<Path>['params'];
  logger: ReturnType<typeof Logger.child>;
} & (Schema extends z.ZodObject<z.ZodRawShape>
  ? HasErrorHandler extends true
    ? {
        /**
         * Retrieves the validated search parameters.
         *
         * Since a validation error fallback was provided, this method returns the parsed data directly.
         * If validation fails, the validation error fallback is rendered instead of the page component.
         */
        getSearchParams: () => Promise<z.output<Schema>>;
      }
    : {
        /**
         * Parses and validates the search parameters.
         *
         * Returns a result object indicating success or failure.
         * You must handle the validation result manually.
         */
        parseSearchParams: () => Promise<SearchParamsResultForSchema<Schema>>;
      }
  : object);

type GetSchemaType<T> = T extends z.ZodObject<z.ZodRawShape> ? T : T extends z.ZodRawShape ? z.ZodObject<T> : never;

/**
 * A builder class for creating type-safe Next.js pages.
 *
 * This class provides a fluent API to define the route, name, and search parameters schema
 * for a page. It handles the validation of search parameters and provides type-safe
 * accessors to the page component.
 */
class PageClient<Route extends AppRoutes, Name extends string, Schema extends z.ZodObject<z.ZodRawShape> | undefined = undefined, HasValidationErrorFallback extends boolean = false> {
  private schema: Schema = undefined as Schema;
  private validationErrorFallback: ValidationErrorFallback<Schema extends z.ZodTypeAny ? Schema : never, Route> | undefined;
  private name: string;

  constructor(_path: Route, name: KebabCase<'name', Name>) {
    this.name = name as unknown as string;
  }

  /**
   * Defines the schema for the search parameters (query string) of the page.
   *
   * When an error fallback is provided, the page component will receive a `getSearchParams` prop
   * that returns the parsed search parameters directly. If validation fails, the error fallback
   * is rendered instead of the page.
   *
   * @param schema - A Zod object schema or a raw shape object defining the search parameters.
   * @param validationErrorFallback - A function that renders a fallback UI when validation fails.
   *
   * @example
   * ```tsx
   * .searchParamsSchema(
   *   { page: z.coerce.number().default(1) },
   *   ({ errors }) => <div>Invalid search params: {JSON.stringify(errors)}</div>
   * )
   * ```
   */
  searchParamsSchema<T extends z.ZodRawShape | z.ZodObject<z.ZodRawShape>>(schema: T, validationErrorFallback: ValidationErrorFallback<GetSchemaType<T>, Route>): PageClient<Route, Name, GetSchemaType<T>, true>;

  /**
   * Defines the schema for the search parameters (query string) of the page.
   *
   * Without a validation error fallback, the page component will receive a `parseSearchParams` prop
   * that returns a result object (`{ success: true, data: ... }` or `{ success: false, error: ... }`).
   * You must handle the validation result manually in your page component.
   *
   * @param schema - A Zod object schema or a raw shape object defining the search parameters.
   *
   * @example
   * ```tsx
   * .searchParamsSchema({ page: z.coerce.number().default(1) })
   * ```
   */
  searchParamsSchema<T extends z.ZodRawShape | z.ZodObject<z.ZodRawShape>>(schema: T): PageClient<Route, Name, GetSchemaType<T>, false>;

  searchParamsSchema<T extends z.ZodRawShape | z.ZodObject<z.ZodRawShape>>(schema: T, validationErrorFallback?: ValidationErrorFallback<GetSchemaType<T>, Route>) {
    const finalSchema = (schema instanceof z.ZodObject ? schema : z.object(schema as z.ZodRawShape)) as GetSchemaType<T>;

    (this as unknown as { schema: typeof finalSchema }).schema = finalSchema;
    (this as unknown as { validationErrorFallback: typeof validationErrorFallback }).validationErrorFallback = validationErrorFallback;
    return this as unknown as PageClient<Route, Name, GetSchemaType<T>, boolean>;
  }

  /**
   * Defines the implementation of the page component.
   *
   * This method takes a function that receives the type-safe props and returns a React element.
   * The props include `getPathParams` and either `getSearchParams` or `parseSearchParams`
   * depending on whether a validation error fallback was provided.
   *
   * @param pageComponent - The functional component for the page.
   *
   * @example
   * ```tsx
   * .page(async ({ getPathParams, getSearchParams }) => {
   *   const { id } = await getPathParams();
   *   const { page } = await getSearchParams();
   *   return <div>Page {page} for item {id}</div>;
   * })
   * ```
   */
  page(pageComponent: (props: EnhancedProps<Schema, Route, HasValidationErrorFallback>) => Promise<ReactElement> | ReactElement) {
    const PageComponent: PageFn = (props) => {
      const logger = Logger.child({ scope: 'PAGE', topic: this.name });

      logger.info('Rendering page');

      const enhancedProps = {
        getPathParams: async () => props.params as PageProps<Route>['params'],
        logger,
      } as EnhancedProps<Schema, Route, HasValidationErrorFallback>;

      if (this.schema && this.validationErrorFallback) {
        const schema = this.schema;
        const validationErrorFallback = this.validationErrorFallback;
        return (async () => {
          const result = await parseSearchParams(props.searchParams, schema);
          if (!result.success) {
            logger.warn('Search params validation failed', { errors: result.errors });
            return validationErrorFallback({
              errors: result.errors as SearchParamsError<Schema>,
              getUnsafeSearchParams: async () => props.searchParams,
              getPathParams: async () => props.params as PageProps<Route>['params'],
              logger,
            });
          }
          logger.info('Search params validation successful', { searchParams: result.searchParams });
          Object.assign(enhancedProps, {
            getSearchParams: async () => result.searchParams,
          });
          return pageComponent(enhancedProps);
        })();
      }

      if (this.schema) {
        const schema = this.schema;
        Object.assign(enhancedProps, {
          parseSearchParams: async () => {
            const result = await parseSearchParams(props.searchParams, schema);
            if (result.success) {
              logger.info('Search params validation successful', { searchParams: result.searchParams });
            } else {
              logger.warn('Search params validation failed', { errors: result.errors });
            }
            return result;
          },
        });
      }

      return pageComponent(enhancedProps);
    };

    // PageComponent.displayName = `Page(${this.name})`;
    return PageComponent;
  }
}

// const createPage = <Path extends AppRoutes>(pageFn: ({ props }: { props: PageProps<Path> }) => React.ReactNode) => {
//   // Page implementation
//   return null;
// };

/**
 * Page namespace containing methods to create type safe Next.js pages with search param validation
 *
 * @example
 * ```tsx
 * import { Page } from '~/lib/pages/server/next-safe-page';
 * import z from 'zod';
 *
 * export default Page.create({
 *   path: '/blog/[slug]',
 *   name: 'blog-post',
 * })
 *   .searchParamsSchema({
 *     showComments: z.boolean().optional(),
 *   })
 *   .page(async ({ getPathParams, parseSearchParams }) => {
 *     const { slug } = await getPathParams();
 *     const { success, searchParams } = await parseSearchParams();
 *
 *     if (!success) return <div>Invalid params</div>;
 *
 *     return <div>Blog Post: {slug}</div>;
 *   });
 * ```
 *
 * @example
 * // With validation error fallback
 * ```tsx
 * import { Page } from '~/lib/pages/server/next-safe-page';
 * import z from 'zod';
 *
 * export default Page.create({
 *   path: '/products',
 *   name: 'products-list',
 * })
 *   .searchParamsSchema(
 *     {
 *       page: z.coerce.number().min(1).default(1),
 *       sort: z.enum(['asc', 'desc']).default('asc'),
 *     },
 *     ({ errors }) => (
 *       <div>
 *         <h1>Invalid Search Parameters</h1>
 *         <pre>{JSON.stringify(errors, null, 2)}</pre>
 *       </div>
 *     )
 *   )
 *   .page(async ({ getSearchParams }) => {
 *     // searchParams are guaranteed to be valid here
 *     const { page, sort } = await getSearchParams();
 *
 *     return <div>Page {page}, Sort: {sort}</div>;
 *   });
 * ```
 */
export const Page = {
  /**
   * Creates a new type-safe page builder.
   *
   * @param options - Configuration object for the page.
   * @param options.path - The route path (e.g., '/blog/[slug]'). Must match a valid route in your application.
   * @param options.name - A unique name for the page, used for debugging or identification.
   */
  create: <Route extends AppRoutes, Name extends string>({ path, name }: { path: Route; name: KebabCase<'name', Name> }) => new PageClient(path, name),
};
