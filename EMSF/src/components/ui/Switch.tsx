import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Switch = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "peer h-5 w-9 cursor-pointer appearance-none rounded-full border border-gray-300 bg-gray-200 transition-colors checked:bg-accent checked:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 " +
      className;

    const thumbClasses =
      "pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4";

    return (
      <label className="relative inline-flex items-center">
        <input ref={ref} type="checkbox" className={classes} {...props} />
        <span className={thumbClasses} />
      </label>
    );
  }
);

Switch.displayName = "Switch";
