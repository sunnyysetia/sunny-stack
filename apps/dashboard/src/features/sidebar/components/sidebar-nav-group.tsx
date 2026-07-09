import type { SidebarGroup } from '../lib/navigation';

import { SidebarLinkItem } from './sidebar-link-item';

interface SidebarNavGroupProps {
  group: SidebarGroup;
  /** Icon-only (width-collapsed) sidebar — headings are hidden entirely. */
  collapsed: boolean;
  /** Divider drawn above the group in icon-only mode (replaces the heading). */
  topBorder: boolean;
}

export function SidebarNavGroup({ group, collapsed, topBorder }: SidebarNavGroupProps) {
  return (
    <div>
      {topBorder && <div className="mx-2 mb-2 h-px bg-foreground/10" />}
      {!collapsed && group.heading && (
        <p className="mb-1 px-3 text-xs font-medium tracking-wide text-foreground/35 uppercase">
          {group.heading}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {group.links.map((link) => (
          <SidebarLinkItem key={link.to} link={link} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}
