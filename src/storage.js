import { config } from './config.js';

// A score is only trusted if it is a whole number between 0 and maxScore.
const isValidScore = (value, maxScore) => Number.isInteger(value) && value >= 0 && value <= maxScore;

// `storage` is passed in (window.localStorage in the page, a fake in tests).
// Anything missing, corrupted or out of range counts as 0.
export function getHighScore(storage, maxScore, key = config.storageKey) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || !/^\d+$/.test(raw)) {
      return 0;
    }
    const value = Number(raw);
    return isValidScore(value, maxScore) ? value : 0;
  } catch {
    // Storage blocked (for example private mode): play on without a high score.
    return 0;
  }
}

// Returns what happened so the page can tell the player:
// 'new' (saved), 'tie' (old record kept), 'lower', 'invalid' or 'unavailable'.
export function saveHighScore(storage, score, maxScore, key = config.storageKey) {
  const previous = getHighScore(storage, maxScore, key);
  if (!isValidScore(score, maxScore)) {
    return { outcome: 'invalid', highScore: previous };
  }
  if (score > 0 && score === previous) {
    return { outcome: 'tie', highScore: previous };
  }
  if (score <= previous) {
    return { outcome: 'lower', highScore: previous };
  }
  try {
    storage.setItem(key, String(score));
    return { outcome: 'new', highScore: score };
  } catch {
    return { outcome: 'unavailable', highScore: score };
  }
}
