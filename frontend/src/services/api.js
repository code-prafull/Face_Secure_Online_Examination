import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      // Don't redirect if already on login/register pages
      const currentPath = window.location.pathname;
      const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
      const isPublic = publicPaths.some((p) => currentPath.startsWith(p));

      if (!isPublic && !currentPath.startsWith("/reset-password")) {
        // Clear any stored state and redirect
        window.location.href = "/login";
      }
    }

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;
