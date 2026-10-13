import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Checkbox = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent " +
      className;

    return <input ref={ref} type="checkbox" className={classes} {...props} />;
  }
);

Checkbox.displayName = "Checkbox";
