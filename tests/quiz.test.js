import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createQuiz, percentage, shuffle, validateQuestions } from '../src/quiz.js';
import { questionsByDifficulty } from '../src/questions.js';
import { config } from '../src/config.js';

const sample = () => [
  { question: 'Q1?', options: ['a', 'b', 'c', 'd'], answer: 'a' },
  { question: 'Q2?', options: ['w', 'x', 'y', 'z'], answer: 'z' },
  { question: 'Q3?', options: ['yes', 'no'], answer: 'no' },
];

// A predictable "random" function: cycles through fixed values.
const seeded = (values = [0.1, 0.7, 0.4, 0.9, 0.2]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const correctOf = (quiz) => sample().find((q) => q.question === quiz.getState().question).answer;
const wrongOf = (quiz) => quiz.getState().options.find((o) => o !== correctOf(quiz));

describe('validateQuestions', () => {
  it('accepts the real game questions (10 for every difficulty)', () => {
    for (const [level, list] of Object.entries(questionsByDifficulty)) {
      assert.deepEqual(validateQuestions(list), [], level);
      assert.equal(list.length, 10, level);
    }
  });

  it('rejects an empty list with a clear message', () => {
    assert.deepEqual(validateQuestions([]), ['There are no questions to play.']);
  });

  it('rejects something that is not a list', () => {
    assert.deepEqual(validateQuestions(undefined), ['Questions must be a list.']);
    assert.deepEqual(validateQuestions('quiz'), ['Questions must be a list.']);
  });

  it('rejects missing or empty question text', () => {
    const errors = validateQuestions([
      { options: ['a', 'b'], answer: 'a' },
      { question: '   ', options: ['a', 'b'], answer: 'a' },
    ]);
    assert.deepEqual(errors, ['Question 1 has no question text.', 'Question 2 has no question text.']);
  });

  it('rejects fewer than 2 options', () => {
    const errors = validateQuestions([
      { question: 'Q?', options: ['a'], answer: 'a' },
      { question: 'Q?', answer: 'a' },
    ]);
    assert.deepEqual(errors, ['Question 1 needs at least 2 options.', 'Question 2 needs at least 2 options.']);
  });

  it('rejects duplicate options', () => {
    const errors = validateQuestions([{ question: 'Q?', options: ['a', 'a', 'b'], answer: 'a' }]);
    assert.deepEqual(errors, ['Question 1 has duplicate options.']);
  });

  it('rejects an answer that is not one of the options', () => {
    const errors = validateQuestions([{ question: 'Q?', options: ['a', 'b'], answer: 'c' }]);
    assert.deepEqual(errors, ['Question 1 has an answer that is not one of its options.']);
  });

  it('rejects empty options and non-object entries', () => {
    const errors = validateQuestions([{ question: 'Q?', options: ['a', ''], answer: 'a' }, null]);
    assert.deepEqual(errors, ['Question 1 has an empty option.', 'Question 2 is not an object.']);
  });
});

describe('shuffle', () => {
  it('returns the same items in a new array and leaves the input unchanged', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, seeded());
    assert.notEqual(result, input);
    assert.deepEqual(input, [1, 2, 3, 4, 5]);
    assert.deepEqual([...result].sort(), [1, 2, 3, 4, 5]);
  });

  it('is predictable when given the same random function', () => {
    assert.deepEqual(shuffle([1, 2, 3, 4, 5], seeded()), shuffle([1, 2, 3, 4, 5], seeded()));
  });

  it('handles empty and single-item lists', () => {
    assert.deepEqual(shuffle([]), []);
    assert.deepEqual(shuffle(['only']), ['only']);
  });
});

describe('createQuiz', () => {
  it('throws a clear error for an empty question list', () => {
    assert.throws(() => createQuiz([]), { message: 'There are no questions to play.' });
  });

  it('starts at question 1 with score 0', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    const state = quiz.start();
    assert.equal(state.status, 'question');
    assert.equal(state.number, 1);
    assert.equal(state.total, 3);
    assert.equal(state.score, 0);
    assert.equal(state.maxScore, 3 * config.pointsPerCorrect);
  });

  it('keeps the correct answer correct after shuffling the options', () => {
    for (let seed = 0; seed < 20; seed++) {
      const quiz = createQuiz(sample(), { random: seeded([seed / 20, 0.33, 0.66, 0.99]) });
      quiz.start();
      for (let n = 0; n < sample().length; n++) {
        const answer = correctOf(quiz);
        assert.ok(quiz.getState().options.includes(answer));
        assert.equal(quiz.answer(answer).correct, true);
        quiz.next();
      }
      assert.equal(quiz.getState().score, 3 * config.pointsPerCorrect);
    }
  });

  it('never mutates the original questions array or its objects', () => {
    const original = sample();
    const before = structuredClone(original);
    const quiz = createQuiz(original, { random: seeded() });
    quiz.start();
    quiz.answer(quiz.getState().options[0]);
    assert.deepEqual(original, before);
  });

  it('adds points for a correct answer and none for a wrong one', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    assert.deepEqual(quiz.answer(wrongOf(quiz)), { accepted: true, correct: false, correctAnswer: correctOf(quiz) });
    assert.equal(quiz.getState().score, 0);
    quiz.next();
    assert.equal(quiz.answer(correctOf(quiz)).correct, true);
    assert.equal(quiz.getState().score, config.pointsPerCorrect);
  });

  it('counts a double click only once', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    const answer = correctOf(quiz);
    assert.equal(quiz.answer(answer).accepted, true);
    assert.equal(quiz.answer(answer).accepted, false);
    assert.equal(quiz.getState().score, config.pointsPerCorrect);
  });

  it('rejects unknown answer text and keeps waiting for a real answer', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    const result = quiz.answer('not an option');
    assert.equal(result.accepted, false);
    assert.equal(result.reason, 'That is not one of the options.');
    assert.equal(quiz.getState().status, 'question');
    assert.equal(quiz.answer(undefined).accepted, false);
  });

  it('counts time up as wrong, shows the correct answer, and ignores clicks after it', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    const answer = correctOf(quiz);
    assert.deepEqual(quiz.timeUp(), { accepted: true, correct: false, correctAnswer: answer });
    assert.equal(quiz.getState().lastResult.timedOut, true);
    assert.equal(quiz.answer(answer).accepted, false);
    assert.equal(quiz.getState().score, 0);
  });

  it('ignores time up after the question was already answered', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    quiz.answer(correctOf(quiz));
    assert.equal(quiz.timeUp().accepted, false);
    assert.equal(quiz.getState().lastResult.correct, true);
  });

  it('does not move on before the question is answered', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    assert.equal(quiz.next(), false);
    assert.equal(quiz.getState().number, 1);
  });

  it('does nothing when answering after the quiz is finished', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    for (let i = 0; i < 3; i++) {
      quiz.answer(correctOf(quiz));
      quiz.next();
    }
    assert.equal(quiz.isFinished(), true);
    assert.equal(quiz.answer('a').accepted, false);
    assert.equal(quiz.timeUp().accepted, false);
    assert.equal(quiz.next(), false);
    assert.equal(quiz.getState().score, 3 * config.pointsPerCorrect);
  });

  it('does nothing when answering before start', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    assert.equal(quiz.answer('a').accepted, false);
    assert.equal(quiz.getState().status, 'idle');
  });

  it('keeps the score between 0 and the total', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    for (let n = 0; n < sample().length; n++) {
      quiz.answer(correctOf(quiz));
      quiz.answer(correctOf(quiz));
      quiz.next();
    }
    const { score, maxScore } = quiz.getState();
    assert.ok(score >= 0 && score <= maxScore);
    assert.equal(score, maxScore);
  });

  it('restart resets score, question number and the last result', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    quiz.answer(correctOf(quiz));
    quiz.next();
    quiz.answer(correctOf(quiz));
    const state = quiz.start();
    assert.equal(state.score, 0);
    assert.equal(state.number, 1);
    assert.equal(state.status, 'question');
    assert.equal(state.lastResult, null);
  });

  it('getState returns copies, so changing them does not change the quiz', () => {
    const quiz = createQuiz(sample(), { random: seeded() });
    quiz.start();
    const state = quiz.getState();
    state.options.length = 0;
    state.score = 99;
    assert.equal(quiz.getState().options.length > 0, true);
    assert.equal(quiz.getState().score, 0);
  });
});

describe('percentage', () => {
  it('returns 0, not NaN, when there are 0 questions', () => {
    assert.equal(percentage(0, 0), 0);
  });

  it('rounds to a whole number', () => {
    assert.equal(percentage(1, 3), 33);
    assert.equal(percentage(2, 3), 67);
    assert.equal(percentage(10, 10), 100);
  });

  it('stays between 0 and 100 for out-of-range scores', () => {
    assert.equal(percentage(-2, 10), 0);
    assert.equal(percentage(15, 10), 100);
  });
});
