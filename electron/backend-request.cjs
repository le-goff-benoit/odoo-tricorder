'use strict';
const { execFile } = require('node:child_process');

// Match backend/studio.py: check UTF-8 bytes before starting or writing to Python.
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const UNAVAILABLE = 'Le moteur local ne répond pas. Les données enregistrées sont conservées.';

function workflowCatalogRequest(projects, pack) {
  // Registration needs identity only, never release histories, tasks or reports.
  return { action: 'project.configure-catalog', projects: projects.map(({ path, name, series }) => ({ path, name, series })), pack };
}

function jsonRequest(script, args, payload, { timeout = 15000, maxBuffer = 8 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify(payload);
    if (Buffer.byteLength(input, 'utf8') > MAX_REQUEST_BYTES) {
      reject(new Error('Requête trop volumineuse (maximum 4 Mio).'));
      return;
    }
    let writeError;
    const child = execFile('python3', [script, ...args], { timeout, maxBuffer }, (error, stdout) => {
      // A backend can reject a request and close stdin before Node finishes
      // writing. Keep its structured error; never crash on the pipe's EPIPE.
      let response;
      try { response = JSON.parse(stdout); } catch { /* Report transport failure below. */ }
      if (response?.ok === false && typeof response.error === 'string') return reject(new Error(response.error));
      if (error || writeError || response?.ok !== true) return reject(new Error(UNAVAILABLE));
      resolve(response.result);
    });
    child.stdin.on('error', error => { writeError = error; });
    child.stdin.end(input);
  });
}

module.exports = { jsonRequest, workflowCatalogRequest, MAX_REQUEST_BYTES };
