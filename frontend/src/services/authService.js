import api from "./api";

export const loginUser = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const registerUser = async (name, email, password) => {
  const response = await api.post("/auth/register", { name, email, password });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

// Password reset — real backend endpoints
export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post("/auth/reset-password", { token, password });
  return response.data;
};

// Profile update — PUT /api/auth/profile (name only; email is server-fixed)
export const updateProfile = async (data) => {
  const response = await api.put("/auth/profile", data);
  return response.data;
};
