/**
 * Type representing all uppercase letters A-Z.
 * Useful for type-level string validation and pattern matching.
 *
 * @example
 * ```typescript
 * type HasUppercase<S extends string> = S extends `${string}${UppercaseLetter}${string}` ? true : false;
 * ```
 */
export type UppercaseLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

/**
 * Type representing all lowercase letters a-z.
 * Useful for type-level string validation and pattern matching.
 *
 * @example
 * ```typescript
 * type IsLowercase<S extends string> = S extends `${LowercaseLetter}${string}` ? true : false;
 * ```
 */
export type LowercaseLetter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

/**
 * Type representing all letters (both uppercase and lowercase).
 * Combines UppercaseLetter and LowercaseLetter for comprehensive letter matching.
 *
 * @example
 * ```typescript
 * type StartsWithLetter<S extends string> = S extends `${Letter}${string}` ? true : false;
 * ```
 */
export type Letter = UppercaseLetter | LowercaseLetter;

/**
 * Type representing all numeric digits 0-9.
 * Useful for type-level numeric string validation.
 *
 * @example
 * ```typescript
 * type IsDigit<S extends string> = S extends Digit ? true : false;
 * ```
 */
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/**
 * Type representing all alphanumeric characters (letters and digits).
 * Combines Letter and Digit for comprehensive alphanumeric matching.
 *
 * @example
 * ```typescript
 * type IsAlphanumeric<S extends string> = S extends `${Alphanumeric}${string}` ? true : false;
 * ```
 */
export type Alphanumeric = Letter | Digit;
