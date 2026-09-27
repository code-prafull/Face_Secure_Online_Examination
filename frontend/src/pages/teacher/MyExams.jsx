import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiPlus, FiActivity, FiTrash2, FiUsers, FiSearch, FiList } from "react-icons/fi";
import { toast } from "sonner";
import { getExams, deleteExam, updateExamStatus } from "../../services/examService";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorMessage from "../../components/common/ErrorMessage";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { formatDateTime } from "../../utils/formatters";

function MyExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(null);

  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getExams();
      setExams(data.exams || []);
    } catch (err) {
      setError(err?.message || "Failed to load exams.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const filtered = exams.filter(
    (e) =>
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Delete — real endpoint: DELETE /api/exams/:id (cascades exam records)
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteExam(deleteTarget._id);
      toast.success(`"${deleteTarget.title}" deleted.`);
      fetchExams();
    } catch (err) {
      toast.error(err?.message || "Failed to delete exam.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Quick status control — PATCH /api/exams/:id/status
  const changeStatus = async (exam, status) => {
    if (status === exam.status) return;
    setStatusSaving(exam._id);
    try {
      await updateExamStatus(exam._id, status);
      toast.success(`"${exam.title}" marked ${status}.`);
      fetchExams();
    } catch (err) {
      toast.error(err?.message || "Failed to update status.");
    } finally {
      setStatusSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Examinations"
        description="All exams created under your account."
        actionLabel="Create Exam"
        onAction={() => navigate("/invigilator/create-exam")}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exams..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {loading && <LoadingSpinner label="Loading exams..." />}
      {error && <ErrorMessage message={error} onRetry={fetchExams} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title={search ? "No exams match your search" : "No exams yet"}
          description={
            search
              ? "Try a different search term."
              : "Create your first examination to get started."
          }
          actionLabel={search ? undefined : "Create Exam"}
          onAction={search ? undefined : () => navigate("/invigilator/create-exam")}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exam) => (
            <article
              key={exam._id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-800">
                  {exam.title || "Untitled Exam"}
                </h3>
                <StatusBadge status={exam.status} />
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {exam.description || "No description."}
              </p>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="font-medium text-slate-700">{exam.duration} min</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Starts</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDateTime(exam.startTime)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Candidates</dt>
                  <dd className="flex items-center gap-1 font-medium text-slate-700">
                    <FiUsers className="h-3.5 w-3.5" />
                    {exam.candidates?.length || 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Conduct status</dt>
                  <dd>
                    <select
                      value={exam.status}
                      disabled={statusSaving === exam._id}
                      onChange={(e) => changeStatus(exam, e.target.value)}
                      aria-label={`Status for ${exam.title}`}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 disabled:opacity-60"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                <Link
                  to={`/invigilator/exams/${exam._id}/questions`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                >
                  <FiList className="h-3.5 w-3.5" />
                  Questions
                </Link>
                <Link
                  to={`/invigilator/monitoring/${exam._id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <FiActivity className="h-3.5 w-3.5" />
                  Monitor
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(exam)}
                  aria-label={`Delete ${exam.title}`}
                  className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete exam?"
        message={`You are about to delete "${deleteTarget?.title}". This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default MyExams;
