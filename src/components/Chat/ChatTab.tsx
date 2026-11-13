import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageCircle, Search, Send } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n/LanguageContext';
import { chatContacts } from '../../lib/chatPolicy';
import { isFirebaseConfigured } from '../../lib/firebase';
import { cn } from '../../utils/cn';
import { User } from '../../types';

type Store = ReturnType<typeof useAppStore>;

// Unread messages addressed to the signed-in user — drives the Chat tab's
// badge in every portal.
export function useUnreadChatCount(store: Store): number {
  const me = store.currentUser?.id;
  return me ? store.messages.filter(m => m.toId === me && !m.read).length : 0;
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

// In-app chat. Who appears as a contact comes from lib/chatPolicy.ts:
// Managers <-> Supervisors, Supervisors <-> frontline staff (Technicians,
// Housekeepers, Janitors, Laundry), frontline only with Supervisors.
export function ChatTab({ store }: { store: Store }) {
  const { t } = useTranslation();
  const { currentUser, users, messages, sendChatMessage, markConversationRead } = store;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Firebase mode: an invited account that never logged in has no real
  // uid yet (its id is still its email) — it can't receive messages.
  const contacts = useMemo(() => {
    if (!currentUser) return [];
    return chatContacts(currentUser, users).filter(u => !isFirebaseConfigured || !u.id.includes('@'));
  }, [currentUser, users]);

  const byContact = useMemo(() => {
    const map = new Map<string, { last?: typeof messages[number]; unread: number }>();
    if (!currentUser) return map;
    for (const m of messages) {
      const other = m.fromId === currentUser.id ? m.toId : m.fromId;
      const entry = map.get(other) || { unread: 0 };
      if (!entry.last || m.createdAt > entry.last.createdAt) entry.last = m;
      if (m.toId === currentUser.id && !m.read) entry.unread++;
      map.set(other, entry);
    }
    return map;
  }, [messages, currentUser]);

  const sortedContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter(u => !q || u.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const la = byContact.get(a.id)?.last?.createdAt || '';
        const lb = byContact.get(b.id)?.last?.createdAt || '';
        return lb.localeCompare(la) || a.name.localeCompare(b.name);
      });
  }, [contacts, byContact, search]);

  const active: User | undefined = contacts.find(u => u.id === activeId);
  const thread = useMemo(() => {
    if (!currentUser || !active) return [];
    return messages
      .filter(m => (m.fromId === currentUser.id && m.toId === active.id) || (m.fromId === active.id && m.toId === currentUser.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages, currentUser, active]);

  // Opening a conversation (or a new message arriving in it) marks it read.
  useEffect(() => {
    if (active) markConversationRead(active.id);
    bottomRef.current?.scrollIntoView({ block: 'end' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, thread.length]);

  const send = () => {
    if (!active || !draft.trim()) return;
    if (sendChatMessage(active, draft)) setDraft('');
  };

  if (!currentUser) return null;

  const contactList = (
    <div className={cn('card !p-0 overflow-hidden flex flex-col md:w-80 md:shrink-0', active && 'hidden md:flex')}>
      <div className="p-3 border-b border-psu-gray/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-psu-gray/30" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2.5 bg-psu-bg rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-psu-blue/20"
          />
        </div>
      </div>
      <div className="overflow-y-auto md:max-h-[65vh]">
        {sortedContacts.length === 0 && (
          <p className="p-6 text-center text-xs text-psu-gray/40 font-medium">{t('chat.noContacts')}</p>
        )}
        {sortedContacts.map(u => {
          const info = byContact.get(u.id);
          return (
            <button
              key={u.id}
              onClick={() => setActiveId(u.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-psu-gray/5 hover:bg-psu-bg transition-colors',
                activeId === u.id && 'bg-psu-blue/5',
              )}
            >
              <div className="w-10 h-10 rounded-full bg-psu-blue/10 text-psu-blue font-black text-xs flex items-center justify-center shrink-0">
                {u.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-psu-gray truncate">{u.name}</span>
                  {info?.last && <span className="text-[10px] text-psu-gray/40 shrink-0">{timeLabel(info.last.createdAt)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-psu-gray/50 truncate">
                    {info?.last ? `${info.last.fromId === currentUser.id ? t('chat.you') + ': ' : ''}${info.last.text}` : t(`rolesShort.${u.role}`)}
                  </span>
                  {!!info?.unread && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-psu-rejected text-white text-[10px] font-black flex items-center justify-center shrink-0">{info.unread}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const conversation = active ? (
    <div className="card !p-0 overflow-hidden flex flex-col flex-1 min-w-0" style={{ height: 'min(70vh, 640px)' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-psu-gray/5">
        <button onClick={() => setActiveId(null)} className="md:hidden text-psu-gray/40" aria-label={t('chat.back')}>
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-bold text-psu-gray truncate">{active.name}</p>
          <p className="text-[10px] font-black text-psu-gray/40 uppercase tracking-widest truncate">{t(`roles.${active.role}`)}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-psu-bg/50">
        {thread.length === 0 && <p className="text-center text-xs text-psu-gray/40 font-medium py-8">{t('chat.noMessages')}</p>}
        {thread.map(m => {
          const mine = m.fromId === currentUser.id;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words',
                mine ? 'bg-psu-blue text-white rounded-br-md' : 'bg-white text-psu-gray border border-psu-gray/10 rounded-bl-md',
              )}>
                {m.text}
                <div className={cn('text-[9px] mt-0.5 text-right', mine ? 'text-white/70' : 'text-psu-gray/40')}>
                  {timeLabel(m.createdAt)}{mine && m.read ? ' · ✓✓' : ''}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 p-3 border-t border-psu-gray/5"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          placeholder={t('chat.typeMessage')}
          className="flex-1 resize-none max-h-32 px-3 py-2.5 bg-psu-bg rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-psu-blue/20"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="w-11 h-11 rounded-xl bg-psu-blue text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
          aria-label={t('chat.send')}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  ) : (
    <div className="hidden md:flex card flex-1 items-center justify-center text-center" style={{ height: 'min(70vh, 640px)' }}>
      <div className="text-psu-gray/30">
        <MessageCircle size={40} className="mx-auto mb-2" />
        <p className="text-xs font-bold">{t('chat.pickContact')}</p>
      </div>
    </div>
  );

  return (
    <div className="md:flex md:gap-4 space-y-4 md:space-y-0">
      {contactList}
      {conversation}
    </div>
  );
}

// "Chat" or "Chat (3)" — the portals' tab bars and desktop sidebar take
// plain-text labels.
export function useChatTabLabel(store: Store): string {
  const { t } = useTranslation();
  const unread = useUnreadChatCount(store);
  return unread > 0 ? `${t('chat.tabTitle')} (${unread})` : t('chat.tabTitle');
}
