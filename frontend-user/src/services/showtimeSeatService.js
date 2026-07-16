import axiosClient from "../api/axiosClient";

export const getShowtimeSeats = async (showtimeId) => {
  const response = await axiosClient.get("/showtime-seats", {
    params: { showtime_id: showtimeId },
  });
  return response.data;
};

export const holdShowtimeSeats = async (showtimeId, seatIds) => {
  const response = await axiosClient.post("/showtime-seats/hold", { showtime_id: showtimeId, showtime_seat_ids: seatIds });
  return response.data;
};

export const releaseShowtimeSeats = async (seatIds) => {
  const response = await axiosClient.post("/showtime-seats/release", { showtime_seat_ids: seatIds });
  return response.data;
};
