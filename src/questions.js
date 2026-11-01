// Each question: the text, the possible options, and the correct answer.
// The answer is stored as text (not an index) so shuffling the options
// can never point at the wrong one.
export const questions = [
  {
    question: 'Which keyword declares a variable that cannot be reassigned?',
    options: ['var', 'let', 'const', 'static'],
    answer: 'const',
  },
  {
    question: 'What is the scope of a variable declared with let inside a for loop block?',
    options: ['The whole file', 'The enclosing function', 'Only that block', 'The global object'],
    answer: 'Only that block',
  },
  {
    question: 'What does [1, 2, 3].map((n) => n * 2) return?',
    options: ['[2, 4, 6]', '[1, 2, 3]', '6', '12'],
    answer: '[2, 4, 6]',
  },
  {
    question: 'What does [5, 12, 8, 20].filter((n) => n > 10) return?',
    options: ['[12, 20]', '[5, 8]', '[true, false]', '2'],
    answer: '[12, 20]',
  },
  {
    question: 'What does [1, 2, 3, 4].reduce((sum, n) => sum + n, 0) return?',
    options: ['10', '[1, 2, 3, 4]', '24', '0'],
    answer: '10',
  },
  {
    question: 'Which array method changes the original array?',
    options: ['map', 'filter', 'push', 'slice'],
    answer: 'push',
  },
  {
    question: 'What is a closure?',
    options: [
      'A function that remembers variables from the scope where it was created',
      'A way to close the browser tab',
      'A loop that never ends',
      'An object with no properties',
    ],
    answer: 'A function that remembers variables from the scope where it was created',
  },
  {
    question: 'Inside a regular function called as obj.method(), what is this?',
    options: ['obj', 'The global object', 'undefined', 'The function itself'],
    answer: 'obj',
  },
  {
    question: 'Why do arrow functions behave differently with this?',
    options: [
      'They take this from the surrounding scope',
      'They always set this to null',
      'They create a new this for every call',
      'They cannot be used inside objects',
    ],
    answer: 'They take this from the surrounding scope',
  },
  {
    question: 'In what order is it logged: console.log("A"); setTimeout(() => console.log("B"), 0); console.log("C");',
    options: ['A then C then B', 'A then B then C', 'B then A then C', 'C then B then A'],
    answer: 'A then C then B',
  },
];
