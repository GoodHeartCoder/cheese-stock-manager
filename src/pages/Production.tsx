import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInventory } from '@/context/InventoryContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, FlaskConical, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function Production() {
  const navigate = useNavigate();
  const { ingredients, formulas, addProduction, getIngredientById } = useInventory();

  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  const [bags, setBags] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  // Auto-select if only one formula exists
  useEffect(() => {
    if (formulas.length === 1 && !selectedFormulaId) {
      setSelectedFormulaId(formulas[0].id);
    }
  }, [formulas, selectedFormulaId]);

  const activeFormula = selectedFormulaId ? formulas.find(f => f.id === selectedFormulaId) : null;
  const bagsNumber = parseInt(bags) || 0;

  const calculatedUsage = useMemo(() => {
    if (!activeFormula) return [];

    return activeFormula.items.map(item => {
      const ingredient = getIngredientById(item.ingredientId);
      const needed = item.quantityPerBag * bagsNumber;
      const available = ingredient?.quantity || 0;
      const hasEnough = available >= needed;

      return {
        ingredientId: item.ingredientId,
        ingredientName: ingredient?.name || 'Unknown',
        unit: 'kg',
        quantityPerBag: item.quantityPerBag,
        quantityNeeded: needed,
        available,
        hasEnough,
      };
    });
  }, [activeFormula, bagsNumber, getIngredientById]);

  const canProduce = activeFormula && calculatedUsage.length > 0 && calculatedUsage.every(u => u.hasEnough) && bagsNumber > 0;

  const handleConfirmProduction = () => {
    if (!canProduce || !activeFormula) {
      toast.error('Cannot produce: insufficient ingredients or invalid formula');
      return;
    }

    addProduction({
      date: date.toISOString(),
      bagsProduced: bagsNumber,
      formulaId: activeFormula.id,
      formulaName: activeFormula.name,
      ingredientsUsed: calculatedUsage.map(u => ({
        ingredientId: u.ingredientId,
        ingredientName: u.ingredientName,
        quantityUsed: u.quantityNeeded,
        unit: 'kg',
      })),
    });

    toast.success(`Produced ${bagsNumber} bags of ${activeFormula.name}!`);
    navigate('/history');
  };

  if (formulas.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Production"
          description="Record new production and deduct from inventory"
        />
        <EmptyState
          icon={<FlaskConical className="w-6 h-6" />}
          title="No formula defined"
          description="Define at least one cheese formula to start production"
          action={
            <Button asChild>
              <Link to="/formula">Go to Formulas</Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  if (ingredients.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Production"
          description="Record new production and deduct from inventory"
        />
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No ingredients in warehouse"
          description="Add ingredients to your warehouse first"
          action={
            <Button asChild>
              <Link to="/warehouse">Go to Warehouse</Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Production"
        description="Record new production and deduct from inventory"
      />

      <div className="max-w-2xl">
        {/* Input Section */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
          <div className="space-y-8">

            {/* Formula Select */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-primary">1. Choose Cheese Type</Label>
              <Select value={selectedFormulaId} onValueChange={setSelectedFormulaId}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Choose a cheese type" />
                </SelectTrigger>
                <SelectContent>
                  {formulas.map(f => (
                    <SelectItem key={f.id} value={f.id} className="text-base">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/50">
              {/* Quantity Input */}
              <div className="space-y-3">
                <Label htmlFor="bags" className="text-base font-semibold text-primary">
                  2. Quantity
                </Label>
                <div className="relative">
                  <Input
                    id="bags"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={bags}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '' || parseInt(val) > 0) {
                        setBags(val);
                        setShowPreview(true);
                      }
                    }}
                    disabled={!selectedFormulaId}
                    className="text-lg h-12 pr-16 font-medium"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-secondary rounded text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Bags
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold text-primary flex items-center gap-2">
                  3. Production Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-medium h-12 transition-all border-2",
                        !date && "text-muted-foreground",
                        date && "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 opacity-70" />
                      {date ? format(date, "PPP") : <span className="text-muted-foreground">Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && bagsNumber > 0 && activeFormula && (
          <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h2 className="font-semibold text-foreground">
                Ingredients needed for {bagsNumber} bags of {activeFormula.name}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {calculatedUsage.map(item => (
                <div key={item.ingredientId} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {item.hasEnough ? (
                      <CheckCircle className="w-5 h-5 text-accent" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{item.ingredientName}</p>
                      <p className="text-sm text-muted-foreground">
                        Available: {item.available} kg
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${item.hasEnough ? 'text-foreground' : 'text-destructive'}`}>
                      {item.quantityNeeded} kg
                    </p>
                    {!item.hasEnough && (
                      <p className="text-sm text-destructive">
                        Need {(item.quantityNeeded - item.available).toFixed(2)} more
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        {bagsNumber > 0 && selectedFormulaId && (
          <Button
            size="lg"
            className="w-full"
            onClick={handleConfirmProduction}
            disabled={!canProduce}
          >
            {canProduce ? `Confirm Production` : 'Insufficient Ingredients'}
          </Button>
        )}
      </div>
    </Layout>
  );
}
