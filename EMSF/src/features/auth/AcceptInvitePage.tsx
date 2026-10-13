import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { apiFetch, ApiRequestError } from "../../lib/api";
import { BrandMark } from "../../components/brand/BrandMark";

interface InvitationPreview {
  employeeId: string;
  employeeName: string;
  email: string;
  workMail?: string;
  role: string;
  expiresAt: string;
}

type PageState =
  | { status: "loading" }
  | { status: "ready"; preview: InvitationPreview }
  | { status: "invalid"; message: string }
  | { status: "submitting" }
  | { status: "done" };

const ERROR_MESSAGES: Record<string, string> = {
  INVITATION_EXPIRED: "This invitation link has expired. Please ask your HR administrator for a new one.",
  INVITATION_INVALID: "This invitation link has already been used or was revoked.",
  NOT_FOUND: "This invitation link is invalid."
};

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!token) {
        setPageState({ status: "invalid", message: "This invitation link is invalid." });
        return;
      }
      try {
        const res = await apiFetch<InvitationPreview>(`/invitations/${token}`);
        if (!cancelled) setPageState({ status: "ready", preview: res.data });
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof ApiRequestError ? err.code : "";
        setPageState({
          status: "invalid",
          message: ERROR_MESSAGES[code] ?? "This invitation link is invalid."
        });
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Redirect to the login page shortly after a successful password reset.
  useEffect(() => {
    if (pageState.status !== "done") return;
    const timer = setTimeout(() => navigate("/login", { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [pageState.status, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }

    setPageState({ status: "submitting" });
    try {
      await apiFetch(`/invitations/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({ password })
      });
      setPageState({ status: "done" });
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.code : "";
      const message =
        ERROR_MESSAGES[code] ??
        (err instanceof ApiRequestError ? err.message : "Failed to set your password. Please try again.");
      setPageState({ status: "invalid", message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <BrandMark size={56} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">ENIAC INC.</h1>
            <p className="text-sm text-gray-500">Set up your account</p>
          </div>

          {pageState.status === "loading" && (
            <p className="text-sm text-gray-500 text-center">Validating your invitation...</p>
          )}

          {pageState.status === "invalid" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <XCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{pageState.message}</span>
              </div>
              <Link to="/login" className="btn btn-secondary w-full">Back to Sign In</Link>
            </div>
          )}

          {pageState.status === "done" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <span>Password set successfully. Redirecting you to sign in...</span>
              </div>
              <Link to="/login" className="btn btn-primary w-full">Continue to Sign In</Link>
            </div>
          )}

          {(pageState.status === "ready" || pageState.status === "submitting") && (
            <>
              <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                 <p className="text-sm font-medium text-gray-900">{pageState.status === "ready" ? pageState.preview.employeeName : ""}</p>
                 <p className="text-xs text-gray-500">
                   {pageState.status === "ready" ? (pageState.preview.workMail ?? pageState.preview.email) : ""}
                   {pageState.status === "ready" && ` · ${pageState.preview.role}`}
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input pr-10"
                      placeholder="At least 8 characters, with a letter and a number"
                      required
                      autoComplete="new-password"
                      disabled={pageState.status === "submitting"}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 bottom-0 pb-2.5 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    placeholder="Re-enter your password"
                    required
                    autoComplete="new-password"
                    disabled={pageState.status === "submitting"}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pageState.status === "submitting"}
                  className="btn btn-primary w-full"
                >
                  {pageState.status === "submitting" ? "Setting password..." : "Set Password & Activate"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Secure Enterprise Workforce Platform
        </p>
      </div>
    </div>
  );
}
