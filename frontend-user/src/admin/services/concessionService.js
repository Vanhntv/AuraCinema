import axiosClient from "../../api/axiosClient";

const API_URL = "/combos";

export const getConcessions = async (params = {}) => {
  const res = await axiosClient.get(API_URL, { params });
  return res.data;
};

export const createConcession = async (data) => {
  const res = await axiosClient.post(API_URL, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const updateConcessionStatus = async (id, status) => {
  const res = await axiosClient.put(`${API_URL}/${id}`, { status });
  return res.data;
};
