import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'primary' | 'accent';
}

export function StatCard({ title, value, icon: Icon, description, variant = 'default' }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            'text-2xl font-bold mt-1',
            variant === 'primary' && 'text-primary',
            variant === 'accent' && 'text-accent',
            variant === 'default' && 'text-foreground'
          )}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          variant === 'primary' && 'bg-primary/10 text-primary',
          variant === 'accent' && 'bg-accent/10 text-accent',
          variant === 'default' && 'bg-secondary text-secondary-foreground'
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
