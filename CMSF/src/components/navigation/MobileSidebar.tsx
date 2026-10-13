import { Sidebar } from "../../components/layout/Sidebar";

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute top-0 left-0 h-full w-64 overflow-y-auto">
        <Sidebar collapsed={false} onNavigate={onClose} />
      </div>
    </div>
  );
}
