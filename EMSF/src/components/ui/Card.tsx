import { type ComponentPropsWithoutRef, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className = "", ...props }, ref) => {
    const classes =
      "card " + className;

    return <div ref={ref} className={classes} {...props} />;
  }
);

Card.displayName = "Card";
