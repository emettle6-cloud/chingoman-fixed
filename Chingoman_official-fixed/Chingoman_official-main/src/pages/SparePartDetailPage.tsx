import { useEffect, useState } from 'react';
import {
  ArrowLeft, MessageSquare, Share2, CheckCircle2, Send, Wrench, MapPin,
  Package, Lock, PackageX, Phone, MessageCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SparePart, Profile } from '@/types';
import { useRouter } from '@/context/RouterContext';
import { useAuth } from '@/context/AuthContext';
import { formatUSD } from '@/lib/cif';
import { VEHICLE_STATUS_LABELS } from '@/lib/constants';
import { AuthModal } from '@/components/AuthModal';

interface SparePartDetailPageProps {
  partId: string;
}

export function SparePartDetailPage({ partId }: SparePartDetailPageProps) {
  const { navigate } = useRouter();
  const { user, profile } = useAuth();
  const [part, setPart] = useState<SparePart | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('spare_parts').select('*').eq('id', partId).maybeSingle();
      setPart(data as SparePart | null);
      const p = data as SparePart | null;
      if (p?.seller_id) {
        const { data: sellerData } = await supabase.from('profiles').select('*').eq('id', p.seller_id).maybeSingle();
        setSeller(sellerData as Profile | null);
      }
      setLoading(false);
    }
    load();
  }, [partId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        <p className="animate-pulse">Loading part details...</p>
      </div>
    );
  }

  if (!part) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500 text-lg">Spare part not found.</p>
        <button onClick={() => navigate({ name: 'parts' })} className="mt-4 text-green-600 font-semibold hover:underline">
          ← Back to Spare Parts
        </button>
      </div>
    );
  }

  const images = part.images ?? [];
  const unavailable = part.status === 'sold' || part.status === 'out_of_stock';
  const fitment = [part.compatible_make, part.compatible_model].filter(Boolean).join(' ');

  async function sendMessage() {
    if (!user || !profile || !part) return;
    if (!part.seller_id) {
      setMessageError('This listing has no seller on record — please contact support instead.');
      return;
    }
    if (part.seller_id === profile.id) {
      setMessageError('This is your own listing.');
      return;
    }
    if (!messageText.trim()) return;

    setSendingMessage(true);
    setMessageError(null);

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: part.seller_id,
      part_id: part.id,
      content: messageText.trim(),
    });

    setSendingMessage(false);

    if (error) {
      setMessageError(`Could not send message: ${error.message}`);
      return;
    }

    setMessageText('');
    setMessageSent(true);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        onClick={() => navigate({ name: 'parts' })}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Spare Parts
      </button>

      {unavailable && (
        <div className="mb-4 flex items-center gap-3 bg-slate-900 text-white rounded-xl px-5 py-3.5">
          <PackageX className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            This part is {VEHICLE_STATUS_LABELS[part.status].toLowerCase()} and is no longer available for purchase.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: images + details */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 relative">
              {images.length > 0 ? (
                <img src={images[activeImage]} alt={part.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Package className="w-10 h-10 mb-2" />
                  <span className="text-sm font-medium">No photos uploaded yet</span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> {part.category}
                </span>
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-24 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      activeImage === i ? 'border-green-500' : 'border-slate-200'
                    }`}
                  >
                    <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <SpecItem label="Category" value={part.category} />
              <SpecItem label="Condition" value={part.condition} />
              <SpecItem label="Ships From" value={part.port_china} />
              {fitment && <SpecItem label="Compatible Make/Model" value={fitment} />}
              {part.compatible_year_from && (
                <SpecItem
                  label="Compatible Years"
                  value={`${part.compatible_year_from}${part.compatible_year_to && part.compatible_year_to !== part.compatible_year_from ? `–${part.compatible_year_to}` : ''}`}
                />
              )}
            </div>
          </div>

          {part.description && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-3">Description</h2>
              <p className="text-slate-600 leading-relaxed">{part.description}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-3">
            <Lock className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 text-sm">Secure Transaction</p>
              <p className="text-xs text-slate-500 mt-0.5">All communications and payments are handled through the Chin-go-man platform. Never pay sellers directly.</p>
            </div>
          </div>
        </div>

        {/* Right: purchase panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{part.name}</h1>
              <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Ships from {part.port_china}
              </p>

              <div className="mb-4">
                <p className="text-xs text-slate-500">Price</p>
                <p className={`text-3xl font-bold ${unavailable ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {formatUSD(Number(part.price_usd))}
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => { if (!user) setAuthOpen(true); else setShowContact(true); }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" /> Contact Seller
                </button>

                {seller && (seller.phone || seller.whatsapp) && (
                  <div className="flex gap-2.5">
                    {seller.phone && (
                      user ? (
                        <a href={`tel:${seller.phone}`} className="flex-1 border border-slate-200 py-2.5 rounded-xl font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" /> Call
                        </a>
                      ) : (
                        <button onClick={() => setAuthOpen(true)} className="flex-1 border border-slate-200 py-2.5 rounded-xl font-medium text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                          <Phone className="w-4 h-4" /> Call
                        </button>
                      )
                    )}
                    {seller.whatsapp && (
                      user ? (
                        <a
                          href={`https://wa.me/${seller.whatsapp.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 border border-emerald-200 bg-emerald-50 py-2.5 rounded-xl font-medium text-sm text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                      ) : (
                        <button onClick={() => setAuthOpen(true)} className="flex-1 border border-emerald-200 bg-emerald-50 py-2.5 rounded-xl font-medium text-sm text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </button>
                      )
                    )}
                  </div>
                )}

                <button
                  onClick={() => navigator.clipboard?.writeText(window.location.href)}
                  className="w-full border border-slate-200 py-2.5 rounded-xl font-medium text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>

              {showContact && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  {messageSent ? (
                    <div className="text-center py-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-900">Message sent</p>
                      <p className="text-xs text-slate-500 mt-1 mb-3">
                        The seller will reply through Chin-go-man's messaging system.
                      </p>
                      <button
                        onClick={() => navigate({ name: 'messages', withProfileId: part.seller_id ?? undefined, partId: part.id })}
                        className="text-sm text-green-600 font-semibold hover:underline"
                      >
                        View conversation →
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-900 mb-1">Message the Seller</p>
                      <p className="text-xs text-slate-500 mb-3">
                        Sent securely through Chin-go-man's in-app messaging. Never send payment outside the platform.
                      </p>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={3}
                        placeholder={`Hi, I'm interested in the ${part.name}...`}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-green-400 resize-none"
                      />
                      {messageError && <p className="text-xs text-red-600 mt-1.5">{messageError}</p>}
                      <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !messageText.trim()}
                        className="mt-2.5 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Send className="w-4 h-4" /> {sendingMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
    </div>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
