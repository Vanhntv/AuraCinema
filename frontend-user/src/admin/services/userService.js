import axiosClient from "../../api/axiosClient";

const API_URL = "/users";

export const getUsers = async (params = {}) => {
  const res = await axiosClient.get(API_URL, { params });
  return res.data;
};

export const getUserById = async (id) => {
  const res = await axiosClient.get(`${API_URL}/${id}`);
  return res.data;
};

export const updateUserBasicInfo = async (id, data) => {
  const res = await axiosClient.patch(`${API_URL}/${id}`, data);
  return res.data;
};

export const updateUserStatus = async (id, status) => {
  const res = await axiosClient.patch(`${API_URL}/${id}/status`, { status });
  return res.data;
};

export const updateUserAccountStatus = async (id, account_status, reason = "") => {
  const res = await axiosClient.patch(`${API_URL}/${id}/status`, {
    account_status,
    reason,
  });
  return res.data;
};

export const adjustRewardPoints = async (id, data) => {
  const res = await axiosClient.post(`${API_URL}/${id}/reward-points`, data);
  return res.data;
};

export const forceResetPassword = async (id, reason = "") => {
  const res = await axiosClient.post(`${API_URL}/${id}/force-reset-password`, { reason });
  return res.data;
};

export const getAccountChangeRequests = async (params = {}) => {
  const res = await axiosClient.get(`${API_URL}/approval-requests`, { params });
  return res.data;
};

export const approveAccountChangeRequest = async (id, current_password) => {
  const res = await axiosClient.post(`${API_URL}/approval-requests/${id}/approve`, { current_password });
  return res.data;
};

export const rejectAccountChangeRequest = async (id, reason) => {
  const res = await axiosClient.post(`${API_URL}/approval-requests/${id}/reject`, { reason });
  return res.data;
};

export const resendApprovedPasswordReset = async (id, target_user_id) => {
  const res = await axiosClient.post(`${API_URL}/approval-requests/${id}/send-reset`, { target_user_id });
  return res.data;
};
