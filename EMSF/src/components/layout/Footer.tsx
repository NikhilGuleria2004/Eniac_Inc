import { ENV_LABEL } from "../../data/constants";

export function Footer() {
  return (
    <footer className="app-footer">
      <span className="truncate">
        Eniac Inc. Employee Management System
      </span>
      <span className="badge badge-neutral shrink-0 hidden xs:inline-flex sm:inline-flex">{ENV_LABEL} ENVIRONMENT</span>
      <span className="badge badge-neutral shrink-0 sm:hidden">{ENV_LABEL}</span>
    </footer>
  );
}
