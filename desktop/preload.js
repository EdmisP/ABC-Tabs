'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harakkaDesktop', {
  retry: () => ipcRenderer.send('window:retry')
});

// Set the permanent desktop mode before the page's own scripts initialise.
try {
  localStorage.setItem('finlandArchiveLegacy', '1');
  localStorage.setItem('finlandArchiveDark', '0');
  if (localStorage.getItem('finlandArchiveTheme') === 'bw') {
    localStorage.setItem('finlandArchiveTheme', 'finland');
  }
} catch (_) {}

const DESKTOP_STYLE = `
html[data-legacy="true"] body{
  margin:0!important;
  padding:0!important;
  background:#c0c0c0!important;
  min-height:100vh!important;
  overflow-x:hidden!important;
}
html[data-legacy="true"] .container{
  width:100%!important;
  max-width:none!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  box-shadow:none!important;
  box-sizing:border-box!important;
}
html[data-legacy="true"] .theme-footer{
  width:100%!important;
  max-width:none!important;
  margin:0!important;
  box-sizing:border-box!important;
}
html[data-legacy="true"] .titlebar{
  -webkit-app-region:drag!important;
  position:sticky!important;
  top:0!important;
  z-index:2147483000!important;
  padding-right:58px!important;
  user-select:none!important;
  margin:0!important;
}
html[data-legacy="true"] .titlebar::after{content:none!important;display:none!important}
html[data-legacy="true"] .titlebar button,
html[data-legacy="true"] .titlebar a,
html[data-legacy="true"] .titlebar input,
html[data-legacy="true"] .titlebar select,
html[data-legacy="true"] .desktop-window-buttons,
html[data-legacy="true"] .desktop-window-buttons *{
  -webkit-app-region:no-drag!important;
}
html[data-legacy="true"] .theme-word-button{display:none!important}
.desktop-window-buttons{
  position:absolute!important;
  right:3px!important;
  top:3px!important;
  height:22px!important;
  display:flex!important;
  gap:2px!important;
  z-index:2147483647!important;
}
html[data-legacy="true"] .desktop-window-button{
  width:23px!important;
  min-width:23px!important;
  height:20px!important;
  min-height:20px!important;
  margin:0!important;
  padding:0!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  border:2px outset #fff!important;
  border-radius:0!important;
  background:#c0c0c0!important;
  color:#000!important;
  font:700 12px/14px "MS Sans Serif",Tahoma,Arial,sans-serif!important;
  line-height:14px!important;
}
html[data-legacy="true"] .desktop-window-button:active{border-style:inset!important}
html[data-legacy="true"] .desktop-window-close{font-size:14px!important}
`;

function forceLegacy() {
  const root = document.documentElement;
  if (!root) return;

  if (root.dataset.legacy !== 'true') root.dataset.legacy = 'true';
  if (root.dataset.dark !== 'false') root.dataset.dark = 'false';
  if (root.dataset.theme === 'bw') root.dataset.theme = root.dataset.country || 'finland';

  try {
    if (localStorage.getItem('finlandArchiveLegacy') !== '1') localStorage.setItem('finlandArchiveLegacy', '1');
    if (localStorage.getItem('finlandArchiveDark') !== '0') localStorage.setItem('finlandArchiveDark', '0');
    if (localStorage.getItem('finlandArchiveTheme') === 'bw') {
      localStorage.setItem('finlandArchiveTheme', root.dataset.country || 'finland');
    }
  } catch (_) {}
}

let lastTheme = '';
function sendCurrentTheme() {
  const root = document.documentElement;
  if (!root) return;
  const country = root.dataset.country || root.dataset.theme || 'finland';
  if (country === lastTheme) return;
  lastTheme = country;
  ipcRenderer.send('theme:changed', country);
}

function installDesktopChrome() {
  forceLegacy();

  if (!document.getElementById('harakka-desktop-style')) {
    const style = document.createElement('style');
    style.id = 'harakka-desktop-style';
    style.textContent = DESKTOP_STYLE;
    document.head.appendChild(style);
  }

  const titlebar = document.querySelector('.titlebar');
  if (titlebar && !titlebar.querySelector('.desktop-window-buttons')) {
    const controls = document.createElement('div');
    controls.className = 'desktop-window-buttons';
    controls.innerHTML = `
      <button type="button" class="desktop-window-button" data-window-action="minimize" aria-label="Minimize">_</button>
      <button type="button" class="desktop-window-button desktop-window-close" data-window-action="close" aria-label="Close">×</button>`;
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-window-action]');
      if (!button) return;
      const action = button.dataset.windowAction;
      if (action === 'minimize') ipcRenderer.send('window:minimize');
      if (action === 'close') ipcRenderer.send('window:close');
    });
    titlebar.appendChild(controls);
  }

  document.querySelectorAll('[data-page-theme="legacy"],[data-page-theme="dark"],[data-page-theme="bw"]').forEach(button => {
    button.hidden = true;
    button.style.display = 'none';
  });

  sendCurrentTheme();
}

window.addEventListener('DOMContentLoaded', () => {
  installDesktopChrome();

  const root = document.documentElement;

  // Watch only the few state attributes that matter. The old build watched every
  // DOM mutation, including every note/tablature redraw, which made editing slow.
  new MutationObserver(mutations => {
    let needsLegacyRepair = false;
    let themeChanged = false;

    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-legacy' || mutation.attributeName === 'data-dark') {
        needsLegacyRepair = true;
      }
      if (mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-country') {
        themeChanged = true;
      }
    }

    if (needsLegacyRepair) forceLegacy();
    if (themeChanged) sendCurrentTheme();
  }).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-country', 'data-legacy', 'data-dark']
  });

  document.addEventListener('click', event => {
    const blocked = event.target.closest('[data-page-theme="legacy"],[data-page-theme="dark"],[data-page-theme="bw"]');
    if (blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      forceLegacy();
    }
  }, true);
});
