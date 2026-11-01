# JavaScript Quiz Game

A 10-question multiple-choice quiz about JavaScript (let/const, arrays, map/filter/reduce,
closures, `this` and the event loop), built with plain JavaScript, HTML and CSS. It uses no
frameworks, no libraries and no npm packages.

The game has three screens:

1. **Start**: number of questions, time per question and the current high score.
2. **Question**: question text, 4 answer buttons, score, question number (`3 / 10`) and a
   15 seconds countdown. After an answer (or when time runs out) all buttons are disabled,
   the correct answer is marked with colour **and** text (`(correct answer)` / `(your answer)`),
   and a **Next** button appears.
3. **End**: final score, percentage, high score (saved in `localStorage`) and **Play again**.

## Requirements

- Node 22 or newer (only for the tests, the game itself does not need Node).
- A modern browser (current Chrome, Edge, Firefox or Safari).
- Live Server in VS Code, or any other local server (see below).

There is no `.env` file. The game has no API keys or secrets, so there is nothing to configure.

## How to run it

**Condition: the page must be served over `http://`, not opened as a file.**
`index.html` loads `src/app.js` with `<script type="module">`. Browsers block ES modules on
`file://` pages (CORS rules), so double-clicking `index.html` gives a blank start screen.

- VS Code: install the **Live Server** extension, right-click `index.html` and choose
  **Open with Live Server**.
- Or any local server, for example `npx serve` or `python -m http.server`, then open the
  address it prints.

## How to run the tests

```
npm test
```

This runs `node --test tests/*.test.js` with Node's built-in test runner (`node:test` and
`node:assert/strict`). Nothing needs to be installed. It needs Node 22 or newer, because Node expands the `tests/*.test.js` pattern itself only
from Node 21; I used Node 24.
The countdown tests use `mock.timers`, so they finish instantly instead of waiting real seconds.

| Test file | What it checks |
|---|---|
| `tests/quiz.test.js` | validation, shuffle, answering, time up, next, restart, score limits, percentage |
| `tests/timer.test.js` | the countdown on its own, and the countdown wired to the quiz the same way `app.js` does |
| `tests/storage.test.js` | reading and saving the high score with a fake storage and a storage that throws |
| `tests/source.test.js` | no `innerHTML` anywhere, no hard-coded rule numbers in `app.js`, README matches `config.js` |

## How the code is organised

```
quiz-game/
  index.html          the three screens; loads src/app.js as a module
  style.css           layout, colours, phone-width rules
  src/config.js       the ONE config object: secondsPerQuestion, pointsPerCorrect, storageKey
  src/questions.js    the 10 questions as { question, options, answer }
  src/quiz.js         game rules, no DOM: validateQuestions, shuffle, percentage, createQuiz
  src/timer.js        createCountdown(seconds, onTick, onEnd) with start / stop / isRunning
  src/storage.js      getHighScore / saveHighScore, the storage object is passed in
  src/app.js          DOM only: draws the state and listens for clicks
  tests/              node:test files, one per module plus source checks
```

**Why the logic is separate from the DOM.** Node has no `document`, so any rule written inside
`app.js` could only be tested by clicking in a browser. All decisions (is this answer allowed,
is it correct, what is the score, is a high score valid) live in `quiz.js`, `timer.js` and
`storage.js`, which never touch the page. `app.js` only asks for the state and draws it.
The tests can then call the same functions the page uses.

**Why one config object.** In Week 1 my grading scale (the D grade) and my bank rules were
different between days, because the same rule was written down in more than one place. So this
time every rule lives in one config object: `src/config.js` is the only place rules are written. `quiz.js`,
`storage.js` and `app.js` import it, and `tests/source.test.js` fails if `app.js` hard-codes
the seconds or if this README states a different number of seconds than `config.js`.

**Why things are passed in (dependency injection).** `shuffle` takes a `random` function,
`createQuiz` takes a `timer`, and the storage functions take a `storage` object. The page
passes `Math.random`, a real countdown and `window.localStorage`. Tests pass a fixed
"random", fake timers and a fake storage, so results are the same every run.

## How the timer works

`createCountdown` keeps `remaining` and `intervalId` inside a **closure**. Nothing outside can
change them, only `start` and `stop` can:

```js
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
```

- `setInterval` asks the browser to run the arrow function every 1000 ms. The callback does
  not run "inside" `start`. The event loop runs it later, once the current code is done.
- `clearInterval(intervalId)` cancels it. That is why the id is kept: without it there is no
  way to stop the interval.
- **Why restart must clear first:** if `start()` ran `setInterval` again without `stop()`,
  the old interval would keep running too. Two callbacks would tick each second, the clock
  would drop 2 seconds at a time, and `onEnd` would fire twice. `stop()` at the top of
  `start()` makes "start twice" and "restart while running" both safe.
- `Math.max(remaining - 1, 0)` and the `stop()` at 0 mean the number shown never goes below 0.
- `stop()` checks `intervalId !== null`, so calling it when nothing is running does nothing.

The quiz calls `timer.start()` in `start()` and `next()`, and `timer.stop()` as soon as a
question is answered or timed out. `app.js` never starts or stops the timer itself, so the
page cannot forget to.

## Week 1 concepts used in this project

| Concept | Where | Why it is used there |
|---|---|---|
| `const` / `let` | `src/quiz.js:77` (`let rounds`), `src/config.js:3` (`const config`) | `const` for things that are never reassigned. `let` only for state that must change (`rounds`, `index`, `score`, `status`). |
| Functions | `src/quiz.js:6` `validateQuestions`, `src/quiz.js:64` `createQuiz` | Each rule has a name and one job, so it can be tested on its own. |
| Arrow functions | `src/quiz.js:3` `isBlank`, `src/timer.js:23` interval callback | Short callbacks. In the interval, an arrow function keeps access to `remaining` from the closure. |
| Objects | `src/config.js:3` `config`, `src/questions.js` question objects | Group related values under clear names (`config.secondsPerQuestion`). `Object.freeze` stops changes at run time. |
| Arrays | `src/questions.js` list of questions, `options` arrays | Ordered lists that can be shuffled and looped over. |
| `map` | `src/quiz.js:87` copy of each question, `src/app.js:83` one button per option | Turn every item into a new item without changing the original. |
| `filter` | `src/quiz.js:28` `options.filter(isBlank)` | Find empty options to report them. |
| `reduce` | `src/quiz.js:14` `questions.reduce(...)` | Collect the problems from every question into one error list. |
| Destructuring | `src/quiz.js:20` `const { question, options, answer } = item`, `src/app.js:97` | Pull out only the fields needed, with readable names. |
| Spread | `src/quiz.js:45` `[...items]`, `src/quiz.js:87` `{ ...q, options }`, `src/quiz.js:154` | Make copies so the original questions and the internal state are never changed from outside. |
| Modules | `import` lines at the top of `src/app.js:2-6`, `export` in every `src` file | Each file has one job and states what it needs. This also lets Node tests import the same code the page uses. |
| Closures | `src/timer.js:8-9` `remaining` / `intervalId`, `src/quiz.js:77` quiz state inside `createQuiz` | Private state: only the returned functions can read or change it. |
| `this` | `src/app.js:65` `handleAnswerClick` uses `this.dataset.option` | A regular function used as an event listener gets the clicked button as `this`, so one function serves all 4 buttons. An arrow function would not get it. |
| Event loop / timers | `src/timer.js:23` `setInterval`, `src/timer.js:13` `clearInterval` | The countdown callback is queued by the browser and runs every second after other code finishes. |
| DOM | `src/app.js:8` `$` (getElementById), `src/app.js:84` `createElement`, `textContent` throughout | Show the state on the page. Text is always set with `textContent`, never `innerHTML`, so question text can never be run as HTML. |
| Events | `src/app.js:89` answer buttons, `src/app.js:169-171` start / restart / next | React to the player's clicks. |
| `localStorage` | `src/storage.js:10` `getItem`, `src/storage.js:36` `setItem`, `src/app.js:17` `getStorage` | Keep the high score between visits. Every access is inside `try`/`catch` because private mode can throw. |

## Edge cases

| Situation | Behaviour | Test |
|---|---|---|
| Question list is empty | Page shows "There are no questions to play." and hides Start, no crash | `rejects an empty list with a clear message`, `throws a clear error for an empty question list` |
| Questions are not a list | Error "Questions must be a list." | `rejects something that is not a list` |
| Missing or blank question text | Rejected with the question number | `rejects missing or empty question text` |
| Fewer than 2 options | Rejected | `rejects fewer than 2 options` |
| Duplicate options | Rejected | `rejects duplicate options` |
| Answer is not one of the options | Rejected | `rejects an answer that is not one of the options` |
| Empty option or non-object entry | Rejected | `rejects empty options and non-object entries` |
| Options are shuffled | Correct answer stays correct (it is stored as text, not an index) | `keeps the correct answer correct after shuffling the options` |
| Original questions array | Never changed, only copies are shuffled | `never mutates the original questions array or its objects`, `returns the same items in a new array and leaves the input unchanged` |
| Double click on an answer | Counted once, second click is ignored | `counts a double click only once` |
| Clicking after time is up | Ignored | `counts time up as wrong, shows the correct answer, and ignores clicks after it` |
| Time up after an answer | Ignored, the answer stands | `ignores time up after the question was already answered` |
| Answering after the quiz is finished | Ignored | `does nothing when answering after the quiz is finished` |
| Answering before start | Ignored | `does nothing when answering before start` |
| Unknown answer text | Rejected, question stays open | `rejects unknown answer text and keeps waiting for a real answer` |
| Next before answering | Does nothing | `does not move on before the question is answered` |
| Timer at the end | Never shows a negative number, `onEnd` fires once | `never shows a negative number, even long after the end` |
| `start()` called twice | Only one interval runs | `starting twice does not create two timers` |
| Restart while running | Old interval cleared, full time again | `restart while running clears the old timer and starts from the full time` |
| `stop()` when not running | Does not throw | `stop() stops the ticks, and stop() when not running does not throw` |
| Answering | Stops the timer | `answering stops the timer, so time up never fires afterwards` |
| Bad seconds (0, -5, 2.5, "15") | `TypeError` | `rejects a bad number of seconds` |
| Score | Never below 0 or above the total | `keeps the score between 0 and the total` |
| Percentage with 0 questions | 0, not `NaN` | `returns 0, not NaN, when there are 0 questions` |
| Restart | Score, question number and last result reset. The timer restarts, and the buttons are rebuilt so none stay disabled | `restart resets score, question number and the last result`, `next() and restart start a fresh timer` |
| First play, nothing saved | High score 0 | `returns 0 on the first play when nothing is saved` |
| Corrupted value (`"abc"`, `"-5"`, `"3.7"`, `"999"`) | Treated as 0 | `treats corrupted values as 0` |
| Tie with the old high score | Old record kept, message says it is a tie | `keeps the old high score on a tie and says so` |
| Storage throws (private mode) | Game keeps working, score just is not saved | `returns 0 when storage throws or is missing`, `keeps the game working when storage throws` |
| Impossible score to save (-1, 11, 2.5) | Not saved | `refuses to save an impossible score` |
| HTML in text | Never used, all text uses `textContent` | `never use innerHTML or outerHTML (text goes on the page with textContent)` |

The guard that makes double clicks, late clicks and clicks after the end safe is one check at
the top of `answer` in `src/quiz.js`. An answer is only accepted while a question is open:

```js
  function answer(selected) {
    if (status !== 'question') {
      return { accepted: false, reason: `Cannot answer while the quiz is "${status}".` };
    }
```

The high score is only trusted if the saved text is made of digits and fits the total
(`src/storage.js`). `Number("3.7")` and `Number("-5")` are real numbers, so `Number()` alone is
not enough:

```js
    if (raw === null || !/^\d+$/.test(raw)) {
      return 0;
    }
    const value = Number(raw);
    return isValidScore(value, maxScore) ? value : 0;
```

## What broke and how I fixed it

1. **`npm test` failed before any test ran.** I first wrote the script as
   `node --test tests/`. On Node 24 this crashed with `MODULE_NOT_FOUND`, because Node treated
   `tests/` as one file to run, not as a folder. I changed it to `node --test tests/*.test.js`.
   Node expands that pattern itself, so it also works in the Windows command prompt, where
   the shell does not expand `*`.
2. **A test hung forever instead of failing.** To check the tests, I broke `shuffle` on
   purpose (`copy[i] = copy[j]` instead of a swap). The test run never finished. One test used
   `while (!quiz.isFinished())`. With the broken shuffle the correct answer was missing, so
   `answer()` was rejected, `next()` refused to move on, and the loop never ended. I replaced
   both `while` loops with `for` loops that run once per question, so a bug makes the test
   fail instead of hang.
3. **A console error in the browser.** Loading the page in headless Chrome showed
   `404 favicon.ico`. It was harmless, but it was a console error. Adding
   `<link rel="icon" href="data:,">` to `index.html` stopped the browser from requesting it.
4. **The timer and the quiz needed each other.** The quiz needs the timer (to start and stop
   it) and the timer's `onEnd` needs the quiz (to call `timeUp()`). In `app.js` `quiz` is
   declared with `let` first, then the timer is created with an arrow function that reads
   `quiz` only when time runs out, and then the quiz is created. By the time the callback
   runs, `quiz` is set. This is a closure: the callback reads the variable when it runs, not
   when it is created.

## What I learned

- Keeping rules out of the DOM file is what makes them testable. I could write 54 tests
  without a browser.
- Tests only prove something if they fail when the code is wrong. Breaking the code on purpose
  (double click counted twice, timer not cleared, `NaN` percentage, tie overwriting, and more)
  showed that every one was caught. It also found the hanging test.
- Edge cases are mostly about *when* something is allowed, not *what* it does. One `status`
  value (`idle`, `question`, `answered`, `finished`) answered most of them.
- `localStorage` values are plain text written by anyone, so they must be checked before use.

## Trickiest part

The timer. It runs outside normal code flow (through the event loop), so bugs show up as
timing problems: two intervals at once, a "time up" after the player already answered, or a
countdown that keeps going after restart. The fix was to make the quiz own the timer, so every
state change that ends a question also stops the timer, and to make `start()` always clear the
old interval first. Fake timers (`mock.timers`) made this testable without waiting 15 real
seconds per test.
