import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "form-input min-h-[80px] resize-y " +
      className;

    // ⌘/Ctrl+Enter submits the enclosing form (textarea Enter inserts newline).
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        const form = e.currentTarget.form;
        if (form) {
          e.preventDefault();
          form.requestSubmit();
        }
      }
      props.onKeyDown?.(e);
    };

    return <textarea ref={ref} className={classes} {...props} onKeyDown={handleKeyDown} />;
  }
);

Textarea.displayName = "Textarea";
