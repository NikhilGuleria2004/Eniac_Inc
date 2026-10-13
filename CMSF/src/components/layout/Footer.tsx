import { ENV_LABEL } from "../../data/constants";

export function Footer() {
  return (
    <footer className="app-footer">
      <span>Eniac Inc. Client Management System</span>
      <span className="badge badge-neutral">{ENV_LABEL} ENVIRONMENT</span>
    </footer>
  );
}
