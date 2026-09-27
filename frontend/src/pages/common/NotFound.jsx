import { Link } from "react-router-dom";
import { FiCompass } from "react-icons/fi";

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <FiCompass className="h-8 w-8 text-blue-600" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-slate-800">404 — Page Not Found</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        to="/login"
        className="mt-8 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Back to Home
      </Link>
    </div>
  );
}

export default NotFound;
