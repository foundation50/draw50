const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

let mainWindow;

function sendFullscreenState(window) {
  window.webContents.send('fullscreen-changed', window.isFullScreen());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#7F6C5D',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.on('enter-full-screen', () => sendFullscreenState(mainWindow));
  mainWindow.on('leave-full-screen', () => sendFullscreenState(mainWindow));
}

app.whenReady().then(() => {
  ipcMain.handle('toggle-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window.setFullScreen(!window.isFullScreen());
    return window.isFullScreen();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
