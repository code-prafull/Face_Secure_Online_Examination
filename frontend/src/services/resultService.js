import api from "./api";

// GET /api/results  (invigilator/admin) — per-exam academic + integrity roll-up
export const getResults = async () => {
  const response = await api.get("/results");
  return response.data;
};

// GET /api/scores/student/:studentId  (invigilator/admin)
export const getStudentResults = async (studentId) => {
  const response = await api.get(`/scores/student/${studentId}`);
  return response.data;
};

// GET /api/analytics  (invigilator/admin) — real counters + distributions
export const getAnalytics = async () => {
  const response = await api.get("/analytics");
  return response.data;
};

// GET /api/reports/pdf?examId=  (invigilator/admin) — jsPDF export (blob)
export const downloadReportPdf = async (examId) => {
  const response = await api.get("/reports/pdf", {
    params: examId ? { examId } : {},
    responseType: "blob",
  });
  return response.data;
};
