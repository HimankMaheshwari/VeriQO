export interface OcrImageInput {
  imageId: string
  buffer: Buffer
  mimeType: string
}

export interface OcrImageResult {
  imageId: string
  text: string
  confidence?: number
}

export interface OcrResult {
  rawText: string
  images: OcrImageResult[]
}

export interface OcrService {
  readonly providerName: string
  extractText(images: OcrImageInput[]): Promise<OcrResult>
}
