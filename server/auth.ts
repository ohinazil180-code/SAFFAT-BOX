import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, UserSession, PublicUser, UserStats } from './types.js';
import { hashPassword, verifyPassword } from './utils/crypto.js';
import { globalShareStore } from './store.js';

const AVATAR_GRADIENTS = [
  'from-cyan-500 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-purple-500 to-indigo-600',
  'from-rose-500 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-fuchsia-500 to-pink-500',
];

class AuthStore {
  private users: Map<string, User> = new Map(); // key: userId
  private emailToId: Map<string, string> = new Map(); // key: lowercase email -> userId
  private usernameToId: Map<string, string> = new Map(); // key: lowercase username -> userId
  private sessions: Map<string, UserSession> = new Map(); // key: token -> UserSession
  private dataFilePath: string;
  private authListeners: Set<(event: { type: string; user?: PublicUser }) => void> = new Set();

  constructor() {
    this.dataFilePath = path.resolve(process.cwd(), 'data', 'users.json');
    this.loadFromDisk();

    // Clean expired sessions periodically
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users)) {
          for (const u of parsed.users) {
            this.users.set(u.id, u);
            this.emailToId.set(u.email.toLowerCase(), u.id);
            this.usernameToId.set(u.username.toLowerCase(), u.id);
          }
        }
        if (Array.isArray(parsed.sessions)) {
          const now = Date.now();
          for (const s of parsed.sessions) {
            if (new Date(s.expiresAt).getTime() > now) {
              this.sessions.set(s.token, s);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AUTH] Could not load users from disk, starting fresh', err);
    }

    // Seed a friendly demo account if no users exist
    if (this.users.size === 0) {
      this.seedDemoUser();
    }
  }

  private seedDemoUser() {
    const demoEmail = 'alex@dropcode.io';
    const demoUsername = 'alex_dropcode';
    const demoPassword = 'password123';
    const hashed = hashPassword(demoPassword);
    const demoUser: User = {
      id: 'usr_demo_alex_dropcode',
      email: demoEmail,
      username: demoUsername,
      name: 'Alex Rivera',
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      avatarColor: AVATAR_GRADIENTS[0],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    this.users.set(demoUser.id, demoUser);
    this.emailToId.set(demoEmail.toLowerCase(), demoUser.id);
    this.usernameToId.set(demoUsername.toLowerCase(), demoUser.id);
    this.saveToDisk();
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        users: Array.from(this.users.values()),
        sessions: Array.from(this.sessions.values()),
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AUTH] Failed to save users to disk', err);
    }
  }

  private cleanupExpiredSessions() {
    const now = Date.now();
    let changed = false;
    for (const [token, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt).getTime() <= now) {
        this.sessions.delete(token);
        changed = true;
      }
    }
    if (changed) {
      this.saveToDisk();
    }
  }

  public subscribe(callback: (event: { type: string; user?: PublicUser }) => void): () => void {
    this.authListeners.add(callback);
    return () => {
      this.authListeners.delete(callback);
    };
  }

  private notify(type: string, user?: PublicUser) {
    for (const listener of this.authListeners) {
      try {
        listener({ type, user });
      } catch {
        // ignore
      }
    }
  }

  public isUsernameAvailable(username: string): boolean {
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) return false;
    return !this.usernameToId.has(clean);
  }

  public isEmailRegistered(email: string): boolean {
    const clean = email.trim().toLowerCase();
    return this.emailToId.has(clean);
  }

  public createUser(payload: {
    email: string;
    username: string;
    password: string;
    name?: string;
  }): { success: boolean; user?: PublicUser; token?: string; error?: string } {
    const email = payload.email.trim().toLowerCase();
    const rawUsername = payload.username.trim();
    const username = rawUsername.toLowerCase();
    const name = (payload.name && payload.name.trim()) || rawUsername;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }

    // Username validation: alphanumeric, underscores, hyphens, 3-20 chars
    const usernameRegex = /^[a-zA-Z0-9_\-]{3,20}$/;
    if (!usernameRegex.test(rawUsername)) {
      return {
        success: false,
        error: 'Username must be 3-20 characters and only contain letters, numbers, hyphens, or underscores',
      };
    }

    // Password validation
    if (!payload.password || payload.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long' };
    }

    if (this.emailToId.has(email)) {
      return { success: false, error: 'An account with this email address already exists' };
    }

    if (this.usernameToId.has(username)) {
      return { success: false, error: 'This username is already taken. Please choose another' };
    }

    const hashed = hashPassword(payload.password);
    const userId = `usr_${crypto.randomUUID()}`;
    const avatarColor = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];

    const newUser: User = {
      id: userId,
      email,
      username: rawUsername,
      name,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      avatarColor,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    this.users.set(userId, newUser);
    this.emailToId.set(email, userId);
    this.usernameToId.set(username, userId);

    // Create session token (valid for 30 days)
    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      token,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    };
    this.sessions.set(token, session);

    this.saveToDisk();

    const publicUser = this.toPublicUser(newUser);
    this.notify('signup', publicUser);

    return { success: true, user: publicUser, token };
  }

  public authenticateUser(
    identifier: string,
    passwordAttempt: string
  ): { success: boolean; user?: PublicUser; token?: string; error?: string } {
    const clean = identifier.trim().toLowerCase();
    let userId = this.emailToId.get(clean);
    if (!userId) {
      userId = this.usernameToId.get(clean);
    }

    if (!userId) {
      return { success: false, error: 'Invalid email, username, or password' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User account not found' };
    }

    const isValid = verifyPassword(passwordAttempt, user.passwordSalt, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid email, username, or password' };
    }

    user.lastLoginAt = new Date().toISOString();

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    };
    this.sessions.set(token, session);

    this.saveToDisk();

    const publicUser = this.toPublicUser(user);
    this.notify('login', publicUser);

    return { success: true, user: publicUser, token };
  }

  public getUserByToken(token: string): PublicUser | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.sessions.delete(token);
      this.saveToDisk();
      return null;
    }

    const user = this.users.get(session.userId);
    return user ? this.toPublicUser(user) : null;
  }

  public updateUser(
    userId: string,
    payload: { username?: string; name?: string; avatarColor?: string }
  ): { success: boolean; user?: PublicUser; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User account not found' };

    const nextUsername = payload.username?.trim();
    if (nextUsername && !/^[a-zA-Z0-9_-]{3,20}$/.test(nextUsername)) {
      return { success: false, error: 'Username must be 3-20 characters and only contain letters, numbers, hyphens, or underscores' };
    }

    if (nextUsername && nextUsername.toLowerCase() !== user.username.toLowerCase()) {
      const existingId = this.usernameToId.get(nextUsername.toLowerCase());
      if (existingId && existingId !== userId) return { success: false, error: 'This username is already taken' };
      this.usernameToId.delete(user.username.toLowerCase());
      this.usernameToId.set(nextUsername.toLowerCase(), userId);
      user.username = nextUsername;
    }

    if (payload.name !== undefined) {
      const nextName = payload.name.trim();
      user.name = nextName || user.username;
    }
    if (payload.avatarColor && AVATAR_GRADIENTS.includes(payload.avatarColor)) {
      user.avatarColor = payload.avatarColor;
    }

    this.saveToDisk();
    const publicUser = this.toPublicUser(user);
    this.notify('profile_updated', publicUser);
    return { success: true, user: publicUser };
  }

  public deleteSession(token: string): boolean {
    if (this.sessions.has(token)) {
      this.sessions.delete(token);
      this.saveToDisk();
      return true;
    }
    return false;
  }

  public getUserStats(userId: string): UserStats {
    const userShares = globalShareStore
      .getRecentShares()
      .filter((s) => s.userId === userId);

    const activeShares = userShares.filter((s) => s.status === 'active');
    const totalDownloads = userShares.reduce((acc, s) => acc + s.downloadCount, 0);
    const totalBytes = userShares.reduce(
      (acc, s) => acc + s.files.reduce((fa, f) => fa + f.size, 0),
      0
    );

    return {
      totalShares: userShares.length,
      activeShares: activeShares.length,
      totalDownloads,
      totalStorageBytes: totalBytes,
    };
  }

  public getActiveCommunityStats() {
    return {
      totalRegisteredUsers: this.users.size,
      activeSessionsCount: this.sessions.size,
    };
  }

  public toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatarColor: user.avatarColor,
      createdAt: user.createdAt,
    };
  }
}

export const globalAuthStore = new AuthStore();
