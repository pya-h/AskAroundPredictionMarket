export function isEnumElement<T>(enumObj: T, value: unknown): value is T {
  return Object.values(enumObj).includes(value as T);
}
