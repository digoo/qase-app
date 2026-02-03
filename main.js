import { app, BrowserWindow, shell, Menu, session, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const store = new Store();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Handler: Lista todos os items do 1Password
ipcMain.handle('1password:search', async (event, query) => {
  try {
    const { stdout } = await execAsync(`op item list --format=json`);
    const items = JSON.parse(stdout);
    
    // Filtra por query se fornecida
    if (query) {
      const lowerQuery = query.toLowerCase();
      return items.filter(item => 
        item.title?.toLowerCase().includes(lowerQuery) ||
        item.urls?.some(url => url.href?.toLowerCase().includes(lowerQuery))
      );
    }
    
    return items;
  } catch (error) {
    console.error('[1Password] Search error:', error.message);
    return [];
  }
});

// Handler: Busca credenciais de um item específico
ipcMain.handle('1password:get-credentials', async (event, itemId) => {
  try {
    const { stdout } = await execAsync(`op item get "${itemId}" --format=json`);
    const item = JSON.parse(stdout);
    
    // Extrai username e password dos fields
    const username = item.fields?.find(f => 
      f.id === 'username' || f.label?.toLowerCase() === 'username'
    )?.value;
    
    const password = item.fields?.find(f => 
      f.id === 'password' || f.label?.toLowerCase() === 'password'
    )?.value;
    
    return { username, password, title: item.title };
  } catch (error) {
    console.error('[1Password] Get credentials error:', error.message);
    return null;
  }
});

// Handler: Busca item por URL (mais inteligente)
ipcMain.handle('1password:get-by-url', async (event, url) => {
  try {
    // Extrai domínio da URL
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Busca items que matcham o domínio
    const { stdout } = await execAsync(`op item list --format=json`);
    const items = JSON.parse(stdout);
    
    const match = items.find(item => 
      item.urls?.some(u => u.href?.includes(domain))
    );
    
    if (!match) return null;
    
    // Pega credenciais do item encontrado
    return await ipcMain.callHandler('1password:get-credentials', null, match.id);
  } catch (error) {
    console.error('[1Password] Get by URL error:', error.message);
    return null;
  }
});

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
      sandbox: true,
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

  mainWindow.webContents.on('did-finish-load', () => {
  console.log('[Main] Page loaded');
  
  
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

mainWindow.webContents.on('did-finish-load', () => {
  console.log('[Main] Page loaded, injecting UI code...');
  
  // INJETA TODO O CÓDIGO DA UI como string
  mainWindow.webContents.executeJavaScript(`
    (function() {
      console.log('[Inject] Starting UI injection...');
      console.log('[Inject] window.onePassword available:', typeof window.onePassword);
      
      // Função de preenchimento (agora DENTRO da página)
      async function fillCredentials(usernameField, passwordField, button) {
  console.log('[1Password] Filling credentials...');
  
  button.disabled = true;
  button.innerHTML = '⏳ Fetching...';
  
  try {
    const currentUrl = window.location.href;
    console.log('[1Password] Current URL:', currentUrl);
    
    let creds = await window.onePassword.getByUrl(currentUrl);
    
    if (!creds) {
      console.log('[1Password] Searching for "qase"...');
      const items = await window.onePassword.search('qase');
      console.log('[1Password] Found items:', items.length);
      
      if (items.length === 0) {
        alert('No credentials found for Qase.\\n\\nMake sure you have saved your Qase credentials in 1Password.');
        return;
      }
      
      if (items.length === 1) {
        console.log('[1Password] Using:', items[0].title);
        creds = await window.onePassword.getCredentials(items[0].id);
      } else {
        const itemList = items.map((item, i) => \`\${i + 1}. \${item.title}\`).join('\\n');
        const selected = prompt(
          \`Found \${items.length} credentials:\\n\\n\${itemList}\\n\\nEnter number (1-\${items.length}):\`
        );
        
        const index = parseInt(selected) - 1;
        if (index >= 0 && index < items.length) {
          console.log('[1Password] Selected:', items[index].title);
          creds = await window.onePassword.getCredentials(items[index].id);
        } else {
          console.log('[1Password] Invalid selection');
          return;
        }
      }
    }
    
    if (creds && creds.username && creds.password) {
      console.log('[1Password] Filling for:', creds.title);
      
      // NOVA FUNÇÃO: Trigger React's internal state
      function setReactValue(element, value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        ).set;
        
        nativeInputValueSetter.call(element, value);
        
        // Dispara múltiplos eventos pra garantir
        const events = [
          new Event('input', { bubbles: true, cancelable: true }),
          new Event('change', { bubbles: true, cancelable: true }),
          new Event('blur', { bubbles: true, cancelable: true }),
          new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' })
        ];
        
        events.forEach(event => element.dispatchEvent(event));
      }
      
      // Preenche usando setter nativo
      setReactValue(usernameField, creds.username);
      setReactValue(passwordField, creds.password);
      
      // Força focus/blur final
      passwordField.focus();
      passwordField.blur();
      
      button.innerHTML = '✅ Filled!';
      button.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      setTimeout(() => {
        button.innerHTML = '🔑 Fill from 1Password';
        button.style.background = 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)';
      }, 2000);
    } else {
      console.error('[1Password] Invalid credentials');
      alert('Could not retrieve valid credentials from 1Password');
    }
  } catch (error) {
    console.error('[1Password] Error:', error);
    alert(\`Error: \${error.message}\\n\\nMake sure 1Password CLI is signed in:\\neval $(op signin)\`);
  } finally {
    button.disabled = false;
    if (button.innerHTML.includes('Fetching')) {
      button.innerHTML = '🔑 Fill from 1Password';
    }
  }
}
      
      // Função de injeção do botão
      function injectUI() {
        if (document.getElementById('qase-1password-btn')) {
          console.log('[1Password] Button already exists');
          return;
        }
        
        const usernameField = document.querySelector(
          'input[type="email"], input[name="username"], input[name="email"], input[autocomplete="username"], input[placeholder*="email" i]'
        );
        const passwordField = document.querySelector('input[type="password"]');
        
        if (usernameField && passwordField) {
          console.log('[1Password] Login form found!');
          
          const button = document.createElement('button');
          button.id = 'qase-1password-btn';
          button.innerHTML = '🔑 Fill from 1Password';
          button.type = 'button';
          button.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            padding: 12px 20px;
            background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
            transition: all 0.2s ease;
          \`;
          
          button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 6px 16px rgba(0, 102, 204, 0.4)';
          };
          
          button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.3)';
          };
          
          button.addEventListener('click', () => {
            console.log('[1Password] Button clicked');
            fillCredentials(usernameField, passwordField, button);
          });
          
          document.body.appendChild(button);
          console.log('[1Password] Button injected successfully');
          return true;
        }
        
        return false;
      }
      
      // Tenta injetar agora
      if (!injectUI()) {
        console.log('[1Password] Form not found yet, retrying...');
        
        // Retry mechanism
        let attempts = 0;
        const maxAttempts = 10;
        const retryInterval = setInterval(() => {
          attempts++;
          console.log(\`[1Password] Retry attempt \${attempts}/\${maxAttempts}\`);
          
          if (injectUI() || attempts >= maxAttempts) {
            clearInterval(retryInterval);
            if (attempts >= maxAttempts) {
              console.log('[1Password] Max attempts reached, giving up');
            }
          }
        }, 1000);
      }
      
      // Observer pra SPAs
      const observer = new MutationObserver(() => {
        if (!document.getElementById('qase-1password-btn')) {
          injectUI();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('[Inject] UI injection complete');
    })();
  `).then(() => {
    console.log('[Main] UI code injected successfully');
  }).catch(err => {
    console.error('[Main] Failed to inject UI code:', err);
  });
});
});