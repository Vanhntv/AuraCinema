export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE });
};

export const formatDisplayDate = (value, fallback = "Đang cập nhật") => {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("vi-VN", { timeZone: APP_TIME_ZONE });
};

export const formatDisplayDateTime = (value, fallback = "-") => {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const formatShowtimeTime = (value, fallback = "Đang cập nhật") => {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleTimeString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatWeekdayShort = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    weekday: "short",
  });
};

export const formatWeekdayLong = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
  });
};

export const formatDayMonth = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  });
};

export const formatDayOfMonth = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
  });
};

export const formatMonthNumber = (value) => {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("vi-VN", {
    timeZone: APP_TIME_ZONE,
    month: "numeric",
  });
};

export const buildRelativeDateOptions = (days = 7) =>
  Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    return {
      value: getDateKey(date),
      day: formatWeekdayShort(date),
      weekday: formatWeekdayLong(date),
      date: formatDayMonth(date),
      displayDate: formatDayMonth(date),
      label: index < 2 ? formatDayMonth(date) : "",
      fullLabel: index === 0 ? "Hôm nay" : index === 1 ? "Ngày mai" : formatWeekdayLong(date),
    };
  });

export const getShowtimeDateValue = (showtime) =>
  getDateKey(showtime?.date || showtime?.showtime_date || showtime?.start_time || showtime?.startTime);

export const getShowtimeStartDate = (showtime) => {
  const startValue = showtime?.start_time || showtime?.startDateTime || showtime?.start_datetime;
  const directDate = toDate(startValue);
  if (directDate) return directDate;

  const displayTime = String(showtime?.startTime || "").trim();
  if (displayTime.includes("T")) return toDate(displayTime);

  const dateValue = getShowtimeDateValue(showtime);
  const timeMatch = displayTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!dateValue || !timeMatch) return null;

  const [, hour, minute] = timeMatch;
  return toDate(`${dateValue}T${hour.padStart(2, "0")}:${minute}:00+07:00`);
};

export const isShowtimeUpcoming = (showtime, currentTime = Date.now()) => {
  const status = String(
    showtime?.status || showtime?.stored_status || "",
  ).toLowerCase();
  if (status === "cancelled") return false;

  const startDate = getShowtimeStartDate(showtime);
  return Boolean(startDate && startDate.getTime() > Number(currentTime));
};

const getEntityId = (value) => {
  if (value && typeof value === "object") return value._id || value.id || "";
  return value || "";
};

export const deduplicateShowtimes = (showtimes = [], preferredShowtimeId = "") => {
  const uniqueShowtimes = new Map();
  const preferredId = String(preferredShowtimeId || "");

  showtimes.forEach((showtime) => {
    const startDate = getShowtimeStartDate(showtime);
    const startKey = startDate
      ? String(startDate.getTime())
      : `${getShowtimeDateValue(showtime)}-${showtime?.startTime || ""}`;
    const cinemaKey = String(
      getEntityId(showtime?.cinema_id || showtime?.cinemaId) ||
        showtime?.cinemaName ||
        "cinema",
    );
    const roomKey = String(
      getEntityId(showtime?.room_id || showtime?.roomId) ||
        showtime?.roomName ||
        "room",
    );
    const key = `${startKey}|${cinemaKey}|${roomKey}`;
    const currentId = String(showtime?.id || showtime?._id || "");

    if (!uniqueShowtimes.has(key) || (preferredId && currentId === preferredId)) {
      uniqueShowtimes.set(key, showtime);
    }
  });

  return Array.from(uniqueShowtimes.values());
};

export const formatDate = formatDisplayDate;
