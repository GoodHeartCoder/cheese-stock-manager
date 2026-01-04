import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { useInventory } from '@/context/InventoryContext';
import { Calendar, ChevronLeft, ChevronRight, Package } from 'lucide-react';
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
import { ProductionEntry } from '@/types/inventory';

export default function History() {
  const { productionHistory } = useInventory();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProduction, setSelectedProduction] = useState<ProductionEntry | null>(null);

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
      <Dialog open={!!selectedProduction} onOpenChange={() => setSelectedProduction(null)}>
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
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedProduction.bagsProduced} bags
                  </p>
                  <p className="text-sm text-muted-foreground">produced</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-2">Ingredients Used</h3>
                <div className="space-y-2">
                  {selectedProduction.ingredientsUsed.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-foreground">{item.ingredientName}</span>
                      <span className="text-muted-foreground">
                        {item.quantityUsed} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
