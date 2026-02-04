import { app, BrowserWindow, shell, Menu, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { initAutoUpdater } from './updater.js';

const store = new Store();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  const ses = session.defaultSession;
  
  // Permissões necessárias
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'clipboard-write', 'notifications'];
    callback(allowedPermissions.includes(permission));
  });

  // Restaura posição da janela
  const bounds = store.get('windowBounds', { 
    width: 1600, 
    height: 1000,
    x: undefined,
    y: undefined
  });

  mainWindow = new BrowserWindow({
    ...bounds,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:qase'
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'Qase',
    backgroundColor: '#ffffff',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });

  // Navegação segura
  const ALLOWED_DOMAINS = ['qase.io', 'app.qase.io'];
  
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const urlObj = new URL(url);
    const isAllowed = ALLOWED_DOMAINS.some(
      domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    if (!isAllowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL('https://app.qase.io');

  setupMenu();
}

function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { 
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools()
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();

  // auto-update só em produção
  if (!process.env.ELECTRON_IS_DEV) {
    initAutoUpdater()
  }

  mainWindow.webContents.on('did-finish-load', () => {  
  
    app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  });

app.on('before-quit', () => {
  if (mainWindow) {
    store.set('windowBounds', mainWindow.getBounds());
  }
  });
});