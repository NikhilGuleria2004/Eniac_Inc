import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`breadcrumb-scroll flex items-center gap-2 text-sm ${className}`} aria-label="Breadcrumb">
      <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 shrink-0">
        <Home aria-hidden="true" size={14} />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 shrink-0">
          <ChevronRight aria-hidden="true" size={12} className="text-gray-400 shrink-0" />
          {item.href ? (
            <Link to={item.href} className="text-gray-600 hover:text-accent whitespace-nowrap">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium whitespace-nowrap">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
