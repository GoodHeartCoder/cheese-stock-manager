import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
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
import { Package, FlaskConical, Calendar, Plus, ArrowRight, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Dashboard() {
  const { ingredients, formulas, productionHistory } = useInventory();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalIngredients = ingredients.length;
  const totalFormulas = formulas.length;
  const recentProductions = productionHistory.slice(0, 5);
  const totalBagsThisMonth = productionHistory
    .filter(p => {
      const productionDate = new Date(p.date);
      const now = new Date();
      return productionDate.getMonth() === now.getMonth() && 
             productionDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.bagsProduced, 0);

  const handleResetData = () => {
    localStorage.removeItem('cheese-inventory');
    window.location.reload();
    toast.success('All data has been cleared');
  };

  return (
    <Layout>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your cheese factory inventory"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Data
            </Button>
            <Button asChild>
              <Link to="/production">
                <Plus className="w-4 h-4 mr-2" />
                New Production
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Ingredients"
          value={totalIngredients}
          icon={Package}
          description="In warehouse"
        />
        <StatCard
          title="Formulas"
          value={totalFormulas}
          icon={FlaskConical}
          description="Bag recipes"
          variant="primary"
        />
        <StatCard
          title="Bags This Month"
          value={totalBagsThisMonth}
          icon={Calendar}
          description={format(new Date(), 'MMMM yyyy')}
          variant="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Stock Overview */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Stock Overview</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/warehouse">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          {ingredients.length === 0 ? (
            <EmptyState
              icon={<Package className="w-6 h-6" />}
              title="No ingredients yet"
              description="Add ingredients to your warehouse to get started"
              action={
                <Button asChild size="sm">
                  <Link to="/warehouse">Add Ingredients</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {ingredients.slice(0, 5).map(ing => (
                <div key={ing.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium text-foreground">{ing.name}</span>
                  <span className="text-muted-foreground">
                    {ing.quantity} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Productions */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recent Productions</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/history">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          {recentProductions.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-6 h-6" />}
              title="No productions yet"
              description="Record your first production to see history"
              action={
                <Button asChild size="sm">
                  <Link to="/production">Record Production</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentProductions.map(prod => (
                <div key={prod.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium text-foreground">{prod.bagsProduced} bags</span>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(prod.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {prod.ingredientsUsed?.length || 0} ingredients
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your ingredients, formulas, and production history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
