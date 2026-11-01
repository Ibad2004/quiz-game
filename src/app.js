// DOM only: this file reads the quiz state and draws it. All game rules live in quiz.js.
import { config } from './config.js';
import { questions } from './questions.js';
import { createQuiz, percentage, validateQuestions } from './quiz.js';
import { createCountdown } from './timer.js';
import { getHighScore, saveHighScore } from './storage.js';

const $ = (id) => document.getElementById(id);

const screens = {
  start: $('start-screen'),
  question: $('question-screen'),
  end: $('end-screen'),
};

// Reading window.localStorage itself can throw when storage is blocked.
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.hidden = key !== name;
  });
}

function showErrors(errors) {
  $('start-info').textContent = 'The quiz cannot start because the questions have problems:';
  const list = $('error-list');
  list.replaceChildren(
    ...errors.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  list.hidden = false;
  $('start-button').hidden = true;
}

// The visible timer is not a live region, otherwise a screen reader would read every second.
// Only "5 seconds left" is announced here; time up is announced by the feedback message.
function renderTime(secondsLeft) {
  const timerElement = $('timer');
  timerElement.textContent = `${secondsLeft} s`;
  timerElement.classList.toggle('low', secondsLeft <= 5);

  if (secondsLeft === 5) {
    $('timer-announcement').textContent = '5 seconds left';
  }
}

function renderStatus(state) {
  $('question-number').textContent = `${state.number} / ${state.total}`;
  $('score').textContent = `Score: ${state.score}`;
}

let quiz = null;

// A regular function (not an arrow) so `this` is the button that was clicked.
function handleAnswerClick() {
  const result = quiz.answer(this.dataset.option);
  if (result.accepted) {
    renderResult();
  }
}

function renderQuestion() {
  const state = quiz.getState();
  renderStatus(state);
  $('question-text').textContent = state.question;
  $('feedback').textContent = '';
  $('feedback').className = 'feedback';
  $('timer-announcement').textContent = '';
  $('next-button').hidden = true;
  $('next-button').textContent = state.isLast ? 'See results' : 'Next';

  // New buttons every question, so no disabled state or colour is left over.
  const buttons = state.options.map((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer';
    button.dataset.option = option;
    button.textContent = option;
    button.addEventListener('click', handleAnswerClick);
    return button;
  });
  $('answers').replaceChildren(...buttons);
}

function renderResult() {
  const state = quiz.getState();
  const { selected, correct, correctAnswer, timedOut } = state.lastResult;
  renderStatus(state);

  $('answers').querySelectorAll('button').forEach((button) => {
    button.disabled = true;
    const option = button.dataset.option;
    if (option === correctAnswer) {
      button.classList.add('correct');
      button.textContent = `${option} (correct answer)`;
    } else if (option === selected) {
      button.classList.add('wrong');
      button.textContent = `${option} (your answer)`;
    }
  });

  const feedback = $('feedback');
  if (timedOut) {
    feedback.textContent = `Time is up! The correct answer is: ${correctAnswer}`;
  } else if (correct) {
    feedback.textContent = 'Correct!';
  } else {
    feedback.textContent = `Wrong. The correct answer is: ${correctAnswer}`;
  }
  feedback.className = `feedback ${correct ? 'correct' : 'wrong'}`;
  $('next-button').hidden = false;
  $('next-button').focus();
}

function renderEnd() {
  const { score, maxScore } = quiz.getState();
  const { outcome, highScore } = saveHighScore(getStorage(), score, maxScore);

  $('final-score').textContent = `Your score: ${score} / ${maxScore}`;
  $('final-percentage').textContent = `That is ${percentage(score, maxScore)}%.`;

  const messages = {
    new: `New high score: ${highScore}!`,
    tie: `You tied the high score of ${highScore}. The old record stays.`,
    lower: `High score: ${highScore}. Try again to beat it.`,
    invalid: `High score: ${highScore}.`,
    unavailable: `High score this session: ${highScore} (it could not be saved in this browser).`,
  };
  $('high-score').textContent = messages[outcome];
  showScreen('end');
  $('restart-button').focus();
}

function startGame() {
  quiz.start();
  renderQuestion();
  showScreen('question');
}

function init() {
  const errors = validateQuestions(questions);
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  const timer = createCountdown(config.secondsPerQuestion, renderTime, () => {
    if (quiz.timeUp().accepted) {
      renderResult();
    }
  });
  quiz = createQuiz(questions, { timer });

  const best = getHighScore(getStorage(), questions.length * config.pointsPerCorrect);
  $('start-info').textContent =
    `${questions.length} questions, ${config.secondsPerQuestion} seconds each. High score: ${best}.`;
  $('start-button').hidden = false;

  $('start-button').addEventListener('click', startGame);
  $('restart-button').addEventListener('click', startGame);
  $('next-button').addEventListener('click', () => {
    if (!quiz.next()) {
      return;
    }
    if (quiz.isFinished()) {
      renderEnd();
    } else {
      renderQuestion();
    }
  });
}

init();
