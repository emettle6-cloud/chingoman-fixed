import { createContext, useContext, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'browse'; make?: string; type?: string; steering?: string }
  | { name: 'vehicle'; id: string }
  | { name: 'cif' }
  | { name: 'sell' }
  | { name: 'guide' }
  | { name: 'dashboard' }
  | { name: 'admin' }
  | { name: 'about' };

interface RouterContextValue {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ name: 'home' });

  function navigate(r: Route) {
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
