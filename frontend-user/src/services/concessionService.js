import axiosClient from "../api/axiosClient";

export const getAvailableConcessions = async () => {
  const response = await axiosClient.get("/combos", {
    params: {
      status: "active",
      limit: 100,
    },
  });

  return response.data;
};
