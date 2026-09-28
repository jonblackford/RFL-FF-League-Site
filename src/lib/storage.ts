type ParsedStorageOptions<T> = {
  storage?: Pick<Storage, "getItem" | "removeItem">;
  removeOnError?: boolean;
  isValid?: (value: unknown) => value is T;
};
// Nonessential UI preferences must not prevent a session when browser storage is denied.
// League persistence keeps its own stricter error handling and is not routed through this adapter.
export const preferenceStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Session state remains usable. */
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Optional preference. */
    }
  },
};
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
export const getParsedStorageItem = <T>(
  key: string,
  fallback: T,
  {
    storage = preferenceStorage,
    removeOnError = true,
    isValid,
  }: ParsedStorageOptions<T> = {},
): T => {
  try {
    const rawValue = storage.getItem(key);
    if (rawValue === null) return fallback;
    const parsed: unknown = JSON.parse(rawValue);
    if (isValid && !isValid(parsed)) {
      if (removeOnError) storage.removeItem(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    if (removeOnError)
      try {
        storage.removeItem(key);
      } catch {
        /* Access may be denied. */
      }
    return fallback;
  }
};
