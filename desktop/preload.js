'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('harakkaDesktop', {
  retry: () => ipcRenderer.send('window:retry')
});

const DESKTOP_STYLE = `
html[data-legacy="true"] body{
  margin:0!important;
  padding:0!important;
  background:#c0c0c0!important;
  min-height:100vh!important;
}
html[data-legacy="true"] .container{
  width:100%!important;
  max-width:none!important;
  margin:0!important;
  padding:3px!important;
  border:0!important;
  box-sizing:border-box!important;
}
html[data-legacy="true"] .theme-footer{
  width:100%!important;
  max-width:none!important;
  margin:0!important;
  border:0!important;
  border-top:2px inset #fff!important;
  box-sizing:border-box!important;
}
html[data-legacy="true"] .titlebar{
  -webkit-app-region:drag!important;
  position:sticky!important;
  top:0!important;
  z-index:2147483000!important;
  padding-right:84px!important;
  user-select:none!important;
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
#desktop-app-frame{
  position:fixed;
  inset:0;
  z-index:2147483646;
  pointer-events:none;
  box-sizing:border-box;
  border-top:2px solid #fff;
  border-left:2px solid #fff;
  border-right:2px solid #404040;
  border-bottom:2px solid #404040;
  box-shadow:inset -1px -1px #808080,inset 1px 1px #dfdfdf;
}
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
  root.dataset.legacy = 'true';
  root.dataset.dark = 'false';
  if (root.dataset.theme === 'bw') root.dataset.theme = root.dataset.country || 'finland';
  try {
    localStorage.setItem('finlandArchiveLegacy', '1');
    localStorage.setItem('finlandArchiveDark', '0');
    if (localStorage.getItem('finlandArchiveTheme') === 'bw') {
      localStorage.setItem('finlandArchiveTheme', root.dataset.country || 'finland');
    }
  } catch (_) {}
}

function sendCurrentTheme() {
  const root = document.documentElement;
  const country = root.dataset.country || root.dataset.theme || 'finland';
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

  if (!document.getElementById('desktop-app-frame')) {
    const frame = document.createElement('div');
    frame.id = 'desktop-app-frame';
    frame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(frame);
  }

  const titlebar = document.querySelector('.titlebar');
  if (titlebar && !titlebar.querySelector('.desktop-window-buttons')) {
    const controls = document.createElement('div');
    controls.className = 'desktop-window-buttons';
    controls.innerHTML = `
      <button type="button" class="desktop-window-button" data-window-action="minimize" aria-label="Minimize">_</button>
      <button type="button" class="desktop-window-button" data-window-action="maximize" aria-label="Maximize">□</button>
      <button type="button" class="desktop-window-button desktop-window-close" data-window-action="close" aria-label="Close">×</button>`;
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-window-action]');
      if (!button) return;
      const action = button.dataset.windowAction;
      if (action === 'minimize') ipcRenderer.send('window:minimize');
      if (action === 'maximize') ipcRenderer.send('window:toggle-maximize');
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
  new MutationObserver(() => {
    forceLegacy();
    sendCurrentTheme();
  }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-country', 'data-legacy', 'data-dark'] });

  new MutationObserver(() => installDesktopChrome()).observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', event => {
    const blocked = event.target.closest('[data-page-theme="legacy"],[data-page-theme="dark"],[data-page-theme="bw"]');
    if (blocked) {
      event.preventDefault();
      event.stopImmediatePropagation();
      forceLegacy();
    }
  }, true);
});
