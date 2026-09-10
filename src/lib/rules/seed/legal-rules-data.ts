import type { RuleConditionGroup } from '../types'
import type { RuleSeverity } from '../types'

export interface StatutoryRuleSeed {
  id?: string
  ruleNumber: string
  title: string
  requirement: string
  applicability: string
  ruleCategory: string
  defaultSeverity: RuleSeverity
  productCategoryId: string | null
  applicabilityCriteria?: RuleConditionGroup | null
  sourceDocument: string
  sourceReference: string
  publicationGazette: string
  remediationGuidance: string
  effectiveDate: Date
  expiryDate: Date | null
  conditions: RuleConditionGroup
  exceptions: RuleConditionGroup[]
  versions: Array<{
    versionNumber: number
    effectiveDate: Date
    expiryDate?: Date | null
    changeDescription: string
    snapshot: Record<string, any>
  }>
}

/**
 * Verified Indian Legal Metrology Statutory Rule Catalog.
 *
 * Grounded in:
 * - The Legal Metrology Act, 2009 (Act No. 1 of 2010)
 * - The Legal Metrology (Packaged Commodities) Rules, 2011 (G.S.R. 202(E) as amended)
 *
 * Centralized Statutory Gates (Handled in applicability-evaluator.ts):
 * 1. Rule 3 Chapter II Gate:
 *    - Quantity threshold: packages > 25kg or > 25L are exempt (cement/fertilizer exempt only if > 50kg).
 *    - Industrial & Institutional consumers: exempt from Chapter II retail rules.
 * 2. Rule 26(a) Small Package Exemption Gate:
 *    - Packages containing <= 10g or <= 10ml are exempt from Chapter II rules (Proviso omitted vide G.S.R. 784(E) w.e.f. 01/07/2012).
 *    - Proviso 1 (G.S.R. 385(E)): Tobacco products are excluded from exemption.
 *    - Proviso 2 (G.S.R. 881(E)): Pan Masala is excluded from exemption w.e.f. 01/02/2026.
 *
 * Rules withheld for manual review / physical measurement (REQUIRES_REVIEW):
 * 1. Physical millimeter font height on uncalibrated images (Rule 9 / Second Schedule) -> Evaluates as advisory WARNING only.
 * 2. Third Schedule pre-determined pack sizes -> Withheld due to G.S.R. 779(E) deregulation in favor of Unit Sale Price.
 * 3. FSSAI food licensing & nutritional declarations -> Withheld to separate food safety from Legal Metrology.
 */
export const VERIFIED_STATUTORY_RULES: StatutoryRuleSeed[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Rule 6(1)(a): Manufacturer, Packer, or Importer Identity
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-a',
    ruleNumber: 'LMPC-2011-R06-1-A',
    title: 'Name and Address of Manufacturer, Packer, or Importer',
    requirement:
      'Every package must declare the name and complete physical address of the manufacturer, or where the manufacturer is not the packer, both the manufacturer and packer; and for imported packages, the name and address of the importer (Rule 6(1)(a)).',
    applicability: 'Chapter II retail packaged commodities in India.',
    ruleCategory: 'MANDATORY_DECLARATION',
    defaultSeverity: 'HIGH',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(a) read with Section 18 of the Legal Metrology Act, 2009',
    publicationGazette: 'G.S.R. 202(E) dated 7th March 2011',
    remediationGuidance:
      'Declare the complete name and physical address of the manufacturer or packer. When brand name or "Marketed by" is stated, the underlying manufacturer/packer must still be declared.',
    effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'AND',
      conditions: [
        {
          operator: 'OR',
          conditions: [
            {
              field: 'declarations.manufacturer',
              operator: 'EXISTS',
              failureMessage: 'Manufacturer identity is missing',
            },
            {
              field: 'declarations.packer',
              operator: 'EXISTS',
              failureMessage: 'Packer identity is missing',
            },
            {
              field: 'declarations.importer',
              operator: 'EXISTS',
              failureMessage: 'Importer identity is missing',
            },
          ],
        },
        {
          field: 'declarations.address',
          operator: 'EXISTS',
          failureMessage: 'Complete physical address of manufacturer/packer/importer is missing',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        changeDescription: 'Initial enactment under G.S.R. 202(E)',
        snapshot: {
          title: 'Name and Address of Manufacturer, Packer, or Importer',
          requirement:
            'Every package must declare the name and complete physical address of the manufacturer, packer, or importer.',
          defaultSeverity: 'HIGH',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Rule 6(1)(b): Generic or Common Name of Commodity
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-b',
    ruleNumber: 'LMPC-2011-R06-1-B',
    title: 'Common or Generic Name of the Commodity',
    requirement:
      'Every package must declare the common or generic name of the commodity contained in the package (Rule 6(1)(b)).',
    applicability: 'Chapter II retail packaged commodities in India.',
    ruleCategory: 'MANDATORY_DECLARATION',
    defaultSeverity: 'MEDIUM',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(b) read with Section 18 of the Legal Metrology Act, 2009',
    publicationGazette: 'G.S.R. 202(E) dated 7th March 2011',
    remediationGuidance:
      'Print the common or generic name of the commodity prominently on the principal display panel.',
    effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'OR',
      conditions: [
        {
          field: 'declarations.product_name',
          operator: 'EXISTS',
          failureMessage: 'Generic or common name of commodity is missing from packaging',
        },
        {
          field: 'product.name',
          operator: 'EXISTS',
          failureMessage: 'Generic or common name of commodity is missing',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        changeDescription: 'Initial enactment under G.S.R. 202(E)',
        snapshot: {
          title: 'Common or Generic Name of the Commodity',
          defaultSeverity: 'MEDIUM',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. Rule 6(1)(c) & Rule 7: Net Quantity in Standard Metric Units
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-c',
    ruleNumber: 'LMPC-2011-R06-1-C',
    title: 'Net Quantity Declaration in Standard Metric Units',
    requirement:
      'The net quantity of the commodity contained in the package must be declared in terms of standard metric units (mg, g, kg, ml, l, m, cm, mm, or number). Non-metric units (e.g. lbs, oz) are prohibited under Section 11 of the Legal Metrology Act.',
    applicability: 'Chapter II retail packaged commodities sold by weight, measure, or count.',
    ruleCategory: 'QUANTITY_AND_UNITS',
    defaultSeverity: 'HIGH',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(c), Rule 7, Rule 13, and Section 11 & 36 of Legal Metrology Act, 2009',
    publicationGazette: 'G.S.R. 202(E) dated 7th March 2011',
    remediationGuidance:
      'Declare net quantity in approved SI units (mg, g, kg, ml, l, m, cm, mm, or number). Remove any non-metric or imperial units.',
    effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.net_quantity',
          operator: 'EXISTS',
          failureMessage: 'Net quantity declaration is missing from package',
        },
        {
          field: 'declarations.net_quantity.rawValue',
          operator: 'MATCHES_REGEX',
          value: '(?i)\\b(\\d+(\\.\\d+)?)\\s*(mg|g|kg|ml|l|ltr|litres?|m|cm|mm|units?|pieces?|pcs|n|no)\\b',
          failureMessage: 'Net quantity must declare standard SI metric units (mg, g, kg, ml, l, m, cm, mm, or number)',
        },
        {
          field: 'declarations.net_quantity.rawValue',
          operator: 'NOT_CONTAINS',
          value: 'lbs',
          params: { caseSensitive: false },
          failureMessage: 'Non-metric imperial units (lbs) are prohibited under Section 11 of Legal Metrology Act',
        },
        {
          field: 'declarations.net_quantity.rawValue',
          operator: 'NOT_CONTAINS',
          value: 'ounce',
          params: { caseSensitive: false },
          failureMessage: 'Non-metric imperial units (ounces) are prohibited under Section 11 of Legal Metrology Act',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        changeDescription: 'Initial enactment under G.S.R. 202(E)',
        snapshot: {
          title: 'Net Quantity Declaration in Standard Metric Units',
          defaultSeverity: 'HIGH',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Rule 6(1)(d): Month and Year of Manufacture / Packing / Import
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-d',
    ruleNumber: 'LMPC-2011-R06-1-D',
    title: 'Month and Year of Manufacture, Packing, or Import',
    requirement:
      'The month and year in which the commodity is manufactured or pre-packed or imported must be declared on every package (Rule 6(1)(d)).',
    applicability: 'Chapter II retail packaged commodities in India.',
    ruleCategory: 'MANDATORY_DECLARATION',
    defaultSeverity: 'HIGH',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(d) amended vide G.S.R. 779(E) and G.S.R. 238(E)',
    publicationGazette: 'G.S.R. 202(E) dated 7th March 2011, amended by G.S.R. 779(E) dated 2nd November 2021',
    remediationGuidance:
      'Stamp or print the month and year of manufacture or packing in readable format (MM/YYYY or Month YYYY) on each unit.',
    effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'OR',
      conditions: [
        {
          field: 'declarations.date_of_packing',
          operator: 'DATE_FORMAT_VALID',
          failureMessage: 'Date of packing is missing or has invalid date format',
        },
        {
          field: 'declarations.date_of_manufacture',
          operator: 'DATE_FORMAT_VALID',
          failureMessage: 'Date of manufacture is missing or has invalid date format',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        changeDescription: 'Initial enactment under G.S.R. 202(E)',
        snapshot: {
          title: 'Month and Year of Manufacture, Packing, or Import',
          defaultSeverity: 'HIGH',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Rule 6(1)(da): Country of Origin for Imported Products
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-da',
    ruleNumber: 'LMPC-2011-R06-1-DA',
    title: 'Country of Origin Declaration for Imported Commodities',
    requirement:
      'The name of the country of origin or manufacture or assembly in case of imported products must be declared on the package (Rule 6(1)(da)).',
    applicability: 'Imported pre-packaged commodities sold in India.',
    ruleCategory: 'MANDATORY_DECLARATION',
    defaultSeverity: 'MEDIUM',
    productCategoryId: null,
    // Strictly applicable to imported commodities where an importer or country of origin is declared/present
    applicabilityCriteria: {
      operator: 'OR',
      conditions: [
        {
          field: 'declarations.importer',
          operator: 'EXISTS',
        },
        {
          field: 'declarations.country_of_origin',
          operator: 'EXISTS',
        },
      ],
    },
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(da) inserted vide G.S.R. 629(E)',
    publicationGazette: 'G.S.R. 629(E) dated 23rd June 2017',
    remediationGuidance:
      'Clearly specify the country of origin or manufacture on the principal display panel of the imported product.',
    effectiveDate: new Date('2018-01-01T00:00:00.000Z'),
    expiryDate: null,
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.country_of_origin',
          operator: 'EXISTS',
          failureMessage: 'Country of origin is missing for imported packaged commodity',
        },
      ],
    },
    exceptions: [],
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2018-01-01T00:00:00.000Z'),
        changeDescription: 'Inserted vide G.S.R. 629(E) effective 1st January 2018',
        snapshot: {
          title: 'Country of Origin Declaration for Imported Commodities',
          defaultSeverity: 'MEDIUM',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Rule 6(1)(e): Maximum Retail Price (MRP) Inclusive of All Taxes
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-e',
    ruleNumber: 'LMPC-2011-R06-1-E',
    title: 'Maximum Retail Price (MRP) Inclusive of All Taxes',
    requirement:
      'The retail sale price of the package shall clearly indicate that it is the Maximum Retail Price inclusive of all taxes, formatted as "MRP Rs. ... incl. of all taxes" or "MRP ₹ ... (incl. of all taxes)" (Rule 6(1)(e)). Charging above declared MRP is an offence under Section 36(1).',
    applicability: 'Chapter II retail packaged commodities in India.',
    ruleCategory: 'PRICING_AND_USP',
    defaultSeverity: 'HIGH',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(e) read with Section 18 and Section 36(1) of Legal Metrology Act, 2009',
    publicationGazette: 'G.S.R. 202(E) dated 7th March 2011',
    remediationGuidance:
      'Print MRP in rupees and paise with the phrase "inclusive of all taxes" or "(incl. of all taxes)". Selling above declared MRP is punishable under Section 36(1).',
    effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.mrp',
          operator: 'EXISTS',
          failureMessage: 'Maximum Retail Price (MRP) declaration is missing from package',
        },
        {
          field: 'declarations.mrp',
          operator: 'NUMERIC_GT',
          value: 0,
          failureMessage: 'Maximum Retail Price must be a positive numerical value greater than 0',
        },
        {
          field: 'declarations.mrp.sourceEvidence',
          operator: 'MATCHES_REGEX',
          value: 'm\\.?r\\.?p\\.?|max(imum)?\\s*retail\\s*price',
          failureMessage: 'Price declaration must clearly state "MRP" or "Maximum Retail Price"',
        },
        {
          field: 'declarations.mrp.sourceEvidence',
          operator: 'MATCHES_REGEX',
          value: 'incl(usive)?\\.?\\s*(of)?\\s*all\\s*taxes',
          failureMessage: 'Maximum Retail Price must be declared inclusive of all taxes',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        changeDescription: 'Initial enactment under G.S.R. 202(E)',
        snapshot: {
          title: 'Maximum Retail Price (MRP) Inclusive of All Taxes',
          defaultSeverity: 'HIGH',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 7. Rule 6(1)(ea): Unit Sale Price (USP)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-ea',
    ruleNumber: 'LMPC-2011-R06-1-EA',
    title: 'Unit Sale Price (USP) for Pre-packaged Commodities',
    requirement:
      'Mandatory w.e.f. 01/12/2022: Unit sale price in rupees, rounded off to the nearest two decimal places, per gram, or per millilitre, or per centimetre, or per piece, for packages containing quantity less than 1kg/1l/1m/1piece; or per kilogram, per litre, per metre, per number for packages containing quantity more than 1kg/1l/1m/1number (Rule 6(1)(ea)).',
    applicability: 'Chapter II retail pre-packaged commodities manufactured/packed on or after 01/12/2022.',
    ruleCategory: 'PRICING_AND_USP',
    defaultSeverity: 'MEDIUM',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(ea) inserted vide G.S.R. 779(E) dated 02/11/2021, commenced w.e.f. 01/12/2022 vide G.S.R. 720(E)',
    publicationGazette: 'G.S.R. 720(E) dated 21st September 2022',
    remediationGuidance:
      'Declare Unit Sale Price in ₹ per standard metric unit (e.g. ₹/g, ₹/kg, ₹/ml, ₹/l, or ₹/piece) alongside the retail price.',
    effectiveDate: new Date('2022-12-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'OR',
      conditions: [
        {
          field: 'declarations.unit_sale_price.sourceEvidence',
          operator: 'MATCHES_REGEX',
          value: '(?:\/|\\bper)\\s*(?:g|kg|gm|gms|gram|grams|ml|l|ltr|litre|litres|cm|m|meter|piece|unit|item|number|no)\\b',
          failureMessage: 'Unit Sale Price (USP) declaration is missing or not formatted per Rule 6(1)(ea)',
        },
        {
          field: 'declarations.mrp.sourceEvidence',
          operator: 'MATCHES_REGEX',
          value: '(?:\/|\\bper)\\s*(?:g|kg|gm|gms|gram|grams|ml|l|ltr|litre|litres|cm|m|meter|piece|unit|item|number|no)\\b',
          failureMessage: 'Unit Sale Price (USP) declaration is missing or not formatted per Rule 6(1)(ea)',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        expiryDate: new Date('2022-11-30T23:59:59.999Z'),
        changeDescription: 'Pre-amendment period prior to mandatory Unit Sale Price',
        snapshot: {
          title: 'Unit Sale Price (Pre-Commencement Advisory)',
          requirement: 'Voluntary / Advisory prior to 1st December 2022.',
          defaultSeverity: 'LOW',
          conditions: { operator: 'AND', conditions: [] },
        },
      },
      {
        versionNumber: 2,
        effectiveDate: new Date('2022-12-01T00:00:00.000Z'),
        changeDescription: 'Mandatory enforcement w.e.f. 1st December 2022 under G.S.R. 779(E) & G.S.R. 720(E)',
        snapshot: {
          title: 'Unit Sale Price (USP) for Pre-packaged Commodities',
          requirement: 'Mandatory declaration of Unit Sale Price rounded to two decimals.',
          defaultSeverity: 'MEDIUM',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 8. Rule 6(1)(f): Consumer Care Contact Details
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r06-1-f',
    ruleNumber: 'LMPC-2011-R06-1-F',
    title: 'Consumer Care and Complaint Contact Details',
    requirement:
      'Every package must declare the name, address, telephone number, and e-mail address of the person or office that can be contacted in case of consumer complaints (Rule 6(1)(f)).',
    applicability: 'Chapter II retail packaged commodities in India.',
    ruleCategory: 'MANDATORY_DECLARATION',
    defaultSeverity: 'MEDIUM',
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 6(1)(f) read with Section 18 of Legal Metrology Act, 2009',
    publicationGazette: 'G.S.R. 202(E) dated 7th March 2011',
    remediationGuidance:
      'Print customer care telephone number, email address, and physical contact address on outer package.',
    effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'OR',
      conditions: [
        {
          field: 'declarations.customer_care',
          operator: 'EXISTS',
          failureMessage: 'Consumer care contact details are missing from package',
        },
        {
          field: 'declarations.consumer_care',
          operator: 'EXISTS',
          failureMessage: 'Consumer care contact details are missing from package',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2011-04-01T00:00:00.000Z'),
        changeDescription: 'Initial enactment under G.S.R. 202(E)',
        snapshot: {
          title: 'Consumer Care and Complaint Contact Details',
          defaultSeverity: 'MEDIUM',
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 9. Rule 9 & Second Schedule: Font Prominence & Typography Advisory
  // ─────────────────────────────────────────────────────────────
  {
    id: 'rule-lmpc-r09-sch2',
    ruleNumber: 'LMPC-2011-R09-SCH2',
    title: 'Prominence and Legibility of Declarations (Second Schedule)',
    requirement:
      'All declarations on a package shall be prominent, legible, and conspicuous (Rule 9). Numeral height and contrast standards apply per Second Schedule.',
    applicability: 'Chapter II display advisory.',
    ruleCategory: 'DISPLAY_AND_PRESENTATION',
    defaultSeverity: 'LOW', // Strictly advisory: produces WARNING, never generates a formal Violation
    productCategoryId: null,
    sourceDocument: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    sourceReference: 'Rule 9 and Second Schedule, amended vide G.S.R. 629(E)',
    publicationGazette: 'G.S.R. 629(E) dated 23rd June 2017',
    remediationGuidance:
      'Ensure printed text color provides sufficient contrast against packaging background and letters meet minimum height.',
    effectiveDate: new Date('2018-01-01T00:00:00.000Z'),
    expiryDate: null,
    exceptions: [],
    conditions: {
      operator: 'AND',
      conditions: [
        {
          field: 'declarations.mrp.rawValue',
          operator: 'EXISTS',
          failureMessage: 'Price legibility check: MRP text must be distinctly legible',
        },
        {
          field: 'declarations.net_quantity.rawValue',
          operator: 'EXISTS',
          failureMessage: 'Quantity legibility check: Net quantity numerals must be distinctly legible',
        },
      ],
    },
    versions: [
      {
        versionNumber: 1,
        effectiveDate: new Date('2018-01-01T00:00:00.000Z'),
        changeDescription: 'Enhanced prominence standards under G.S.R. 629(E)',
        snapshot: {
          title: 'Prominence and Legibility of Declarations (Second Schedule)',
          defaultSeverity: 'LOW',
        },
      },
    ],
  },
]
