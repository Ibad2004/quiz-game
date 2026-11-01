import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getHighScore, saveHighScore } from '../src/storage.js';
import { config } from '../src/config.js';

// A tiny stand-in for localStorage that also records every write.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  const writes = [];
  return {
    writes,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      writes.push([key, value]);
      data[key] = String(value);
    },
  };
}

// Behaves like a browser that blocks storage (for example private mode).
const brokenStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

const key = config.storageKey;

describe('getHighScore', () => {
  it('returns 0 on the first play when nothing is saved', () => {
    assert.equal(getHighScore(fakeStorage(), 10), 0);
  });

  it('reads a valid saved score', () => {
    assert.equal(getHighScore(fakeStorage({ [key]: '7' }), 10), 7);
  });

  it('treats corrupted values as 0', () => {
    for (const bad of ['abc', '-5', '3.7', '999', '', ' 4', '1e1', 'NaN']) {
      assert.equal(getHighScore(fakeStorage({ [key]: bad }), 10), 0, `value ${JSON.stringify(bad)}`);
    }
  });

  it('returns 0 when storage throws or is missing', () => {
    assert.equal(getHighScore(brokenStorage, 10), 0);
    assert.equal(getHighScore(null, 10), 0);
  });
});

describe('saveHighScore', () => {
  it('saves the first score above 0', () => {
    const storage = fakeStorage();
    assert.deepEqual(saveHighScore(storage, 4, 10), { outcome: 'new', highScore: 4 });
    assert.deepEqual(storage.writes, [[key, '4']]);
  });

  it('saves a better score', () => {
    const storage = fakeStorage({ [key]: '5' });
    assert.deepEqual(saveHighScore(storage, 8, 10), { outcome: 'new', highScore: 8 });
    assert.equal(getHighScore(storage, 10), 8);
  });

  it('keeps the old high score on a tie and says so', () => {
    const storage = fakeStorage({ [key]: '6' });
    assert.deepEqual(saveHighScore(storage, 6, 10), { outcome: 'tie', highScore: 6 });
    assert.deepEqual(storage.writes, []);
  });

  it('keeps the old high score when the new one is lower', () => {
    const storage = fakeStorage({ [key]: '9' });
    assert.deepEqual(saveHighScore(storage, 3, 10), { outcome: 'lower', highScore: 9 });
    assert.deepEqual(storage.writes, []);
  });

  it('does not call 0 against nothing saved a tie', () => {
    assert.deepEqual(saveHighScore(fakeStorage(), 0, 10), { outcome: 'lower', highScore: 0 });
  });

  it('replaces a corrupted saved value with a real score', () => {
    const storage = fakeStorage({ [key]: '999' });
    assert.deepEqual(saveHighScore(storage, 2, 10), { outcome: 'new', highScore: 2 });
  });

  it('refuses to save an impossible score', () => {
    const storage = fakeStorage({ [key]: '3' });
    for (const bad of [-1, 11, 2.5, NaN, '5']) {
      assert.deepEqual(saveHighScore(storage, bad, 10), { outcome: 'invalid', highScore: 3 });
    }
    assert.deepEqual(storage.writes, []);
  });

  it('keeps the game working when storage throws', () => {
    assert.deepEqual(saveHighScore(brokenStorage, 5, 10), { outcome: 'unavailable', highScore: 5 });
    assert.deepEqual(saveHighScore(null, 5, 10), { outcome: 'unavailable', highScore: 5 });
  });
});
