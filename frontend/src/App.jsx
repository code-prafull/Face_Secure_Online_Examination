import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

// Common pages
import Unauthorized from "./pages/common/Unauthorized";
import NotFound from "./pages/common/NotFound";

// Layout
import DashboardLayout from "./components/layout/DashboardLayout";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import MyExams from "./pages/teacher/MyExams";
import CreateExam from "./pages/teacher/CreateExam";
import Students from "./pages/teacher/Students";
import LiveMonitoring from "./pages/teacher/LiveMonitoring";
import ExamMonitor from "./pages/teacher/ExamMonitor";
import ManageQuestions from "./pages/teacher/ManageQuestions";
import Results from "./pages/teacher/Results";
import Reports from "./pages/teacher/Reports";
import TeacherProfile from "./pages/teacher/Profile";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import ExamList from "./pages/student/ExamList";
import StudentResults from "./pages/student/StudentResults";
import StudentProfile from "./pages/student/StudentProfile";

// Exam session is lazy-loaded (proctoring ML models are heavy)
const ExamFlow = lazy(() => import("./pages/student/ExamFlow"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
  </div>
);

/** Root redirect based on role */
function HomeRedirect() {
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ================= Public ================= */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ============ Teacher / Invigilator ============ */}
          <Route
            element={
              <ProtectedRoute allowedRoles={["invigilator", "admin"]} />
            }
          >
            <Route element={<DashboardLayout />}>
              <Route path="/invigilator" element={<TeacherDashboard />} />
              <Route path="/invigilator/exams" element={<MyExams />} />
              <Route path="/invigilator/create-exam" element={<CreateExam />} />
              <Route path="/invigilator/students" element={<Students />} />
              <Route path="/invigilator/monitoring" element={<LiveMonitoring />} />
              <Route
                path="/invigilator/monitoring/:examId"
                element={<ExamMonitor />}
              />
              <Route
                path="/invigilator/exams/:examId/questions"
                element={<ManageQuestions />}
              />
              <Route path="/invigilator/results" element={<Results />} />
              <Route path="/invigilator/reports" element={<Reports />} />
              <Route path="/invigilator/profile" element={<TeacherProfile />} />
            </Route>
          </Route>

          {/* ============ Student / Candidate ============ */}
          <Route element={<ProtectedRoute allowedRoles={["candidate"]} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/candidate" element={<StudentDashboard />} />
              <Route
                path="/candidate/exams"
                element={<ExamList mode="available" />}
              />
              <Route
                path="/candidate/upcoming"
                element={<ExamList mode="upcoming" />}
              />
              <Route
                path="/candidate/my-exams"
                element={<ExamList mode="all" />}
              />
              <Route
                path="/candidate/history"
                element={<ExamList mode="history" />}
              />
              <Route path="/candidate/results" element={<StudentResults />} />
              <Route path="/candidate/profile" element={<StudentProfile />} />
            </Route>

            {/* Full-screen exam session */}
            <Route
              path="/exam/:examId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ExamFlow />
                </Suspense>
              }
            />
          </Route>

          {/* Admin alias */}
          <Route path="/admin" element={<Navigate to="/invigilator" replace />} />

          {/* Legacy redirects (old app paths) */}
          <Route
            path="/dashboard"
            element={<Navigate to="/candidate" replace />}
          />

          {/* Default & 404 */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "inherit",
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid rgba(148,163,184,0.18)",
              boxShadow: "0 18px 40px -18px rgba(0,0,0,0.85)",
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
