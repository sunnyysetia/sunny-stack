import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sunny:sidebar-collapsed';

// `localStorage` can throw `SecurityError` when third-party cookies are
// blocked, when the dashboard is opened in a sandboxed iframe, or in
// some private-browsing configurations. The sidebar must keep rendering
// in those cases — silently fall back to the default (expanded) and
// drop persistence rather than crash the shell.
function readPersisted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writePersisted(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    // Storage unavailable — preference is lost for this session, but the
    // toggle still works in-memory.
  }
}

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(readPersisted);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writePersisted(next);
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
