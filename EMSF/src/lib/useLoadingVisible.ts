import { useEffect, useState } from "react";

interface UseLoadingVisibleOptions {
  /** Wait this long before showing anything, so fast responses never flash. */
  showDelay?: number;
  /** Once shown, stay visible at least this long to avoid flicker. */
  minDuration?: number;
}

/**
 * Gates a loading indicator so it never flashes on fast responses and never
 * disappears instantly: nothing renders until `showDelay` elapses, and once
 * visible it stays for at least `minDuration` after `active` turns false.
 */
export function useLoadingVisible(
  active: boolean,
  { showDelay = 200, minDuration = 400 }: UseLoadingVisibleOptions = {},
): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      const showTimer = setTimeout(() => setVisible(true), showDelay);
      return () => clearTimeout(showTimer);
    }
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), minDuration);
    return () => clearTimeout(hideTimer);
  }, [active, showDelay, minDuration, visible]);

  return visible;
}
