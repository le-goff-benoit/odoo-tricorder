const path = require('node:path');
const os = require('node:os');

function initialWorkspace(argv = process.argv) {
  return argv.includes('--workflow-studio') || argv.some(arg => arg.endsWith('.tricorder-workflow')) ? 'studio' : 'cockpit';
}
function statePaths(env = process.env, mode = initialWorkspace(), home = os.homedir()) {
  const isolated = env.TRICORDER_STATE_DIR;
  return {
    cockpit: env.TRICORDER_COCKPIT_STATE_DIR || (isolated ? (mode === 'studio' ? path.join(isolated, 'cockpit') : isolated) : path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'odoo-tricorder')),
    studio: env.TRICORDER_WORKFLOW_STATE_DIR || (isolated ? (mode === 'studio' ? isolated : path.join(isolated, 'workflows')) : path.join(home, '.local/share/tricorder')),
  };
}
// Several entry points may arrive while the first renderer is still loading.
// Share that navigation; a rejected load remains retryable.
function workspaceLoader(window) {
  let loaded = false, loading;
  return function ensureLoaded() {
    if (loaded) return Promise.resolve();
    loading ||= Promise.resolve().then(() => window.loadURL('tricorder://app/'))
      .then(() => { loaded = true; }).finally(() => { loading = null; });
    return loading;
  };
}
module.exports = { initialWorkspace, statePaths, workspaceLoader };
