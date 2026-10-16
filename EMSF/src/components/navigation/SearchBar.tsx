import { useState, useRef, useEffect } from "react";
import { Search, ArrowRight } from "lucide-react";
import { ROUTES } from "../../data/constants";
import { getEmployees, getClients, getProjects } from "../../data/mock/repositories";
import { NavLink } from "react-router-dom";

interface SearchResult {
  label: string;
  sub: string;
  route: string;
  type: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const employees = getEmployees();
  const clients = getClients();
  const projects = getProjects();

  const q = query.toLowerCase().trim();

  const results: SearchResult[] = q
    ? [
        ...employees
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
          })),
        ...clients
          .filter((c) => c.name.toLowerCase().includes(q) || c.clientCode.toLowerCase().includes(q))
          .map((c) => ({
            label: c.name,
            sub: c.clientCode,
            route: ROUTES.CLIENT_DETAIL(c.id),
            type: "Client",
          })),
        ...projects
          .filter((p) => p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q))
          .map((p) => ({
            label: p.name,
            sub: p.projectCode,
            route: ROUTES.PROJECT_DETAIL(p.id),
            type: "Project",
          })),
      ]
    : [];

  const showResults = q && open && results.length > 0;
  const showEmpty = q && open && results.length === 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = () => {
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative flex-1 max-w-xl" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && open) {
              e.preventDefault();
              dropdownRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
            }
          }}
          placeholder="Search employees, projects, clients…"
          aria-label="Search employees, projects, clients"
          aria-expanded={open}
          aria-autocomplete="list"
          className="form-input pl-10 pr-4 text-sm"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          {showResults && (
            <div className="p-1">
              {results.map((result, index) => (
                <NavLink
                  key={`${result.route}-${index}`}
                  to={result.route}
                  onClick={handleSelect}
                  className="flex items-center justify-between px-3 py-2 rounded-sm hover:bg-gray-50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 min-w-[60px]">{result.type}</span>
                    <div>
                      <p className="font-medium text-gray-900">{result.label}</p>
                      <p className="text-xs text-gray-500">{result.sub}</p>
                    </div>
                  </div>
                  <ArrowRight aria-hidden="true" size={14} className="text-gray-400" />
                </NavLink>
              ))}
            </div>
          )}
          {showEmpty && (
            <div className="px-3 py-4 text-center text-sm text-gray-500">No results found</div>
          )}
          {!q && open && (
            <div className="px-3 py-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Quick Links</p>
              <NavLink to={ROUTES.DASHBOARD} onClick={handleSelect} className="flex items-center py-1 text-sm text-gray-700 hover:text-accent">
                Go to Dashboard
              </NavLink>
              <NavLink to={ROUTES.EMPLOYEES} onClick={handleSelect} className="flex items-center py-1 text-sm text-gray-700 hover:text-accent">
                Employee Directory
              </NavLink>
              <NavLink to={ROUTES.PROJECTS} onClick={handleSelect} className="flex items-center py-1 text-sm text-gray-700 hover:text-accent">
                Projects
              </NavLink>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
