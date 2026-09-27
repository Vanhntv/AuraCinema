const AURA_BOOKING_CODE_PATTERN = /^AURA\d{12}$/;
const AURA_TICKET_PLUS_SEPARATOR_PATTERN = /^(AURA\d{12})\+([A-Z]+\d+)$/;

export const normalizeTicketLookupCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(AURA_TICKET_PLUS_SEPARATOR_PATTERN, "$1-$2");

export const isAuraBookingCode = (value) =>
  AURA_BOOKING_CODE_PATTERN.test(normalizeTicketLookupCode(value));
