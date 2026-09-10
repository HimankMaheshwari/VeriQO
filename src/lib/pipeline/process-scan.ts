import { prisma } from '@/lib/prisma'
import { getStorageService } from '@/lib/storage'
import { getOcrService, getGeminiApiKey, type OcrImageInput } from '@/lib/ocr'
import { getProductAnalysisService } from '@/lib/ai'
import { audit, logger } from '@/lib/audit'
import type { ProductScan, ScanImage, ExtractedDeclaration, Product } from '@prisma/client'

export interface ProcessScanResult {
  scan: ProductScan & {
    images: ScanImage[]
    extractedDeclarations: ExtractedDeclaration[]
    product: Product | null
  }
  ocrProvider: string
  aiProvider: string
  warnings: string[]
}

/**
 * Orchestrates the Phase 2 end-to-end OCR and AI product identification pipeline:
 * 1. Fetch scan and images
 * 2. Retrieve image buffers from storage
 * 3. Run OCR extraction per image and aggregate raw text
 * 4. Run AI package declaration analysis & product identification
 * 5. Persist declarations and product identification result
 * 6. Audit log execution
 */
export async function processScan(scanId: string): Promise<ProcessScanResult> {
  const warnings: string[] = []

  // 1. Fetch scan record
  const scan = await prisma.productScan.findUnique({
    where: { id: scanId },
    include: {
      images: true,
      user: true,
      product: true,
    },
  })

  if (!scan) {
    throw new Error(`ProductScan with ID "${scanId}" not found`)
  }

  if (scan.images.length === 0) {
    throw new Error(`ProductScan with ID "${scanId}" has no uploaded images to process`)
  }

  // Mark as processing
  await prisma.productScan.update({
    where: { id: scanId },
    data: {
      status: 'PROCESSING',
      ocrStatus: 'PROCESSING',
      identificationStatus: 'PROCESSING',
      ocrError: null,
    },
  })

  const storageService = getStorageService()
  const apiKey = getGeminiApiKey()
  const ocrService = getOcrService()
  const aiService = getProductAnalysisService()

  try {
    // 2. Load image buffers
    const loadedImages: { image: ScanImage; buffer: Buffer; mimeType: string }[] = []

    for (const img of scan.images) {
      try {
        const buffer = await storageService.getBuffer(img.storageKey)
        loadedImages.push({
          image: img,
          buffer,
          mimeType: img.mimeType,
        })
      } catch (err) {
        logger.warn(`Failed to read buffer for image ${img.id}:`, err)
        warnings.push(`Failed to read storage key: ${img.storageKey}`)
      }
    }

    if (loadedImages.length === 0) {
      throw new Error('None of the uploaded images could be read from storage')
    }

    // 3. Handle case where live vision OCR is not configured (missing GEMINI_API_KEY)
    if (!apiKey && ocrService.providerName === 'fallback-mock-ocr') {
      const missingKeyNotice =
        'Live Vision OCR requires GEMINI_API_KEY. Configure your Google Gemini API key in .env.local to activate package reading.'
      warnings.push(missingKeyNotice)

      // Clear declarations and insert NOT_DETECTED place records
      await prisma.extractedDeclaration.deleteMany({ where: { scanId } })

      const emptyAnalysis = await aiService.analyzePackage('')
      await prisma.extractedDeclaration.createMany({
        data: emptyAnalysis.declarations.map((d) => ({
          scanId,
          fieldName: d.fieldName,
          rawValue: null,
          normalizedValue: null,
          confidence: 0,
          detectionStatus: 'NOT_DETECTED',
          sourceText: null,
        })),
      })

      // Update scan as FAILED so it does not falsely claim COMPLETE
      const failedScan = await prisma.productScan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          ocrStatus: 'FAILED',
          ocrError: missingKeyNotice,
          rawOcrText: '',
          identificationStatus: 'FAILED',
          identifiedProductName: null,
          identifiedBrand: null,
          identifiedCategory: null,
          identifiedManufacturer: null,
          identificationConfidence: 0,
        },
        include: {
          images: true,
          extractedDeclarations: true,
          product: true,
        },
      })

      await audit({
        userId: scan.userId,
        action: 'PRODUCT_SCAN',
        entityType: 'ProductScan',
        entityId: scanId,
        metadata: {
          status: 'FAILED',
          reason: 'MISSING_GEMINI_API_KEY',
          warnings,
        },
      })

      return {
        scan: failedScan,
        ocrProvider: ocrService.providerName,
        aiProvider: aiService.providerName,
        warnings,
      }
    }

    // 4. Extract OCR across all images
    const ocrInputs: OcrImageInput[] = loadedImages.map((item) => ({
      imageId: item.image.id,
      buffer: item.buffer,
      mimeType: item.mimeType,
    }))

    const ocrResult = await ocrService.extractText(ocrInputs)

    for (const imgRes of ocrResult.images) {
      try {
        await prisma.scanImage.update({
          where: { id: imgRes.imageId },
          data: { ocrText: imgRes.text || null },
        })
      } catch (err) {
        logger.warn(`Failed to update OCR text on image ${imgRes.imageId}:`, err)
      }
    }

    const combinedOcrText = (ocrResult.rawText || '').trim()
    const hasText = combinedOcrText.length > 0

    // 5. Run AI Package Analysis & Identification
    const analysis = await aiService.analyzePackage(
      combinedOcrText,
      loadedImages.map((i) => ({ buffer: i.buffer, mimeType: i.mimeType }))
    )

    // 6. Persist Declarations (clean slate for this scan)
    await prisma.extractedDeclaration.deleteMany({
      where: { scanId },
    })

    if (analysis.declarations.length > 0) {
      await prisma.extractedDeclaration.createMany({
        data: analysis.declarations.map((d) => ({
          scanId,
          fieldName: d.fieldName,
          rawValue: d.rawValue,
          normalizedValue: d.normalizedValue,
          confidence: d.confidence,
          detectionStatus: d.detectionStatus,
          sourceText: d.sourceText,
        })),
      })
    }

    // 7. Handle Product Entity Linking (only when truly identified)
    let matchedProductId: string | null = scan.productId

    if (
      analysis.product.productName &&
      analysis.product.status === 'IDENTIFIED' &&
      !matchedProductId
    ) {
      try {
        const existing = await prisma.product.findFirst({
          where: {
            name: { equals: analysis.product.productName, mode: 'insensitive' },
            ...(analysis.product.brand
              ? { brand: { equals: analysis.product.brand, mode: 'insensitive' } }
              : {}),
          },
        })

        if (existing) {
          matchedProductId = existing.id
        } else {
          const created = await prisma.product.create({
            data: {
              name: analysis.product.productName,
              brand: analysis.product.brand,
              category: analysis.product.category,
              manufacturer: analysis.product.likelyManufacturer,
            },
          })
          matchedProductId = created.id
        }
      } catch (err) {
        logger.warn('Failed to link or create Product repository entity:', err)
      }
    }

    // 8. Update Scan with final completed state
    const ocrStatus = hasText ? 'COMPLETED' : 'COMPLETED'
    const ocrError = !hasText ? 'No legible packaging text detected on the uploaded image(s)' : null
    if (ocrError) warnings.push(ocrError)

    const updatedScan = await prisma.productScan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETE',
        productId: matchedProductId,
        rawOcrText: combinedOcrText,
        ocrStatus,
        identificationStatus: analysis.product.status,
        identifiedProductName: analysis.product.productName,
        identifiedBrand: analysis.product.brand,
        identifiedCategory: analysis.product.category,
        identifiedManufacturer: analysis.product.likelyManufacturer,
        identificationConfidence: analysis.product.confidence,
        ocrError: warnings.length > 0 ? warnings.join('; ') : null,
      },
      include: {
        images: true,
        extractedDeclarations: true,
        product: true,
      },
    })

    // 9. Record audit log
    await audit({
      userId: scan.userId,
      action: 'PRODUCT_SCAN',
      entityType: 'ProductScan',
      entityId: scanId,
      metadata: {
        ocrProvider: ocrService.providerName,
        aiProvider: aiService.providerName,
        declarationsCount: analysis.declarations.length,
        identifiedProduct: analysis.product.productName,
        confidence: analysis.product.confidence,
        status: analysis.product.status,
        warnings,
      },
    })

    return {
      scan: updatedScan,
      ocrProvider: ocrService.providerName,
      aiProvider: aiService.providerName,
      warnings,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(`Scan processing failed for scan ${scanId}:`, err)

    await prisma.productScan.update({
      where: { id: scanId },
      data: {
        status: 'FAILED',
        ocrStatus: 'FAILED',
        identificationStatus: 'FAILED',
        ocrError: errorMessage,
      },
    })

    throw err
  }
}
