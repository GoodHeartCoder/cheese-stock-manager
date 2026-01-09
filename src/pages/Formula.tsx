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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useInventory } from '@/context/InventoryContext';
import { FlaskConical, Plus, Trash2, Package, Pencil, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Formula } from '@/types/inventory';

export default function FormulaPage() {
  const { ingredients, formulas, addFormula, updateFormula, deleteFormula, getIngredientById } = useInventory();
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);

  // Create Formula State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFormulaName, setNewFormulaName] = useState('');

  // Editing State
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [editFormulaName, setEditFormulaName] = useState('');

  const activeFormula = selectedFormulaId ? formulas.find(f => f.id === selectedFormulaId) : null;

  const availableIngredients = activeFormula
    ? ingredients.filter(ing => !activeFormula.items.some(item => item.ingredientId === ing.id))
    : [];

  const handleCreateFormula = () => {
    if (!newFormulaName.trim()) {
      toast.error('Please enter a formula name');
      return;
    }
    // Check for duplicate names (case-insensitive)
    const isDuplicate = formulas.some(
      f => f.name.toLowerCase() === newFormulaName.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error('A formula with this name already exists');
      return;
    }
    addFormula(newFormulaName.trim(), []);
    setNewFormulaName('');
    setIsCreateOpen(false);
    toast.success('Formula created');
  };

  const handleDeleteFormula = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this formula? This cannot be undone.')) {
      deleteFormula(id);
      if (selectedFormulaId === id) setSelectedFormulaId(null);
      toast.success('Formula deleted');
    }
  };

  const handleRenameFormula = () => {
    if (!activeFormula || !editFormulaName.trim()) {
      toast.error('Please enter a formula name');
      return;
    }

    const trimmedName = editFormulaName.trim();

    // Check for duplicate names (excluding current formula)
    const isDuplicate = formulas.some(
      f => f.id !== activeFormula.id && f.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      toast.error('A formula with this name already exists');
      return;
    }

    updateFormula(activeFormula.id, { name: trimmedName });
    setIsRenameOpen(false);
    toast.success('Formula renamed');
  };

  const handleAddToFormula = () => {
    if (!activeFormula || !selectedIngredient || !quantity) {
      toast.error('Please select an ingredient and enter quantity');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    updateFormula(activeFormula.id, {
      items: [
        ...activeFormula.items,
        { ingredientId: selectedIngredient, quantityPerBag: qty },
      ],
    });
    setSelectedIngredient('');
    setQuantity('');
    toast.success('Added to formula');
  };

  const handleRemoveFromFormula = (ingredientId: string) => {
    if (!activeFormula) return;
    updateFormula(activeFormula.id, {
      items: activeFormula.items.filter(item => item.ingredientId !== ingredientId),
    });
    toast.success('Removed from formula');
  };

  const handleUpdateQuantity = (ingredientId: string, newQuantity: string) => {
    if (!activeFormula) return;
    const parsed = parseFloat(newQuantity);

    // If invalid or negative, don't update state (effectively read-only or revert)
    // Or we could allow it but block saving? 
    // Here we just ignore invalid inputs, keeping the old value effectively or waiting for valid input.
    // Better UX: Allow typing but check before save?
    // Since this is onChange, we'll allow empty string (clearing) but block negatives.

    if (newQuantity === '') {
      // Allow clearing to type new number
      updateFormula(activeFormula.id, {
        items: activeFormula.items.map(item =>
          item.ingredientId === ingredientId
            ? { ...item, quantityPerBag: 0 } // temp 0
            : item
        ),
      });
      return;
    }

    if (isNaN(parsed) || parsed < 0) return;

    // If user enters 0, we'll allow it but maybe the UI should highlight it.
    // For now, we'll follow the rule "Block 0kg ingredients" by preventing 0 in the context update
    // unless the user specifically wants to clear it.
    if (parsed === 0 && newQuantity !== '') {
      toast.error('Quantity must be greater than 0. Use the delete button to remove it.');
      return;
    }

    updateFormula(activeFormula.id, {
      items: activeFormula.items.map(item =>
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
          title="Formulas"
          description="Define cheese recipes"
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

  // LIST VIEW
  if (!activeFormula) {
    return (
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="Formulas"
            description="Manage your cheese formulas"
          />
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Formula
          </Button>
        </div>

        {formulas.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="w-6 h-6" />}
            title="No formulas defined"
            description="Create your first formula to start production"
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                Create Formula
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formulas.map(formula => (
              <div
                key={formula.id}
                className="bg-card hover:bg-accent/5 transition-colors rounded-xl border border-border p-5 cursor-pointer group"
                onClick={() => setSelectedFormulaId(formula.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive transition-colors hover:bg-destructive/10"
                    onClick={(e) => handleDeleteFormula(formula.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-semibold text-lg mb-1">{formula.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formula.items.length} ingredient{formula.items.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Formula</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label>Formula Name</Label>
              <Input
                placeholder="e.g. Cheddar, Gouda"
                value={newFormulaName}
                onChange={(e) => setNewFormulaName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFormula}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    );
  }

  // DETAIL VIEW (Edit Formula)
  return (
    <Layout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setSelectedFormulaId(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{activeFormula.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => {
                setEditFormulaName(activeFormula.name);
                setIsRenameOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">Edit formula ingredients</p>
        </div>
      </div>

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
                      {ing.name} (kg)
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

      {/* Items List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/30">
          <h2 className="font-semibold text-foreground">Ingredients (per bag)</h2>
        </div>
        <div className="divide-y divide-border">
          {activeFormula.items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No ingredients in this formula yet. Use the form above to add some.
            </div>
          ) : (
            activeFormula.items.map(item => {
              const ingredient = getIngredientById(item.ingredientId);
              if (!ingredient) return null;

              return (
                <div key={item.ingredientId} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-foreground">{ingredient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Available in Stock: {ingredient.quantity} kg
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
                      <span className="text-muted-foreground">kg</span>
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
            })
          )}
        </div>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Formula</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>New Formula Name</Label>
            <Input
              value={editFormulaName}
              onChange={(e) => setEditFormulaName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFormula()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameFormula}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
