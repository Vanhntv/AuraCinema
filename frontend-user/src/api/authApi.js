import axiosClient from "./axiosClient";

export const login = async ({ email, password }) => {
  const response = await axiosClient.post("/auth/login", { email, password });
  return response.data;
};

export const register = async ({
  full_name,
  email,
  password,
  phone,
  avatar,
}) => {
  const response = await axiosClient.post("/auth/register", {
    full_name,
    email,
    password,
    phone,
    avatar,
  });

  return response.data;
};

export const getProfile = async () => {
  const response = await axiosClient.get("/auth/profile");
  return response.data;
};

export const updateProfile = async ({ full_name, phone, avatar }) => {
  const response = await axiosClient.put("/auth/profile", {
    full_name,
    phone,
    avatar,
  });
  return response.data;
};

const authApi = {
  login,
  register,
  getProfile,
  updateProfile,
};

export default authApi;
