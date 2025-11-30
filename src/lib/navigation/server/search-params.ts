/**
 * Search params utilities
 *
 * Utilities for parsing Next.js App Router URL search parameters with Zod schemas.
 * A lightweight, schema-aware pre-processing pass coerces common string values
 * (booleans, numbers, arrays, and case-insensitive enums) before validation,
 * providing friendlier types and fewer brittle string checks in server components.
 *
 * Highlights
 * - Shared, memoized access to the current request's {@link NextSearchParams | searchParams}
 * - Best-effort coercion guided by your Zod object schema
 * - Non-destructive conversions with per-field error isolation
 * - Clear success/error union for ergonomic handling in UI code
 *
 * Usage overview
 * 1. Call {@link cacheSearchParams} in the App Router page that receives `searchParams`
 * 2. In any descendant server component, call {@link parseSearchParams} with your Zod schema
 * 3. Handle the discriminated union to render UI for success or validation errors
 */

import type { SearchParams } from "next/dist/server/request/search-params";
import { cache } from "react";

import { z } from "zod";

import { Logger } from "~/lib/logging/server/logger";
import type { Prettify } from "~/lib/utils/shared/prettify";

/**
 * Shape of URL search params as provided by Next.js App Router.
 *
 * Examples
 * - `{ page: '2' }`
 * - `{ tags: ['alpha', 'beta'] }`
 * - `{ q: undefined }`
 */
export type NextSearchParams = Record<string, string | string[] | undefined>;

/**
 * Build a tuple of a given length (internal helper for numeric type arithmetic).
 *
 * @internal
 */
type BuildTuple<Length extends number, T extends unknown[] = []> = T["length"] extends Length ? T : BuildTuple<Length, [unknown, ...T]>;

/**
 * Type-level numeric predecessor for literal numbers.
 *
 * - Decrement<0> -> 0 (saturating at zero)
 * - Decrement<5> -> 4
 * - Works for any small numeric literal; recursion depth depends on TS limits.
 */
export type Decrement<N extends number> = BuildTuple<N> extends [unknown, ...infer Rest] ? Rest["length"] : 0;

/**
 * Result of parsing URL search parameters against a Zod schema.
 *
 * This discriminated union represents the two possible outcomes from
 * parseSearchParams:
 *
 * - Success:
 *   - `success: true`
 *   - `searchParams`: the validated and parsed output typed as `z.output<S>`
 *   - `errors`: undefined
 *
 * - Failure:
 *   - `success: false`
 *   - `errors.global`: array of form-level error messages
 *   - `errors.parameters`: a map of parameter keys to an array of field-level error messages.
 *     The parameter keys include:
 *       - input object keys (the schema's expected properties),
 *       - output keys from the schema pipeline, and
 *       - intermediate pipeline stage keys (when using Zod pipes).
 *   - `searchParams`: undefined
 *
 * Generic type parameter S is the Zod schema used to validate the input. On success
 * the returned `searchParams` is typed as `z.output<S>`.
 *
 * Note: This type is internal and intended for ergonomic handling of validation
 * results in server components that parse Next.js App Router search params.
 */
export type SearchParamsResult<O extends z.ZodRawShape> =
  | {
      success: false;
      errors: {
        global: string[];
        parameters: { [P in keyof z.core.$InferObjectOutput<O, Record<string, unknown>>]?: string[] };
      };
      searchParams: never;
    }
  | {
      success: true;
      searchParams: z.core.$InferObjectOutput<O, Record<string, unknown>>;
      errors: never;
    };

/**
 * Check if a string value represents a truthy boolean.
 * @internal
 */
const isTruthyString = (value: string): boolean => {
  const lowerValue = value.toLowerCase();
  return lowerValue === "true" || lowerValue === "1" || lowerValue === "yes" || lowerValue === "y";
};

/**
 * Coerce a value to a boolean based on common truthy string representations.
 * @internal
 */
const coerceToBoolean = (value: unknown): boolean => {
  if (typeof value === "string") {
    return isTruthyString(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && isTruthyString(item));
  }
  return false;
};

/**
 * Coerce a value to a number if possible.
 * @internal
 */
const coerceToNumber = (value: unknown): number | undefined => {
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (Array.isArray(value) && value.length === 1) {
    const parsed = Number(value[0]);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
};

/**
 * Coerce a string value to match an enum value (case-insensitive).
 * @internal
 */
const coerceToEnum = (value: unknown, enumValues: unknown[]): string | undefined => {
  if (typeof value !== "string") {
    return;
  }
  const lowerValue = value.toLowerCase();
  return (enumValues as string[]).find((enumValue) => typeof enumValue === "string" && enumValue.toLowerCase() === lowerValue);
};

/**
 * Process a single field based on its schema type.
 * @internal
 */
const processField = (value: unknown, schemaField: { _def?: { typeName?: string; values?: unknown[] } }): unknown => {
  const typeName = schemaField._def?.typeName;
  if (!typeName) {
    return value;
  }

  switch (typeName) {
    case "ZodBoolean":
      return coerceToBoolean(value);
    case "ZodArray":
      return Array.isArray(value) ? value : [value];
    case "ZodNumber": {
      const numValue = coerceToNumber(value);
      return numValue !== undefined ? numValue : value;
    }
    case "ZodEnum": {
      const enumValues = schemaField._def?.values;
      if (Array.isArray(enumValues)) {
        const matchedValue = coerceToEnum(value, enumValues);
        return matchedValue !== undefined ? matchedValue : value;
      }
      return value;
    }
    default:
      return value;
  }
};

/**
 * Schema-aware pre-processing of raw URL parameters.
 *
 * URL values are strings (or string arrays). Before validating with Zod,
 * we apply obvious, safe coercions using the target schema as a hint:
 * - Booleans: "true", "1", "yes", "y" (case-insensitive) → `true`
 * - Numbers: numeric strings → numbers; single-item arrays of numeric strings → number
 * - Arrays: single values → single-item arrays when the schema expects an array
 * - Enums: case-insensitive string match to a Zod enum's values
 *
 * Behavior
 * - Best effort: failure to process one field does not affect others
 * - Non-destructive: leaves values as-is when no obvious conversion exists
 * - Schema-scoped: keys not present in the schema are ignored
 * - Defensive: if schema internals are unavailable, returns original params
 *
 * @internal
 */
const processSearchParamsForSchema = (params: Record<string, unknown>, schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> => {
  const processed = params;

  try {
    const shape = schema.shape as unknown as Record<string, { _def?: { typeName?: string; values?: unknown[] } }>;

    for (const key in processed) {
      if (!Object.hasOwn(processed, key)) {
        continue;
      }

      try {
        const schemaField = shape[key];
        const value = processed[key];

        if (!schemaField || value === undefined || value === null) {
          continue;
        }

        processed[key] = processField(value, schemaField);
      } catch (error) {
        Logger.warn(`Error processing field "${key}":`, { error });
      }
    }
  } catch (error) {
    Logger.warn("Could not process search params with schema:", { error });
  }

  return processed;
};

/**
 * Extracts the underlying ZodObject shape from either a plain ZodObject schema
 * or nested ZodPipes whose ultimate input is a ZodObject.
 *
 * Used to support schemas with transforms (`.transform()`, `.pipe()`) throughout
 * the type system.
 */
export type InputObjectShape<S> = S extends z.ZodObject<infer O extends z.ZodRawShape> ? O : S extends z.ZodPipe<infer I extends z.ZodTypeAny, z.ZodTypeAny> ? InputObjectShape<I> : never;

/**
 * Union shape that reports field errors keyed by the input object's fields,
 * but carries the full pipeline's output type on success.
 *
 * @internal
 */
type InputKeys<S> = keyof z.core.$InferObjectOutput<InputObjectShape<S>, Record<string, unknown>>;
type OutputKeys<S> = z.output<S> extends object ? keyof z.output<S> : never;
/**
 * Depth-limited recursion to collect intermediate pipeline output keys (avoid infinite instantiation).
 *
 * @internal
 */
type StageKeys<S, D extends number = 5> = D extends 0
  ? never
  : S extends z.ZodPipe<infer I extends z.ZodTypeAny, infer O extends z.ZodTypeAny>
    ? StageKeys<I, Decrement<D>> | StageKeys<O, Decrement<D>> | (z.output<I> extends object ? keyof z.output<I> : never) | (z.output<O> extends object ? keyof z.output<O> : never)
    : never;
type ParameterKeys<S> = Extract<InputKeys<S> | OutputKeys<S> | StageKeys<S>, string>;
type ParameterErrors<S> = Prettify<Partial<Record<ParameterKeys<S>, string[]>> & Record<string, string[] | undefined>>;

/**
 * Discriminated union returned by {@link parseSearchParams}.
 *
 * On success: `success: true` and `searchParams` typed as `z.output<S>`.
 * On error: `success: false` with field-level {@link ParameterErrors} and global form errors.
 *
 * @internal
 */
export type SearchParamsResultForSchema<S> =
  | {
      success: false;
      errors: {
        global: string[];
        parameters: ParameterErrors<S>;
        pretty: string;
      };
      searchParams: undefined;
    }
  | {
      success: true;
      searchParams: z.output<S>;
      errors: undefined;
    };

/**
 * Parse the current request's URL search parameters using a Zod schema or pipeline.
 *
 * - Accepts a plain Zod object or nested {@link z.ZodPipe} chains that ultimately
 *   originate from a Zod object.
 * - Performs best-effort pre-processing based on the input object's shape before
 *   parsing with the full schema (including transforms/refinements).
 * - Memoized per request using React's {@link cache}.
 *
 * S - The Zod schema (object or pipeline) used to parse the search params.
 * @param schema The Zod schema or nested pipeline to parse with.
 * @returns A discriminated union containing either parsed `searchParams` or structured `errors`.
 * @throws If {@link cacheSearchParams} was not called earlier for the current request.
 *
 * @example Basic object schema
 * ```ts
 * const schema = z.object({ page: z.coerce.number().int().min(1).catch(1) });
 * const result = await parseSearchParams(schema);
 * if (result.success) {
 *   // result.searchParams.page is number
 * } else {
 *   // result.errors.parameters.page?: string[]
 * }
 * ```
 *
 * @example Pipeline with transforms and nested pipes
 * ```ts
 * const base = z.object({ q: z.string().optional(), flags: z.array(z.enum(['A','B'])).optional() });
 * const mid = base.transform(v => ({ ...v, len: v.q?.length ?? 0 }));
 * const schema = mid.pipe(z.object({ len: z.number().min(0) }));
 * const result = await parseSearchParams(schema);
 * // errors.parameters can include keys from base, mid (len), and final output
 * ```
 */
export const parseSearchParams = cache(async <S extends z.ZodTypeAny>(searchParams: Promise<SearchParams>, schema: S): Promise<SearchParamsResultForSchema<S>> => {
  // Unwrap the input object schema for preprocessing
  let inputObjectSchema: z.ZodObject<z.ZodRawShape>;
  // Unwrap nested ZodPipes to find the ultimate input object schema
  let current: z.ZodTypeAny = schema;
  // Structural access to the internal 'in' of ZodPipe without relying on private types
  type PipeIn<T extends z.ZodTypeAny> = { _def: { in: T } };
  while (current instanceof z.ZodPipe) {
    current = (current as unknown as PipeIn<z.ZodTypeAny>)._def.in;
  }
  if (current instanceof z.ZodObject) {
    inputObjectSchema = current as z.ZodObject<z.ZodRawShape>;
  } else {
    // Defensive: the function is typed to only allow these two, so this should never happen
    throw new Error("Unsupported schema type passed to `parseSearchParams`");
  }

  // Pre-process using the input object schema's shape
  const processedParams = processSearchParamsForSchema(await searchParams, inputObjectSchema);

  // Evaluate the full schema (pipe preserved)
  const fullResult = await schema.safeParseAsync(processedParams);

  // Always return a discriminated union based on the full schema result
  if (!fullResult.success) {
    const flattened = z.flattenError(fullResult.error);
    return {
      success: false as const,
      errors: {
        global: flattened.formErrors,
        // Map field errors to expected shape; Zod reports string keys which align with our index signature
        parameters: flattened.fieldErrors as ParameterErrors<S>,
        pretty: z.prettifyError(fullResult.error),
      },
      searchParams: undefined,
    };
  }
  return { success: true as const, searchParams: fullResult.data as z.output<S>, errors: undefined };
});
