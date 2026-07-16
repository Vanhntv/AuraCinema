import { useCallback, useEffect, useMemo, useState } from "react";
import { getProfile, login as loginApi } from "../api/authApi";
import { ADMIN_ACCESS_TOKEN_KEY } from "../api/axiosClient";
import { AuthContext } from "./AuthContext";

const isAdminUser = (user) => user?.role === "admin" || user?.role_id === 1;

const consumeAdminTokenFromHash = () => {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const hashToken = hashParams.get("adminToken");

  if (!hashToken) {
    return null;
  }

  hashParams.delete("adminToken");
  const nextHash = hashParams.toString();
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ""}`;
  window.history.replaceState(null, "", nextUrl);

  localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, hashToken);
  return hashToken;
};

function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    consumeAdminTokenFromHash() || localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY)
  );
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY))
  );

  const saveToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);
    }

    setToken(nextToken || null);
  }, []);

  const logout = useCallback(() => {
    saveToken(null);
    setUser(null);
    setLoading(false);
  }, [saveToken]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getProfile();

        if (!isAdminUser(response.data)) {
          logout();
          return;
        }

        if (isMounted) {
          setUser(response.data);
        }
      } catch {
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [logout, token]);

  const login = useCallback(
    async (credentials) => {
      const response = await loginApi(credentials);

      if (!isAdminUser(response.data)) {
        saveToken(null);
        setUser(null);
        throw new Error("Tài khoản này không có quyền quản trị");
      }

      if (response.token) {
        saveToken(response.token);
      }

      setUser(response.data || null);
      return response;
    },
    [saveToken]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      isAdmin: isAdminUser(user),
      login,
      logout,
    }),
    [loading, login, logout, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
