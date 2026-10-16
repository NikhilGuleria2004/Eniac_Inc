import { type ReactNode, useEffect, useId, useRef, useState } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

const SHOW_DELAY = 400;

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => cancel, []);

  // Delay the first show on hover; show immediately on keyboard focus.
  const showDelayed = () => {
    cancel();
    timerRef.current = setTimeout(() => setOpen(true), SHOW_DELAY);
  };
  const showNow = () => {
    cancel();
    setOpen(true);
  };
  const hide = () => {
    cancel();
    setOpen(false);
  };

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showDelayed}
      onMouseLeave={hide}
      onFocus={showNow}
      onBlur={hide}
    >
      {children}
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 rounded-md bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap ${sideClasses[side]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
