export const PRICING_MODE_STANDARD = "standard";
export const PRICING_MODE_CUSTOM = "custom";

export const pricingDayTypeLabels = {
  weekday: "Ngày thường",
  weekend: "Cuối tuần",
  holiday: "Ngày lễ",
};

export const buildShowtimePricingFields = ({ mode, formData }) => {
  if (mode === PRICING_MODE_STANDARD) {
    return { pricing_mode: PRICING_MODE_STANDARD };
  }

  return {
    pricing_mode: PRICING_MODE_CUSTOM,
    base_price: Number(formData.normal_price),
    seat_prices: {
      normal: Number(formData.normal_price),
      vip: Number(formData.vip_price),
      couple: Number(formData.couple_price),
    },
  };
};

export const groupShowtimePricingQuotes = (quotes = []) =>
  Array.from(
    quotes.reduce((groups, quote) => {
      const prices = quote.seat_prices || {};
      const key = [
        quote.pricing_day_type,
        prices.normal,
        prices.vip,
        prices.couple,
      ].join("|");
      const current = groups.get(key) || {
        dayType: quote.pricing_day_type,
        dates: new Set(),
        slotCount: 0,
        prices: {
          normal: prices.normal,
          vip: prices.vip,
          couple: prices.couple,
        },
      };

      if (quote.date) current.dates.add(quote.date);
      current.slotCount += 1;
      groups.set(key, current);
      return groups;
    }, new Map()).values(),
  ).map((group) => ({
    ...group,
    dates: Array.from(group.dates).sort(),
  }));
