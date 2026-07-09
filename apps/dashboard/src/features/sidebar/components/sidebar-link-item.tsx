import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip';
import { cn } from '@repo/ui/lib/utils';
import { Link, useLocation } from '@tanstack/react-router';

import { isRouteActive } from '../lib/is-route-active';
import type { SidebarLink } from '../lib/navigation';

export function SidebarLinkItem({ link, collapsed }: { link: SidebarLink; collapsed: boolean }) {
  const location = useLocation();
  const isActive = isRouteActive(location.pathname, link.to);

  const className = cn(
    'group flex items-center gap-3 overflow-hidden rounded-lg text-sm font-medium transition-all duration-200',
    // Padding shrinks during the width animation so the icon ends up
    // exactly centered in the 56px rail without a layout snap.
    collapsed ? 'p-2' : 'px-3 py-2',
    isActive
      ? 'bg-white text-foreground shadow-sm'
      : 'text-foreground/70 hover:bg-white/50 hover:text-foreground',
  );

  const labelClassName = cn(
    'min-w-0 flex-1 truncate transition-opacity duration-150',
    collapsed && 'pointer-events-none opacity-0',
  );

  const inner = (
    <>
      <link.icon className="h-4 w-4 shrink-0" />
      <span className={labelClassName}>{link.label}</span>
    </>
  );

  if (!collapsed) {
    return (
      <Link to={link.to} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger render={<Link to={link.to} className={className} />}>{inner}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {link.label}
      </TooltipContent>
    </Tooltip>
  );
}
