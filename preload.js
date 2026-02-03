const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Loading preload.js...');

// APENAS expõe as APIs - nada mais
contextBridge.exposeInMainWorld('onePassword', {
  search: (query) => ipcRenderer.invoke('1password:search', query),
  getCredentials: (itemId) => ipcRenderer.invoke('1password:get-credentials', itemId),
  getByUrl: (url) => ipcRenderer.invoke('1password:get-by-url', url)
});

console.log('[Preload] onePassword APIs exposed');