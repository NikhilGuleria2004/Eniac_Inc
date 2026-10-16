import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * useState-like state persisted in the URL query string, so filters/search
 * survive share, refresh, and Back/Forward navigation (URL as state).
 */
export function useUrlState(
  key: string,
  defaultValue = ""
): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? defaultValue;

  const setValue = useCallback(
    (next: string) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (!next || next === defaultValue) p.delete(key);
          else p.set(key, next);
          return p;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setParams]
  );

  return [value, setValue];
}
