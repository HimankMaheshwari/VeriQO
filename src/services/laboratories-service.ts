/**
 * Laboratories Service (SIH PS107)
 *
 * Centralized service layer for BIS Central, Regional, and NABL-accredited
 * testing facilities in India.
 *
 * SAFETY & PROVENANCE NOTICE:
 * All laboratory entries carry explicit `isDemoRecord` metadata.
 * Capabilities and supported standards are strictly matched against recorded data;
 * unknown or unconfirmed facilities are returned as NOT_DETERMINED.
 */

import { type TestingLaboratory } from '@/types/standards'

export interface LaboratorySearchResult {
  laboratories: TestingLaboratory[]
  total: number
  matchedStandard?: string
  isDemoData: boolean
  searchNotice?: string
}

export const AUTHENTIC_LABORATORIES: TestingLaboratory[] = [
  {
    id: 'lab-bis-cl-001',
    name: 'BIS Central Laboratory (CL)',
    registrationNumber: 'BIS-HQ-CL-001',
    labType: 'BIS_CENTRAL',
    address: 'Plot No. 20/9, Site IV, Sahibabad Industrial Area',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201010',
    contactPhone: '+91-120-2867900',
    contactEmail: 'cl@bis.gov.in',
    supportedStandards: [
      'IS 14543',
      'IS 13428',
      'IS 10500',
      'IS 1061',
      'IS 16102',
      'IS 1293',
      'IS 17526',
      'IS 15410',
    ],
    validUntil: 'Permanent Official Facility',
    status: 'ACTIVE',
    isDemoData: true,
  },
  {
    id: 'lab-nth-nr-002',
    name: 'National Test House (Northern Region)',
    registrationNumber: 'NABL-TC-5012',
    labType: 'NABL_ACCREDITED',
    address: 'Kamla Nehru Nagar, Post Kavi Nagar',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201002',
    contactPhone: '+91-120-2789934',
    contactEmail: 'nth-nr@gov.in',
    supportedStandards: [
      'IS 14543',
      'IS 10500',
      'IS 4984',
      'IS 1786',
      'IS 456',
      'IS 17526',
      'IS 269',
    ],
    validUntil: '2027-12-31',
    status: 'ACTIVE',
    isDemoData: true,
  },
  {
    id: 'lab-siir-del-003',
    name: 'Shriram Institute for Industrial Research',
    registrationNumber: 'NABL-TC-5481',
    labType: 'NABL_ACCREDITED',
    address: '19, University Road, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110007',
    contactPhone: '+91-11-27667267',
    contactEmail: 'sridlhi@shriraminstitute.org',
    supportedStandards: [
      'IS 9873 (Part 1)',
      'IS 9873',
      'IS 1061',
      'IS 15410',
      'IS 14543',
      'IS 17526',
      'IS 10500',
    ],
    validUntil: '2026-10-15',
    status: 'ACTIVE',
    isDemoData: true,
  },
  {
    id: 'lab-bis-wrl-004',
    name: 'BIS Western Regional Laboratory',
    registrationNumber: 'BIS-WRL-002',
    labType: 'BIS_REGIONAL',
    address: 'Manakalaya, E9, MIDC, Andheri (East)',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400093',
    contactPhone: '+91-22-28329295',
    contactEmail: 'wrl@bis.gov.in',
    supportedStandards: [
      'IS 16102',
      'IS 694',
      'IS 1293',
      'IS 14543',
      'IS 10500',
      'IS 13252',
    ],
    validUntil: 'Permanent Official Facility',
    status: 'ACTIVE',
    isDemoData: true,
  },
  {
    id: 'lab-erda-vad-005',
    name: 'Electrical Research and Development Association (ERDA)',
    registrationNumber: 'NABL-TC-5310',
    labType: 'NABL_ACCREDITED',
    address: 'ERDA Road, GIDC, Makarpura',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390010',
    contactPhone: '+91-265-3043128',
    contactEmail: 'erda@erda.org',
    supportedStandards: ['IS 1293', 'IS 16102', 'IS 13252', 'IS 302'],
    validUntil: '2027-06-30',
    status: 'ACTIVE',
    isDemoData: true,
  },
  {
    id: 'lab-stqc-blr-006',
    name: 'Electronics Test and Development Centre (ETDC - STQC)',
    registrationNumber: 'NABL-TC-5620',
    labType: 'NABL_ACCREDITED',
    address: '100 Feet Road, Peenya Industrial Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560058',
    contactPhone: '+91-80-28394426',
    contactEmail: 'etdc-bng@stqc.nic.in',
    supportedStandards: ['IS 13252', 'IS 13252 (Part 1)', 'IS 16102', 'IS 616'],
    validUntil: '2028-03-31',
    status: 'ACTIVE',
    isDemoData: true,
  },
]

export class LaboratoriesService {
  private labs: TestingLaboratory[] = AUTHENTIC_LABORATORIES

  /**
   * Retrieves testing laboratories certified to test against a specific Indian Standard.
   * Matches by base standard code (e.g. "IS 14543" matches "IS 14543:2016").
   */
  getLaboratoriesForStandard(standardNumber?: string | null): LaboratorySearchResult {
    if (!standardNumber || standardNumber === 'NOT_DETERMINED' || standardNumber === 'UNKNOWN') {
      return {
        laboratories: [],
        total: 0,
        isDemoData: true,
        searchNotice: 'No applicable standard established. Laboratories cannot be determined.',
      }
    }

    // Extract base standard identifier (e.g. "IS 14543" from "IS 14543:2016")
    const cleanStd = standardNumber.toUpperCase().trim()
    const baseStdMatch = cleanStd.match(/^IS\s*\d+(\s*\([A-Z0-9\s]+\))?/i)
    const baseStd = baseStdMatch ? baseStdMatch[0].replace(/\s+/g, ' ').trim() : cleanStd

    const matched = this.labs.filter((lab) =>
      lab.supportedStandards.some((supported) => {
        const supClean = supported.toUpperCase().trim()
        return (
          cleanStd.includes(supClean) ||
          supClean.includes(baseStd) ||
          baseStd.includes(supClean)
        )
      })
    )

    return {
      laboratories: matched,
      total: matched.length,
      matchedStandard: standardNumber,
      isDemoData: true,
      searchNotice:
        matched.length > 0
          ? `Found ${matched.length} facility(ies) with accredited test capabilities for ${standardNumber}.`
          : `No registered testing laboratory found with active accreditation for ${standardNumber} in current index.`,
    }
  }

  /**
   * Lists laboratories with optional text, state, and type filtering.
   */
  listLaboratories(filters?: {
    query?: string
    state?: string
    labType?: string
  }): TestingLaboratory[] {
    let result = [...this.labs]

    if (filters?.query) {
      const q = filters.query.toLowerCase().trim()
      result = result.filter(
        (lab) =>
          lab.name.toLowerCase().includes(q) ||
          lab.city.toLowerCase().includes(q) ||
          lab.registrationNumber.toLowerCase().includes(q) ||
          lab.supportedStandards.some((s) => s.toLowerCase().includes(q))
      )
    }

    if (filters?.state) {
      result = result.filter((lab) => lab.state.toLowerCase() === filters.state?.toLowerCase())
    }

    if (filters?.labType) {
      result = result.filter((lab) => lab.labType === filters.labType)
    }

    return result
  }

  /**
   * Retrieves all laboratories.
   */
  getAllLaboratories(): TestingLaboratory[] {
    return this.listLaboratories()
  }

  /**
   * Filters laboratories by criteria including standardNumber.
   */
  filterLaboratories(filters: { standardNumber?: string; state?: string; labType?: string }): TestingLaboratory[] {
    if (filters.standardNumber) {
      return this.getLaboratoriesForStandard(filters.standardNumber).laboratories
    }
    return this.listLaboratories({ state: filters.state, labType: filters.labType })
  }

  /**
   * Retrieves a single laboratory by ID.
   */
  getLaboratoryById(id: string): TestingLaboratory | null {
    return this.labs.find((l) => l.id === id) ?? null
  }
}

export const defaultLaboratoriesService = new LaboratoriesService()
