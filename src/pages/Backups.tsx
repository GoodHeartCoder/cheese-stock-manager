import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Download, History, RefreshCcw, Trash2, ShieldAlert } from 'lucide-react';
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

export default function Backups() {
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

    const handleCreateBackup = async () => {
        try {
            await backupManager.saveBackup(false);
            toast.success('Backup created successfully');
            loadBackups();
        } catch (error) {
            toast.error('Failed to create backup');
        }
    };

    const handleRestore = async (path: string) => {
        try {
            toast.info('Restoring backup... The app will reload.', { duration: 3000 });
            await backupManager.restoreBackup(path);
        } catch (error) {
            toast.error('Restore failed');
        }
    };

    const handleDelete = async (path: string) => {
        try {
            await backupManager.deleteBackup(path);
            toast.success('Backup deleted');
            loadBackups();
        } catch (error) {
            toast.error('Failed to delete backup');
        }
    };

    const formatSize = (bytes: number) => {
        const kb = bytes / 1024;
        return `${kb.toFixed(2)} KB`;
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Backups"
                description="Manage your data backups and restore history."
                action={
                    <Button onClick={handleCreateBackup} className="gap-2">
                        <Database className="w-4 h-4" />
                        Create Manual Backup
                    </Button>
                }
            />

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" />
                            Backup History
                        </CardTitle>
                        <CardDescription>
                            Automatic backups are performed every 7 days. Manual backups can be created at any time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <RefreshCcw className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No backups found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-muted-foreground font-medium">
                                            <th className="text-left py-3 px-4">Name</th>
                                            <th className="text-left py-3 px-4">Type</th>
                                            <th className="text-left py-3 px-4">Date</th>
                                            <th className="text-left py-3 px-4">Size</th>
                                            <th className="text-right py-3 px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.map((backup) => (
                                            <tr key={backup.path} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="py-4 px-4 font-medium">{backup.name}</td>
                                                <td className="py-4 px-4">
                                                    {backup.isAutomatic ? (
                                                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                                            Automatic
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                                                            Manual
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-muted-foreground">
                                                    {format(backup.timestamp, 'Pp')}
                                                </td>
                                                <td className="py-4 px-4 text-muted-foreground">{formatSize(backup.size)}</td>
                                                <td className="py-4 px-4 text-right space-x-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:bg-primary/5">
                                                                <Download className="w-3 h-3" />
                                                                Restore
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-2">
                                                                    <ShieldAlert className="w-5 h-5 text-destructive" />
                                                                    Restore Data Backup?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will overwrite your current inventory, formulas, and history with the data from this backup.
                                                                    A safety backup of your current state will be created before the restore.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRestore(backup.path)} className="bg-primary">
                                                                    Restore and Restart
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(backup.path)}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
        </div>
    );
}
