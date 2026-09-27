import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FiMenu, FiBell } from "react-icons/fi";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../../context/AuthContext";

const pageTitles = {
  "/invigilator": "Teacher Dashboard",
  "/invigilator/exams": "My Examinations",
  "/invigilator/create-exam": "Create Examination",
  "/invigilator/questions": "Question Management",
  "/invigilator/students": "Student Management",
  "/invigilator/monitoring": "Live Monitoring",
  "/invigilator/results": "Results",
  "/invigilator/reports": "Reports",
  "/invigilator/profile": "Profile",
  "/candidate": "Student Dashboard",
  "/candidate/exams": "Available Examinations",
  "/candidate/upcoming": "Upcoming Examinations",
  "/candidate/my-exams": "My Examinations",
  "/candidate/history": "Exam History",
  "/candidate/results": "Results",
  "/candidate/profile": "Profile",
};

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const title =
    pageTitles[location.pathname] ||
    (user?.role === "candidate" ? "Student Portal" : "Teacher Portal");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="layout-topbar sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <h2 className="truncate text-base font-semibold text-slate-800">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <FiBell className="h-5 w-5" />
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">
                {user?.name || "User"}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {user?.role || ""}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
