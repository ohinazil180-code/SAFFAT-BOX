import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ConversationStatus = 'open' | 'pending' | 'closed';
export type ConversationPriority = 'normal' | 'high' | 'urgent';

export type ConversationMeta = {
  conversationId: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedTo?: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  body: string;
  createdAt: string;
  attachment?: { name: string; mimeType: string; size: number; storagePath: string; url: string };
};

class ChatStore {
  private messages: ChatMessage[] = [];
  private metadata = new Map<string, ConversationMeta>();
  private filePath = path.resolve(process.cwd(), 'data', 'chat.json');
  private listeners = new Set<(message: ChatMessage) => void>();
  private metaListeners = new Set<(meta: ConversationMeta) => void>();

  constructor() {
    try {
      if (fs.existsSync(this.filePath)) this.messages = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch { this.messages = []; }
  }

  private save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.messages.slice(-5000), null, 2));
  }

  subscribe(listener: (message: ChatMessage) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeMeta(listener: (meta: ConversationMeta) => void) { this.metaListeners.add(listener); return () => this.metaListeners.delete(listener); }

  addMessage(input: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const now = new Date().toISOString();
    const existing = this.metadata.get(input.conversationId);
    this.metadata.set(input.conversationId, { conversationId: input.conversationId, status: existing?.status === 'closed' ? 'open' : existing?.status || 'open', priority: existing?.priority || 'normal', assignedTo: existing?.assignedTo, updatedAt: now });
    const message = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.messages.push(message);
    this.save();
    this.listeners.forEach((listener) => listener(message));
    const meta = this.metadata.get(input.conversationId)!;
    this.metaListeners.forEach((listener) => listener(meta));
    return message;
  }

  updateConversation(conversationId: string, patch: Partial<Pick<ConversationMeta, 'status' | 'priority' | 'assignedTo'>>) {
    const current = this.metadata.get(conversationId) || { conversationId, status: 'open' as const, priority: 'normal' as const, updatedAt: new Date().toISOString() };
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.metadata.set(conversationId, next);
    this.save();
    this.metaListeners.forEach((listener) => listener(next));
    return next;
  }

  getConversationMeta(conversationId: string) { return this.metadata.get(conversationId) || { conversationId, status: 'open' as const, priority: 'normal' as const, updatedAt: new Date().toISOString() }; }
  getAllMetadata() { return [...this.metadata.values()]; }

  getConversation(conversationId: string) { return this.messages.filter((message) => message.conversationId === conversationId); }
  findAttachment(fileId: string) { return this.messages.find((message) => message.attachment?.url.endsWith(`/attachments/${fileId}`)); }
  getConversations() {
    const map = new Map<string, ChatMessage>();
    for (const message of this.messages) map.set(message.conversationId, message);
    return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const globalChatStore = new ChatStore();
export const ADMIN_EMAIL = 'admin@gmail.com';
export const ADMIN_PASSWORD = 'admin1234';
export const isAdminEmail = (email?: string) => email?.toLowerCase() === ADMIN_EMAIL;
export const conversationForUser = (userId: string) => `user:${userId}`;
export const conversationForAdmin = (id: string) => id.startsWith('user:') ? id : `user:${id}`;
export const adminIdentity = { id: 'admin', name: 'Support Admin' };
export type ChatRole = 'user' | 'admin';
export const normalizeChatBody = (body: unknown) => typeof body === 'string' ? body.trim().slice(0, 2000) : '';
export const chatStore = globalChatStore;
export const makeConversationId = conversationForUser;
export const cryptoId = () => crypto.randomUUID();
export const chatPath = path.resolve(process.cwd(), 'data', 'chat.json');
