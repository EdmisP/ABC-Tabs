'use strict';

const { app, BrowserWindow, ipcMain, shell, net, nativeImage, session } = require('electron');
const path = require('path');

const LIVE_ORIGIN = 'https://magpiesacorvid.github.io';
const LIVE_PATH = '/Finland-ABC-Archive-and-Tab-Maker/';
const LIVE_URL = `${LIVE_ORIGIN}${LIVE_PATH}`;

const FLAG_PNG = {
  finland: 'https://flagcdn.com/w160/fi.png',
  sweden: 'https://flagcdn.com/w160/se.png',
  norway: 'https://flagcdn.com/w160/no.png',
  germany: 'https://flagcdn.com/w160/de.png',
  hungary: 'https://flagcdn.com/w160/hu.png',
  kosovo: 'https://flagcdn.com/w160/xk.png',
  albania: 'https://flagcdn.com/w160/al.png',
  serbia: 'https://flagcdn.com/w160/rs.png',
  greece: 'https://flagcdn.com/w160/gr.png',
  turkey: 'https://flagcdn.com/w160/tr.png',
  croatia: 'https://flagcdn.com/w160/hr.png',
  bosnia: 'https://flagcdn.com/w160/ba.png',
  poland: 'https://flagcdn.com/w160/pl.png',
  ukraine: 'https://flagcdn.com/w160/ua.png',
  russia: 'https://flagcdn.com/w160/ru.png',
  belarus: 'https://flagcdn.com/w160/by.png',
  georgia: 'https://flagcdn.com/w160/ge.png',
  kazakhstan: 'https://flagcdn.com/w160/kz.png',
  england: 'https://flagcdn.com/w160/gb-eng.png',
  brittany: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Flag_of_Brittany_%28Gwenn_ha_du%29.svg/256px-Flag_of_Brittany_%28Gwenn_ha_du%29.svg.png'
};

let mainWindow = null;

function liveUrl() {
  const url = new URL(LIVE_URL);
  url.searchParams.set('desktop', 'legacy');
  url.searchParams.set('_fresh', String(Date.now()));
  return url.toString();
}

async function clearWebCache() {
  const ses = session.defaultSession;
  await Promise.allSettled([
    ses.clearCache(),
    ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
  ]);
}

async function setWindowThemeIcon(theme) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const url = FLAG_PNG[theme];
  if (!url) return;
  try {
    const response = await net.fetch(url, { cache: 'no-store' });
    if (!response.ok) return;
    const buffer = Buffer.from(await response.arrayBuffer());
    const image = nativeImage.createFromBuffer(buffer);
    if (!image.isEmpty()) mainWindow.setIcon(image);
  } catch (_) {
    // Keep the previous icon when a remote flag cannot be fetched.
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 860,
    minHeight: 620,
    frame: false,
    backgroundColor: '#c0c0c0',
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    title: "Harakka's ABC Archive and Tab Maker",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.removeMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin === LIVE_ORIGIN && parsed.pathname.startsWith(LIVE_PATH)) {
        mainWindow.loadURL(url);
      } else {
        shell.openExternal(url);
      }
    } catch (_) {}
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      const allowed = parsed.origin === LIVE_ORIGIN && parsed.pathname.startsWith(LIVE_PATH);
      if (!allowed && parsed.protocol !== 'file:') {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (_) {}
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _description, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || validatedURL.startsWith('file:')) return;
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  clearWebCache().finally(() => mainWindow.loadURL(liveUrl()));
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:toggle-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:retry', () => {
  if (!mainWindow) return;
  clearWebCache().finally(() => mainWindow.loadURL(liveUrl()));
});
ipcMain.on('theme:changed', (_event, theme) => {
  if (typeof theme === 'string') setWindowThemeIcon(theme);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
