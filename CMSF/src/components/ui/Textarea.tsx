import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "form-input " +
      className;

    return <textarea ref={ref} className={classes} {...props} />;
  }
);

Textarea.displayName = "Textarea";
