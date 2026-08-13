import { useEffect, useState } from 'react';
import { Menu, X, Heart, User as UserIcon, LogOut, LayoutDashboard, ShieldCheck, MessageSquare, Home } from 'lucide-react';
import { useRouter, type Route } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthModal } from './AuthModal';
import { CurrencySelector } from './CurrencySelector';
import { useCurrency } from '@/context/CurrencyContext';
import { SUPPORTED_CURRENCIES } from '@/lib/exchangeRate';

export function Header() {
  const { route, navigate } = useRouter();
  const { user, profile, signOut } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [userMenu, setUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) { setUnreadCount(0); return; }
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', profile.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [profile]);

  const navItems: { label: string; route: Route }[] = [
    { label: 'Home', route: { name: 'home' } },
    { label: 'Browse Cars', route: { name: 'browse' } },
    { label: 'Spare Parts', route: { name: 'parts' } },
    { label: 'CIF Calculator', route: { name: 'cif' } },
    { label: 'Sell a Car', route: { name: 'sell' } },
    { label: 'Import Guide', route: { name: 'guide' } },
  ];

  function isActive(name: string) {
    return route.name === name;
  }

  function openAuth(mode: 'signin' | 'signup') {
    setAuthMode(mode);
    setAuthOpen(true);
    setMobileOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate({ name: 'home' })} className="flex items-center gap-2.5 shrink-0">
              <img src="/assets/chingoman_officail_logo_transparent.png" alt="Chin-go-man" className="h-14 w-auto" />
              <span className="font-bold text-lg text-slate-900 hidden sm:block">Chin-go-man</span>
            </button>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.route)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.route.name)
                      ? 'text-green-600 bg-green-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <CurrencySelector className="hidden sm:block" />
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenu(!userMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm">
                      {(profile?.full_name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-700">
                      {profile?.full_name?.split(' ')[0] || 'Account'}
                    </span>
                  </button>
                  {userMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="text-sm font-medium text-slate-900">{profile?.full_name || 'User'}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                        <button
                          onClick={() => { navigate({ name: 'dashboard' }); setUserMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </button>
                        <button
                          onClick={() => { navigate({ name: 'messages' }); setUserMenu(false); }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span className="flex items-center gap-2.5">
                            <MessageSquare className="w-4 h-4" /> Messages
                          </span>
                          {unreadCount > 0 && (
                            <span className="bg-green-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {unreadCount}
                            </span>
                          )}
                        </button>
                        {profile?.is_admin && (
                          <button
                            onClick={() => { navigate({ name: 'admin' }); setUserMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" /> Approve Listings
                          </button>
                        )}
                        <button
                          onClick={() => { signOut(); setUserMenu(false); navigate({ name: 'home' }); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openAuth('signin')}
                    className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => openAuth('signup')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Display Prices In</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      c.code === currency
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{c.flag}</span> {c.code}
                  </button>
                ))}
              </div>
            </div>
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.route); setMobileOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.route.name) ? 'text-green-600 bg-green-50' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {!user && (
                <button
                  onClick={() => openAuth('signin')}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Sign In
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </>
  );
}
