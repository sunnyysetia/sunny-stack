import { Avatar } from '@repo/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react';

import { sessionQueryOptions } from '@/features/auth/api/queries';
import { useSignOut } from '@/features/auth/hooks/use-sign-out';

// Sidebar identity chip + sign-out menu. Reads the current user straight off
// the session query — the protected route guard has already resolved it.
export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useQuery(sessionQueryOptions);
  const signOut = useSignOut();

  if (!session) return null;

  const user = session.user;
  // A user always has an email; `name` can be empty on first sign-in, so fall
  // back to the email for the display name and initials.
  const displayName = user.name.trim() || user.email;

  return (
    <DropdownMenu>
      {/* Single left-anchored trigger so the avatar holds its x-position and
         only the surrounding padding animates during collapse — matching the
         nav icons. */}
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          'group flex w-full items-center gap-2 overflow-hidden rounded-xl text-left ring-ring transition-all duration-200 outline-none hover:bg-foreground/5 focus-visible:ring-2 data-popup-open:bg-foreground/5',
          // px shrinks during the width animation so the avatar ends up
          // centered in the 56px rail without a layout snap.
          collapsed ? 'py-2' : 'px-2 py-2',
        )}
      >
        <Avatar name={displayName} src={user.image} size="lg" className="shrink-0" />
        <div
          className={cn(
            'grid min-w-0 flex-1 text-left text-sm leading-tight transition-opacity duration-150',
            collapsed && 'pointer-events-none opacity-0',
          )}
        >
          <span className="truncate font-medium">{displayName}</span>
          <span className="truncate text-xs text-foreground/50">{user.email}</span>
        </div>
        <ChevronsUpDownIcon
          className={cn(
            'ml-auto size-4 shrink-0 text-foreground/30 transition-opacity duration-150',
            collapsed && 'pointer-events-none opacity-0',
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="right" align="end" sideOffset={4}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="px-1 py-1.5">
              <div className="flex items-center gap-2 text-left text-sm">
                <Avatar name={displayName} src={user.image} size="lg" />
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
