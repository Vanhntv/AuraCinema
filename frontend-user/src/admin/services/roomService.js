import axiosClient from "../../api/axiosClient";

const API_URL = "/rooms";

export const getRooms = async (params = {}) => {
  const res = await axiosClient.get(API_URL, { params });
  return res.data;
};

export const getRoomById = async (id) => {
  const res = await axiosClient.get(`${API_URL}/${id}`);
  return res.data;
};

export const createRoom = async (data) => {
  const res = await axiosClient.post(API_URL, data);
  return res.data;
};

export const updateRoom = async (id, data) => {
  const res = await axiosClient.put(`${API_URL}/${id}`, data);
  return res.data;
};

export const updateRoomStatus = async (id, status) => {
  const res = await axiosClient.patch(`${API_URL}/${id}/status`, { status });
  return res.data;
};

export const deleteRoom = async (id) => {
  const res = await axiosClient.delete(`${API_URL}/${id}`);
  return res.data;
};
