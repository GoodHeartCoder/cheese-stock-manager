const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let Store;

// Initialize Store asynchronously since electron-store is ESM
async function initStore() {
    const { default: ElectronStore } = await import('electron-store');
    Store = new ElectronStore();
    Store.clear(); // Temporary wipe for fresh start
    console.log("Store initialized and CLEARED at:", Store.path);
}

console.log("Electron main process started!");

function createWindow() {
    console.log("Creating window...");
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../public/app-icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    const isDev = !app.isPackaged;

    if (isDev) {
        console.log("Loading URL: http://localhost:8080");
        win.loadURL('http://localhost:8080').catch(e => console.error("Failed to load URL:", e));
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// IPC Handlers for storage
ipcMain.handle('get-inventory', async () => {
    if (!Store) await initStore();
    return Store.get('inventory');
});

ipcMain.handle('save-inventory', async (event, data) => {
    if (!Store) await initStore();
    Store.set('inventory', data);
    return true;
});

ipcMain.handle('get-app-path', async (event, name) => {
    return app.getPath(name);
});

ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), options);
    return result;
});

ipcMain.handle('dialog:saveFile', async (event, options) => {
    const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), options);
    return result;
});

app.whenReady().then(async () => {
    await initStore();
    createWindow();

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
