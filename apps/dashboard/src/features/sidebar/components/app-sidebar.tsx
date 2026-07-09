import { TooltipProvider } from '@repo/ui/components/tooltip';
import { cn } from '@repo/ui/lib/utils';

import { navigationGroups } from '../lib/navigation';
import { useSidebarState } from '../lib/use-sidebar-state';

import { SidebarNavGroup } from './sidebar-nav-group';
import { SidebarToggleButton } from './sidebar-toggle-button';
import { SidebarUserMenu } from './sidebar-user-menu';

const EXPANDED_WIDTH = '14rem';
const COLLAPSED_WIDTH = '3.5rem';
const TOOLTIP_DELAY_MS = 250;

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarState();

  return (
    <TooltipProvider delay={TOOLTIP_DELAY_MS}>
      <aside
        className="flex h-full shrink-0 flex-col overflow-x-hidden px-2 transition-[width] duration-200 ease-out"
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      >
        <div className="relative flex h-14 shrink-0 items-center">
          {/* Anchored absolutely so the icon and wordmark sit at a fixed
             x-position (matching the nav icons' left edge) and just fade
             in/out — they never slide during the width animation. */}
          <div
            className={cn(
              'pointer-events-none absolute left-4 flex items-center gap-1.5 transition-opacity duration-150',
              collapsed && 'opacity-0',
            )}
          >
            <img src="/maple-icon.webp" alt="Sunny" className="h-6 w-6 shrink-0" />
            <span className="truncate text-base font-semibold text-foreground">Sunny</span>
          </div>
          <SidebarToggleButton collapsed={collapsed} onToggle={toggle} className="mr-1.5 ml-auto" />
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-1">
          {navigationGroups.map((group, i) => (
            <div key={group.heading ?? i} className={cn(i > 0 && (collapsed ? 'mt-2' : 'mt-5'))}>
              <SidebarNavGroup group={group} collapsed={collapsed} topBorder={collapsed && i > 0} />
            </div>
          ))}
        </nav>

        <div className="flex px-1 pt-1 pb-1">
          <SidebarUserMenu collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
