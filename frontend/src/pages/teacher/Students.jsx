import { useEffect, useState } from "react";
import { FiUsers, FiSearch, FiMail, FiClock } from "react-icons/fi";
import { getStudents, getStudentExamHistory } from "../../services/studentService";
import PageHeader from "../../components/common/PageHeader";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Model";

/**
 * Student Management — GET /api/users/students (real backend records).
 * Each row can open the student's exam history (GET /api/users/:id/exams).
 */
function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // History modal
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStudents();
      setStudents(data.students || []);
    } catch (err) {
      setError(err?.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openHistory = async (student) => {
    setHistoryFor(student);
    setHistory(null);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const data = await getStudentExamHistory(student.id);
      setHistory(data);
    } catch (err) {
      setHistoryError(err?.message || "Failed to load exam history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Management"
        description="Full candidate records with their assigned examinations."
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
          {students.length} student{students.length !== 1 && "s"}
        </span>
        <div className="relative max-w-xs flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading students..." />}
      {error && <ErrorMessage message={error} onRetry={fetchStudents} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<FiUsers />}
          title={search ? "No students match your search" : "No students yet"}
          description={
            search
              ? "Try a different search term."
              : "Registered candidate accounts will appear here."
          }
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Assigned Exams</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {student.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-slate-800">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <FiMail className="h-3.5 w-3.5 text-slate-400" />
                        {student.email || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-1.5">
                        {(student.exams || []).length === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
                        {(student.exams || []).map((ex) => (
                          <span
                            key={ex.id}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs"
                          >
                            {ex.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {student.joinedAt
                        ? new Date(student.joinedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openHistory(student)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <FiClock className="h-3.5 w-3.5" />
                        View history
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Source: <code>GET /api/users/students</code> — per-student history via{" "}
        <code>GET /api/users/:id/exams</code>.
      </p>

      {/* Student history modal */}
      <Modal
        open={Boolean(historyFor)}
        title={`Exam history — ${historyFor?.name || ""}`}
        onClose={() => setHistoryFor(null)}
      >
        {historyLoading && <LoadingSpinner label="Loading history..." />}
        {!historyLoading && historyError && (
          <ErrorMessage message={historyError} />
        )}
        {!historyLoading && !historyError && history && (
          <div className="space-y-3">
            {(history.exams || []).length === 0 && (
              <p className="text-sm text-slate-500">
                No exams assigned to this student yet.
              </p>
            )}
            {(history.exams || []).map((row) => (
              <div
                key={row.examId}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {row.title}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.submitted
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {row.submitted ? row.resultStatus : "not submitted"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-4">
                  <span>Status: {row.status}</span>
                  <span>
                    MCQ:{" "}
                    {row.autoScore != null
                      ? `${row.autoScore}/${row.totalMcqMarks}`
                      : "—"}
                  </span>
                  <span>
                    Coding:{" "}
                    {row.codingMarks != null ? row.codingMarks : row.submitted ? "pending" : "—"}
                  </span>
                  <span>
                    Suspicion: {row.suspicion} · Violations: {row.violations}
                  </span>
                </div>
                {row.submittedAt && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Submitted: {new Date(row.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Students;
