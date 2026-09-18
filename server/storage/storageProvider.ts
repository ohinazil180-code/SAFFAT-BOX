import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export interface StorageMetadata {
  size: number;
  lastModified: Date;
  mimeType?: string;
}

export interface StorageProvider {
  name: string;
  upload(storagePath: string, buffer: Buffer, mimeType?: string): Promise<{ storagePath: string; size: number }>;
  downloadStream(storagePath: string): Promise<Readable>;
  downloadBuffer(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<boolean>;
  exists(storagePath: string): Promise<boolean>;
  getMetadata(storagePath: string): Promise<StorageMetadata | null>;
  createSignedUrl(storagePath: string, expiresInSeconds?: number): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  name = 'local';
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getFullPath(storagePath: string): string {
    const safeRel = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.baseDir, safeRel);
  }

  async upload(storagePath: string, buffer: Buffer): Promise<{ storagePath: string; size: number }> {
    const fullPath = this.getFullPath(storagePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
    return { storagePath, size: buffer.length };
  }

  async downloadStream(storagePath: string): Promise<Readable> {
    const fullPath = this.getFullPath(storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found in storage: ${storagePath}`);
    }
    return fs.createReadStream(fullPath);
  }

  async downloadBuffer(storagePath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(storagePath);
    return await fs.promises.readFile(fullPath);
  }

  async delete(storagePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(storagePath);
    try {
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(storagePath);
    return fs.existsSync(fullPath);
  }

  async getMetadata(storagePath: string): Promise<StorageMetadata | null> {
    const fullPath = this.getFullPath(storagePath);
    try {
      const stats = await fs.promises.stat(fullPath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  async createSignedUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string> {
    // In local mode, returns direct API download route with timestamp token
    const token = Buffer.from(JSON.stringify({ p: storagePath, exp: Date.now() + expiresInSeconds * 1000 })).toString('base64url');
    return `/api/storage/signed?token=${token}`;
  }
}

// Global active storage provider instance (extensible to Supabase / S3 / R2)
export const activeStorageProvider: StorageProvider = new LocalStorageProvider();
