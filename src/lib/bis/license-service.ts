import { prisma } from '@/lib/prisma'
import type { PrismaClient } from '@prisma/client'
import type {
  ILicenseService,
  LicenseVerificationResult,
  VerifyCmlInput,
  VerifyCrsInput,
  VerifyHuidInput,
} from './types'
import { DEMO_LICENSES } from './mock-data'

export class BisLicenseService implements ILicenseService {
  private db: PrismaClient

  constructor(client?: PrismaClient) {
    this.db = client ?? prisma
  }

  /**
   * Validates and verifies an ISI Certification Marks License (CML) number.
   * Standard format: CM/L-XXXXXXX (7 digits)
   */
  async verifyCml(input: VerifyCmlInput): Promise<LicenseVerificationResult> {
    const raw = (input.cmlNumber || '').trim().toUpperCase()
    const match = raw.match(/^(?:CM\/L-?|CML-?)?(\d{7})$/)

    if (!match) {
      return {
        isValid: false,
        status: 'INVALID_FORMAT',
        licenseType: 'ISI_CML',
        licenseNumber: raw,
        isDemoRecord: false,
        message: 'Invalid CML format. A valid BIS ISI License number must contain exactly 7 numeric digits (e.g. CM/L-8400123).',
      }
    }

    const normalizedNumber = `CM/L-${match[1]}`

    // 1. Check database
    try {
      const dbLicense = await this.db.bisLicense.findFirst({
        where: {
          licenseNumber: normalizedNumber,
          licenseType: 'ISI_CML',
        },
      })

      if (dbLicense) {
        return {
          isValid: dbLicense.status === 'OPERATIVE',
          status: dbLicense.status as any,
          licenseType: 'ISI_CML',
          licenseNumber: dbLicense.licenseNumber,
          standardNumber: dbLicense.standardNumber,
          licenseeName: dbLicense.licenseeName,
          brandName: dbLicense.brandName,
          factoryAddress: dbLicense.factoryAddress,
          validFrom: dbLicense.validFrom?.toISOString(),
          validUntil: dbLicense.validUntil?.toISOString(),
          productCategory: dbLicense.productCategory,
          varietyDescription: dbLicense.varietyDescription,
          details: dbLicense.metadata as any,
          isDemoRecord: dbLicense.isDemoRecord,
          message:
            dbLicense.status === 'OPERATIVE'
              ? `Valid Operative BIS ISI License found for ${dbLicense.licenseeName}.`
              : `BIS ISI License ${normalizedNumber} is ${dbLicense.status}.`,
        }
      }
    } catch {
      // Fall through to mock dataset
    }

    // 2. Check deterministic demo catalog
    const mock = DEMO_LICENSES.find(
      (l) => l.licenseType === 'ISI_CML' && l.licenseNumber === normalizedNumber
    )
    if (mock) {
      return mock
    }

    // 3. Valid format but not found in repository
    return {
      isValid: false,
      status: 'NOT_FOUND',
      licenseType: 'ISI_CML',
      licenseNumber: normalizedNumber,
      isDemoRecord: false,
      message: `CML number ${normalizedNumber} is syntactically valid but was not found in the local BIS registry catalog.`,
    }
  }

  /**
   * Validates and verifies a Compulsory Registration Scheme (CRS) number.
   * Standard format: R-XXXXXXXX (8 digits)
   */
  async verifyCrs(input: VerifyCrsInput): Promise<LicenseVerificationResult> {
    const raw = (input.registrationNumber || '').trim().toUpperCase()
    const match = raw.match(/^(?:R-?)?(\d{8})$/)

    if (!match) {
      return {
        isValid: false,
        status: 'INVALID_FORMAT',
        licenseType: 'CRS_REGISTRATION',
        licenseNumber: raw,
        isDemoRecord: false,
        message: 'Invalid CRS format. A valid BIS Compulsory Registration number must contain exactly 8 numeric digits prefixed with R- (e.g. R-41009876).',
      }
    }

    const normalizedNumber = `R-${match[1]}`

    // 1. Check database
    try {
      const dbLicense = await this.db.bisLicense.findFirst({
        where: {
          licenseNumber: normalizedNumber,
          licenseType: 'CRS_REGISTRATION',
        },
      })

      if (dbLicense) {
        return {
          isValid: dbLicense.status === 'OPERATIVE',
          status: dbLicense.status as any,
          licenseType: 'CRS_REGISTRATION',
          licenseNumber: dbLicense.licenseNumber,
          standardNumber: dbLicense.standardNumber,
          licenseeName: dbLicense.licenseeName,
          brandName: dbLicense.brandName,
          factoryAddress: dbLicense.factoryAddress,
          validFrom: dbLicense.validFrom?.toISOString(),
          validUntil: dbLicense.validUntil?.toISOString(),
          productCategory: dbLicense.productCategory,
          varietyDescription: dbLicense.varietyDescription,
          details: dbLicense.metadata as any,
          isDemoRecord: dbLicense.isDemoRecord,
          message:
            dbLicense.status === 'OPERATIVE'
              ? `Valid Operative BIS CRS Registration found for ${dbLicense.licenseeName}.`
              : `BIS CRS Registration ${normalizedNumber} is ${dbLicense.status}.`,
        }
      }
    } catch {
      // Fall through to mock dataset
    }

    // 2. Check mock catalog
    const mock = DEMO_LICENSES.find(
      (l) => l.licenseType === 'CRS_REGISTRATION' && l.licenseNumber === normalizedNumber
    )
    if (mock) {
      return mock
    }

    return {
      isValid: false,
      status: 'NOT_FOUND',
      licenseType: 'CRS_REGISTRATION',
      licenseNumber: normalizedNumber,
      isDemoRecord: false,
      message: `CRS registration ${normalizedNumber} is syntactically valid but was not found in the local BIS registry catalog.`,
    }
  }

  /**
   * Validates and verifies a Hallmarking Unique Identification (HUID) code.
   * Standard format: 6 alphanumeric characters (e.g. AB12CD)
   */
  async verifyHuid(input: VerifyHuidInput): Promise<LicenseVerificationResult> {
    const raw = (input.huid || '').trim().toUpperCase()
    const match = raw.match(/^(?:HUID:?)?([A-Z0-9]{6})$/)

    if (!match) {
      return {
        isValid: false,
        status: 'INVALID_FORMAT',
        licenseType: 'HALLMARK_HUID',
        licenseNumber: raw,
        isDemoRecord: false,
        message: 'Invalid HUID format. A valid BIS Hallmarking Unique Identification (HUID) must contain exactly 6 alphanumeric characters (e.g. AB12CD).',
      }
    }

    const code = match[1]
    const normalizedNumber = `HUID:${code}`

    // 1. Check database
    try {
      const dbLicense = await this.db.bisLicense.findFirst({
        where: {
          licenseNumber: normalizedNumber,
          licenseType: 'HALLMARK_HUID',
        },
      })

      if (dbLicense) {
        return {
          isValid: dbLicense.status === 'OPERATIVE',
          status: dbLicense.status as any,
          licenseType: 'HALLMARK_HUID',
          licenseNumber: dbLicense.licenseNumber,
          standardNumber: dbLicense.standardNumber,
          licenseeName: dbLicense.licenseeName,
          brandName: dbLicense.brandName,
          productCategory: dbLicense.productCategory,
          details: dbLicense.metadata as any,
          isDemoRecord: dbLicense.isDemoRecord,
          message: `Authentic 6-character HUID (${code}) verified successfully.`,
        }
      }
    } catch {
      // Fall through to mock dataset
    }

    // 2. Check mock catalog
    const mock = DEMO_LICENSES.find(
      (l) => l.licenseType === 'HALLMARK_HUID' && l.licenseNumber === normalizedNumber
    )
    if (mock) {
      return mock
    }

    return {
      isValid: false,
      status: 'NOT_FOUND',
      licenseType: 'HALLMARK_HUID',
      licenseNumber: normalizedNumber,
      isDemoRecord: false,
      message: `HUID code ${code} is syntactically valid (6 alphanumeric characters) but was not found in the local registry catalog.`,
    }
  }
}

export const defaultBisLicenseService = new BisLicenseService()
