import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'browse'; make?: string; type?: string; steering?: string }
  | { name: 'vehicle'; id: string }
  | { name: 'cif' }
  | { name: 'sell' }
  | { name: 'guide' }
  | { name: 'dashboard' }
  | { name: 'admin' }
  | { name: 'messages'; withProfileId?: string; vehicleId?: string; partId?: string }
  | { name: 'about' }
  | { name: 'parts'; category?: string }
  | { name: 'part'; id: string }
  | { name: 'sell-part' };

interface RouterContextValue {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

// Turns a Route into a real URL (path + query string), so the browser's own
// history stack has an entry for every page the person visits on the site —
// this is what makes the back/forward buttons stay inside Chin-go-man instead
// of leaving straight to whatever site was open before it.
function routeToUrl(route: Route): string {
  const params = new URLSearchParams();
  switch (route.name) {
    case 'home': return '/';
    case 'browse':
      if (route.make) params.set('make', route.make);
      if (route.type) params.set('type', route.type);
      if (route.steering) params.set('steering', route.steering);
      return `/browse${params.toString() ? `?${params}` : ''}`;
    case 'vehicle': return `/vehicle/${route.id}`;
    case 'cif': return '/cif';
    case 'sell': return '/sell';
    case 'guide': return '/guide';
    case 'dashboard': return '/dashboard';
    case 'admin': return '/admin';
    case 'messages':
      if (route.withProfileId) params.set('with', route.withProfileId);
      if (route.vehicleId) params.set('vehicle', route.vehicleId);
      if (route.partId) params.set('part', route.partId);
      return `/messages${params.toString() ? `?${params}` : ''}`;
    case 'about': return '/about';
    case 'parts':
      if (route.category) params.set('category', route.category);
      return `/parts${params.toString() ? `?${params}` : ''}`;
    case 'part': return `/part/${route.id}`;
    case 'sell-part': return '/sell-part';
    default: return '/';
  }
}

function urlToRoute(pathname: string, search: string): Route {
  const params = new URLSearchParams(search);
  const segments = pathname.split('/').filter(Boolean);
  const [first, second] = segments;

  switch (first) {
    case undefined: return { name: 'home' };
    case 'browse':
      return {
        name: 'browse',
        make: params.get('make') ?? undefined,
        type: params.get('type') ?? undefined,
        steering: params.get('steering') ?? undefined,
      };
    case 'vehicle':
      return second ? { name: 'vehicle', id: second } : { name: 'home' };
    case 'cif': return { name: 'cif' };
    case 'sell': return { name: 'sell' };
    case 'guide': return { name: 'guide' };
    case 'dashboard': return { name: 'dashboard' };
    case 'admin': return { name: 'admin' };
    case 'messages':
      return {
        name: 'messages',
        withProfileId: params.get('with') ?? undefined,
        vehicleId: params.get('vehicle') ?? undefined,
        partId: params.get('part') ?? undefined,
      };
    case 'about': return { name: 'about' };
    case 'parts': return { name: 'parts', category: params.get('category') ?? undefined };
    case 'part':
      return second ? { name: 'part', id: second } : { name: 'parts' };
    case 'sell-part': return { name: 'sell-part' };
    default: return { name: 'home' };
  }
}

function routeFromLocation(): Route {
  if (typeof window === 'undefined') return { name: 'home' };
  return urlToRoute(window.location.pathname, window.location.search);
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => routeFromLocation());

  // On first load, if the app was opened at some deep path (e.g. a shared
  // vehicle link), make sure that becomes a real history entry so "back"
  // from there still has somewhere in-app to go rather than exiting.
  useEffect(() => {
    if (window.history.state === null) {
      window.history.replaceState({ chingoman: true }, '', routeToUrl(route));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state when the person uses the browser's own back/forward buttons.
  useEffect(() => {
    function onPopState() {
      setRoute(routeFromLocation());
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(r: Route) {
    const url = routeToUrl(r);
    if (url !== window.location.pathname + window.location.search) {
      window.history.pushState({ chingoman: true }, '', url);
    }
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
