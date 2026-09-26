export const PRICING_MODE_STANDARD = "standard";
export const PRICING_MODE_CUSTOM = "custom";

export const pricingDayTypeLabels = {
  weekday: "Ngày thường",
  weekend: "Cuối tuần",
  holiday: "Ngày lễ",
};

const toPriceDraft = (prices = {}) => ({
  normal: prices.normal == null ? "" : String(prices.normal),
  vip: prices.vip == null ? "" : String(prices.vip),
  couple: prices.couple == null ? "" : String(prices.couple),
});

const getPriceSnapshot = (showtime) => ({
  normal: showtime?.seat_prices?.normal ?? showtime?.base_price ?? null,
  vip: showtime?.seat_prices?.vip ?? null,
  couple: showtime?.seat_prices?.couple ?? null,
});

const getPriceSignature = (prices) =>
  [prices.normal, prices.vip, prices.couple].join("|");

export const buildShowtimePricingFields = ({ mode, prices, formData }) => {
  if (mode === PRICING_MODE_STANDARD) {
    return { pricing_mode: PRICING_MODE_STANDARD };
  }

  const customPrices = prices || {
    normal: formData?.normal_price,
    vip: formData?.vip_price,
    couple: formData?.couple_price,
  };

  return {
    pricing_mode: PRICING_MODE_CUSTOM,
    base_price: Number(customPrices.normal),
    seat_prices: {
      normal: Number(customPrices.normal),
      vip: Number(customPrices.vip),
      couple: Number(customPrices.couple),
    },
  };
};

export const findPricingDayTypeForStartTime = (quotes, startTime) => {
  const targetTime = new Date(startTime).getTime();
  if (Number.isNaN(targetTime)) return null;

  return (
    quotes.find(
      (quote) => new Date(quote.start_time).getTime() === targetTime,
    )?.pricing_day_type || null
  );
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

export const buildCustomPriceDrafts = ({ quotes = [], showtimes = [] }) => {
  const groups = groupShowtimePricingQuotes(quotes);
  const quoteDayTypeByTime = new Map(
    quotes.map((quote) => [
      new Date(quote.start_time).getTime(),
      quote.pricing_day_type,
    ]),
  );

  return groups.reduce((drafts, group) => {
    const snapshots = showtimes
      .filter((showtime) => {
        const time = new Date(showtime.start_time).getTime();
        const dayType =
          showtime.pricing_day_type || quoteDayTypeByTime.get(time);
        return dayType === group.dayType;
      })
      .map(getPriceSnapshot)
      .filter((prices) => Object.values(prices).every((price) => price != null));
    const uniqueSnapshots = new Map(
      snapshots.map((prices) => [getPriceSignature(prices), prices]),
    );
    const hasMixedPrices = uniqueSnapshots.size > 1;
    const initialPrices = hasMixedPrices
      ? { normal: null, vip: null, couple: null }
      : uniqueSnapshots.values().next().value || group.prices;

    drafts[group.dayType] = {
      ...toPriceDraft(initialPrices),
      standardPrices: toPriceDraft(group.prices),
      hasMixedPrices,
    };
    return drafts;
  }, {});
};
