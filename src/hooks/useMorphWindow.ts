import { useEffect, useState } from "react";

export function useMorphWindow(systemKey: number, durationMs = 900): boolean {
  const [settledKey, setSettledKey] = useState(systemKey);

  useEffect(() => {
    if (settledKey === systemKey) return;
    const timer = setTimeout(() => setSettledKey(systemKey), durationMs);
    return () => clearTimeout(timer);
  }, [systemKey, settledKey, durationMs]);

  return settledKey !== systemKey;
}
