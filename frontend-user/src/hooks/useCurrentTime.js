import { useEffect, useState } from "react";

export default function useCurrentTime(refreshInterval = 10000) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), refreshInterval);
    return () => window.clearInterval(intervalId);
  }, [refreshInterval]);

  return currentTime;
}
