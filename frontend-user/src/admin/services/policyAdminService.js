import axiosClient from "../../api/axiosClient";

const API_URL = "/policies";

export const getAdminPolicies = async (params = {}) => {
  const response = await axiosClient.get(API_URL, { params });
  return response.data;
};

export const createAdminPolicy = async (payload) => {
  const response = await axiosClient.post(API_URL, payload);
  return response.data;
};

export const updateAdminPolicy = async (id, payload) => {
  const response = await axiosClient.put(`${API_URL}/${id}`, payload);
  return response.data;
};

export const deleteAdminPolicy = async (id) => {
  const response = await axiosClient.delete(`${API_URL}/${id}`);
  return response.data;
};

export const importAdminPolicyFromWord = async (file, fields = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries({ status: "draft", surface: "general", ...fields }).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  });

  const response = await axiosClient.post(`${API_URL}/import-word`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
