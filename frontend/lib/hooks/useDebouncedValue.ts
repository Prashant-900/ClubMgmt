"use client";

import { useEffect, useState } from "react";

/**
 * Returns a copy of `value` that only settles after `delayMs` of quiet time.
 *
 * Bind the input itself to the raw state so typing stays instant, and use the
 * returned value as the fetch dependency:
 *
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 * // <input value={search} onChange={...} />  ← immediate
 * // useEffect(..., [debouncedSearch])        ← throttled
 * ```
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    // Clearing on every change is what collapses a burst of keystrokes
    // into a single update.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
