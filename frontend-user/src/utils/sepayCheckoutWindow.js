export const SEPAY_CHECKOUT_MESSAGE_TYPE = "auracinema:sepay-checkout-result";

const normalizeBookingId = (bookingId) => String(bookingId || "")
  .replace(/[^a-zA-Z0-9_-]/g, "")
  .slice(0, 80);

export function buildSepayCheckoutWindowName(bookingId) {
  return `auracinema_sepay_${normalizeBookingId(bookingId) || "payment"}`;
}

export function openSepayCheckoutWindow(bookingId, browserWindow = window) {
  const width = Math.min(720, Math.max(420, Number(browserWindow.screen?.availWidth || 720)));
  const height = Math.min(860, Math.max(620, Number(browserWindow.screen?.availHeight || 860)));
  const left = Math.max(0, Math.round((Number(browserWindow.screenX || 0)
    + (Number(browserWindow.outerWidth || width) - width) / 2)));
  const top = Math.max(0, Math.round((Number(browserWindow.screenY || 0)
    + (Number(browserWindow.outerHeight || height) - height) / 2)));
  const target = buildSepayCheckoutWindowName(bookingId);
  const popup = browserWindow.open(
    "",
    target,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );

  popup?.focus?.();
  return popup ? { popup, target } : null;
}

export function submitSepayCheckoutForm({
  checkoutUrl,
  fields,
  target,
  documentObject = document,
}) {
  const form = documentObject.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.target = target;
  form.style.display = "none";

  Object.entries(fields || {}).forEach(([name, value]) => {
    const input = documentObject.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  });

  documentObject.body.appendChild(form);
  form.submit();
  form.remove();
}

export function isTrustedSepayCheckoutMessage(event, {
  bookingId,
  expectedOrigin = window.location.origin,
  expectedSource = null,
} = {}) {
  return event?.origin === expectedOrigin
    && (!expectedSource || event.source === expectedSource)
    && event?.data?.type === SEPAY_CHECKOUT_MESSAGE_TYPE
    && String(event.data.bookingId || "") === String(bookingId || "");
}
