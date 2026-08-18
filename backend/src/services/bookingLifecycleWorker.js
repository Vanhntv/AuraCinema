import { expirePendingBookings } from "./bookingExpiryService.js";
import { expireSeatHolds } from "./seatHoldService.js";

export const startBookingLifecycleWorker = ({
  intervalMs = 30000,
  runImmediately = true,
  expireSeatHoldsTask = expireSeatHolds,
  expirePendingBookingsTask = expirePendingBookings,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  logger = console,
} = {}) => {
  let isRunning = false;

  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await expireSeatHoldsTask();
      await expirePendingBookingsTask();
    } catch (error) {
      logger.error("Không thể dọn vòng đời giữ ghế/booking", error);
    } finally {
      isRunning = false;
    }
  };

  const timer = setIntervalFn(run, intervalMs);
  timer?.unref?.();
  if (runImmediately) void run();

  return () => clearIntervalFn(timer);
};
