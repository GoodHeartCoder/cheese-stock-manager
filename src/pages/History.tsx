import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInventory } from '@/context/InventoryContext';
import { Calendar, ChevronLeft, ChevronRight, Package, Pencil, Trash2, X, Check } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProductionEntry } from '@/types/inventory';

export default function History() {
  const { productionHistory, updateProduction, deleteProduction } = useInventory();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProduction, setSelectedProduction] = useState<ProductionEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBags, setEditBags] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleStartEdit = () => {
    if (selectedProduction) {
      setEditBags(selectedProduction.bagsProduced.toString());
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBags('');
  };

  const handleSaveEdit = () => {
    if (selectedProduction && editBags) {
      const newBags = parseInt(editBags, 10);
      if (newBags > 0 && newBags !== selectedProduction.bagsProduced) {
        updateProduction(selectedProduction.id, newBags);
        // Update local state to reflect changes
        setSelectedProduction(prev => prev ? {
          ...prev,
          bagsProduced: newBags,
          ingredientsUsed: prev.ingredientsUsed.map(item => ({
            ...item,
            quantityUsed: item.quantityUsed * (newBags / prev.bagsProduced),
          })),
        } : null);
      }
      setIsEditing(false);
      setEditBags('');
    }
  };

  const handleDelete = () => {
    if (selectedProduction) {
      deleteProduction(selectedProduction.id);
      setSelectedProduction(null);
      setShowDeleteConfirm(false);
    }
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
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(day => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const bags = getBagsForDay(day);
              const entries = getEntriesForDay(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => entries.length > 0 && setSelectedProduction(entries[0])}
                  disabled={entries.length === 0}
                  className={`
                    aspect-square p-1 rounded-lg flex flex-col items-center justify-center text-sm transition-colors
                    ${!isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'}
                    ${isToday ? 'ring-2 ring-primary' : ''}
                    ${bags > 0 ? 'bg-accent/20 hover:bg-accent/30 cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className={isToday ? 'font-bold' : ''}>{format(day, 'd')}</span>
                  {bags > 0 && (
                    <span className="text-xs font-medium text-accent mt-0.5">
                      {bags}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-accent/20"></div>
            <span>Production day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded ring-2 ring-primary"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Production Detail Dialog */}
      <Dialog open={!!selectedProduction} onOpenChange={(open) => {
        if (!open) {
          setSelectedProduction(null);
          setIsEditing(false);
          setEditBags('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Production on {selectedProduction && format(new Date(selectedProduction.date), 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          {selectedProduction && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg">
                <Package className="w-8 h-8 text-accent" />
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={editBags}
                        onChange={(e) => setEditBags(e.target.value)}
                        className="w-24 text-lg font-bold"
                        autoFocus
                      />
                      <span className="text-foreground font-bold">bags</span>
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                        <Check className="w-4 h-4 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-foreground">
                        {selectedProduction.bagsProduced} bags
                      </p>
                      <p className="text-sm text-muted-foreground">produced</p>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={handleStartEdit}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Ingredients Used</h3>
                <div className="space-y-2">
                  {selectedProduction.ingredientsUsed.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-foreground">{item.ingredientName}</span>
                      <span className="text-muted-foreground">
                        {item.quantityUsed.toFixed(2)} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Production Entry</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this production record and restore the ingredients back to your warehouse stock. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
