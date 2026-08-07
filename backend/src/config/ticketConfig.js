const parseMinuteEnv = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const ticketCheckInConfig = {
  beforeMinutes: parseMinuteEnv(process.env.TICKET_CHECKIN_BEFORE_MINUTES, 30),
  afterMinutes: parseMinuteEnv(process.env.TICKET_CHECKIN_AFTER_MINUTES, 30),
};
