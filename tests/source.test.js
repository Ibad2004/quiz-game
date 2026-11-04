// Checks on the source files themselves, for rules that a unit test cannot see.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { config } from '../src/config.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const sourceFiles = readdirSync(new URL('src/', root)).map((name) => `src/${name}`);

describe('source files', () => {
  it('never use innerHTML or outerHTML (text goes on the page with textContent)', () => {
    for (const file of [...sourceFiles, 'index.html']) {
      assert.doesNotMatch(read(file), /innerHTML|outerHTML|insertAdjacentHTML/, file);
    }
  });

  it('app.js gets the game rules from config instead of hard-coding them', () => {
    const app = read('src/app.js');
    assert.match(app, /secondsPerQuestion/);
    for (const { label, secondsPerQuestion } of Object.values(config.difficulties)) {
      assert.doesNotMatch(app, new RegExp(`\\b${secondsPerQuestion}\\b`), `app.js hard-codes ${secondsPerQuestion}`);
      assert.doesNotMatch(app, new RegExp(`'${label}'`), `app.js hard-codes the label ${label}`);
    }
  });

  it('the README states the same time per level as config.js', () => {
    const readme = read('README.md');
    for (const { label, secondsPerQuestion } of Object.values(config.difficulties)) {
      assert.match(readme, new RegExp(`\\| ${label} \\| ${secondsPerQuestion} seconds \\|`), label);
    }
  });
});
