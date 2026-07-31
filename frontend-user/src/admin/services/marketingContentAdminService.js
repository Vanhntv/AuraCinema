import axiosClient from "../../api/axiosClient";

const API_URL = "/admin/marketing-content";

export const getAdminMarketingContent = async (params = {}) => {
  const response = await axiosClient.get(API_URL, { params });
  return response.data;
};

export const createAdminMarketingContent = async (payload) => {
  const response = await axiosClient.post(API_URL, payload);
  return response.data;
};

export const updateAdminMarketingContent = async (id, payload) => {
  const response = await axiosClient.put(`${API_URL}/${id}`, payload);
  return response.data;
};

export const deleteAdminMarketingContent = async (id) => {
  const response = await axiosClient.delete(`${API_URL}/${id}`);
  return response.data;
};
