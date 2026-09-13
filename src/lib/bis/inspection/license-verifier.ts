/**
 * LicenseVerifier — Connects detected packaging identifiers to BisLicenseService.
 *
 * RULES:
 * 1. Consumes existing BisLicenseService (CML, CRS, HUID).
 * 2. Propagates isDemoRecord provenance from the license record.
 * 3. Never presents demo verification as official live verification.
 * 4. Maps results to VERIFIED, NOT_VERIFIED, UNKNOWN.
 */

import { BisLicenseService } from '@/lib/bis/license-service'
import type { BisDetectedIdentifier, BisVerificationSummary } from '@/types/bis-inspection'

export class LicenseVerifier {
  private licenseService: BisLicenseService

  constructor(licenseService?: BisLicenseService) {
    this.licenseService = licenseService ?? new BisLicenseService()
  }

  /**
   * Verifies all detected statutory license identifiers against the BIS registry/demo database.
   */
  async verifyDetectedIdentifiers(identifiers: BisDetectedIdentifier[]): Promise<BisVerificationSummary[]> {
    const summaries: BisVerificationSummary[] = []

    for (const id of identifiers) {
      if (id.state !== 'DETECTED' || !id.normalizedValue) {
        continue
      }

      if (id.type === 'CML_NUMBER') {
        try {
          const res = await this.licenseService.verifyCml({ cmlNumber: id.normalizedValue })
          summaries.push({
            identifierType: 'CML_NUMBER',
            identifierValue: id.normalizedValue,
            status: res.isValid ? 'VERIFIED' : 'NOT_VERIFIED',
            details: res,
            isDemoRecord: res.isDemoRecord,
          })
        } catch {
          summaries.push({
            identifierType: 'CML_NUMBER',
            identifierValue: id.normalizedValue,
            status: 'UNKNOWN',
            details: null,
            isDemoRecord: false,
          })
        }
      } else if (id.type === 'CRS_REGISTRATION') {
        try {
          const res = await this.licenseService.verifyCrs({ registrationNumber: id.normalizedValue })
          summaries.push({
            identifierType: 'CRS_REGISTRATION',
            identifierValue: id.normalizedValue,
            status: res.isValid ? 'VERIFIED' : 'NOT_VERIFIED',
            details: res,
            isDemoRecord: res.isDemoRecord,
          })
        } catch {
          summaries.push({
            identifierType: 'CRS_REGISTRATION',
            identifierValue: id.normalizedValue,
            status: 'UNKNOWN',
            details: null,
            isDemoRecord: false,
          })
        }
      } else if (id.type === 'HALLMARK_HUID') {
        try {
          const res = await this.licenseService.verifyHuid({ huid: id.normalizedValue })
          summaries.push({
            identifierType: 'HALLMARK_HUID',
            identifierValue: id.normalizedValue,
            status: res.isValid ? 'VERIFIED' : 'NOT_VERIFIED',
            details: res,
            isDemoRecord: res.isDemoRecord,
          })
        } catch {
          summaries.push({
            identifierType: 'HALLMARK_HUID',
            identifierValue: id.normalizedValue,
            status: 'UNKNOWN',
            details: null,
            isDemoRecord: false,
          })
        }
      }
    }

    return summaries
  }
}

export const defaultLicenseVerifier = new LicenseVerifier()
