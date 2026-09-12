/**
 * Service interfaces and domain types for BIS & Indian Standards modules.
 */

export * from '@/types/bis'

import type {
  BisStandardDetail,
  BisStandardItem,
  StandardSearchFilters,
  LicenseVerificationResult,
  VerifyCmlInput,
  VerifyCrsInput,
  VerifyHuidInput,
  QualityControlOrderItem,
  QcoCheckInput,
  QcoCheckResult,
} from '@/types/bis'

export interface IStandardsService {
  searchStandards(filters: StandardSearchFilters): Promise<{ standards: BisStandardItem[]; total: number; page: number; pageSize: number }>
  getStandardById(id: string): Promise<BisStandardDetail | null>
  getStandardByNumber(standardNumber: string): Promise<BisStandardDetail>
}

export interface ILicenseService {
  verifyCml(input: VerifyCmlInput): Promise<LicenseVerificationResult>
  verifyCrs(input: VerifyCrsInput): Promise<LicenseVerificationResult>
  verifyHuid(input: VerifyHuidInput): Promise<LicenseVerificationResult>
}

export interface IQcoService {
  listQcos(): Promise<QualityControlOrderItem[]>
  checkQcoApplicability(input: QcoCheckInput): Promise<QcoCheckResult>
}
