import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInventory } from '@/context/InventoryContext';
import { Calendar, ChevronLeft, ChevronRight, Package, Pencil, Trash2 } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ProductionEntry } from '@/types/inventory';

export default function History() {
  const { productionHistory, updateProduction, deleteProduction, ingredients } = useInventory();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // State for viewing a day's productions
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // State for editing a specific entry
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [newBagsCount, setNewBagsCount] = useState('');

  const productionByDate = useMemo(() => {
    const map = new Map<string, ProductionEntry[]>();
    productionHistory.forEach(entry => {
      const dateKey = format(new Date(entry.date), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, entry]);
    });
    return map;
  }, [productionHistory]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getBagsForDay = (date: Date): number => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const entries = productionByDate.get(dateKey) || [];
    return entries.reduce((sum, e) => sum + e.bagsProduced, 0);
  };

  const getEntriesForDay = (date: Date): ProductionEntry[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return productionByDate.get(dateKey) || [];
  };

  const activeDayEntries = selectedDay ? getEntriesForDay(selectedDay) : [];


  const handleUpdateProduction = () => {
    if (!editingEntry || !newBagsCount) return;

    const bags = parseInt(newBagsCount, 10);
    if (isNaN(bags) || bags <= 0) {
      toast.error('Please enter a valid positive number of bags');
      return;
    }

    // Client-side Stock Check to give friendly error
    // (Context also blocks it, but this gives the Toast)
    const oldBags = editingEntry.bagsProduced;
    if (bags > oldBags) {
      // Calculate needs
      for (const item of editingEntry.ingredientsUsed) {
        const perBag = item.quantityUsed / oldBags;
        const totalNew = perBag * bags;
        const neededDelta = totalNew - item.quantityUsed;

        // Find in stock
        const inStock = ingredients.find(i => i.id === item.ingredientId);
        if (!inStock || inStock.quantity < neededDelta) {
          toast.error(`Insufficient stock: Not enough ${item.ingredientName}. Need ${neededDelta.toFixed(1)}kg more.`);
          return;
        }
      }
    }

    updateProduction(editingEntry.id, { bagsProduced: bags });

    // Naive check if it actually updated? 
    // Since updateProduction is async/setState, we can't know immediately.
    // relying on the pre-check above is the best UX.

    toast.success('Production updated');
    setEditingEntry(null);
    setSelectedDay(null); // Close main dialog to refresh or simplify flow
  };

  if (productionHistory.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Production History"
          description="View your production records by date"
        />
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title="No production history"
          description="Record your first production to see it here"
          action={
            <Button asChild>
              <Link to="/production">Record Production</Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Production History"
        description="View your production records by date"
      />

      {/* Calendar Navigation */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-lg text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const bags = getBagsForDay(day);
              const hasEntries = bags > 0;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => hasEntries && setSelectedDay(day)}
                  disabled={!hasEntries}
                  className={`
                    aspect-square p-1 rounded-lg flex flex-col items-start justify-start text-left text-sm transition-colors overflow-hidden
                    ${!isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${hasEntries ? 'bg-accent/10 hover:bg-accent/20 cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className={`w-full text-center mb-1 ${isToday ? 'font-bold' : ''}`}>{format(day, 'd')}</span>
                  {hasEntries && (
                    <div className="w-full space-y-0.5">
                      {getEntriesForDay(day).map(entry => (
                        <div key={entry.id} className="text-[10px] leading-tight truncate w-full px-1">
                          <span className="font-semibold text-primary">{entry.bagsProduced}</span>
                          <span className="text-muted-foreground ml-1">{entry.formulaName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Production List Dialog (Day View) */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Production on {selectedDay && format(selectedDay, 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {activeDayEntries.map(entry => (
              <div key={entry.id} className="bg-secondary/20 rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{entry.formulaName || 'Unknown Formula'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), 'h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this production entry? Ingredients will be returned to stock.')) {
                        deleteProduction(entry.id);
                        toast.success('Production deleted');
                        // If it was the last entry for the day, close the dialog
                        if (activeDayEntries.length <= 1) {
                          setSelectedDay(null);
                        }
                      }
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingEntry(entry);
                      setNewBagsCount(entry.bagsProduced.toString());
                      setSelectedDay(null);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-accent/10 text-accent rounded-md px-3 py-1 font-bold text-lg">
                    {entry.bagsProduced} bags
                  </div>
                </div>

                <div className="pl-3 border-l-2 border-border space-y-1">
                  {entry.ingredientsUsed.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.ingredientName}</span>
                      <span className="text-muted-foreground">{item.quantityUsed.toFixed(1)} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Production Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Production: {editingEntry?.formulaName}</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Editing production from {format(new Date(editingEntry.date), 'MMMM d, h:mm a')}
              </p>
              <div className="space-y-2">
                <Label htmlFor="bags-edit">Total bags for this batch</Label>
                <Input
                  id="bags-edit"
                  type="number"
                  value={newBagsCount}
                  onChange={e => setNewBagsCount(e.target.value)}
                  min={0}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduction}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
