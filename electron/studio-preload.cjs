const { contextBridge, ipcRenderer } = require('electron');
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
