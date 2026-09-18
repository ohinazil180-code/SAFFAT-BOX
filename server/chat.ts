import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  body: string;
  createdAt: string;
};

class ChatStore {
  private messages: ChatMessage[] = [];
  private filePath = path.resolve(process.cwd(), 'data', 'chat.json');
  private listeners = new Set<(message: ChatMessage) => void>();

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

  addMessage(input: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const message = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.messages.push(message);
    this.save();
    this.listeners.forEach((listener) => listener(message));
    return message;
  }

  getConversation(conversationId: string) { return this.messages.filter((message) => message.conversationId === conversationId); }
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
