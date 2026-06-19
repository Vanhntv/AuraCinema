import { useCallback, useEffect, useMemo, useState } from "react";
import { login as loginApi, register as registerApi, getProfile } from "../api/authApi";
import { ACCESS_TOKEN_KEY } from "../api/axiosClient";
import { AuthContext } from "./AuthContext";

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
  );

  const saveToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
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

      if (response.token) {
        saveToken(response.token);
      }

      setUser(response.data || null);
      return response;
    },
    [saveToken]
  );

  const register = useCallback(
    async (payload) => {
      const response = await registerApi(payload);

      if (response.token) {
        saveToken(response.token);
        setUser(response.data || null);
      }

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
      login,
      register,
      logout,
    }),
    [loading, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
