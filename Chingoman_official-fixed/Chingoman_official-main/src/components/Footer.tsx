import { Ship, Mail, Phone, MapPin } from 'lucide-react';
import { useRouter, type Route } from '@/context/RouterContext';

export function Footer() {
  const { navigate } = useRouter();

  const links: { label: string; route: Route }[] = [
    { label: 'Browse Cars', route: { name: 'browse' } },
    { label: 'CIF Calculator', route: { name: 'cif' } },
    { label: 'Sell a Car', route: { name: 'sell' } },
    { label: 'Import Guide', route: { name: 'guide' } },
    { label: 'About Us', route: { name: 'about' } },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/assets/chingoman_officail_logo_transparent.png" alt="Chin-go-man" className="h-10 w-auto" />
              <span className="font-bold text-lg text-white">Chin-go-man</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              The trusted marketplace for importing quality used vehicles from China to Ghana and West Africa.
              Verified inspections, transparent pricing, and escrow protection on every transaction.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Explore</h4>
            <ul className="space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.route)}
                    className="text-sm text-slate-400 hover:text-green-400 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">Contact</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" /> chichi@chin-go-man.com</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" /> 0200383572</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> Accra, Ghana</li>
              <li className="flex items-center gap-2"><Ship className="w-4 h-4 shrink-0" /> Tema Port Operations</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">© 2026 Chin-go-man. All rights reserved.</p>
          <p className="text-xs text-slate-500">Built for West African car buyers.</p>
        </div>
      </div>
    </footer>
  );
}
