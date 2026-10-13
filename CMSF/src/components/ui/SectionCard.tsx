import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({ title, subtitle, action, children, className = "", contentClassName = "" }: SectionCardProps) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
