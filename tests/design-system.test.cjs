const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
test('owned CSS uses shared spacing tokens, with relative Markdown spacing allowed', () => {
  const root = path.join(__dirname, '../src');
  const contract = fs.readFileSync(path.join(root, 'design-system.css'), 'utf8');
  for (const file of ['style.css', 'design-system.css']) {
    const css = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of css.matchAll(/\b(?:padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|(?:row-|column-)?gap)\s*:\s*([^;{}]+);/g)) {
      assert.doesNotMatch(match[1], /\dpx/, `${file}: local spacing ${match[0]}`);
    }
    for (const match of css.matchAll(/var\((--space-\d+)\)/g)) assert.ok(contract.includes(`${match[1]}:`), `Undefined spacing ${match[1]}`);
  }
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(app.indexOf("import './design-system.css'") > app.indexOf("import './style.css'"));
});
