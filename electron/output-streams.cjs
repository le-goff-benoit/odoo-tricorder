// A desktop app may outlive the terminal or launcher that owns these pipes.
// Only a disconnected log reader is harmless; other stream errors remain fatal.
function protectStandardOutput(stdout = process.stdout, stderr = process.stderr) {
  for (const stream of new Set([stdout, stderr])) {
    stream.on('error', error => {
      if (error.code !== 'EPIPE') throw error;
    });
  }
}

module.exports = {protectStandardOutput};
