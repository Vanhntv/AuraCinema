import axios from "axios";

export const ACCESS_TOKEN_KEY = "accessToken";
export const AUTH_FORBIDDEN_EVENT = "auracinema:auth-forbidden";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const hasAuthorizationHeader = Boolean(
      config.headers?.Authorization || config.headers?.authorization
    );

    if (token && !hasAuthorizationHeader) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAdminPage = window.location.pathname.startsWith("/admin");

    if (status === 403 && isAdminPage) {
      window.dispatchEvent(
        new CustomEvent(AUTH_FORBIDDEN_EVENT, {
          detail: {
            message: "Phiên đăng nhập không có quyền quản trị. Vui lòng đăng nhập lại.",
          },
        })
      );
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
