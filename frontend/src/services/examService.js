import api from "./api";

// ================= Exams =================

export const getExams = async () => {
  const response = await api.get("/exams");
  return response.data;
};

export const getExamById = async (examId) => {
  const response = await api.get(`/exams/${examId}`);
  return response.data;
};

export const createExam = async (examData) => {
  const response = await api.post("/exams", examData);
  return response.data;
};

// Update exam — PUT /api/exams/:id (partial update, candidate assignment)
export const updateExam = async (examId, examData) => {
  const response = await api.put(`/exams/${examId}`, examData);
  return response.data;
};

// Delete exam — DELETE /api/exams/:id (cascades exam-scoped records)
export const deleteExam = async (examId) => {
  const response = await api.delete(`/exams/${examId}`);
  return response.data;
};

// ================= Questions (question bank) =================

// GET /api/exams/:examId/questions
// Candidates receive questions with correct answers stripped server-side;
// invigilator/owner receives the full version (incl. correctOption).
export const getExamQuestions = async (examId) => {
  const response = await api.get(`/exams/${examId}/questions`);
  return response.data;
};

// POST /api/exams/:examId/questions  (invigilator owner / admin)
export const addQuestion = async (examId, questionData) => {
  const response = await api.post(`/exams/${examId}/questions`, questionData);
  return response.data;
};

// DELETE /api/exams/:examId/questions/:questionId  (invigilator owner / admin)
export const deleteQuestion = async (examId, questionId) => {
  const response = await api.delete(`/exams/${examId}/questions/${questionId}`);
  return response.data;
};

// ================= Submission & results =================

// POST /api/exams/:examId/submit  (assigned candidate)
// answers: [{ question, selectedOption? , code?, language? }]
// MCQs are auto-graded server-side; coding answers await teacher review.
export const submitExam = async (examId, answers) => {
  const response = await api.post(`/exams/${examId}/submit`, { answers });
  return response.data;
};

// GET /api/exams/:examId/my-result  (candidate)
export const getMyResult = async (examId) => {
  const response = await api.get(`/exams/${examId}/my-result`);
  return response.data;
};

// GET /api/exams/:examId/submissions  (invigilator owner / admin)
export const getExamSubmissions = async (examId) => {
  const response = await api.get(`/exams/${examId}/submissions`);
  return response.data;
};

// PATCH /api/exams/:examId/submissions/:submissionId/review
export const reviewSubmission = async (examId, submissionId, { codingMarks, feedback }) => {
  const response = await api.patch(
    `/exams/${examId}/submissions/${submissionId}/review`,
    { codingMarks, feedback }
  );
  return response.data;
};

// Update exam status — PATCH /api/exams/:id/status
// status: "upcoming" | "active" | "completed"
export const updateExamStatus = async (examId, status) => {
  const response = await api.patch(`/exams/${examId}/status`, { status });
  return response.data;
};

// Academic + proctoring report per exam — GET /api/exams/:id/results (owner/admin)
export const getExamResults = async (examId) => {
  const response = await api.get(`/exams/${examId}/results`);
  return response.data;
};
