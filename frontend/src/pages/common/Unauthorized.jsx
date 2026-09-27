import { Link } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

function Unauthorized() {
  const { getDashboardPath, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <FiLock className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-slate-800">403 — Unauthorized</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
        You do not have permission to access this page. Your account role does
        not allow this area of the application.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/login"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to Sign In
        </Link>
        <Link
          to={user ? getDashboardPath(user.role) : "/login"}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default Unauthorized;
