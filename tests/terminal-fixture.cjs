// Cleanup is limited to the socket of a synthetic test instance.
const { expect } = require('@playwright/test');
const fs = require('node:fs');
const net = require('node:net');

async function cleanupBroker(socket) {
  const shellPids = [];
  await new Promise(resolve => {
    const client = net.createConnection(socket); let buffer = '';
    client.on('error', resolve);
    client.on('connect', () => client.write('{"id":1,"action":"list"}\n'));
    client.on('data', data => {
      buffer += data;
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const msg = JSON.parse(buffer.slice(0, end)); buffer = buffer.slice(end + 1);
        if (msg.id === 1) {
          for (const s of msg.result) {
            if (s.alive) shellPids.push(s.pid);
            client.write(JSON.stringify({ id: 2, action: 'stop', session: s.id }) + '\n');
          }
          client.write('{"id":3,"action":"ping"}\n');
        } else if (msg.id === 3) { try { process.kill(msg.result.pid, 'SIGTERM'); } catch {} client.end(); resolve(); }
      }
    });
    client.on('close', resolve);
  });
  // stop acknowledges the signal, not the shell's exit. Bash can still write
  // HISTFILE after the broker closes, racing deletion of the synthetic home.
  const live = pid => {
    try { return !['Z', 'X'].includes(fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[0]); }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  await expect.poll(() => shellPids.filter(live), { timeout: 8000,
    message: 'Synthetic shells must exit before deleting their home' }).toEqual([]);
}

module.exports = { cleanupBroker };
