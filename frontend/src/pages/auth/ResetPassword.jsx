import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiLock, FiArrowLeft } from "react-icons/fi";
import { toast } from "sonner";
import ThemeToggle from "../../components/layout/ThemeToggle";
import { resetPassword } from "../../services/authService";

/**
 * Reset Password — POST /api/auth/reset-password (token from the link).
 */
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await resetPassword(token, password);
      toast.success(data?.message || "Password updated successfully.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const msg =
        err?.message || "Failed to reset password. Request a new link.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600">
            <FiLock className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a new password for your account</p>
        </div>

        {!token && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            This reset link is missing or invalid. Request a new one from the
            forgot-password page.
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={!token || submitting}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
