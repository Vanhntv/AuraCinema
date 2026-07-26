import axiosClient from "../api/axiosClient";

export const getAvailableConcessions = async () => {
  const response = await axiosClient.get("/combos/public", {
    params: {
      limit: 100,
    },
  });

  return response.data;
};
