import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const filename = `odoo-tricorder_${pkg.version}_amd64.deb`;
const digest = createHash('sha256').update(await readFile(`release/${filename}`)).digest('hex');
await writeFile('release/SHA256SUMS', `${digest}  ${filename}\n`);
console.log(`${digest}  ${filename}`);
