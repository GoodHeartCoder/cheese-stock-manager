import { useState } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Warehouse, FlaskConical, Plus, Calendar, RotateCcw, FileText, ShoppingBag } from 'lucide-react';
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
import { toast } from 'sonner';
import { ModeToggle } from '@/components/ModeToggle';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { to: '/formula', label: 'Formula', icon: FlaskConical },
  { to: '/production', label: 'Production', icon: Plus },
  { to: '/bags', label: 'Bags', icon: ShoppingBag },
  { to: '/history', label: 'History', icon: Calendar },
  { to: '/reports', label: 'Reports', icon: FileText },
];

export function Navigation() {
  const { resetInventory } = useInventory();
  const [isResetOpen, setIsResetOpen] = useState(false);

  const handleReset = () => {
    resetInventory();
    setIsResetOpen(false);
    toast.success('All data has been reset');
    // Force reload to ensure all states are clean if needed, or rely on context
    window.location.reload();
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CF</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:block">Cheese Factory</span>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <RouterNavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:block">{label}</span>
              </RouterNavLink>
            ))}

            <div className="w-px h-6 bg-border mx-2" />

            <ModeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsResetOpen(true)}
              title="Reset All Data"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your ingredients, formulas, and production history from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
