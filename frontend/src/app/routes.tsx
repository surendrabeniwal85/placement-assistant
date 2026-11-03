import { moduleRegistry, type ModuleRoute } from './moduleRegistry';

export type RegisteredView = NonNullable<ModuleRoute['view']>;

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '');
  }
  return pathname;
}

export function resolveRegisteredView(pathname: string): RegisteredView | null {
  const normalized = normalizePath(pathname);
  for (const module of moduleRegistry) {
    const route = module.routes.find((candidate) => candidate.path === normalized);
    if (route && 'view' in route) return route.view;
  }
  return null;
}

export function isProtectedPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return (
    normalized === '/auth/session' ||
    normalized === '/dashboard' ||
    normalized.startsWith('/dashboard/') ||
    normalized === '/portal/dashboard' ||
    normalized.startsWith('/portal/') ||
    normalized === '/institute/records' ||
    normalized === '/institute/classroom' ||
    normalized === '/institute/hub' ||
    normalized === '/placement/drives' ||
    normalized === '/placement/selection'
  );
}

export function isRegisteredPath(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  for (const module of moduleRegistry) {
    if (module.routes.some((candidate) => candidate.path === normalized)) {
      return true;
    }
  }
  return isProtectedPath(normalized);
}
