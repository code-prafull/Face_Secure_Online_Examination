import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiLogIn, FiShield } from "react-icons/fi";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/layout/ThemeToggle";

const Login = () => {
  const { login, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await login(email.trim(), password);
      const target = location.state?.from?.pathname || getDashboardPath(data?.user?.role);
      toast.success(`Welcome back, ${data?.user?.name || "user"}!`);
      navigate(target, { replace: true });
    } catch (err) {
      const msg = err?.message || "Login failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
            <FiShield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Face Secure</h1>
          <p className="mt-2 text-sm text-slate-500">
            AI-proctored online examination platform
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Access your examination portal
          </p>

          {error && (
            <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiLogIn className="h-4 w-4" />
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New student?{" "}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Create an account
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Teacher (invigilator) accounts are provisioned by the administrator.
        </p>
      </div>
    </div>
  );
};

export default Login;
