interface AvatarProps {
  name?: string;
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizePx = { sm: 32, md: 40, lg: 48 } as const;

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ name, src, alt, size = "md", className = "" }: AvatarProps) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const classes = `inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-medium ${sizeClasses[size]} ${className}`;

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || "Avatar"}
        loading="lazy"
        decoding="async"
        width={sizePx[size]}
        height={sizePx[size]}
        className={`${classes} object-cover`}
      />
    );
  }

  return <span className={classes}>{initials || "?"}</span>;
}
