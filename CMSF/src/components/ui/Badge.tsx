import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Badge = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  ({ className = "", ...props }, ref) => {
    const base =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
      className;

    return <span ref={ref} className={base} {...props} />;
  }
);

Badge.displayName = "Badge";
