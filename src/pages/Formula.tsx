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
import { useInventory } from '@/context/InventoryContext';
import { FlaskConical, Plus, Trash2, Package, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Formula as FormulaType } from '@/types/inventory';

export default function Formula() {
  const { ingredients, formulas, addFormula, updateFormula, deleteFormula, getIngredientById } = useInventory();
  const [selectedFormula, setSelectedFormula] = useState<FormulaType | null>(formulas[0] || null);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showNewFormulaDialog, setShowNewFormulaDialog] = useState(false);
  const [newFormulaName, setNewFormulaName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const availableIngredients = ingredients.filter(
    ing => !selectedFormula?.items.some(item => item.ingredientId === ing.id)
  );

  const handleCreateFormula = () => {
    if (!newFormulaName.trim()) {
      toast.error('Please enter a formula name');
      return;
    }
    addFormula({ name: newFormulaName.trim(), items: [] });
    setNewFormulaName('');
    setShowNewFormulaDialog(false);
    toast.success('Formula created');
    // Select the newly created formula
    setTimeout(() => {
      const newFormula = formulas.find(f => f.name === newFormulaName.trim());
      if (newFormula) setSelectedFormula(newFormula);
    }, 100);
  };

  const handleAddToFormula = () => {
    if (!selectedFormula || !selectedIngredient || !quantity) {
      toast.error('Please select an ingredient and enter quantity');
      return;
    }

    updateFormula(selectedFormula.id, {
      items: [
        ...selectedFormula.items,
        { ingredientId: selectedIngredient, quantityPerBag: parseFloat(quantity) },
      ],
    });
    setSelectedIngredient('');
    setQuantity('');
    toast.success('Added to formula');
  };

  const handleRemoveFromFormula = (ingredientId: string) => {
    if (!selectedFormula) return;
    updateFormula(selectedFormula.id, {
      items: selectedFormula.items.filter(item => item.ingredientId !== ingredientId),
    });
    toast.success('Removed from formula');
  };

  const handleUpdateQuantity = (ingredientId: string, newQuantity: string) => {
    if (!selectedFormula) return;
    const parsed = parseFloat(newQuantity);
    if (isNaN(parsed) || parsed < 0) return;

    updateFormula(selectedFormula.id, {
      items: selectedFormula.items.map(item =>
        item.ingredientId === ingredientId
          ? { ...item, quantityPerBag: parsed }
          : item
      ),
    });
  };

  const handleDeleteFormula = () => {
    if (!selectedFormula) return;
    deleteFormula(selectedFormula.id);
    setSelectedFormula(formulas.filter(f => f.id !== selectedFormula.id)[0] || null);
    setShowDeleteConfirm(false);
    toast.success('Formula deleted');
  };

  const handleRenameFormula = () => {
    if (!selectedFormula || !renameValue.trim()) return;
    updateFormula(selectedFormula.id, { name: renameValue.trim() });
    setShowRenameDialog(false);
    setRenameValue('');
    toast.success('Formula renamed');
  };

  // Sync selectedFormula with formulas state
  const currentFormula = formulas.find(f => f.id === selectedFormula?.id) || null;

  if (ingredients.length === 0) {
    return (
      <Layout>
        <PageHeader
          title="Formulas"
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
        title="Formulas"
        description="Define how much of each ingredient goes into one bag"
        action={
          <Button onClick={() => setShowNewFormulaDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Formula
          </Button>
        }
      />

      {/* Formula Selector */}
      {formulas.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Select Formula</Label>
              <Select
                value={currentFormula?.id || ''}
                onValueChange={(id) => setSelectedFormula(formulas.find(f => f.id === id) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a formula" />
                </SelectTrigger>
                <SelectContent>
                  {formulas.map(formula => (
                    <SelectItem key={formula.id} value={formula.id}>
                      {formula.name} ({formula.items.length} ingredients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentFormula && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setRenameValue(currentFormula.name);
                    setShowRenameDialog(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {formulas.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="w-6 h-6" />}
          title="No formulas yet"
          description="Create your first formula to define bag recipes"
          action={
            <Button onClick={() => setShowNewFormulaDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Formula
            </Button>
          }
        />
      ) : currentFormula ? (
        <>
          {/* Add to Formula */}
          {availableIngredients.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5 mb-6">
              <h2 className="font-semibold text-foreground mb-4">Add Ingredient to "{currentFormula.name}"</h2>
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

          {/* Current Formula Items */}
          {currentFormula.items.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="w-6 h-6" />}
              title="No ingredients in formula"
              description="Add ingredients to define how much goes into each bag"
            />
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-secondary/30">
                <h2 className="font-semibold text-foreground">{currentFormula.name} (per bag)</h2>
              </div>
              <div className="divide-y divide-border">
                {currentFormula.items.map(item => {
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
        </>
      ) : (
        <EmptyState
          icon={<FlaskConical className="w-6 h-6" />}
          title="Select a formula"
          description="Choose a formula from above to view and edit its ingredients"
        />
      )}

      {/* New Formula Dialog */}
      <Dialog open={showNewFormulaDialog} onOpenChange={setShowNewFormulaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Formula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formula-name">Formula Name</Label>
              <Input
                id="formula-name"
                placeholder="e.g., Standard Mix, Premium Blend"
                value={newFormulaName}
                onChange={e => setNewFormulaName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFormulaDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFormula}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Formula Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Formula</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-formula">New Name</Label>
              <Input
                id="rename-formula"
                placeholder="Enter new name"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFormula}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Formula</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentFormula?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFormula} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
