import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Select = forwardRef<HTMLSelectElement, ComponentPropsWithoutRef<"select">>(
  ({ className = "", children, ...props }, ref) => {
    const classes =
      "form-input appearance-none bg-no-repeat bg-right pr-10 " +
      className;

    return (
      <div className="relative">
        <select ref={ref} className={classes} {...props}>
          {children}
        </select>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  }
);

Select.displayName = "Select";
