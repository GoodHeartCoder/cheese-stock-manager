import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Flame, FlaskConical } from 'lucide-react';
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
    const { formulas, bags, cookBags } = useInventory();

    const [selectedFormula, setSelectedFormula] = useState<{ id: string, name: string } | null>(null);
    const [isCooking, setIsCooking] = useState(false);
    const [inputValue, setInputValue] = useState('');

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
