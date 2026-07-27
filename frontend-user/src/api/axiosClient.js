import axios from "axios";

export const ACCESS_TOKEN_KEY = "accessToken";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
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

export default axiosClient;
