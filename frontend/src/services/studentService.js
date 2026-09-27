import api from "./api";

// GET /api/users/students  (invigilator/admin) — full candidate records
export const getStudents = async () => {
  const response = await api.get("/users/students");
  return response.data;
};

// GET /api/users/:id/exams  (invigilator/admin) — one student's exam history
export const getStudentExamHistory = async (studentId) => {
  const response = await api.get(`/users/${studentId}/exams`);
  return response.data;
};

// GET /api/scores/student/:studentId  (invigilator/admin) — academic + integrity
export const getStudentResults = async (studentId) => {
  const response = await api.get(`/scores/student/${studentId}`);
  return response.data;
};
