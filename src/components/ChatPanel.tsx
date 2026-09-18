import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, X, ShieldCheck, Users, Wifi, Search, MoreHorizontal, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Message = { id: string; conversationId: string; senderName: string; senderRole: 'user' | 'admin'; body: string; createdAt: string };
type Conversation = Message & { meta?: { status: 'open' | 'pending' | 'closed'; priority: 'normal' | 'high' | 'urgent'; assignedTo?: string } };

export const ChatPanel: React.FC = () => {
  const { user, token, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [readConversations, setReadConversations] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'urgent'>('all');
  const [savingMeta, setSavingMeta] = useState(false);
  const isAdmin = user?.email.toLowerCase() === 'admin@gmail.com';
  const conversationId = isAdmin ? selected : user ? `user:${user.id}` : '';

  const loadMessages = async (id: string) => {
    if (!user || !id) return;
    const response = await fetch(`/api/chat/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token || ''}` } });
    if (response.ok) setMessages((await response.json()).messages);
  };

  useEffect(() => {
    if (!open || !user) return;
    if (isAdmin) {
      fetch('/api/chat/conversations', { headers: { Authorization: `Bearer ${token || ''}` } }).then((r) => r.ok ? r.json() : { conversations: [] }).then((data) => { setConversations(data.conversations); if (!selected && data.conversations[0]) setSelected(data.conversations[0].conversationId); });
    }
    if (conversationId) loadMessages(conversationId);
    if (!token) return;
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/chat?token=${encodeURIComponent(token)}`);
    let disposed = false;
    socket.onopen = () => {
      if (disposed) socket.close();
    };
    socket.onmessage = (event) => { const data = JSON.parse(event.data); if (data.type === 'chat.message') { setMessages((current) => current.some((item) => item.id === data.message.id) ? current : [...current, data.message]); setConversations((current) => [data.message, ...current.filter((item) => item.conversationId !== data.message.conversationId)]); } };
    socket.onerror = () => undefined;
    return () => {
      disposed = true;
      // Closing a CONNECTING WebSocket causes the browser's "closed without
      // opened" runtime error during logout. Let it finish, then close it.
      if (socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [open, user, token, selected, conversationId, isAdmin]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim() || !conversationId || !user) return;
    const response = await fetch(`/api/chat/${encodeURIComponent(conversationId)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify({ body }) });
    if (response.ok) { const data = await response.json(); setMessages((current) => current.some((item) => item.id === data.message.id) ? current : [...current, data.message]); setBody(''); }
  };

  const updateConversation = async (patch: { status?: string; priority?: string }) => {
    if (!selected || !isAdmin || savingMeta) return;
    setSavingMeta(true);
    const response = await fetch(`/api/chat/${encodeURIComponent(selected)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify(patch) });
    if (response.ok) { const data = await response.json(); setConversations((current) => current.map((item) => item.conversationId === selected ? { ...item, meta: data.meta } : item)); }
    setSavingMeta(false);
  };
  const activeTitle = useMemo(() => isAdmin ? (conversations.find((item) => item.conversationId === selected)?.senderName || 'Select a conversation') : 'Support team', [isAdmin, conversations, selected]);

  return <>
    <button onClick={() => user ? setOpen(true) : openAuthModal('login')} aria-label="Open realtime support chat" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-cyan-400/30 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-cyan-500/20 hover:bg-slate-800"><MessageCircle className="h-4 w-4 text-cyan-400" />Chat with support</button>
  {isAdmin && open && selected && <div className="fixed bottom-20 right-5 z-[60] flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl"><span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Manage</span><button title="Mark pending" aria-label="Mark pending" onClick={() => updateConversation({ status: 'pending' })} className="rounded-lg p-2 text-amber-300 hover:bg-slate-800"><Clock3 className="h-4 w-4" /></button><button title="Close conversation" aria-label="Close conversation" onClick={() => updateConversation({ status: 'closed' })} className="rounded-lg p-2 text-emerald-300 hover:bg-slate-800"><CheckCircle2 className="h-4 w-4" /></button><button title="Mark urgent" aria-label="Mark urgent" onClick={() => updateConversation({ priority: 'urgent' })} className="rounded-lg p-2 text-rose-300 hover:bg-slate-800"><AlertTriangle className="h-4 w-4" /></button></div>}
    {open && user && <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 p-4 sm:items-center"><section className="flex h-[min(680px,calc(100vh-2rem))] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"><aside className={`${isAdmin ? 'flex' : 'hidden'} w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80`}><div className="flex items-center gap-2 border-b border-slate-800 p-4 text-sm font-bold text-white"><Users className="h-4 w-4 text-cyan-400" />Inbox</div><div className="border-b border-slate-800 p-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500" /><div className="mt-2 grid grid-cols-2 gap-1"><select aria-label="Filter conversation status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"><option value="all">All status</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select><select aria-label="Filter conversation priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"><option value="all">All priority</option><option value="high">High</option><option value="urgent">Urgent</option></select></div></div><div className="flex-1 overflow-y-auto p-2">{conversations.filter((item) => `${item.senderName} ${item.body}`.toLowerCase().includes(search.toLowerCase())).filter((item) => statusFilter === 'all' || item.meta?.status === statusFilter).filter((item) => priorityFilter === 'all' || item.meta?.priority === priorityFilter).map((item) => <button key={item.conversationId} onClick={() => { setSelected(item.conversationId); setReadConversations((current) => current.includes(item.conversationId) ? current : [...current, item.conversationId]); }} className={`mb-1 w-full rounded-xl p-3 text-left ${selected === item.conversationId ? 'bg-cyan-500/15 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>{item.senderName}</span>{!readConversations.includes(item.conversationId) && item.senderRole === 'user' && <span className="rounded-full bg-cyan-500 px-1.5 py-0.5 text-[9px] text-slate-950">New</span>}</div><div className="truncate text-[11px] text-slate-500">{item.body}</div></button>)}</div></aside><div className="flex min-w-0 flex-1 flex-col"><header className="flex items-center justify-between border-b border-slate-800 p-4"><div><div className="flex items-center gap-2 text-sm font-bold text-white">{isAdmin ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <Wifi className="h-4 w-4 text-cyan-400" />}{activeTitle}</div><div className="text-[11px] text-slate-500">Realtime messages are delivered instantly</div></div><button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></header><div className="flex-1 space-y-3 overflow-y-auto p-4">{!conversationId && <p className="mt-20 text-center text-sm text-slate-500">Choose a conversation to reply.</p>}{conversationId && messages.filter((item) => item.conversationId === conversationId).map((item) => <div key={item.id} className={`flex ${item.senderRole === (isAdmin ? 'admin' : 'user') ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${item.senderRole === 'admin' ? 'bg-cyan-500/15 text-cyan-50' : 'bg-slate-800 text-slate-200'}`}><div>{item.body}</div><time className="mt-1 block text-[10px] opacity-50">{new Date(item.createdAt).toLocaleTimeString()}</time></div></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-slate-800 p-3"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder={isAdmin && !selected ? 'Select a conversation' : 'Write a message...'} disabled={!conversationId} className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /><button disabled={!conversationId || !body.trim()} className="rounded-xl bg-cyan-500 px-4 text-slate-950 disabled:opacity-40"><Send className="h-4 w-4" /></button></form></div></section></div>}
  </>;
};
