/**
 * StorageService — abstraction layer for file storage.
 *
 * Phase 1: LocalStorageService (saves to local filesystem under ./uploads/)
 * Phase 2+: Swap to S3StorageService / GCSStorageService by setting
 *            STORAGE_PROVIDER=s3 in .env.local. No business logic changes needed.
 *
 * All application code calls getStorageService() — never instantiates providers directly.
 */

import path from 'path'
import fs from 'fs/promises'

export interface StorageService {
  /** Upload a file buffer. Returns the storage key (not a full URL). */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<string>
  /** Get a file buffer by key for processing (OCR/AI). */
  getBuffer(key: string): Promise<Buffer>
  /** Get a URL to serve/download the file. */
  getUrl(key: string): Promise<string>
  /** Delete a file by key. */
  delete(key: string): Promise<void>
}

// ─── Phase 1: Local filesystem storage ───────────────────────────────────────

class LocalStorageService implements StorageService {
  private basePath: string

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH ?? './uploads'
  }

  async upload(buffer: Buffer, key: string, _mimeType: string): Promise<string> {
    const fullPath = path.join(this.basePath, key)
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(fullPath, buffer)
    return key
  }

  async getBuffer(key: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, key)
    return await fs.readFile(fullPath)
  }

  async getUrl(key: string): Promise<string> {
    return `/api/v1/files/${key.replace(/\\/g, '/')}`
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key)
    await fs.unlink(fullPath).catch(() => {
      // Ignore not-found errors on delete
    })
  }
}

// ─── Phase 2+: S3-compatible storage (stub, not implemented yet) ─────────────

class S3StorageService implements StorageService {
  async upload(_buffer: Buffer, _key: string, _mimeType: string): Promise<string> {
    throw new Error('S3StorageService not implemented yet — coming in Phase 2')
  }
  async getBuffer(_key: string): Promise<Buffer> {
    throw new Error('S3StorageService not implemented yet')
  }
  async getUrl(_key: string): Promise<string> {
    throw new Error('S3StorageService not implemented yet — coming in Phase 2')
  }
  async delete(_key: string): Promise<void> {
    throw new Error('S3StorageService not implemented yet — coming in Phase 2')
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _instance: StorageService | null = null

export function getStorageService(): StorageService {
  if (_instance) return _instance

  const provider = process.env.STORAGE_PROVIDER ?? 'local'

  switch (provider) {
    case 's3':
      _instance = new S3StorageService()
      break
    case 'local':
    default:
      _instance = new LocalStorageService()
  }

  return _instance
}
