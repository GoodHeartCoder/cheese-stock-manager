import { useState, useMemo } from 'react';
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
import { FlaskConical, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Production() {
  const navigate = useNavigate();
  const { ingredients, formulas, addProduction, getIngredientById } = useInventory();
  const [selectedFormulaId, setSelectedFormulaId] = useState('');
  const [bags, setBags] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const bagsNumber = parseInt(bags) || 0;
  const selectedFormula = formulas.find(f => f.id === selectedFormulaId);

  const calculatedUsage = useMemo(() => {
    if (!selectedFormula) return [];
    return selectedFormula.items.map(item => {
      const ingredient = getIngredientById(item.ingredientId);
      const needed = item.quantityPerBag * bagsNumber;
      const available = ingredient?.quantity || 0;
      const hasEnough = available >= needed;

      return {
        ingredientId: item.ingredientId,
        ingredientName: ingredient?.name || 'Unknown',
        unit: ingredient?.unit || '',
        quantityPerBag: item.quantityPerBag,
        quantityNeeded: needed,
        available,
        hasEnough,
      };
    });
  }, [selectedFormula, bagsNumber, getIngredientById]);

  const canProduce = calculatedUsage.length > 0 && calculatedUsage.every(u => u.hasEnough) && bagsNumber > 0 && selectedFormula;

  const handleConfirmProduction = () => {
    if (!canProduce || !selectedFormula) {
      toast.error('Cannot produce: insufficient ingredients or no formula selected');
      return;
    }

    addProduction({
      date: new Date().toISOString(),
      bagsProduced: bagsNumber,
      formulaId: selectedFormula.id,
      formulaName: selectedFormula.name,
      ingredientsUsed: calculatedUsage.map(u => ({
        ingredientId: u.ingredientId,
        ingredientName: u.ingredientName,
        quantityUsed: u.quantityNeeded,
        unit: u.unit,
      })),
    });

    toast.success(`Produced ${bagsNumber} bags using ${selectedFormula.name}!`);
    navigate('/history');
  };

  if ((formulas?.length || 0) === 0) {
    return (
      <Layout>
        <PageHeader
          title="Production"
          description="Record new production and deduct from inventory"
        />
        <EmptyState
          icon={<FlaskConical className="w-6 h-6" />}
          title="No formulas defined"
          description="Create a formula first before recording production"
          action={
            <Button asChild>
              <Link to="/formula">Go to Formulas</Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  if ((ingredients?.length || 0) === 0) {
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
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="space-y-4">
            {/* Formula Selection */}
            <div className="space-y-2">
              <Label htmlFor="formula" className="text-base font-medium">
                Which formula did you use?
              </Label>
              <Select value={selectedFormulaId} onValueChange={setSelectedFormulaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a formula" />
                </SelectTrigger>
                <SelectContent>
                  {(formulas || []).map(formula => (
                    <SelectItem key={formula.id} value={formula.id}>
                      {formula.name} ({formula.items.length} ingredients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bags Input */}
            <div className="space-y-2">
              <Label htmlFor="bags" className="text-base font-medium">
                How many bags did you produce?
              </Label>
              <Input
                id="bags"
                type="number"
                min="1"
                placeholder="Enter number of bags"
                value={bags}
                onChange={e => {
                  setBags(e.target.value);
                  setShowPreview(true);
                }}
                className="text-lg h-12"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Today: {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && bagsNumber > 0 && selectedFormula && (
          <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h2 className="font-semibold text-foreground">
                Ingredients needed for {bagsNumber} bag{bagsNumber > 1 ? 's' : ''} ({selectedFormula.name})
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
                        Available: {item.available} {item.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${item.hasEnough ? 'text-foreground' : 'text-destructive'}`}>
                      {item.quantityNeeded} {item.unit}
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
        {bagsNumber > 0 && selectedFormula && (
          <Button
            size="lg"
            className="w-full"
            onClick={handleConfirmProduction}
            disabled={!canProduce}
          >
            {canProduce ? `Confirm Production of ${bagsNumber} Bags` : 'Insufficient Ingredients'}
          </Button>
        )}
      </div>
    </Layout>
  );
}
