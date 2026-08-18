import axiosClient from "../api/axiosClient";

export const getShowtimeSeats = async (showtimeId) => {
  const response = await axiosClient.get("/showtime-seats", {
    params: { showtime_id: showtimeId },
  });
  return response.data;
};

export const getActiveShowtimeSeatHold = async (showtimeId, holdToken = "") => {
  const response = await axiosClient.get("/showtime-seats/hold/active", {
    params: { showtime_id: showtimeId, hold_token: holdToken || undefined },
  });
  return response.data;
};

export const holdShowtimeSeats = async (showtimeId, seatIds, holdToken = "") => {
  const response = await axiosClient.post("/showtime-seats/hold", {
    showtime_id: showtimeId,
    showtime_seat_ids: seatIds,
    hold_token: holdToken || undefined,
  });
  return response.data;
};

export const releaseShowtimeSeats = async (showtimeId, seatIds, holdToken = "") => {
  const response = await axiosClient.post("/showtime-seats/release", {
    showtime_id: showtimeId,
    showtime_seat_ids: seatIds,
    hold_token: holdToken || undefined,
  });
  return response.data;
};
