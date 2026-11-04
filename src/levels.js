// Everything about difficulty levels, with no DOM, so it can be tested in Node.
import { config } from './config.js';
import { createQuiz, validateQuestions } from './quiz.js';
import { createCountdown } from './timer.js';

export const difficultyNames = Object.freeze(Object.keys(config.difficulties));

const describe = (value) => (typeof value === 'string' ? `"${value}"` : String(value));

// Object.hasOwn (not `in`) so names like "toString" or "__proto__" are rejected too.
export function getDifficulty(name) {
  if (typeof name !== 'string' || !Object.hasOwn(config.difficulties, name)) {
    throw new RangeError(
      `Unknown difficulty ${describe(name)}. Choose one of: ${difficultyNames.join(', ')}.`,
    );
  }
  return { name, ...config.difficulties[name] };
}

// One high score per level, so an Easy score can never replace a Hard record.
export const highScoreKey = (name) => `${config.storageKey}.${getDifficulty(name).name}`;

// Checks every level's questions. Each problem says which level it belongs to.
export function validateLevels(questionsByDifficulty) {
  if (questionsByDifficulty === null || typeof questionsByDifficulty !== 'object') {
    return ['The questions must be grouped by difficulty.'];
  }

  const levelErrors = difficultyNames.flatMap((name) => {
    const { label } = config.difficulties[name];
    return validateQuestions(questionsByDifficulty[name]).map((problem) => `${label}: ${problem}`);
  });

  const unknownLevels = Object.keys(questionsByDifficulty)
    .filter((name) => !difficultyNames.includes(name))
    .map((name) => `Questions were given for an unknown difficulty "${name}".`);

  const seen = new Set();
  const repeated = difficultyNames
    .flatMap((name) => (Array.isArray(questionsByDifficulty[name]) ? questionsByDifficulty[name] : []))
    .map((item) => item?.question)
    .filter((text) => {
      if (typeof text !== 'string') {
        return false;
      }
      const isRepeat = seen.has(text);
      seen.add(text);
      return isRepeat;
    })
    .map((text) => `The question "${text}" is used more than once.`);

  return [...levelErrors, ...unknownLevels, ...repeated];
}

// Builds one game for one level: its own questions and a countdown with that level's time.
export function createLevelGame(name, questionsByDifficulty, { onTick, onTimeUp, random } = {}) {
  const difficulty = getDifficulty(name);
  const timer = createCountdown(difficulty.secondsPerQuestion, onTick, onTimeUp);
  const quiz = createQuiz(questionsByDifficulty[name], {
    timer,
    random,
    pointsPerCorrect: config.pointsPerCorrect,
  });
  return { difficulty, quiz, timer };
}
