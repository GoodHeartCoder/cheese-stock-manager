import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Database,
    Download,
    Upload,
    History,
    RefreshCcw,
    Trash2,
    ShieldAlert,
    Save,
    FileJson
} from 'lucide-react';
import { backupManager, BackupFile } from '@/lib/backupManager';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Reports() {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadBackups = async () => {
        setIsLoading(true);
        try {
            const list = await backupManager.listBackups();
            setBackups(list);
        } catch (error) {
            toast.error('Failed to load backups');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    const handleExport = async () => {
        try {
            const success = await backupManager.exportData();
            if (success) {
                toast.success('Data exported successfully');
            }
        } catch (error) {
            toast.error('Failed to export data');
        }
    };

    const handleImport = async () => {
        try {
            const success = await backupManager.importData();
            if (success) {
                toast.success('Data imported! The app will reload.');
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            toast.error('Import failed - please ensure it is a valid format');
        }
    };

    const handleCreateInternalBackup = async () => {
        try {
            await backupManager.saveBackup(false);
            toast.success('Internal backup created');
            loadBackups();
        } catch (error) {
            toast.error('Internal backup failed');
        }
    };

    const handleRestore = async (path: string) => {
        try {
            toast.info('Restoring... App will reload.');
            await backupManager.restoreBackup(path);
        } catch (error) {
            toast.error('Restore failed');
        }
    };

    const handleDeleteBackup = async (path: string) => {
        try {
            await backupManager.deleteBackup(path);
            toast.success('Backup removed');
            loadBackups();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const formatSize = (bytes: number) => {
        const kb = bytes / 1024;
        return `${kb.toFixed(1)} KB`;
    };

    return (
        <Layout>
            <PageHeader
                title="Data Manager"
                description="Export, import, and backup your cheese stock data."
            />

            <div className="grid gap-6 md:grid-cols-2">
                {/* External Card */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Save className="w-5 h-5 text-primary" />
                            External Portability
                        </CardTitle>
                        <CardDescription>
                            Save your data to a JSON file to keep it outside the app or move to another Mac.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button onClick={handleExport} className="gap-2 h-20 text-lg flex flex-col py-2">
                            <Download className="w-6 h-6" />
                            Export Data
                        </Button>
                        <Button onClick={handleImport} variant="outline" className="gap-2 h-20 text-lg flex flex-col py-2 border-primary/30">
                            <Upload className="w-6 h-6" />
                            Import Data
                        </Button>
                    </CardContent>
                </Card>

                {/* Internal Backup Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            Internal Safety Backups
                        </CardTitle>
                        <CardDescription>
                            Create a quick safety point before making big changes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleCreateInternalBackup} variant="secondary" className="w-full gap-2">
                            <Database className="w-4 h-4" />
                            Create Internal Backup
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* History Table */}
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Backup History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileJson className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No internal backups yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-muted-foreground font-medium">
                                            <th className="text-left py-3 px-4">Type</th>
                                            <th className="text-left py-3 px-4">Date & Time</th>
                                            <th className="text-left py-3 px-4">Size</th>
                                            <th className="text-right py-3 px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.map((backup) => (
                                            <tr key={backup.path} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="py-4 px-4">
                                                    {backup.isAutomatic ? (
                                                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Auto</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">Manual</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 font-medium">
                                                    {format(backup.timestamp, 'MMM d, HH:mm')}
                                                </td>
                                                <td className="py-4 px-4 text-muted-foreground">{formatSize(backup.size)}</td>
                                                <td className="py-4 px-4 text-right space-x-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                                Restore
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-2">
                                                                    <ShieldAlert className="w-5 h-5 text-destructive" />
                                                                    Restore Backup?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will replace all your current data. We will save a safety copy of your current state first.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRestore(backup.path)}>
                                                                    Confirm and Reload
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive h-8 w-8"
                                                        onClick={() => handleDeleteBackup(backup.path)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
