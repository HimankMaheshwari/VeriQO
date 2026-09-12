import type { DetectionStatus } from '@prisma/client'

export interface ExtractedDeclarationItem {
  fieldName: string
  label: string
  rawValue: string | null
  normalizedValue: string | null
  confidence: number
  sourceText: string | null
  detectionStatus: DetectionStatus
}

export interface ProductIdentificationResult {
  productName: string | null
  brand: string | null
  category: string | null
  likelyManufacturer: string | null
  confidence: number
  status: 'IDENTIFIED' | 'UNCERTAIN' | 'FAILED'
}

export interface AnalysisResult {
  product: ProductIdentificationResult
  declarations: ExtractedDeclarationItem[]
  isi_mark?: ExtractedDeclarationItem | null
  cml_number?: ExtractedDeclarationItem | null
  hallmark_huid?: ExtractedDeclarationItem | null
  crs_registration_number?: ExtractedDeclarationItem | null
}

export interface ProductAnalysisService {
  readonly providerName: string
  analyzePackage(
    rawOcrText: string,
    images?: { buffer: Buffer; mimeType: string }[]
  ): Promise<AnalysisResult>
}

export const MANDATORY_DECLARATION_FIELDS = [
  { fieldName: 'product_name', label: 'Product / Commodity Name' },
  { fieldName: 'brand', label: 'Brand Name' },
  { fieldName: 'manufacturer', label: 'Manufacturer Name' },
  { fieldName: 'packer', label: 'Packer Name' },
  { fieldName: 'importer', label: 'Importer Name' },
  { fieldName: 'address', label: 'Complete Physical Address' },
  { fieldName: 'net_quantity', label: 'Net Quantity / Weight / Volume' },
  { fieldName: 'mrp', label: 'Maximum Retail Price (MRP)' },
  { fieldName: 'unit_sale_price', label: 'Unit Sale Price (USP)' },
  { fieldName: 'date_of_manufacture', label: 'Date of Manufacture' },
  { fieldName: 'date_of_packing', label: 'Date of Packing' },
  { fieldName: 'best_before', label: 'Best Before / Expiry Date' },
  { fieldName: 'customer_care', label: 'Customer Care Details' },
  { fieldName: 'country_of_origin', label: 'Country of Origin' },
  { fieldName: 'batch_number', label: 'Batch / Lot Number' },
]

export const BIS_DECLARATION_FIELDS = [
  { fieldName: 'isi_mark', label: 'ISI / BIS Standard Mark' },
  { fieldName: 'cml_number', label: 'BIS CM/L License Number' },
  { fieldName: 'hallmark_huid', label: 'Hallmark Unique Identification (HUID)' },
  { fieldName: 'crs_registration_number', label: 'Compulsory Registration Scheme (CRS) Number' },
] as const
