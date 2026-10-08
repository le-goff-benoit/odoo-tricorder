import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const filename = `odoo-tricorder_${pkg.version}_amd64.deb`;
const digest = createHash('sha256').update(await readFile(`build-artifacts/${filename}`)).digest('hex');
await writeFile('build-artifacts/SHA256SUMS', `${digest}  ${filename}\n`);
console.log(`${digest}  ${filename}`);
