import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInventory } from '@/context/InventoryContext';
import { cn } from '@/lib/utils';
import { format, startOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarIcon, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
    const { ingredients, productionHistory } = useInventory();
    const [date, setDate] = useState<Date | undefined>(startOfMonth(new Date()));

    const handleExport = () => {
        if (!date) {
            toast.error("Please select a start date");
            return;
        }

        const doc = new jsPDF();
        const title = `Cheese Production Report`;
        const subtitle = `From ${format(date, 'MMM d, yyyy')} to ${format(new Date(), 'MMM d, yyyy')}`;

        // Title
        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.text(subtitle, 14, 30);

        // --- Current Inventory Section ---
        doc.setFontSize(14);
        doc.text("Current Warehouse Inventory", 14, 45);

        const inventoryData = ingredients.map(ing => [
            ing.name,
            `${ing.quantity} ${ing.unit}`
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Ingredient', 'Quantity Available']],
            body: inventoryData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // --- Production History Section ---
        // Filter history
        const filteredHistory = productionHistory.filter(entry =>
            new Date(entry.date) >= date
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const finalY = (doc as any).lastAutoTable.finalY || 50;
        doc.setFontSize(14);
        doc.text("Production History", 14, finalY + 15);

        const historyData = filteredHistory.map(entry => {
            const ingredientsList = entry.ingredientsUsed.map(i =>
                `${i.ingredientName}: ${i.quantityUsed.toFixed(1)}${i.unit}`
            ).join(', ');

            return [
                format(new Date(entry.date), 'yyyy-MM-dd'),
                entry.formulaName,
                entry.bagsProduced.toString(),
                ingredientsList
            ];
        });

        if (historyData.length === 0) {
            doc.setFontSize(10);
            doc.text("No production records found for this period.", 14, finalY + 25);
        } else {
            autoTable(doc, {
                startY: finalY + 20,
                head: [['Date', 'Formula', 'Bags', 'Ingredients Used']],
                body: historyData,
                theme: 'grid',
                headStyles: { fillColor: [39, 174, 96] },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 'auto' }
                }
            });
        }

        doc.save(`cheese-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        toast.success("Report downloaded successfully");
    };

    const filteredCount = productionHistory.filter(entry =>
        date && new Date(entry.date) >= date
    ).length;

    return (
        <Layout>
            <PageHeader
                title="Reports"
                description="Export data and view usage statistics"
            />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Export Card */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">PDF Export</h3>
                            <p className="text-sm text-muted-foreground">Generate production summary</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="p-4 bg-accent/10 rounded-lg text-sm">
                            <p>Current Inventory: <strong>{ingredients.length} items</strong></p>
                            <p>Production Entries: <strong>{filteredCount} records</strong></p>
                        </div>

                        <Button className="w-full" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF Report
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
