import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "./AuthContext";
import { DEMO_USERS } from "../../data/constants";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: isRestoringSession } = useAuth();
  const navigate = useNavigate();

  if (isRestoringSession) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(email, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("Invalid email or password");
    }
    setIsLoading(false);
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setError("");
    setIsLoading(true);

    const success = await login(demoEmail, demoPassword);
    if (success) {
      navigate("/dashboard");
    } else {
      setError(`Quick login failed for ${demoEmail}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">ENIAC INC.</h1>
            <p className="text-sm text-gray-500">Client Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email or work email"
                required
                autoComplete="off"
                autoCorrect="off"
              />
            </div>

            <div className="relative">
              <label className="form-label">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input pr-10"
                placeholder="Enter your password"
                required
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
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

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center mb-3">DEV QUICK LOGIN</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.role}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(u.email, u.password)}
                  className="btn btn-secondary flex flex-col items-start gap-0.5"
                  title={`${u.email} / ${u.password}`}
                >
                  <span className="font-medium">{u.role}</span>
                  <span className="text-xs text-gray-500">{u.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Secure Enterprise Workforce Platform
        </p>
      </div>
    </div>
  );
}
