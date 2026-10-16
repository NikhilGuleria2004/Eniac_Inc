interface BrandMarkProps {
  size?: number;
  variant?: "default" | "on-dark";
  className?: string;
}

/**
 * Eniac EMS brand mark — connected org-chart nodes on the institutional
 * navy tile. Matches the browser favicon (public/favicon.svg) exactly;
 * rendered inline so it inherits no external asset dependency.
 */
export function BrandMark({ size = 36, variant = "default", className = "" }: BrandMarkProps) {
  const gid = variant === "on-dark" ? "od" : "lt";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Eniac Inc. logo"
      translate="no"
    >
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={`eniac-bg-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#163A63" />
            <stop offset="1" stopColor="#0B1F3A" />
          </linearGradient>
          <linearGradient id={`eniac-node-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4C8DFF" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#eniac-bg-${gid})`} />
        <rect x="2" y="2" width="60" height="60" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="2" />
        <g stroke="#4C8DFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
          <path d="M32 17v6" />
          <path d="M32 23H18v6" />
          <path d="M32 23h14v6" />
        </g>
        <circle cx="32" cy="14" r="5" fill={`url(#eniac-node-${gid})`} stroke="#fff" strokeWidth="1.6" />
        <circle cx="18" cy="34" r="5" fill={`url(#eniac-node-${gid})`} stroke="#fff" strokeWidth="1.6" />
        <circle cx="46" cy="34" r="5" fill={`url(#eniac-node-${gid})`} stroke="#fff" strokeWidth="1.6" />
        <circle cx="32" cy="46" r="5" fill="#fff" />
        <circle cx="32" cy="46" r="5" fill="none" stroke={`url(#eniac-node-${gid})`} strokeWidth="2" />
        <g stroke="#0B1F3A" strokeWidth="1.8" strokeLinecap="round">
          <path d="M29.5 46h5" />
        </g>
      </svg>
    </span>
  );
}
