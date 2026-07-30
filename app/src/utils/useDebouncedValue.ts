import { useEffect, useState } from 'react';

/**
 * Collapse rapid value changes (e.g. keystrokes) into a single debounced value.
 * Bind the input to the raw state, use the returned value as your fetch dependency.
 * Mirrors the web's useDebouncedValue.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
