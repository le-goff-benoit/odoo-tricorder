import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const child = spawn('node', ['node_modules/@playwright/test/cli.js', 'test'], {
  stdio: 'inherit', env: { ...process.env, TRICORDER_EXECUTABLE: resolve('release/linux-unpacked/odoo-tricorder') },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
