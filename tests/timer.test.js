import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCountdown } from '../src/timer.js';
import { createQuiz } from '../src/quiz.js';

const sample = () => [
  { question: 'Q1?', options: ['a', 'b'], answer: 'a' },
  { question: 'Q2?', options: ['c', 'd'], answer: 'd' },
];

describe('createCountdown', () => {
  it('ticks down once per second and calls onEnd once at 0', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const ticks = [];
    let ended = 0;
    const timer = createCountdown(3, (s) => ticks.push(s), () => ended++);
    timer.start();
    t.mock.timers.tick(3000);
    assert.deepEqual(ticks, [3, 2, 1, 0]);
    assert.equal(ended, 1);
    assert.equal(timer.isRunning(), false);
  });

  it('never shows a negative number, even long after the end', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const ticks = [];
    let ended = 0;
    const timer = createCountdown(2, (s) => ticks.push(s), () => ended++);
    timer.start();
    t.mock.timers.tick(10000);
    assert.ok(ticks.every((s) => s >= 0), `ticks were ${ticks}`);
    assert.equal(timer.getRemaining(), 0);
    assert.equal(ended, 1);
  });

  it('starting twice does not create two timers', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const ticks = [];
    const timer = createCountdown(5, (s) => ticks.push(s));
    timer.start();
    timer.start();
    t.mock.timers.tick(1000);
    assert.deepEqual(ticks, [5, 5, 4]);
  });

  it('restart while running clears the old timer and starts from the full time', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    let ended = 0;
    const timer = createCountdown(3, () => {}, () => ended++);
    timer.start();
    t.mock.timers.tick(2000);
    timer.start();
    assert.equal(timer.getRemaining(), 3);
    t.mock.timers.tick(2000);
    assert.equal(ended, 0);
    t.mock.timers.tick(1000);
    assert.equal(ended, 1);
  });

  it('stop() stops the ticks, and stop() when not running does not throw', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const ticks = [];
    const timer = createCountdown(5, (s) => ticks.push(s));
    assert.doesNotThrow(() => timer.stop());
    timer.start();
    t.mock.timers.tick(1000);
    timer.stop();
    assert.doesNotThrow(() => timer.stop());
    t.mock.timers.tick(5000);
    assert.deepEqual(ticks, [5, 4]);
    assert.equal(timer.isRunning(), false);
  });

  it('rejects a bad number of seconds', () => {
    assert.throws(() => createCountdown(0), TypeError);
    assert.throws(() => createCountdown(-5), TypeError);
    assert.throws(() => createCountdown(2.5), TypeError);
    assert.throws(() => createCountdown('15'), TypeError);
  });
});

describe('quiz with a real countdown', () => {
  // Wires the timer to the quiz the same way app.js does.
  const setup = (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    let quiz = null;
    const timer = createCountdown(3, () => {}, () => quiz.timeUp());
    quiz = createQuiz(sample(), { timer, random: () => 0.5 });
    return { quiz, timer };
  };

  it('answering stops the timer, so time up never fires afterwards', (t) => {
    const { quiz, timer } = setup(t);
    quiz.start();
    assert.equal(timer.isRunning(), true);
    const answer = sample().find((q) => q.question === quiz.getState().question).answer;
    quiz.answer(answer);
    assert.equal(timer.isRunning(), false);
    t.mock.timers.tick(5000);
    assert.equal(quiz.getState().lastResult.timedOut, false);
    assert.equal(quiz.getState().score, 1);
  });

  it('when the timer reaches 0 the question counts as wrong', (t) => {
    const { quiz, timer } = setup(t);
    quiz.start();
    t.mock.timers.tick(3000);
    assert.equal(timer.isRunning(), false);
    assert.equal(quiz.getState().lastResult.timedOut, true);
    assert.equal(quiz.getState().score, 0);
  });

  it('next() and restart start a fresh timer', (t) => {
    const { quiz, timer } = setup(t);
    quiz.start();
    t.mock.timers.tick(3000);
    quiz.next();
    assert.equal(timer.isRunning(), true);
    assert.equal(timer.getRemaining(), 3);
    t.mock.timers.tick(1000);
    quiz.start();
    assert.equal(timer.getRemaining(), 3);
    assert.equal(quiz.getState().number, 1);
  });

  it('the timer is stopped once the quiz is finished', (t) => {
    const { quiz, timer } = setup(t);
    quiz.start();
    t.mock.timers.tick(3000);
    quiz.next();
    t.mock.timers.tick(3000);
    quiz.next();
    assert.equal(quiz.isFinished(), true);
    assert.equal(timer.isRunning(), false);
  });
});
