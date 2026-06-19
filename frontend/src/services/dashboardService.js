import axios from "axios";

const API_URL = "http://localhost:5001/api/dashboard";

export const getDashboardStats = async () => {
  const res = await axios.get(`${API_URL}/stats`);
  return res.data;
};
