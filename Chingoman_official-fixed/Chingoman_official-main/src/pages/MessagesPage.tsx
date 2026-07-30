import { useEffect, useState } from 'react';
import { MessageSquare, Send, ArrowLeft, Car, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import type { Message, Vehicle, SparePart, Profile } from '@/types';

interface Conversation {
  key: string;
  otherProfile: Profile;
  vehicle: Vehicle | null;
  part: SparePart | null;
  lastMessage: Message;
  unreadCount: number;
}

// Conversation key encodes who the other person is plus which listing (if any)
// the conversation is about, so a buyer can have one thread about a vehicle
// and a separate thread about a spare part with the same seller.
function conversationKey(otherId: string, vehicleId: string | null, partId: string | null) {
  return `${otherId}:${vehicleId ?? 'none'}:${partId ?? 'none'}`;
}

export function MessagesPage() {
  const { profile } = useAuth();
  const { route, navigate } = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (profile) loadConversations();
  }, [profile]);

  // If arriving from a vehicle or part page wanting to open a specific conversation.
  useEffect(() => {
    if (route.name === 'messages' && route.withProfileId) {
      const key = conversationKey(route.withProfileId, route.vehicleId ?? null, route.partId ?? null);
      setActiveKey(key);
    }
  }, [route]);

  useEffect(() => {
    if (activeKey && profile) loadThread(activeKey);
  }, [activeKey, profile]);

  async function loadConversations() {
    if (!profile) return;
    setLoading(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    const messages = (data as Message[]) ?? [];

    const grouped = new Map<string, Message[]>();
    for (const m of messages) {
      const otherId = m.sender_id === profile.id ? m.receiver_id : m.sender_id;
      const key = conversationKey(otherId, m.vehicle_id, m.part_id);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    const otherProfileIds = Array.from(new Set(
      Array.from(grouped.keys()).map((k) => k.split(':')[0])
    ));
    const vehicleIds = Array.from(new Set(
      messages.map((m) => m.vehicle_id).filter((v): v is string => !!v)
    ));
    const partIds = Array.from(new Set(
      messages.map((m) => m.part_id).filter((v): v is string => !!v)
    ));

    const [{ data: profilesData }, { data: vehiclesData }, { data: partsData }] = await Promise.all([
      otherProfileIds.length > 0
        ? supabase.from('profiles').select('*').in('id', otherProfileIds)
        : Promise.resolve({ data: [] as Profile[] }),
      vehicleIds.length > 0
        ? supabase.from('vehicles').select('*').in('id', vehicleIds)
        : Promise.resolve({ data: [] as Vehicle[] }),
      partIds.length > 0
        ? supabase.from('spare_parts').select('*').in('id', partIds)
        : Promise.resolve({ data: [] as SparePart[] }),
    ]);

    const profilesById = new Map((profilesData ?? []).map((p: Profile) => [p.id, p]));
    const vehiclesById = new Map((vehiclesData ?? []).map((v: Vehicle) => [v.id, v]));
    const partsById = new Map((partsData ?? []).map((p: SparePart) => [p.id, p]));

    const convos: Conversation[] = Array.from(grouped.entries())
      .map(([key, msgs]) => {
        const [otherId, vehicleId, partId] = key.split(':');
        const otherProfile = profilesById.get(otherId);
        if (!otherProfile) return null;
        return {
          key,
          otherProfile,
          vehicle: vehicleId !== 'none' ? (vehiclesById.get(vehicleId) ?? null) : null,
          part: partId !== 'none' ? (partsById.get(partId) ?? null) : null,
          lastMessage: msgs[0],
          unreadCount: msgs.filter((m) => m.receiver_id === profile.id && !m.is_read).length,
        };
      })
      .filter((c): c is Conversation => c !== null)
      .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

    setConversations(convos);
    setLoading(false);

    if (!activeKey && convos.length > 0 && route.name === 'messages' && !route.withProfileId) {
      setActiveKey(convos[0].key);
    }
  }

  async function loadThread(key: string) {
    if (!profile) return;
    const [otherId, vehicleId, partId] = key.split(':');

    let query = supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });

    query = vehicleId !== 'none' ? query.eq('vehicle_id', vehicleId) : query.is('vehicle_id', null);
    query = partId !== 'none' ? query.eq('part_id', partId) : query.is('part_id', null);

    const { data } = await query;
    setThread((data as Message[]) ?? []);

    // Mark incoming messages in this thread as read.
    const unreadIds = (data as Message[] ?? [])
      .filter((m) => m.receiver_id === profile.id && !m.is_read)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      loadConversations();
    }
  }

  async function sendReply() {
    if (!profile || !activeKey || !reply.trim()) return;
    const [otherId, vehicleId, partId] = activeKey.split(':');

    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: otherId,
      vehicle_id: vehicleId !== 'none' ? vehicleId : null,
      part_id: partId !== 'none' ? partId : null,
      content: reply.trim(),
    });
    setSending(false);

    if (!error) {
      setReply('');
      loadThread(activeKey);
      loadConversations();
    }
  }

  const activeConvo = conversations.find((c) => c.key === activeKey);

  if (!profile) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Messages</h1>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ minHeight: '60vh' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 h-full">
          {/* Conversation list */}
          <div className={`border-r border-slate-100 ${activeKey ? 'hidden sm:block' : ''}`}>
            {loading ? (
              <p className="p-6 text-sm text-slate-400">Loading...</p>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">No conversations yet.</p>
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveKey(c.key)}
                  className={`w-full text-left px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    activeKey === c.key ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.otherProfile.full_name || c.otherProfile.email}</p>
                    {c.unreadCount > 0 && (
                      <span className="bg-green-600 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center px-1">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.vehicle && (
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1 mb-0.5">
                      <Car className="w-3 h-3" /> {c.vehicle.year} {c.vehicle.make} {c.vehicle.model}
                    </p>
                  )}
                  {c.part && (
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1 mb-0.5">
                      <Wrench className="w-3 h-3" /> {c.part.name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 truncate">{c.lastMessage.content}</p>
                </button>
              ))
            )}
          </div>

          {/* Thread */}
          <div className={`sm:col-span-2 flex flex-col ${activeKey ? '' : 'hidden sm:flex'}`}>
            {activeConvo ? (
              <>
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                  <button onClick={() => setActiveKey(null)} className="sm:hidden text-slate-400">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{activeConvo.otherProfile.full_name || activeConvo.otherProfile.email}</p>
                    {activeConvo.vehicle && (
                      <button
                        onClick={() => navigate({ name: 'vehicle', id: activeConvo.vehicle!.id })}
                        className="text-xs text-green-600 hover:underline flex items-center gap-1"
                      >
                        <Car className="w-3 h-3" /> {activeConvo.vehicle.year} {activeConvo.vehicle.make} {activeConvo.vehicle.model}
                      </button>
                    )}
                    {activeConvo.part && (
                      <button
                        onClick={() => navigate({ name: 'part', id: activeConvo.part!.id })}
                        className="text-xs text-green-600 hover:underline flex items-center gap-1"
                      >
                        <Wrench className="w-3 h-3" /> {activeConvo.part.name}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: '45vh' }}>
                  {thread.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                          m.sender_id === profile.id
                            ? 'bg-green-600 text-white rounded-br-sm'
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 text-sm outline-none focus:border-green-400"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
