import { useEffect, useRef, useState } from "react";

/**
 * Returns `value` after it stops changing for `delayMs` (default 300ms).
 * When `flushKey` changes (e.g. active scene id), returns the latest
 * `value` immediately so stale content is not shown after a context switch.
 */
export const useDebouncedValue = (value, delayMs = 300, flushKey) => {
  const [debounced, setDebounced] = useState(value);
  const prevFlushKeyRef = useRef(flushKey);
  const flushKeyChanged =
    flushKey !== undefined && prevFlushKeyRef.current !== flushKey;

  if (flushKeyChanged) {
    prevFlushKeyRef.current = flushKey;
  }

  useEffect(() => {
    setDebounced(value);
  }, [flushKey]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs, flushKey]);

  if (flushKeyChanged) {
    return value;
  }

  return debounced;
};
