import { cn } from '@repo/ui/lib/utils';
import { PanelLeftIcon } from 'lucide-react';

export function SidebarToggleButton({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/45 ring-ring transition-colors outline-none hover:bg-foreground/5 hover:text-foreground/80 focus-visible:ring-2',
        className,
      )}
    >
      <PanelLeftIcon
        className={cn('h-4 w-4 transition-transform duration-200', collapsed && '-scale-x-100')}
      />
    </button>
  );
}
