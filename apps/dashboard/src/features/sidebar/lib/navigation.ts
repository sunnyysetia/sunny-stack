import type { LucideIcon } from 'lucide-react';
import { BookOpenIcon, Disc3Icon, HouseIcon } from 'lucide-react';

import type { AppRoutePaths } from '../types';

export interface SidebarLink {
  label: string;
  to: AppRoutePaths;
  icon: LucideIcon;
}

export interface SidebarGroup {
  heading?: string;
  links: SidebarLink[];
}

export const navigationGroups: SidebarGroup[] = [
  // Top-level (no heading) — renders as a bare link above the first section.
  {
    links: [{ label: 'Home', to: '/', icon: HouseIcon }],
  },
  {
    heading: 'Library',
    links: [
      { label: 'Books', to: '/books', icon: BookOpenIcon },
      { label: 'Vinyls', to: '/vinyls', icon: Disc3Icon },
    ],
  },
];
