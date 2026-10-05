const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('draw50Desktop', {
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  toggleGpuAcceleration: () => ipcRenderer.invoke('toggle-gpu-acceleration'),
  getGpuAccelerationState: () => ipcRenderer.invoke('get-gpu-acceleration-state'),
  onFullscreenChange: (listener) => {
    ipcRenderer.on('fullscreen-changed', (_event, isFullscreen) => listener(isFullscreen));
  },
});
