import { useState, useRef, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
import { ROUTES } from "../../data/constants";
import { getEmployees, getClients, getProjects } from "../../data/mock/repositories";
import { NavLink } from "react-router-dom";
import { useFocusTrap } from "../../lib/useFocusTrap";

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

function ShortcutBadge() {
  // Platform-specific symbol, glued with non-breaking spaces.
  return (
    <kbd className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
      {IS_MAC ? "⌘\u00A0+\u00A0K" : "Ctrl\u00A0+\u00A0K"}
    </kbd>
  );
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(open, panelRef);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
    // Focus return on close is handled by useFocusTrap.
  }, [open]);

  const employees = getEmployees();
  const clients = getClients();
  const projects = getProjects();

  const q = query.toLowerCase().trim();

  const results = [
    ...(q
      ? employees
          .filter(
            (e) =>
              e.firstName.toLowerCase().includes(q) ||
              e.lastName.toLowerCase().includes(q) ||
              e.email.toLowerCase().includes(q) ||
              e.employeeCode.toLowerCase().includes(q)
          )
          .map((e) => ({
            label: `${e.firstName} ${e.lastName}`,
            sub: e.employeeCode,
            route: ROUTES.EMPLOYEE_DETAIL(e.id),
            type: "Employee",
          }))
      : []),
    ...(q
      ? clients
          .filter((c) => c.name.toLowerCase().includes(q) || c.clientCode.toLowerCase().includes(q))
          .map((c) => ({
            label: c.name,
            sub: c.clientCode,
            route: ROUTES.CLIENT_DETAIL(c.id),
            type: "Client",
          }))
      : []),
    ...(q
      ? projects
          .filter((p) => p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q))
          .map((p) => ({
            label: p.name,
            sub: p.projectCode,
            route: ROUTES.PROJECT_DETAIL(p.id),
            type: "Project",
          }))
      : []),
  ];

  const commands = [
    { label: "Go to Dashboard", route: ROUTES.DASHBOARD },
    { label: "Add Employee", route: ROUTES.EMPLOYEES },
    { label: "Create Client", route: ROUTES.CLIENTS },
    { label: "Create Project", route: ROUTES.PROJECTS },
    { label: "Request Leave", route: ROUTES.LEAVE_REQUEST },
    { label: "View Notifications", route: ROUTES.NOTIFICATIONS },
    { label: "Open Reports", route: ROUTES.REPORTS },
    { label: "Open Profile", route: ROUTES.PROFILE },
  ];

  const showCommands = !q;
  const showResults = q && results.length > 0;

  // Arrow keys move focus between the palette's option links.
  const focusFirstOption = () => {
    panelRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
  };
  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'));
    if (options.length === 0) return;
    const index = options.indexOf(document.activeElement as HTMLAnchorElement);
    e.preventDefault();
    if (e.key === "ArrowDown") {
      const next = index === -1 ? options[0] : options[Math.min(index + 1, options.length - 1)];
      next.focus();
    } else {
      const next = index <= 0 ? inputRef.current! : options[index - 1];
      next.focus();
    }
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="btn btn-secondary text-sm w-full max-w-xl mx-4 hidden md:flex items-center justify-between"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="text-gray-500">Search employees, projects, clients…</span>
        <ShortcutBadge />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[15vh] overscroll-contain"
          onClick={close}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-xl bg-white rounded-md shadow-xl border border-gray-200 mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Search size={18} className="text-gray-400" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    focusFirstOption();
                  }
                }}
                placeholder="Type a command or search…"
                aria-label="Type a command or search"
                className="flex-1 outline-none text-sm"
              />
              <kbd className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div
              className="max-h-80 overflow-y-auto overscroll-contain p-2"
              onKeyDown={handleListKeyDown}
            >
              {showCommands && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">Commands</p>
                  {commands.map((cmd) => (
                    <NavLink
                      key={cmd.label}
                      to={cmd.route}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-2 py-2 rounded-sm hover:bg-gray-50 text-sm"
                    >
                      <span>{cmd.label}</span>
                      <ArrowRight aria-hidden="true" size={14} className="text-gray-400" />
                    </NavLink>
                  ))}
                </div>
              )}
              {showResults && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">Results</p>
                  {results.map((result, index) => (
                    <NavLink
                      key={index}
                      to={result.route}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between px-2 py-2 rounded-sm hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm text-gray-900">{result.label}</p>
                        <p className="text-xs text-gray-500">{result.sub}</p>
                      </div>
                      <span className="text-xs text-gray-400">{result.type}</span>
                    </NavLink>
                  ))}
                </div>
              )}
              {q && !showResults && (
                <div className="px-2 py-4 text-center text-sm text-gray-500">No results found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
