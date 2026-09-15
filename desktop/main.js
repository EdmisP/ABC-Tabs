'use strict';

const { app, BrowserWindow, ipcMain, shell, net, nativeImage } = require('electron');
const path = require('path');

// The archive is an SVG/DOM utility and does not need GPU acceleration. Disabling
// Chromium's GPU process makes shutdown much less invasive on Windows display/audio
// drivers, especially on older cards and drivers.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,GlobalMediaControls');

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
let currentIconTheme = '';
let shuttingDown = false;
let iconFetchAbort = null;

function liveUrl() {
  const url = new URL(LIVE_URL);
  url.searchParams.set('desktop', 'legacy');
  return url.toString();
}

async function setWindowThemeIcon(theme) {
  if (!mainWindow || mainWindow.isDestroyed() || !theme || theme === currentIconTheme) return;
  const url = FLAG_PNG[theme];
  if (!url) return;

  try {
    if (iconFetchAbort) iconFetchAbort.abort();
    iconFetchAbort = new AbortController();
    const response = await net.fetch(url, { signal: iconFetchAbort.signal });
    if (!response.ok || shuttingDown) return;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (shuttingDown || !mainWindow || mainWindow.isDestroyed()) return;
    const image = nativeImage.createFromBuffer(buffer);
    if (!image.isEmpty()) {
      mainWindow.setIcon(image);
      currentIconTheme = theme;
    }
  } catch (_) {
    // Keep the existing app icon if a remote flag is unavailable or shutdown cancels it.
  } finally {
    iconFetchAbort = null;
  }
}

function safeShutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (iconFetchAbort) {
    try { iconFetchAbort.abort(); } catch (_) {}
    iconFetchAbort = null;
  }

  const win = mainWindow;
  mainWindow = null;
  currentIconTheme = '';

  if (win && !win.isDestroyed()) {
    try { win.webContents.setAudioMuted(true); } catch (_) {}
    try { win.webContents.removeAllListeners(); } catch (_) {}
    try { win.removeAllListeners(); } catch (_) {}
    try { win.destroy(); } catch (_) {}
  }

  // Do not wait for a busy remote page, service worker or Chromium renderer to run
  // unload handlers. Once the window is destroyed, terminate the desktop shell.
  setImmediate(() => app.exit(0));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 860,
    minHeight: 620,
    frame: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#c0c0c0',
    show: true,
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

  // F11/full-screen is disabled at BrowserWindow level. Also suppress the common shortcut.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') event.preventDefault();
  });

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

  mainWindow.on('close', event => {
    if (shuttingDown) return;
    event.preventDefault();
    safeShutdown();
  });

  // Use normal HTTP/browser caching. The site's service worker is network-first, so
  // GitHub updates are still checked while repeat launches stay quick.
  mainWindow.loadURL(liveUrl());
}

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:close', safeShutdown);
ipcMain.on('window:retry', () => {
  if (!mainWindow) return;
  mainWindow.loadURL(liveUrl());
});
ipcMain.on('theme:changed', (_event, theme) => {
  if (typeof theme === 'string') setWindowThemeIcon(theme);
});

app.whenReady().then(createWindow);
app.on('before-quit', event => {
  if (shuttingDown) return;
  event.preventDefault();
  safeShutdown();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !shuttingDown) safeShutdown();
});
app.on('activate', () => {
  if (!shuttingDown && BrowserWindow.getAllWindows().length === 0) createWindow();
});
