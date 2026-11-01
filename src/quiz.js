import { config } from './config.js';

const isBlank = (value) => typeof value !== 'string' || value.trim() === '';

// Returns a list of problems. An empty list means the questions are usable.
export function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    return ['Questions must be a list.'];
  }
  if (questions.length === 0) {
    return ['There are no questions to play.'];
  }

  return questions.reduce((errors, item, i) => {
    const label = `Question ${i + 1}`;
    if (item === null || typeof item !== 'object') {
      return [...errors, `${label} is not an object.`];
    }

    const { question, options, answer } = item;
    const problems = [];
    if (isBlank(question)) {
      problems.push(`${label} has no question text.`);
    }
    if (!Array.isArray(options) || options.length < 2) {
      problems.push(`${label} needs at least 2 options.`);
    } else {
      if (options.filter(isBlank).length > 0) {
        problems.push(`${label} has an empty option.`);
      }
      if (new Set(options).size !== options.length) {
        problems.push(`${label} has duplicate options.`);
      }
      if (!options.includes(answer)) {
        problems.push(`${label} has an answer that is not one of its options.`);
      }
    }
    return [...errors, ...problems];
  }, []);
}

// Fisher-Yates shuffle on a copy. `random` is passed in so tests can make
// the order predictable; the game uses Math.random.
export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Whole-number percentage. Returns 0 instead of NaN when there is nothing to divide by.
export function percentage(score, total) {
  if (!(total > 0)) {
    return 0;
  }
  const safeScore = Math.min(Math.max(score, 0), total);
  return Math.round((safeScore / total) * 100);
}

// Statuses: 'idle' (not started), 'question' (waiting for an answer),
// 'answered' (result shown, waiting for Next), 'finished'.
export function createQuiz(questions, options = {}) {
  const errors = validateQuestions(questions);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const {
    random = Math.random,
    pointsPerCorrect = config.pointsPerCorrect,
    timer = null,
  } = options;
  const maxScore = questions.length * pointsPerCorrect;

  let rounds = [];
  let index = 0;
  let score = 0;
  let status = 'idle';
  let lastResult = null;

  const current = () => rounds[index];

  function start() {
    // Copies only: the original questions array and its objects are never changed.
    rounds = shuffle(questions, random).map((q) => ({ ...q, options: shuffle(q.options, random) }));
    index = 0;
    score = 0;
    lastResult = null;
    status = 'question';
    timer?.start();
    return getState();
  }

  function finishRound(result) {
    timer?.stop();
    lastResult = result;
    status = 'answered';
  }

  function answer(selected) {
    if (status !== 'question') {
      return { accepted: false, reason: `Cannot answer while the quiz is "${status}".` };
    }
    const round = current();
    if (!round.options.includes(selected)) {
      return { accepted: false, reason: 'That is not one of the options.' };
    }
    const correct = selected === round.answer;
    if (correct) {
      score = Math.min(score + pointsPerCorrect, maxScore);
    }
    finishRound({ selected, correct, correctAnswer: round.answer, timedOut: false });
    return { accepted: true, correct, correctAnswer: round.answer };
  }

  function timeUp() {
    if (status !== 'question') {
      return { accepted: false, reason: `Time up ignored while the quiz is "${status}".` };
    }
    const round = current();
    finishRound({ selected: null, correct: false, correctAnswer: round.answer, timedOut: true });
    return { accepted: true, correct: false, correctAnswer: round.answer };
  }

  function next() {
    if (status !== 'answered') {
      return false;
    }
    lastResult = null;
    index += 1;
    if (index >= rounds.length) {
      status = 'finished';
    } else {
      status = 'question';
      timer?.start();
    }
    return true;
  }

  const isFinished = () => status === 'finished';

  function getState() {
    const round = current();
    return {
      status,
      number: Math.min(index + 1, rounds.length),
      total: questions.length,
      score,
      maxScore,
      question: round && !isFinished() ? round.question : null,
      options: round && !isFinished() ? [...round.options] : [],
      lastResult: lastResult ? { ...lastResult } : null,
      isLast: index === rounds.length - 1,
    };
  }

  return { start, answer, timeUp, next, isFinished, getState };
}
