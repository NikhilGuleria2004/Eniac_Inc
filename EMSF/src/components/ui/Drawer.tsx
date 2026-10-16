import { type ReactNode, useEffect, useId, useRef } from "react";
import { useFocusTrap } from "../../lib/useFocusTrap";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
}

export function Drawer({ open, onClose, title, children, footer, side = "right" }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const sideClasses = side === "right" ? "right-0" : "left-0";

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`fixed top-0 bottom-0 w-[calc(100vw-2rem)] max-w-md ${sideClasses} card shadow-xl flex flex-col min-w-0 overscroll-contain`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Panel"}
      >
        {(title) && (
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
        {footer && (
          <div className="border-t border-gray-200 p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
