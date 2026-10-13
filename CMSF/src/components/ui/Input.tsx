import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "form-input " +
      className;

    return <input ref={ref} className={classes} {...props} />;
  }
);

Input.displayName = "Input";
