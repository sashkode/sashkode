/**
 * Make a type easier to read in IDEs by resolving intersections and mapped types.
 *
 * Prettify produces a shallow "pretty" object type by remapping all keys of `T`
 * into a new object. This often flattens displayed types in IntelliSense and
 * hover tooltips, without changing the actual compile-time structure.
 *
 * Notes
 * - Non-destructive: it doesn't add or remove properties; it simply re-emits them.
 * - Shallow: only affects the top-level shape; nested objects remain as-is unless
 *   you apply Prettify at those levels too.
 * - Idempotent: applying Prettify multiple times has no additional effect.
 *
 * @example
 * type Raw = { a: string } & { b: number };
 * type Pretty = Prettify<Raw>; // { a: string; b: number }
 */
export type Prettify<T> = {
  [Key in keyof T]: T[Key];
} & {};
