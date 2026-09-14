import { issueScheduledGifts } from "./giftEntitlementService.js";

export const startGiftLifecycleWorker = ({
  intervalMs = 60 * 60 * 1000,
  runImmediately = true,
  task = issueScheduledGifts,
  logger = console,
} = {}) => {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await task(); } catch (error) { logger.error("Không thể phát quà tự động", error); } finally { running = false; }
  };
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  if (runImmediately) void run();
  return () => clearInterval(timer);
};
