import { z } from 'zod';

import type { Never } from './never';
import type { UppercaseLetter } from './regex-like';

/**
 * Type-level validation for kebab-case strings.
 * Provides compile-time feedback with descriptive error messages.
 */
export type KebabCase<VariableName extends string, S extends string> = S extends ''
  ? Never<`${VariableName} cannot be empty - must be in kebab-case format`>
  : S extends `${string}${UppercaseLetter}${string}`
    ? Never<`${VariableName} contains uppercase letters - kebab-case requires lowercase only`>
    : S extends ` ${string}` | `${string} ` | `${string} ${string}`
      ? Never<`${VariableName} contains spaces - kebab-case uses hyphens instead`>
      : S extends `_${string}` | `${string}_` | `${string}_${string}`
        ? Never<`${VariableName} contains underscores - kebab-case uses hyphens instead`>
        : S extends `-${string}`
          ? Never<`${VariableName} cannot start with a hyphen in kebab-case format`>
          : S extends `${string}-`
            ? Never<`${VariableName} cannot end with a hyphen in kebab-case format`>
            : S extends `${string}--${string}`
              ? Never<`${VariableName} contains consecutive hyphens - only single hyphens allowed in kebab-case`>
              : S;

/**
 * Runtime regex for kebab-case validation:
 * - Must start and end with lowercase letter or digit
 * - Can contain lowercase letters, digits, and single hyphens
 * - No consecutive hyphens, no leading/trailing hyphens
 */
const kebabCaseRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Zod schema for kebab-case string validation.
 * Provides both runtime validation and compile-time type safety.
 *
 * @example
 * ```typescript
 * const schema = kebabCaseSchema();
 * const result = schema.parse("valid-kebab-case"); // ✅ passes
 * const invalid = schema.parse("Invalid_Case"); // ❌ throws validation error
 * ```
 */
export const kebabCaseSchema = () =>
  z.string().refine(
    (val) => {
      if (typeof val !== 'string') return false;
      return kebabCaseRegex.test(val);
    },
    {
      message: 'Must be kebab-case: lowercase letters and numbers only, separated by single hyphens (no leading, trailing, or consecutive hyphens)',
    },
  );
