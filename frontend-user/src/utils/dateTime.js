const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const formatDate = (value, fallback = "Đang cập nhật") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("vi-VN", { timeZone: DEFAULT_TIME_ZONE });
};

export const buildRelativeDateOptions = (length = 7) =>
  Array.from({ length }, (_, index) => {
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

export const getShowtimeDateValue = (showtime) => getDateKey(showtime?.start_time);

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
      value: date.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIME_ZONE }),
      label: date
        .toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: DEFAULT_TIME_ZONE,
        })
        .replaceAll("/", "-"),
    };
  });

export const getShowtimeDateValue = (showtime) => {
  const value = showtime?.date || showtime?.showtime_date || showtime?.start_time || showtime?.startTime;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: DEFAULT_TIME_ZONE });
};
      value: getDateKey(date),
      day: formatWeekdayShort(date),
      weekday: formatWeekdayLong(date),
      date: formatDayMonth(date),
      displayDate: formatDayMonth(date),
      label: index === 0 ? "Hôm nay" : index === 1 ? "Ngày mai" : "",
      fullLabel: index === 0 ? "Hôm nay" : index === 1 ? "Ngày mai" : formatWeekdayLong(date),
    };
  });
