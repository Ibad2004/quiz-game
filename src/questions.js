// Each question: the text, the possible options, and the correct answer.
// The answer is stored as text (not an index) so shuffling the options
// can never point at the wrong one.
// One list per difficulty. The keys must match the levels in config.difficulties.
export const questionsByDifficulty = {
  easy: [
    {
      question: 'Which symbol starts a one-line comment in JavaScript?',
      options: ['//', '#', '<!--', '**'],
      answer: '//',
    },
    {
      question: 'What does console.log("Hi") do?',
      options: ['Prints Hi in the console', 'Saves Hi to a file', 'Shows a popup with Hi', 'Deletes Hi'],
      answer: 'Prints Hi in the console',
    },
    {
      question: 'Which keyword declares a variable whose value can change later?',
      options: ['let', 'const', 'fixed', 'final'],
      answer: 'let',
    },
    {
      question: 'What is the result of 2 + 3 in JavaScript?',
      options: ['5', '23', '6', 'undefined'],
      answer: '5',
    },
    {
      question: 'What is the index of the first item in an array?',
      options: ['0', '1', '-1', 'Arrays have no index'],
      answer: '0',
    },
    {
      question: 'Which array method adds an item to the end of an array?',
      options: ['push', 'pop', 'shift', 'slice'],
      answer: 'push',
    },
    {
      question: 'What type is the value true?',
      options: ['boolean', 'string', 'number', 'object'],
      answer: 'boolean',
    },
    {
      question: 'Which operator checks that two values are equal without converting their types?',
      options: ['===', '=', '==', '!='],
      answer: '===',
    },
    {
      question: 'What does [1, 2, 3].length return?',
      options: ['3', '2', '4', 'undefined'],
      answer: '3',
    },
    {
      question: 'Which of these values is a string?',
      options: ['"hello"', '42', 'true', 'null'],
      answer: '"hello"',
    },
  ],
  medium: [
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
  ],
  hard: [
    {
      question: 'What does console.log(typeof null) print?',
      options: ['object', 'null', 'undefined', 'number'],
      answer: 'object',
    },
    {
      question: 'What does console.log([1, 2, 3] + [4]) print?',
      options: ['1,2,34', '[1, 2, 3, 4]', '10', 'NaN'],
      answer: '1,2,34',
    },
    {
      question: 'In what order is it logged: console.log("A"); setTimeout(() => console.log("B"), 0); Promise.resolve().then(() => console.log("C")); console.log("D");',
      options: ['A D C B', 'A B C D', 'A D B C', 'A C D B'],
      answer: 'A D C B',
    },
    {
      question: 'What is logged by: for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); }',
      options: ['3 3 3', '0 1 2', '0 0 0', '1 2 3'],
      answer: '3 3 3',
    },
    {
      question: 'const add = (a) => (b) => a + b; What is add(2)(3)?',
      options: ['5', '23', 'A function', 'NaN'],
      answer: '5',
    },
    {
      question: 'What does [10, 1, 2].sort() return?',
      options: ['[1, 10, 2]', '[1, 2, 10]', '[10, 2, 1]', '[2, 1, 10]'],
      answer: '[1, 10, 2]',
    },
    {
      question: 'What does 0.1 + 0.2 === 0.3 return?',
      options: ['false', 'true', 'undefined', 'NaN'],
      answer: 'false',
    },
    {
      question: 'In an ES module, what is this inside f in: const obj = { f: () => this };',
      options: ['undefined', 'obj', 'f', 'null'],
      answer: 'undefined',
    },
    {
      question: 'What does Promise.all reject with when one of its promises rejects?',
      options: ['The first rejection reason', 'An array of every error', 'undefined', 'It never rejects'],
      answer: 'The first rejection reason',
    },
    {
      question: 'What does [1, 2, 3].reduce((sum, n) => sum + n) return (no starting value)?',
      options: ['6', '5', '0', 'TypeError'],
      answer: '6',
    },
  ],
};
