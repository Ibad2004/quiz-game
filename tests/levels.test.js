import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { questionsByDifficulty } from '../src/questions.js';
import { createLevelGame, difficultyNames, getDifficulty, highScoreKey, validateLevels } from '../src/levels.js';
import { getHighScore, saveHighScore } from '../src/storage.js';

const levelQuestions = () => ({
  easy: [{ question: 'E1?', options: ['a', 'b'], answer: 'a' }],
  medium: [{ question: 'M1?', options: ['c', 'd'], answer: 'd' }],
  hard: [{ question: 'H1?', options: ['e', 'f'], answer: 'e' }],
});

// A tiny stand-in for localStorage.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

describe('difficulty config', () => {
  it('has easy, medium and hard, in that order', () => {
    assert.deepEqual(difficultyNames, ['easy', 'medium', 'hard']);
  });

  it('every level has a label and a whole number of seconds of at least 1', () => {
    for (const name of difficultyNames) {
      const { label, secondsPerQuestion } = config.difficulties[name];
      assert.equal(typeof label, 'string', name);
      assert.notEqual(label.trim(), '', name);
      assert.ok(Number.isInteger(secondsPerQuestion) && secondsPerQuestion >= 1, name);
    }
  });

  it('harder levels give less time per question', () => {
    const { easy, medium, hard } = config.difficulties;
    assert.ok(easy.secondsPerQuestion > medium.secondsPerQuestion);
    assert.ok(medium.secondsPerQuestion > hard.secondsPerQuestion);
  });

  it('the default difficulty is a real level', () => {
    assert.ok(difficultyNames.includes(config.defaultDifficulty));
  });

  it('the rules cannot be changed while the game runs', () => {
    assert.ok(Object.isFrozen(config));
    assert.ok(Object.isFrozen(config.difficulties));
    assert.ok(Object.isFrozen(config.difficulties.hard));
    assert.throws(() => {
      config.difficulties.hard.secondsPerQuestion = 999;
    }, TypeError);
  });

  it('every level in the config has questions, and every question list has a level', () => {
    assert.deepEqual(Object.keys(questionsByDifficulty), difficultyNames);
  });
});

describe('getDifficulty', () => {
  it('returns the name, label and time of a level', () => {
    assert.deepEqual(getDifficulty('hard'), { name: 'hard', label: 'Hard', secondsPerQuestion: 10 });
  });

  it('returns a copy, so changing it does not change the rules', () => {
    const hard = getDifficulty('hard');
    hard.secondsPerQuestion = 999;
    assert.equal(getDifficulty('hard').secondsPerQuestion, config.difficulties.hard.secondsPerQuestion);
  });

  it('rejects unknown names with a clear RangeError listing the choices', () => {
    for (const bad of ['expert', '', 'Easy', ' easy', 'toString', '__proto__', 'constructor', null, undefined, 3, {}]) {
      assert.throws(() => getDifficulty(bad), (error) => {
        assert.ok(error instanceof RangeError, String(bad));
        assert.match(error.message, /Choose one of: easy, medium, hard\./);
        return true;
      });
    }
  });
});

describe('highScoreKey', () => {
  it('gives every level its own key', () => {
    const keys = difficultyNames.map(highScoreKey);
    assert.equal(new Set(keys).size, difficultyNames.length);
    for (const key of keys) {
      assert.ok(key.startsWith(`${config.storageKey}.`), key);
    }
  });

  it('rejects an unknown level', () => {
    assert.throws(() => highScoreKey('expert'), RangeError);
  });
});

describe('validateLevels', () => {
  it('accepts the real questions of every level', () => {
    assert.deepEqual(validateLevels(questionsByDifficulty), []);
  });

  it('rejects something that is not grouped by difficulty', () => {
    for (const bad of [null, undefined, 'easy', 42]) {
      assert.deepEqual(validateLevels(bad), ['The questions must be grouped by difficulty.'], String(bad));
    }
  });

  it('says which level is missing or empty', () => {
    const data = levelQuestions();
    delete data.hard;
    data.easy = [];
    assert.deepEqual(validateLevels(data), ['Easy: There are no questions to play.', 'Hard: Questions must be a list.']);
  });

  it('labels a broken question with its level', () => {
    const data = levelQuestions();
    data.medium[0].answer = 'not an option';
    assert.deepEqual(validateLevels(data), ['Medium: Question 1 has an answer that is not one of its options.']);
  });

  it('rejects questions for a level that does not exist', () => {
    const data = { ...levelQuestions(), expert: [{ question: 'X?', options: ['a', 'b'], answer: 'a' }] };
    assert.deepEqual(validateLevels(data), ['Questions were given for an unknown difficulty "expert".']);
  });

  it('rejects the same question used twice, inside a level or across levels', () => {
    const data = levelQuestions();
    data.hard.push({ ...data.easy[0] });
    data.easy.push({ ...data.easy[0] });
    assert.deepEqual(validateLevels(data), [
      'The question "E1?" is used more than once.',
      'The question "E1?" is used more than once.',
    ]);
  });
});

describe('createLevelGame', () => {
  const firstTick = (name) => {
    const ticks = [];
    const { quiz } = createLevelGame(name, levelQuestions(), { onTick: (s) => ticks.push(s), random: () => 0.5 });
    quiz.start();
    return ticks[0];
  };

  it('easy uses 20 seconds, medium 15, hard 10 (from config)', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    for (const name of difficultyNames) {
      assert.equal(firstTick(name), config.difficulties[name].secondsPerQuestion, name);
    }
  });

  it('uses only the questions of the chosen level', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    for (const name of difficultyNames) {
      const data = levelQuestions();
      const { quiz, difficulty } = createLevelGame(name, data, { random: () => 0.5 });
      quiz.start();
      assert.equal(difficulty.name, name);
      assert.equal(quiz.getState().question, data[name][0].question);
      assert.equal(quiz.getState().total, data[name].length);
    }
  });

  it('time runs out after exactly the level time, and Play again uses the same time', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    let game = null;
    const ticks = [];
    game = createLevelGame('hard', levelQuestions(), {
      onTick: (s) => ticks.push(s),
      onTimeUp: () => game.quiz.timeUp(),
      random: () => 0.5,
    });
    const seconds = config.difficulties.hard.secondsPerQuestion;

    game.quiz.start();
    t.mock.timers.tick((seconds - 1) * 1000);
    assert.equal(game.quiz.getState().status, 'question');
    t.mock.timers.tick(1000);
    assert.equal(game.quiz.getState().lastResult.timedOut, true);

    ticks.length = 0;
    game.quiz.start();
    assert.equal(ticks[0], seconds);
  });

  it('two games have separate timers', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const easy = createLevelGame('easy', levelQuestions());
    const hard = createLevelGame('hard', levelQuestions());
    easy.quiz.start();
    hard.quiz.start();
    easy.timer.stop();
    assert.equal(easy.timer.isRunning(), false);
    assert.equal(hard.timer.isRunning(), true);
    hard.timer.stop();
  });

  it('an unknown level throws before any timer or quiz is made', () => {
    let ticked = false;
    assert.throws(() => createLevelGame('expert', levelQuestions(), { onTick: () => (ticked = true) }), RangeError);
    assert.equal(ticked, false);
  });

  it('a level without questions throws the validation error', () => {
    const data = levelQuestions();
    data.easy = [];
    assert.throws(() => createLevelGame('easy', data), { message: 'There are no questions to play.' });
  });
});

describe('high scores per level', () => {
  it('a Hard score never changes the Easy record', () => {
    const storage = fakeStorage();
    saveHighScore(storage, 3, 10, highScoreKey('easy'));
    saveHighScore(storage, 9, 10, highScoreKey('hard'));
    assert.equal(getHighScore(storage, 10, highScoreKey('easy')), 3);
    assert.equal(getHighScore(storage, 10, highScoreKey('hard')), 9);
    assert.equal(getHighScore(storage, 10, highScoreKey('medium')), 0);
  });

  it('a tie keeps the old record for that level only', () => {
    const storage = fakeStorage({ [highScoreKey('medium')]: '6' });
    assert.deepEqual(saveHighScore(storage, 6, 10, highScoreKey('medium')), { outcome: 'tie', highScore: 6 });
    assert.deepEqual(saveHighScore(storage, 6, 10, highScoreKey('easy')), { outcome: 'new', highScore: 6 });
  });

  it('the old single high score from before levels existed is ignored, not mixed in', () => {
    const storage = fakeStorage({ [config.storageKey]: '8' });
    for (const name of difficultyNames) {
      assert.equal(getHighScore(storage, 10, highScoreKey(name)), 0, name);
    }
  });
});
