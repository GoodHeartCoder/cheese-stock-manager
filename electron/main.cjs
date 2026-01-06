const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log("Electron main process started!");

function createWindow() {
    console.log("Creating window...");
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
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

app.whenReady().then(() => {
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
