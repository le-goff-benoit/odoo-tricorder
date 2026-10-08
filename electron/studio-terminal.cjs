'use strict';
const socketNet = require('node:net');
const { spawn } = require('node:child_process');

class TerminalBroker {
  constructor(script, socket, onEvent) { this.script = script; this.socket = socket; this.onEvent = onEvent; this.pending = new Map(); this.nextId = 0; this.owned = new Set(); }
  connect() {
    return new Promise((resolve, reject) => {
      const client = socketNet.createConnection(this.socket); client.once('error', reject);
      client.once('connect', () => {
        client.removeListener('error', reject); this.client = client; let buffer = ''; client.setEncoding('utf8');
        client.on('data', chunk => {
          buffer += chunk; let end;
          while ((end = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, end); buffer = buffer.slice(end + 1); let message;
            try { message = JSON.parse(line); } catch { continue; }
            if (message.event) this.onEvent(message);
            else { const request = this.pending.get(message.id); if (request) { this.pending.delete(message.id); clearTimeout(request.timer); message.error ? request.reject(new Error(message.error)) : request.resolve(message.result); } }
          }
        });
        client.on('error', () => {});
        client.on('close', () => { if (this.client === client) this.client = null; for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(new Error('Terminal déconnecté')); } this.pending.clear(); this.onEvent({ event: 'disconnected' }); });
        resolve();
      });
    });
  }
  async ensure() {
    if (this.client && !this.client.destroyed) return;
    this.connecting ||= (async () => {
      try { await this.connect(); return; } catch {}
      this.process = spawn('python3', [this.script, this.socket], { detached: true, stdio: 'ignore' }); this.process.unref();
      for (let attempt = 0; attempt < 40; attempt++) { await new Promise(resolve => setTimeout(resolve, 100)); try { await this.connect(); return; } catch {} }
      throw new Error('Le service de terminal local ne répond pas.');
    })().finally(() => { this.connecting = null; });
    await this.connecting;
  }
  async request(payload) {
    await this.ensure();
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Délai du terminal dépassé')); }, 5000);
      this.pending.set(id, { resolve, reject, timer }); this.client.write(JSON.stringify({ ...payload, id }) + '\n');
    });
  }
  disconnect() { this.client?.end(); if (this.process && this.owned.size === 0) this.process.kill('SIGTERM'); }
}
module.exports = { TerminalBroker };
