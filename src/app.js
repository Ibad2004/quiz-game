// DOM only: this file reads the quiz state and draws it. All game rules live in quiz.js and levels.js.
import { config } from './config.js';
import { questionsByDifficulty } from './questions.js';
import { percentage } from './quiz.js';
import { createLevelGame, difficultyNames, getDifficulty, highScoreKey, validateLevels } from './levels.js';
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

function showErrors(intro, errors) {
  $('start-info').textContent = intro;
  const list = $('error-list');
  list.replaceChildren(
    ...errors.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }),
  );
  list.hidden = false;
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

let game = null;
let selectedDifficulty = config.defaultDifficulty;

const maxScoreOf = (name) => questionsByDifficulty[name].length * config.pointsPerCorrect;

// A regular function (not an arrow) so `this` is the button that was clicked.
function handleAnswerClick() {
  const result = game.quiz.answer(this.dataset.option);
  if (result.accepted) {
    renderResult();
  }
}

function renderQuestion() {
  const state = game.quiz.getState();
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
  const state = game.quiz.getState();
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
  const { difficulty, quiz } = game;
  const { score, maxScore } = quiz.getState();
  const { outcome, highScore } = saveHighScore(getStorage(), score, maxScore, highScoreKey(difficulty.name));

  $('final-level').textContent = `Level: ${difficulty.label}`;
  $('final-score').textContent = `Your score: ${score} / ${maxScore}`;
  $('final-percentage').textContent = `That is ${percentage(score, maxScore)}%.`;

  const messages = {
    new: `New ${difficulty.label} high score: ${highScore}!`,
    tie: `You tied the ${difficulty.label} high score of ${highScore}. The old record stays.`,
    lower: `${difficulty.label} high score: ${highScore}. Try again to beat it.`,
    invalid: `${difficulty.label} high score: ${highScore}.`,
    unavailable: `${difficulty.label} high score this session: ${highScore} (it could not be saved in this browser).`,
  };
  $('high-score').textContent = messages[outcome];
  showScreen('end');
  $('restart-button').focus();
}

// Draws one radio button per level, with its time and its own high score.
// Called every time the start screen is shown, so the high scores are never out of date.
function renderStartScreen() {
  const storage = getStorage();
  const options = difficultyNames.map((name) => {
    const { label, secondsPerQuestion } = getDifficulty(name);
    const total = questionsByDifficulty[name].length;
    const best = getHighScore(storage, maxScoreOf(name), highScoreKey(name));

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'difficulty';
    input.value = name;
    input.checked = name === selectedDifficulty;

    const title = document.createElement('span');
    title.className = 'difficulty-name';
    title.textContent = label;

    const details = document.createElement('span');
    details.className = 'difficulty-details';
    details.textContent = `${total} questions, ${secondsPerQuestion} seconds each. High score: ${best} / ${total}`;

    const text = document.createElement('span');
    text.append(title, details);

    const option = document.createElement('label');
    option.className = 'difficulty-option';
    option.append(input, text);
    return option;
  });

  $('difficulty-options').replaceChildren(...options);
  $('error-list').hidden = true;
  $('start-info').textContent = 'Harder levels have harder questions and less time.';
  $('difficulty-picker').hidden = false;
  $('start-button').hidden = false;
}

function chosenDifficulty() {
  const checked = document.querySelector('input[name="difficulty"]:checked');
  return checked ? checked.value : config.defaultDifficulty;
}

function onTimeUp() {
  if (game.quiz.timeUp().accepted) {
    renderResult();
  }
}

function startGame(name) {
  // getDifficulty throws for an unknown name, so a broken choice can never start a game.
  const difficulty = getDifficulty(name);
  // Stop the previous game's timer before making a new one, so two timers never run at once.
  game?.timer.stop();
  game = createLevelGame(difficulty.name, questionsByDifficulty, { onTick: renderTime, onTimeUp });
  selectedDifficulty = difficulty.name;

  $('level-badge').textContent = difficulty.label;
  game.quiz.start();
  renderQuestion();
  showScreen('question');
}

function showStartScreen() {
  game?.timer.stop();
  renderStartScreen();
  showScreen('start');
  document.querySelector('input[name="difficulty"]:checked')?.focus();
}

function init() {
  const errors = validateLevels(questionsByDifficulty);
  if (errors.length > 0) {
    showErrors('The quiz cannot start because the questions have problems:', errors);
    return;
  }

  renderStartScreen();

  $('start-button').addEventListener('click', () => {
    try {
      startGame(chosenDifficulty());
    } catch (error) {
      showErrors('That difficulty cannot be played:', [error.message]);
    }
  });
  $('restart-button').addEventListener('click', () => startGame(game.difficulty.name));
  $('change-difficulty-button').addEventListener('click', showStartScreen);
  $('next-button').addEventListener('click', () => {
    if (!game.quiz.next()) {
      return;
    }
    if (game.quiz.isFinished()) {
      renderEnd();
    } else {
      renderQuestion();
    }
  });
}

init();
