import { useState, useEffect } from "react";

/**
 * Custom hook for debouncing value changes.
 *
 * Delays state updates until after the user stops changing the value.
 * Useful for expensive operations like searching through large lists.
 *
 * @hook
 * @param {*} value - The value to debounce
 * @param {number} [delay=250] - Debounce delay in milliseconds
 * @returns {*} Debounced value, updates after delay with no changes
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 300);
 *
 * // debouncedSearch only updates 300ms after user stops typing
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
