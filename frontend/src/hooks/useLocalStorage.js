import { useState, useCallback } from 'react';

/**
 * useState backed by localStorage. The value is JSON-serialized, so it works
 * correctly with booleans, numbers, and objects (not just strings).
 *
 * @param {string} key - localStorage key
 * @param {*} defaultValue - value to use when the key is absent or unreadable
 * @returns {[*, Function]} [storedValue, setValue]
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback((newValue) => {
    setValue(newValue);
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch {}
  }, [key]);

  return [value, setStoredValue];
}
