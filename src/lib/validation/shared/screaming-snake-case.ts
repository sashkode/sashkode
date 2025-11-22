import { z } from 'zod';

import type { Never } from './never';
import type { LowercaseLetter } from './regex-like';

/**
 * Type-level validation for SCREAMING_SNAKE_CASE strings.
 * Provides compile-time feedback with descriptive error messages.
 */
export type ScreamingSnakeCase<VariableName extends string, S extends string> = S extends ''
  ? Never<`${VariableName} cannot be empty - must be in SCREAMING_SNAKE_CASE format`>
  : S extends `${string}${LowercaseLetter}${string}`
    ? Never<`${VariableName} contains lowercase letters - SCREAMING_SNAKE_CASE requires uppercase only`>
    : S extends ` ${string}` | `${string} ` | `${string} ${string}`
      ? Never<`${VariableName} contains spaces - SCREAMING_SNAKE_CASE uses underscores instead`>
      : S extends `-${string}` | `${string}-` | `${string}-${string}`
        ? Never<`${VariableName} contains hyphens - SCREAMING_SNAKE_CASE uses underscores instead`>
        : S extends `_${string}`
          ? Never<`${VariableName} cannot start with an underscore in SCREAMING_SNAKE_CASE format`>
          : S extends `${string}_`
            ? Never<`${VariableName} cannot end with an underscore in SCREAMING_SNAKE_CASE format`>
            : S extends `${string}__${string}`
              ? Never<`${VariableName} contains consecutive underscores - only single underscores allowed in SCREAMING_SNAKE_CASE`>
              : S;

/**
 * Runtime regex for SCREAMING_SNAKE_CASE validation:
 * - Must start and end with uppercase letter or digit
 * - Can contain uppercase letters, digits, and single underscores
 * - No consecutive underscores, no leading/trailing underscores
 */
const screamingSnakeCaseRegex = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

/**
 * Zod schema for SCREAMING_SNAKE_CASE string validation.
 * Provides both runtime validation and compile-time type safety.
 *
 * @example
 * ```typescript
 * const schema = screamingSnakeCaseSchema();
 * const result = schema.parse("VALID_SCREAMING_SNAKE_CASE"); // ✅ passes
 * const invalid = schema.parse("invalid_case"); // ❌ throws validation error
 * ```
 */
export const screamingSnakeCaseSchema = () =>
  z.string().refine(
    (val) => {
      if (typeof val !== 'string') return false;
      return screamingSnakeCaseRegex.test(val);
    },
    {
      message: 'Must be SCREAMING_SNAKE_CASE: uppercase letters and numbers only, separated by single underscores (no leading, trailing, or consecutive underscores)',
    },
  );
