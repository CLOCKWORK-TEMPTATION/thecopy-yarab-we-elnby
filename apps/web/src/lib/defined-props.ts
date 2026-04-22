type DefinedProps<T extends Record<string, unknown>> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<
    T[K],
    undefined
  >;
};

export function definedProps<T extends Record<string, unknown>>(
  props: T
): DefinedProps<T> {
  const entries = Object.entries(props).filter(
    ([, value]) => value !== undefined
  );
  return Object.fromEntries(entries) as DefinedProps<T>;
}
