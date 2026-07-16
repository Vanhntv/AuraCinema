import axiosClient from "./axiosClient";

export const login = async ({ email, password }) => {
  const response = await axiosClient.post("/auth/login", { email, password });
  return response.data;
};

export const register = async ({
  full_name,
  email,
  password,
  confirm_password,
  phone,
  avatar,
}) => {
  const response = await axiosClient.post("/auth/register", {
    full_name,
    email,
    password,
    confirm_password,
    phone,
    avatar,
  });

  return response.data;
};

export const forgotPassword = async ({ email }) => {
  const response = await axiosClient.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async ({
  email,
  otp,
  password,
  confirm_password,
}) => {
  const response = await axiosClient.post("/auth/reset-password", {
    email,
    otp,
    password,
    confirm_password,
  });
  return response.data;
};

export const getProfile = async () => {
  const response = await axiosClient.get("/auth/profile");
  return response.data;
};

export const updateProfile = async (payload) => {
  const response = await axiosClient.patch("/auth/profile", payload);
  return response.data;
};

export const changePassword = async ({
  current_password,
  password,
  confirm_password,
}) => {
  const response = await axiosClient.patch("/auth/change-password", {
    current_password,
    password,
    confirm_password,
  });
  return response.data;
};

const authApi = {
  login,
  register,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
};

export default authApi;
