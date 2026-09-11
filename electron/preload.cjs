const { contextBridge, ipcRenderer } = require('electron');
const call = channel => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('tricorder', Object.freeze({
  bootstrap: call('bootstrap'), overview: call('overview'), project: call('project'),
  document: call('document'), addProject: call('add-project'), openFolder: call('open-folder'),
  link: call('link'), settings: call('settings'), notify: call('notify'), sourceRoot: call('source-root'),
  clipboard: Object.freeze({ read: call('clipboard:read'), write: call('clipboard:write') }),
  terminals: Object.freeze({ list: call('terminal:list'), create: call('terminal:create'),
    attach: call('terminal:attach'), write: call('terminal:write'), resize: call('terminal:resize'), stop: call('terminal:stop'),
    onEvent(callback) { const listener = (_event, value) => callback(value); ipcRenderer.on('terminal:event', listener); return () => ipcRenderer.removeListener('terminal:event', listener); },
  }),
}));
