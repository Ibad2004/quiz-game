// A countdown that calls onTick(secondsLeft) every second and onEnd() once at 0.
// `intervalId` and `remaining` live in this closure, so only start/stop can touch them.
export function createCountdown(seconds, onTick = () => {}, onEnd = () => {}) {
  if (!Number.isInteger(seconds) || seconds < 1) {
    throw new TypeError('seconds must be a whole number of at least 1.');
  }

  let remaining = seconds;
  let intervalId = null;

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function start() {
    // Clear any running interval first, otherwise two would tick at once.
    stop();
    remaining = seconds;
    onTick(remaining);
    intervalId = setInterval(() => {
      remaining = Math.max(remaining - 1, 0);
      onTick(remaining);
      if (remaining === 0) {
        stop();
        onEnd();
      }
    }, 1000);
  }

  const isRunning = () => intervalId !== null;
  const getRemaining = () => remaining;

  return { start, stop, isRunning, getRemaining };
}
