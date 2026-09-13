export const SEAT_OPERATIONAL_STATUSES = ["active", "maintenance"];

export const getSeatOperationalStatus = (seat = {}) =>
  seat.operational_status === "maintenance" || seat.status === false
    ? "maintenance"
    : "active";

export const isSeatInMaintenance = (seat = {}) =>
  getSeatOperationalStatus(seat) === "maintenance";
