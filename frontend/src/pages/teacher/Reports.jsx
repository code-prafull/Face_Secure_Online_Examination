import { useEffect, useState } from "react";
import {
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiBarChart2,
} from "react-icons/fi";
import { toast } from "sonner";
import { getExams } from "../../services/examService";
import { downloadReportPdf } from "../../services/resultService";
import PageHeader from "../../components/common/PageHeader";

/**
 * Reports hub — every listed report is backed by a live backend endpoint:
 *   • CSV incident export  → Results page (client-side, violation rows)
 *   • Session summary      → local rule-based summary (no external AI APIs)
 *   • Academic report      → GET /api/results + GET /api/exams/:id/results
 *   • PDF export           → GET /api/reports/pdf  (jsPDF, server-side)
 */
function Reports() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getExams();
        if (alive) setExams(data.exams || []);
      } catch {
        if (alive) setExams([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const downloadPdf = async () => {
    const key = examId || "all";
    setDownloading(key);
    try {
      const blob = await downloadReportPdf(examId || undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = examId
        ? `face-secure-exam-${examId}.pdf`
        : `face-secure-report-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF report downloaded.");
    } catch (err) {
      toast.error(err?.message || "Failed to generate PDF report.");
    } finally {
      setDownloading(null);
    }
  };

  const reportTypes = [
    {
      title: "Proctoring Incident Report",
      description:
        "Candidate-wise list of MULTIPLE_FACES, NO_FACE, MOBILE_DETECTED and UNKNOWN_FACE events with timestamps and suspicion scores. Exportable as CSV.",
      where: "Results → Export CSV",
    },
    {
      title: "Session Summary",
      description:
        "Neutral, rule-based summary of a candidate's proctoring session (events + violations), generated locally — no external AI API keys involved.",
      where: "Live Monitoring → Generate Session Summary",
    },
    {
      title: "Academic Score Report",
      description:
        "Auto-scored MCQ marks, coding marks (after review), suspicion and violation counts per candidate — combined academic + integrity view.",
      where: "Results → view per exam (GET /api/exams/:id/results)",
    },
    {
      title: "PDF Export",
      description:
        "Server-rendered A4 PDF (jsPDF): exam window, per-candidate scores, pass/fail view and proctoring counters. Single-exam or full summary.",
      where: "GET /api/reports/pdf — button below",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Available report types for your examinations — every item below is served by a live backend endpoint."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {reportTypes.map((report) => (
          <article
            key={report.title}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                  <FiFileText className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {report.title}
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                <FiCheckCircle className="h-3 w-3" />
                Available
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {report.description}
            </p>

            <p className="mt-3 text-xs font-medium text-slate-400">{report.where}</p>
          </article>
        ))}
      </div>

      {/* PDF export — real endpoint */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          <FiBarChart2 className="h-4 w-4 text-blue-600" />
          Download PDF report
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          One PDF with the exam window, per-candidate marks and proctoring
          counters — or a summary across every exam.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">
              Exam scope
            </span>
            <select
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All exams (summary)</option>
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.title}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={downloadPdf}
            disabled={Boolean(downloading)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiDownload className="h-4 w-4" />
            {downloading
              ? "Generating..."
              : examId
              ? "Download this exam"
              : "Download summary"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Source: <code>GET /api/reports/pdf?examId=…</code> (invigilator /
          admin). Grades shown as pass/fail follow{" "}
          <code>passingMarks</code> when set on the exam.
        </p>
      </section>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-800">
        <p className="font-semibold">Integrated reporting endpoints:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li><code>GET /api/exams/:id/results</code> — academic + integrity report per exam</li>
          <li><code>GET /api/results</code> — cross-exam roll-up with summary</li>
          <li><code>GET /api/reports/pdf</code> — jsPDF export (single / all)</li>
          <li><code>GET /api/analytics</code> — counters and distributions</li>
        </ul>
      </div>
    </div>
  );
}

export default Reports;
