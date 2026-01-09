const { ipcRenderer } = require('electron');

// Since contextIsolation is false, we attach directly to window
window.electronAPI = {
    getInventory: () => ipcRenderer.invoke('get-inventory'),
    saveInventory: (data) => ipcRenderer.invoke('save-inventory', data)
};

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})
