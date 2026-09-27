import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import api from "../services/api";

const AuthContext = createContext(null);

/**
 * GET /auth/me only returns { id, role } (backend contract), while login/register
 * return the full profile. Cache the profile returned by login so a page refresh
 * can still show the real name/email. Only backend-provided values are stored —
 * nothing is fabricated.
 */
const PROFILE_CACHE_KEY = "fs_profile";

const readCachedProfile = (id) => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    return cached && cached.id === id ? cached : null;
  } catch {
    return null;
  }
};

const mergeProfile = (meUser) => {
  if (!meUser) return null;
  if (meUser.name) return meUser;
  const cached = readCachedProfile(meUser.id);
  return cached ? { ...meUser, name: cached.name, email: cached.email } : meUser;
};

const cacheProfile = (user) => {
  try {
    if (user?.id && user?.name) {
      localStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify({ id: user.id, name: user.name, email: user.email })
      );
    }
  } catch {
    /* storage unavailable — non-fatal */
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session when the app loads
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(mergeProfile(response.data.user));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    cacheProfile(response.data.user);
    setUser(response.data.user);
    return response.data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const response = await api.post("/auth/register", { name, email, password });
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      try {
        localStorage.removeItem(PROFILE_CACHE_KEY);
      } catch {
        /* ignore */
      }
      setUser(null);
    }
  }, []);

  // PUT /api/auth/profile — updates the cached profile + context state so the
  // new name survives a refresh (AuthContext contract unchanged otherwise).
  const updateProfile = useCallback(async (data) => {
    const response = await api.put("/auth/profile", data);
    const updated = response.data.user;
    cacheProfile(updated);
    setUser((prev) => (prev ? { ...prev, ...updated } : updated));
    return response.data;
  }, []);

  const getDashboardPath = useCallback((role) => {
    switch (role) {
      case "admin":
        return "/admin";
      case "invigilator":
        return "/invigilator";
      default:
        return "/candidate";
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        setUser,
        getDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
