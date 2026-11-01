// The single place for game rules. Every other file imports this object,
// so changing a number here changes it everywhere (page, logic and tests).
export const config = Object.freeze({
  secondsPerQuestion: 15,
  pointsPerCorrect: 1,
  storageKey: 'quizGame.highScore',
});
