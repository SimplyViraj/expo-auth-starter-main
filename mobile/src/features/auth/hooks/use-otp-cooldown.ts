import { useCallback, useEffect, useState } from 'react';

const defaultCooldownSeconds = 60;

export function useOtpCooldown(durationSeconds = defaultCooldownSeconds, initialSeconds = durationSeconds) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setTimeout(
      () => setSecondsRemaining((seconds) => Math.max(0, seconds - 1)),
      1000,
    );

    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const restart = useCallback(() => {
    setSecondsRemaining(durationSeconds);
  }, [durationSeconds]);

  return {
    isCoolingDown: secondsRemaining > 0,
    restart,
    secondsRemaining,
  };
}
