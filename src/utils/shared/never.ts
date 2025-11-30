/**
 * Never type utility for providing meaningful compile-time error messages
 * instead of generic `never` types that don't explain what went wrong.
 */

/**
 * Creates a type-level error that prevents assignment of invalid types.
 * Used to provide meaningful error messages during type checking.
 *
 * @template TypeError - The error message to display when type checking fails.
 * @returns A type that can never be instantiated, with an embedded error message.
 *
 * @example
 * type ValidColors = 'red' | 'green' | 'blue';
 *
 * function setColor<T extends string>(color: T) {
 *   return color as T extends ValidColors
 *     ? T
 *     : Never<`Invalid color '${T}'. Must be one of: 'red' | 'green' | 'blue'`>
 * }
 *
 * // Will show a type error: Invalid color 'yellow'. Must be one of: 'red' | 'green' | 'blue'
 * const color = setColor('yellow');
 *
 * // Works fine
 * const validColor = setColor('red');
 *
 * @remarks
 * This type is primarily used as a utility for other type-level operations
 * to provide meaningful error messages when type constraints are violated.
 * It works by creating an impossible type intersection that triggers
 * TypeScript's type checker with a custom error message.
 */
export type Never<TypeError extends string> = { _typeError: string & TypeError };
