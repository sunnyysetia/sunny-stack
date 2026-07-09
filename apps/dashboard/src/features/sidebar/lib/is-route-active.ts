// A link is active for its own path and any nested route beneath it.
export function isRouteActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
