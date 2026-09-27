import { useState } from "react";
import { Link } from "react-router-dom";
import { FiMail, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import { toast } from "sonner";
import ThemeToggle from "../../components/layout/ThemeToggle";
import { forgotPassword } from "../../services/authService";

/**
 * Forgot Password — POST /api/auth/forgot-password.
 *
 * The backend has no SMTP provider, so no email is sent. In that case the
 * response comes back with devMode: true and a ready-made reset link which
 * is shown here — clearly labelled, never pretending an email was sent.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    try {
      const data = await forgotPassword(email.trim());
      setResult(data);
      toast.success(data.message || "Reset link generated.");
    } catch (err) {
      const msg = err?.message || "Failed to request a reset link.";
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
            <FiMail className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Forgot Password</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your account email to request a password reset link
          </p>
        </div>

        {result ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800"
            >
              <p className="flex items-center gap-2 font-semibold">
                <FiCheckCircle className="h-4 w-4 shrink-0" />
                Request received
              </p>
              <p className="mt-1.5 text-xs leading-5">{result.message}</p>
              {result.expiresInMinutes && (
                <p className="mt-1 text-xs text-green-700">
                  The link is valid for {result.expiresInMinutes} minutes.
                </p>
              )}
            </div>

            {result.devMode && result.devResetUrl ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                <strong>Dev mode:</strong> no mail service is configured on this
                server, so the reset link was returned directly instead of
                being emailed. Open it to set a new password:
                <Link
                  to={result.devResetUrl}
                  className="mt-2 block break-all rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-xs text-blue-700 hover:bg-amber-100"
                >
                  {result.devResetUrl}
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                If that email is registered, a reset link is on its way.
              </div>
            )}

            <button
              type="button"
              onClick={() => setResult(null)}
              className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Requesting..." : "Request reset link"}
            </button>
          </form>
        )}

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

export default ForgotPassword;
