import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Radio = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "h-4 w-4 border-gray-300 text-accent focus:ring-accent " +
      className;

    return <input ref={ref} type="radio" className={classes} {...props} />;
  }
);

Radio.displayName = "Radio";
