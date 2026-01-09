import { InventoryState } from '@/types/inventory';

// Since nodeIntegration is true, we can use node modules directly
// But we need to use 'window.require' or just assume they are available if bundled correctly.
// For Electron with nodeIntegration, require is usually on the window or global.
const fs = window.require('fs');
const path = window.require('path');
const { ipcRenderer } = window.require('electron');

const BACKUP_FOLDER_NAME = 'backups';
const STORAGE_KEY = 'cheese-inventory';
const LAST_BACKUP_KEY = 'cheese-last-backup-timestamp';

export interface BackupFile {
    name: string;
    path: string;
    timestamp: number;
    size: number;
    isAutomatic: boolean;
}

class BackupManager {
    private cachedBackupDir: string | null = null;

    private async getBackupPath(): Promise<string> {
        if (this.cachedBackupDir) return this.cachedBackupDir;

        const userDataPath = await ipcRenderer.invoke('get-app-path', 'userData');
        const backupDir = path.join(userDataPath, BACKUP_FOLDER_NAME);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        this.cachedBackupDir = backupDir;
        return backupDir;
    }

    public async saveBackup(isAutomatic: boolean = false): Promise<string> {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) throw new Error('No data found in localStorage to backup');

            const timestamp = Date.now();
            const dateStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-');
            const prefix = isAutomatic ? 'auto' : 'manual';
            const fileName = `${prefix}-backup-${dateStr}.json`;
            const backupDir = await this.getBackupPath();
            const filePath = path.join(backupDir, fileName);

            fs.writeFileSync(filePath, data, 'utf8');

            if (isAutomatic) {
                localStorage.setItem(LAST_BACKUP_KEY, timestamp.toString());
            }

            return filePath;
        } catch (error) {
            console.error('Failed to save backup:', error);
            throw error;
        }
    }

    public async listBackups(): Promise<BackupFile[]> {
        try {
            const backupDir = await this.getBackupPath();
            const files = fs.readdirSync(backupDir);

            return files
                .filter((f: string) => f.endsWith('.json'))
                .map((f: string) => {
                    const filePath = path.join(backupDir, f);
                    const stats = fs.statSync(filePath);
                    return {
                        name: f,
                        path: filePath,
                        timestamp: stats.mtimeMs,
                        size: stats.size,
                        isAutomatic: f.startsWith('auto')
                    };
                })
                .sort((a: BackupFile, b: BackupFile) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    public async restoreBackup(filePath: string): Promise<void> {
        try {
            // 1. Create a safety backup first
            await this.saveBackup(false);

            // 2. Read and restore
            const content = fs.readFileSync(filePath, 'utf8');
            localStorage.setItem(STORAGE_KEY, content);

            // 3. Inform the app (handled by reload usually)
            window.location.reload();
        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw error;
        }
    }

    public async deleteBackup(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Failed to delete backup:', error);
            throw error;
        }
    }

    public async checkAndTriggerAutoBackup(): Promise<void> {
        const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        if (!lastBackup || (now - parseInt(lastBackup)) > SEVEN_DAYS_MS) {
            console.log('Triggering automatic weekly backup...');
            await this.saveBackup(true);
        }
    }
}

export const backupManager = new BackupManager();
