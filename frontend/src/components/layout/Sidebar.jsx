import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiBook,
  FiPlusCircle,
  FiUsers,
  FiActivity,
  FiBarChart2,
  FiUser,
  FiLogOut,
  FiClock,
  FiFileText,
  FiCalendar,
  FiShield,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const teacherLinks = [
  { to: "/invigilator", icon: FiHome, label: "Dashboard" },
  { to: "/invigilator/exams", icon: FiBook, label: "My Exams" },
  { to: "/invigilator/create-exam", icon: FiPlusCircle, label: "Create Exam" },
  { to: "/invigilator/students", icon: FiUsers, label: "Students" },
  { to: "/invigilator/monitoring", icon: FiActivity, label: "Live Monitoring" },
  { to: "/invigilator/results", icon: FiBarChart2, label: "Results" },
  { to: "/invigilator/reports", icon: FiFileText, label: "Reports" },
  { to: "/invigilator/profile", icon: FiUser, label: "Profile" },
];

const studentLinks = [
  { to: "/candidate", icon: FiHome, label: "Dashboard" },
  { to: "/candidate/exams", icon: FiBook, label: "Available Exams" },
  { to: "/candidate/upcoming", icon: FiCalendar, label: "Upcoming Exams" },
  { to: "/candidate/my-exams", icon: FiClock, label: "My Exams" },
  { to: "/candidate/history", icon: FiFileText, label: "Exam History" },
  { to: "/candidate/results", icon: FiBarChart2, label: "Results" },
  { to: "/candidate/profile", icon: FiUser, label: "Profile" },
];

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const links = user?.role === "candidate" ? studentLinks : teacherLinks;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`layout-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
            <FiShield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Face Secure</h1>
            <p className="text-xs text-slate-500">Exam Proctoring</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`
              }
            >
              <link.icon className="h-5 w-5 shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700">
                {user?.name || "User"}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {user?.role || "Account"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <FiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
