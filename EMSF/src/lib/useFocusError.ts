import { useEffect, useRef } from "react";

/**
 * Returns a ref for an error summary container. When `error` becomes truthy
 * (a message string, a non-empty array length, or `true`), focus moves to the
 * first invalid control inside the nearest form, falling back to the summary
 * itself — so keyboard and screen-reader users land on the problem after a
 * failed submit instead of losing their place.
 *
 * Attach the ref to the summary element and give it `tabIndex={-1}` so it can
 * receive focus.
 */
export function useFocusError<T extends HTMLElement = HTMLDivElement>(error: unknown) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!error) return;
    const summary = ref.current;
    const form = summary?.closest("form") ?? null;
    const invalid = form?.querySelector<HTMLElement>(":invalid");
    (invalid ?? summary)?.focus();
  }, [error]);

  return ref;
}
