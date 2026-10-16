import { useState, createContext, useContext, type ComponentPropsWithoutRef } from "react";

interface TabsContextValue {
  activeTab: string | undefined;
  setActiveTab: (value: string) => void;
}

const TabsContext = /* @__PURE__ */ createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within Tabs");
  return ctx;
}

interface TabsProps {
  /** Initial tab for uncontrolled usage; omit when providing `value`. */
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className = "" }: TabsProps) {
  const [internal, setInternal] = useState<string | undefined>(defaultValue);
  const active = value ?? internal;
  const setActive = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ activeTab: active, setActiveTab: setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends ComponentPropsWithoutRef<"div"> {}

export function TabsList({ className = "", ...props }: TabsListProps) {
  // Grid tab bars (e.g. chart card switchers) already fill their container
  // and must not be forced into a scroll wrapper — render them directly.
  if (className.includes("flex-wrap") || className.includes("grid")) {
    return (
      <div
        className={`flex flex-wrap items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1 ${className}`}
        role="tablist"
        {...props}
      />
    );
  }
  return (
    <div className="tabs-scroll max-w-full">
      <div
        className={`inline-flex items-center rounded-md border border-gray-200 bg-gray-50 p-1 ${className}`}
        role="tablist"
        {...props}
      />
    </div>
  );
}

interface TabsTriggerProps extends ComponentPropsWithoutRef<"button"> {
  value: string;
}

export function TabsTrigger({ value, className = "", ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  const classes =
    "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-colors " +
    (isActive
      ? "bg-white text-gray-900 shadow-sm"
      : "text-gray-600 hover:text-gray-900") +
    " " +
    className;

  // WAI-ARIA tabs pattern: arrow keys move (and activate) between tabs,
  // Home/End jump to first/last. Triggers live in the same tablist, so we
  // traverse siblings in the DOM.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const list = e.currentTarget.parentElement;
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const index = tabs.indexOf(e.currentTarget);
    if (index === -1) return;

    let next: HTMLButtonElement | undefined;
    if (e.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    else return;

    e.preventDefault();
    next.focus();
    next.click();
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      data-state={isActive ? "active" : "inactive"}
      className={classes}
      onClick={() => setActiveTab(value)}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

interface TabsContentProps extends ComponentPropsWithoutRef<"div"> {
  value: string;
}

export function TabsContent({ value, className = "", ...props }: TabsContentProps) {
  const { activeTab } = useTabs();

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      data-state={activeTab === value ? "active" : "inactive"}
      className={className}
      {...props}
    />
  );
}
