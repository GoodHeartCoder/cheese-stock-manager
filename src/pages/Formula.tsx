import { useState } from 'react';
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
import { FlaskConical, Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Formula() {
  const { ingredients, formula, updateFormula, getIngredientById } = useInventory();
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');

  const availableIngredients = ingredients.filter(
    ing => !formula.items.some(item => item.ingredientId === ing.id)
  );

  const handleAddToFormula = () => {
    if (!selectedIngredient || !quantity) {
      toast.error('Please select an ingredient and enter quantity');
      return;
    }

    updateFormula({
      items: [
        ...formula.items,
        { ingredientId: selectedIngredient, quantityPerBag: parseFloat(quantity) },
      ],
    });
    setSelectedIngredient('');
    setQuantity('');
    toast.success('Added to formula');
  };

  const handleRemoveFromFormula = (ingredientId: string) => {
    updateFormula({
      items: formula.items.filter(item => item.ingredientId !== ingredientId),
    });
    toast.success('Removed from formula');
  };

  const handleUpdateQuantity = (ingredientId: string, newQuantity: string) => {
    const parsed = parseFloat(newQuantity);
    if (isNaN(parsed) || parsed < 0) return;

    updateFormula({
      items: formula.items.map(item =>
        item.ingredientId === ingredientId
          ? { ...item, quantityPerBag: parsed }
          : item
      ),
    });
  };

  if (ingredients.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Formula"
          description="Define how much of each ingredient goes into one bag"
        />
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No ingredients available"
          description="Add ingredients to your warehouse first before creating a formula"
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
        title="Formula"
        description="Define how much of each ingredient goes into one bag"
      />

      {/* Add to Formula */}
      {availableIngredients.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h2 className="font-semibold text-foreground mb-4">Add Ingredient to Formula</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Ingredient</Label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {availableIngredients.map(ing => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40 space-y-2">
              <Label>Quantity per bag</Label>
              <Input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddToFormula}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current Formula */}
      {formula.items.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="w-6 h-6" />}
          title="No formula defined"
          description="Add ingredients to define how much goes into each bag"
        />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h2 className="font-semibold text-foreground">Current Formula (per bag)</h2>
          </div>
          <div className="divide-y divide-border">
            {formula.items.map(item => {
              const ingredient = getIngredientById(item.ingredientId);
              if (!ingredient) return null;
              
              return (
                <div key={item.ingredientId} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{ingredient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Available: {ingredient.quantity} {ingredient.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        value={item.quantityPerBag}
                        onChange={e => handleUpdateQuantity(item.ingredientId, e.target.value)}
                      />
                      <span className="text-muted-foreground">{ingredient.unit}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFromFormula(item.ingredientId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}
