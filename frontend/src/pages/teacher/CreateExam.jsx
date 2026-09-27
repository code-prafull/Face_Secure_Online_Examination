import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiArrowLeft, FiUsers } from "react-icons/fi";
import { toast } from "sonner";
import { createExam } from "../../services/examService";
import { getStudents } from "../../services/studentService";
import PageHeader from "../../components/common/PageHeader";

const initialForm = {
  title: "",
  description: "",
  duration: "",
  startTime: "",
  endTime: "",
  passingMarks: "",
  totalMarks: "",
  instructions: "",
  requireCamera: true,
  allowMultipleFaces: false,
};

function CreateExam() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  // Candidate pool for assignment — GET /api/users/students
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getStudents();
        if (alive) setStudents(data.students || []);
      } catch {
        // Endpoint failure is surfaced by the empty-state hint below;
        // exam creation still works without assignment.
        if (alive) setStudents([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggleStudent = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
  };

  const validate = () => {
    if (!form.title.trim()) return "Exam title is required.";
    if (!form.duration || Number(form.duration) < 1) return "Duration must be at least 1 minute.";
    if (!form.startTime) return "Start time is required.";
    if (!form.endTime) return "End time is required.";
    if (new Date(form.endTime) <= new Date(form.startTime))
      return "End time must be later than start time.";
    if (form.totalMarks && form.passingMarks && Number(form.passingMarks) > Number(form.totalMarks))
      return "Passing marks cannot exceed total marks.";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        duration: Number(form.duration),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        instructions: form.instructions.trim(),
        totalMarks: form.totalMarks ? Number(form.totalMarks) : null,
        passingMarks: form.passingMarks ? Number(form.passingMarks) : null,
        requireCamera: form.requireCamera,
        allowMultipleFaces: form.allowMultipleFaces,
        candidates: selected,
      };

      await createExam(payload);
      toast.success(
        selected.length
          ? `Exam created — ${selected.length} student${selected.length > 1 ? "s" : ""} assigned.`
          : "Exam created successfully!"
      );
      navigate("/invigilator/exams");
    } catch (err) {
      const msg = err?.message || "Failed to create exam.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Create Examination"
        description="Schedule a new exam with duration, timing and security settings."
      />

      <button
        type="button"
        onClick={() => navigate("/invigilator/exams")}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to exams
      </button>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic details */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Basic Details</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Exam Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={update("title")}
                placeholder="e.g. Mathematics — Term Final"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={update("description")}
                placeholder="Short description of the exam"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Instructions for Students
              </label>
              <textarea
                value={form.instructions}
                onChange={update("instructions")}
                placeholder="Rules, permitted materials, etc."
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Saved with the exam and shown to assigned students.
              </p>
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Schedule & Duration</h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Duration (minutes) *
              </label>
              <input
                type="number"
                min="1"
                value={form.duration}
                onChange={update("duration")}
                placeholder="90"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={update("startTime")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={update("endTime")}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Marks */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Marks</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Total Marks</label>
              <input
                type="number"
                min="0"
                value={form.totalMarks}
                onChange={update("totalMarks")}
                placeholder="100"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Passing Marks</label>
              <input
                type="number"
                min="0"
                value={form.passingMarks}
                onChange={update("passingMarks")}
                placeholder="40"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Total and passing marks are stored with the exam and used in
            academic reports (<code>GET /api/exams/:id/results</code>). Leave
            blank to rely on question marks.
          </p>
        </section>

        {/* Candidate assignment */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <FiUsers className="h-4 w-4 text-blue-600" />
              Assign Students
            </h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {selected.length} selected
            </span>
          </div>

          {students.length === 0 ? (
            <p className="text-sm text-slate-500">
              No candidate accounts available yet — students appear here once
              they register. You can assign them later from Live Monitoring.
            </p>
          ) : (
            <>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {students
                  .filter(
                    (s) =>
                      !studentSearch ||
                      s.name
                        ?.toLowerCase()
                        .includes(studentSearch.toLowerCase()) ||
                      s.email
                        ?.toLowerCase()
                        .includes(studentSearch.toLowerCase())
                  )
                  .map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {s.name?.[0]?.toUpperCase() || "?"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {s.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {s.email}
                        </span>
                      </span>
                    </label>
                  ))}
                {students.filter(
                  (s) =>
                    !studentSearch ||
                    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
                ).length === 0 && (
                  <p className="px-2 py-3 text-sm text-slate-500">
                    No students match "{studentSearch}".
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        {/* Security settings */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">Exam Security Settings</h2>

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={form.requireCamera}
                onChange={update("requireCamera")}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-medium text-slate-700">
                  Require webcam during exam
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Students must grant camera access before starting.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={!form.allowMultipleFaces}
                onChange={(e) => setForm((p) => ({ ...p, allowMultipleFaces: !e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-medium text-slate-700">
                  Flag multiple faces (only one person allowed)
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Extra faces are detected in-browser and logged as
                  MULTIPLE_FACES events to the backend.
                </span>
              </span>
            </label>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
              <strong>Always active:</strong> mobile-phone detection is enabled
              for every exam session (MOBILE_DETECTED events → backend
              suspicion score). Cannot be disabled.
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/invigilator/exams")}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiSave className="h-4 w-4" />
            {saving ? "Creating..." : "Create Exam"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateExam;
