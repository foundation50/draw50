const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('draw50Desktop', {
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  onFullscreenChange: (listener) => {
    ipcRenderer.on('fullscreen-changed', (_event, isFullscreen) => listener(isFullscreen));
  },
});
