const { contextBridge, ipcRenderer } = require('electron');
const call = channel => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('tricorder', Object.freeze({
  onNavigate(callback) { const listener = (_event, value) => callback(value); ipcRenderer.on('workspace:navigate', listener); return () => ipcRenderer.removeListener('workspace:navigate', listener); },
  workflowTerminal: call('workflow-terminal'),
  bootstrap: call('bootstrap'), overview: call('overview'), project: call('project'), revision: call('catalog-revision'),
  document: call('document'), openFolder: call('open-folder'), workflows: call('workflow-workspace'),
  link: call('link'), settings: call('settings'), notify: call('notify'), sourceRoot: call('source-root'), workspaceRoot: call('workspace-root'),
  clipboard: Object.freeze({ read: call('clipboard:read'), write: call('clipboard:write') }),
  cockpit: Object.freeze({ observations: call('observations'), quotas: call('quotas'), prepareAgent: call('prepare-agent'), bind: call('bind-native'), bindCodexRuntime: call('bind-codex-runtime'), prepareClaude: call('prepare-claude'), forget: call('forget-native'),
    profile: call('profile'), profileFolder: call('profile-folder'), resetProfile: call('profile-reset'), search: call('search-documents'),
    palette: call('palette'), prepareSkill: call('prepare-skill'), prepareUsage: call('prepare-usage'), files: call('files'), preview: call('file-preview') }),
  terminals: Object.freeze({ list: call('terminal:list'), create: call('terminal:create'), context: call('terminal:context'),
    attach: call('terminal:attach'), write: call('terminal:write'), resize: call('terminal:resize'), stop: call('terminal:stop'),
    onEvent(callback) { const listener = (_event, value) => callback(value); ipcRenderer.on('terminal:event', listener); return () => ipcRenderer.removeListener('terminal:event', listener); },
  }),
}));

contextBridge.exposeInMainWorld('studio', Object.freeze({
  request: payload => ipcRenderer.invoke('studio:request', payload),
  human: payload => ipcRenderer.invoke('studio:human', payload),
  updates: payload => ipcRenderer.invoke('studio:updates', payload),
  portable: payload => ipcRenderer.invoke('studio:portable', payload),
  folder: () => ipcRenderer.invoke('studio:folder'),
  terminal: request => ipcRenderer.invoke('studio:terminal', request),
  onTerminal(callback) { const listener = (_event, event) => callback(event); ipcRenderer.on('studio:terminal-event', listener); return () => ipcRenderer.removeListener('studio:terminal-event', listener); },
  onNavigate(callback) { const listener = (_event, destination) => callback(destination); ipcRenderer.on('studio:navigate', listener); return () => ipcRenderer.removeListener('studio:navigate', listener); },
}));
