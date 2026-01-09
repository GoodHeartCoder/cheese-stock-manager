import { NavLink as RouterNavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Warehouse, FlaskConical, Plus, Calendar, FileText, ShoppingBag, Database } from 'lucide-react';
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
  { to: '/reports', label: 'Data Manager', icon: Database },
];

export function Navigation() {
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

            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
