import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5001/api",
});

export default axiosClient;
