import type { OcrService, OcrImageInput, OcrResult } from './types'

export class FallbackOcrProvider implements OcrService {
  readonly providerName = 'fallback-mock-ocr'

  async extractText(images: OcrImageInput[]): Promise<OcrResult> {
    if (images.length === 0) {
      return { rawText: '', images: [] }
    }

    // Do NOT inject synthetic text that mimics packaging declarations.
    // When no OCR engine is available (missing API key), rawText must be empty
    // so heuristic parsers do not mistake image metadata or notices for product names.
    const imageResults = images.map((img) => ({
      imageId: img.imageId,
      text: '',
      confidence: 0,
    }))

    return {
      rawText: '',
      images: imageResults,
    }
  }
}
