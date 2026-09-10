// Product and Scan types mirroring Prisma models
// Phase 1 creates structural types; Phase 2 will populate OCR & identification data

export interface Product {
  id: string
  name: string
  brand?: string | null
  genericName?: string | null
  barcode?: string | null
  manufacturer?: string | null
  packer?: string | null
  importer?: string | null
  countryOfOrigin?: string | null
  category?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface ProductScan {
  id: string
  productId?: string | null
  userId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
  notes?: string | null
  createdAt: Date
  updatedAt: Date
  images?: ScanImage[]
}

export interface ScanImage {
  id: string
  scanId: string
  storageKey: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: Date
}
