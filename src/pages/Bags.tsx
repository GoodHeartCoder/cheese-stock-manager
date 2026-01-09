import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Flame, FlaskConical, History, Edit2, Trash2, Save, X } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useInventory } from '@/context/InventoryContext';
import { toast } from 'sonner';

export default function Bags() {
    const { formulas, bags, cookingHistory, cookBags, updateCookingEntry, deleteCookingEntry } = useInventory();

    const [selectedFormula, setSelectedFormula] = useState<{ id: string, name: string } | null>(null);
    const [isCooking, setIsCooking] = useState(false);
    const [inputValue, setInputValue] = useState('');

    // State for editing history
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleCook = (formula: { id: string, name: string }) => {
        setIsCooking(true);
        setSelectedFormula(formula);
        setInputValue('');
    };

    const handleConfirm = () => {
        if (!selectedFormula || !isCooking) return;

        const value = parseInt(inputValue);
        if (isNaN(value) || value <= 0) {
            toast.error('Please enter a valid positive number');
            return;
        }

        const currentQty = bags.find(b => b.formulaId === selectedFormula.id)?.quantity || 0;
        if (value > currentQty) {
            toast.error('Cannot cook more bags than available');
            return;
        }
        cookBags(selectedFormula.id, value);
        toast.success(`Cooked ${value} bags of ${selectedFormula.name}`);

        setInputValue('');
        setIsCooking(false);
        setSelectedFormula(null);
    };

    const handleStartEdit = (entry: { id: string, quantityCooked: number }) => {
        setEditingId(entry.id);
        setEditValue(entry.quantityCooked.toString());
    };

    const handleSaveEdit = (id: string) => {
        const value = parseInt(editValue);
        if (isNaN(value) || value <= 0) {
            toast.error('Please enter a valid positive number');
            return;
        }
        updateCookingEntry(id, value);
        setEditingId(null);
        toast.success('Cooking entry updated');
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this cooking record? This will return the bags to your inventory.')) {
            deleteCookingEntry(id);
            toast.success('Cooking record deleted');
        }
    };

    if (formulas.length === 0) {
        return (
            <Layout>
                <PageHeader
                    title="Bags Manager"
                    description="Track and manage your produced cheese bags"
                />
                <EmptyState
                    icon={<FlaskConical className="w-6 h-6" />}
                    title="No formulas defined"
                    description="Create formulas to start tracking bags"
                    action={
                        <Button asChild>
                            <a href="#/formula">Go to Formulas</a>
                        </Button>
                    }
                />
            </Layout>
        );
    }

    return (
        <Layout>
            <PageHeader
                title="Bags Manager"
                description="Track and manage your produced cheese bags"
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {formulas.map(formula => {
                    const bagData = bags.find(b => b.formulaId === formula.id);
                    const quantity = bagData?.quantity || 0;

                    return (
                        <Card key={formula.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xl font-bold">
                                    {formula.name}
                                </CardTitle>
                                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold mb-6">{quantity} <span className="text-base font-normal text-muted-foreground">bags</span></div>

                                <div className="grid grid-cols-1 gap-3">
                                    <Button
                                        className="w-full gap-2"
                                        variant="destructive" // Using destructive/warm color for cooking/consuming
                                        onClick={() => handleCook(formula)}
                                        disabled={quantity === 0}
                                    >
                                        <Flame className="w-4 h-4" />
                                        Cook
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {cookingHistory.length > 0 && (
                <div className="mt-12 space-y-4">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">Recent Cooking History</h2>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Formula</TableHead>
                                    <TableHead>Quantity Cooked</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cookingHistory.slice(0, 10).map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-muted-foreground">
                                            {format(new Date(entry.date), 'MMM d, HH:mm')}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {entry.formulaName}
                                        </TableCell>
                                        <TableCell>
                                            {editingId === entry.id ? (
                                                <div className="flex items-center gap-2 max-w-[120px]">
                                                    <Input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="h-8"
                                                    />
                                                    <span className="text-sm text-muted-foreground">bags</span>
                                                </div>
                                            ) : (
                                                <span>{entry.quantityCooked} bags</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {editingId === entry.id ? (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-green-600"
                                                            onClick={() => handleSaveEdit(entry.id)}
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            onClick={() => handleStartEdit(entry)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => handleDelete(entry.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            <Dialog open={isCooking} onOpenChange={(open) => !open && setIsCooking(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Cook Bags - {selectedFormula?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Enter the number of bags you want to cook. This will subtract from the total.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="qty">
                                Quantity to Cook
                            </Label>
                            <Input
                                id="qty"
                                type="number"
                                min="1"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Enter quantity"
                                autoFocus
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCooking(false)}>Cancel</Button>
                        <Button onClick={handleConfirm} variant="destructive">
                            Confirm Cook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
