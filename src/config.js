// The single place for game rules. Every other file imports this object,
// so changing a number here changes it everywhere (page, logic and tests).
// Harder levels have harder questions AND less time per question.
export const config = Object.freeze({
  difficulties: Object.freeze({
    easy: Object.freeze({ label: 'Easy', secondsPerQuestion: 20 }),
    medium: Object.freeze({ label: 'Medium', secondsPerQuestion: 15 }),
    hard: Object.freeze({ label: 'Hard', secondsPerQuestion: 10 }),
  }),
  defaultDifficulty: 'medium',
  pointsPerCorrect: 1,
  storageKey: 'quizGame.highScore',
});
