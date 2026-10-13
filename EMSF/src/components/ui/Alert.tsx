interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

export function Alert({ variant = "info", title, children, className = "" }: AlertProps) {
  return (
    <div className={`rounded-md border px-4 py-3 ${variantStyles[variant]} ${className}`}>
      {title && <p className="font-medium mb-1">{title}</p>}
      <p className="text-sm">{children}</p>
    </div>
  );
}
