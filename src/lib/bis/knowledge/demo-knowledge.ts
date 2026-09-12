/**
 * Synthetic Demo Knowledge Dataset for SIH 2026 PS107:
 * BIS Knowledge Base & RAG Foundation.
 *
 * IMPORTANT TRANSPARENCY NOTICE:
 * All records in this file are synthetic demo test fixtures created for prototype
 * verification and retrieval testing. They do NOT represent live or officially
 * promulgated Bureau of Indian Standards documents.
 *
 * Every record is explicitly marked:
 * - isDemoRecord: true
 * - [DEMO TEST RECORD]
 */

import { chunkStandard } from './chunking'
import type {
  StandardInputForChunking,
  BisKnowledgeChunkDto,
  BisKnowledgeSourceDto,
} from './types'

export const DEMO_KNOWLEDGE_SOURCES: BisKnowledgeSourceDto[] = [
  {
    id: 'src-demo-001',
    standardId: 'std-demo-is10500',
    sourceName: '[DEMO TEST RECORD] Gazette of India — Drinking Water Notification',
    sourceType: 'GAZETTE',
    sourceUrl: 'https://egazette.gov.in/demo/is10500-test-record',
    version: '2012-R2',
    checksum: 'demo-sha256-is10500-test-hash',
    ingestionStatus: 'COMPLETED',
    metadata: {
      isDemoRecord: true,
      ministry: 'Ministry of Consumer Affairs, Food and Public Distribution',
      disclaimer: 'SYNTHETIC TEST RECORD — NOT OFFICIAL BIS PUBLICATION',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'src-demo-002',
    standardId: 'std-demo-is1293',
    sourceName: '[DEMO TEST RECORD] Electrical Accessories Quality Control Order Gazette',
    sourceType: 'QCO_NOTIFICATION',
    sourceUrl: 'https://egazette.gov.in/demo/is1293-qco-test-record',
    version: '2020-QCO',
    checksum: 'demo-sha256-is1293-test-hash',
    ingestionStatus: 'COMPLETED',
    metadata: {
      isDemoRecord: true,
      orderNumber: 'S.O. 4567(E)',
      disclaimer: 'SYNTHETIC TEST RECORD — NOT OFFICIAL BIS PUBLICATION',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'src-demo-003',
    standardId: 'std-demo-is9873',
    sourceName: '[DEMO TEST RECORD] Toys (Quality Control) Order Gazette',
    sourceType: 'QCO_NOTIFICATION',
    sourceUrl: 'https://egazette.gov.in/demo/is9873-qco-test-record',
    version: '2020-QCO',
    checksum: 'demo-sha256-is9873-test-hash',
    ingestionStatus: 'COMPLETED',
    metadata: {
      isDemoRecord: true,
      orderNumber: 'S.O. 853(E)',
      disclaimer: 'SYNTHETIC TEST RECORD — NOT OFFICIAL BIS PUBLICATION',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'src-demo-004',
    standardId: 'std-demo-is13252',
    sourceName: '[DEMO TEST RECORD] Electronics & IT Goods (Compulsory Registration) Order',
    sourceType: 'QCO_NOTIFICATION',
    sourceUrl: 'https://egazette.gov.in/demo/is13252-qco-test-record',
    version: '2021-CRS',
    checksum: 'demo-sha256-is13252-test-hash',
    ingestionStatus: 'COMPLETED',
    metadata: {
      isDemoRecord: true,
      orderNumber: 'S.O. 2345(E)',
      disclaimer: 'SYNTHETIC TEST RECORD — NOT OFFICIAL BIS PUBLICATION',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

export const DEMO_STANDARDS_KNOWLEDGE: StandardInputForChunking[] = [
  {
    id: 'std-demo-is10500',
    standardNumber: 'IS 10500:2012',
    title: '[DEMO TEST RECORD] Drinking Water — Specification (Second Revision)',
    description:
      '[DEMO TEST RECORD] Prescribes statutory requirements and methods of sampling and test for drinking water (potable water) supplied across India.',
    scope:
      '[DEMO TEST RECORD] This standard prescribes the requirements and methods of sampling and test for drinking water. This standard applies to drinking water supplied by municipal authorities, packaged drinking water treatment plants, and institutional distribution systems throughout India.',
    division: 'FAD',
    category: 'Food and Agriculture / Water Quality',
    edition: '2nd Revision',
    year: 2012,
    sourceUrl: 'https://standardsbis.bsbedge.com/demo/is10500',
    sourceType: 'BIS_STANDARD_DOCUMENT',
    isDemoRecord: true,
    clauses: [
      {
        id: 'cl-demo-10500-4-1',
        clauseNumber: '4.1',
        title: 'General Physical and Organoleptic Characteristics',
        content:
          '[DEMO TEST RECORD] Drinking water shall be clear and free from undesirable taste and odour. The pH value shall be between 6.5 and 8.5. Total Dissolved Solids (TDS) shall not exceed 500 mg/l under acceptable limits and 2000 mg/l under permissible limits in absence of alternate sources. Turbidity shall not exceed 1 NTU acceptable and 5 NTU permissible.',
        parentClauseNumber: '4',
        hierarchyPath: 'IS 10500:2012 > Clause 4 Requirements > Clause 4.1 Physical Characteristics',
        pageNumber: 3,
        sourceRef: 'IS 10500:2012, Clause 4.1, Page 3',
        isMandatory: true,
        limits: [
          { parameter: 'pH Value', requirement: '6.5 to 8.5', min: 6.5, max: 8.5, unit: 'pH' },
          { parameter: 'Total Dissolved Solids (TDS)', requirement: 'Max 500 acceptable, Max 2000 permissible', max: 2000, unit: 'mg/l' },
          { parameter: 'Turbidity', requirement: 'Max 1.0 acceptable, Max 5.0 permissible', max: 5.0, unit: 'NTU' },
        ],
      },
      {
        id: 'cl-demo-10500-4-2',
        clauseNumber: '4.2',
        title: 'General Chemical Parameters',
        content:
          '[DEMO TEST RECORD] Total hardness (as CaCO3) shall not exceed 200 mg/l acceptable and 600 mg/l in the absence of alternate source. Iron (as Fe) content shall not exceed 0.3 mg/l. Chlorides (as Cl) shall not exceed 250 mg/l acceptable and 1000 mg/l permissible.',
        parentClauseNumber: '4',
        hierarchyPath: 'IS 10500:2012 > Clause 4 Requirements > Clause 4.2 Chemical Parameters',
        pageNumber: 4,
        sourceRef: 'IS 10500:2012, Clause 4.2, Page 4',
        isMandatory: true,
        limits: [
          { parameter: 'Total Hardness (as CaCO3)', requirement: 'Max 200 acceptable, Max 600 permissible', max: 600, unit: 'mg/l' },
          { parameter: 'Iron (as Fe)', requirement: 'Max 0.3', max: 0.3, unit: 'mg/l' },
          { parameter: 'Chlorides (as Cl)', requirement: 'Max 250 acceptable, Max 1000 permissible', max: 1000, unit: 'mg/l' },
        ],
      },
      {
        id: 'cl-demo-10500-4-3',
        clauseNumber: '4.3',
        title: 'Toxic Heavy Metals and Substances',
        content:
          '[DEMO TEST RECORD] Permissible limits for toxic substances: Lead (as Pb) shall not exceed 0.01 mg/l. Arsenic (as As) shall not exceed 0.01 mg/l (acceptable) and 0.05 mg/l (permissible). Mercury (as Hg) shall not exceed 0.001 mg/l. Cadmium (as Cd) shall not exceed 0.003 mg/l. No relaxation is permitted for toxic heavy metals.',
        parentClauseNumber: '4',
        hierarchyPath: 'IS 10500:2012 > Clause 4 Requirements > Clause 4.3 Toxic Substances',
        pageNumber: 5,
        sourceRef: 'IS 10500:2012, Clause 4.3, Page 5',
        isMandatory: true,
        limits: [
          { parameter: 'Lead (as Pb)', requirement: 'Max 0.01', max: 0.01, unit: 'mg/l' },
          { parameter: 'Arsenic (as As)', requirement: 'Max 0.01 acceptable, Max 0.05 permissible', max: 0.05, unit: 'mg/l' },
          { parameter: 'Mercury (as Hg)', requirement: 'Max 0.001', max: 0.001, unit: 'mg/l' },
        ],
      },
      {
        id: 'cl-demo-10500-5-1',
        clauseNumber: '5.1',
        title: 'Bacteriological Quality & Microbiological Examination',
        content:
          '[DEMO TEST RECORD] All water intended for drinking shall be safe from biological pathogens. E. coli or thermotolerant coliform bacteria shall not be detectable in any 100 ml sample of treated drinking water.',
        parentClauseNumber: '5',
        hierarchyPath: 'IS 10500:2012 > Clause 5 Microbiological Quality > Clause 5.1 Bacteriological Examination',
        pageNumber: 7,
        sourceRef: 'IS 10500:2012, Clause 5.1, Page 7',
        isMandatory: true,
        limits: [
          { parameter: 'E. coli or thermotolerant coliform bacteria', requirement: 'Shall not be detectable in 100 ml', unit: 'MPN/100ml' },
        ],
      },
    ],
  },
  {
    id: 'std-demo-is1293',
    standardNumber: 'IS 1293:2019',
    title: '[DEMO TEST RECORD] Plugs and Socket-Outlets of Rated Voltage up to and including 250 Volts and Rated Current up to and including 16 Amperes',
    description:
      '[DEMO TEST RECORD] Prescribes technical specifications, pin configurations, safety interlocks, and marking for domestic plugs and socket-outlets in India.',
    scope:
      '[DEMO TEST RECORD] This standard applies to plugs and fixed or portable socket-outlets for a.c. only, with or without earthing contact, with a rated voltage up to and including 250 V and a rated current up to and including 16 A, intended for household and similar purposes.',
    division: 'ETD',
    category: 'Electrotechnical / Electrical Accessories',
    edition: '4th Revision',
    year: 2019,
    sourceUrl: 'https://standardsbis.bsbedge.com/demo/is1293',
    sourceType: 'BIS_STANDARD_DOCUMENT',
    isDemoRecord: true,
    clauses: [
      {
        id: 'cl-demo-1293-6-1',
        clauseNumber: '6.1',
        title: 'Standard Ratings for Voltage and Current',
        content:
          '[DEMO TEST RECORD] Standard accessories shall have a rated voltage of 250 V a.c. Preferred rated currents are 6 A and 16 A. Socket-outlets and plugs must be properly rated and marked for either 6 A or 16 A operation.',
        parentClauseNumber: '6',
        hierarchyPath: 'IS 1293:2019 > Clause 6 Ratings > Clause 6.1 Standard Ratings',
        pageNumber: 6,
        sourceRef: 'IS 1293:2019, Clause 6.1, Page 6',
        isMandatory: true,
      },
      {
        id: 'cl-demo-1293-8-1',
        clauseNumber: '8.1',
        title: 'Marking and ISI Standard Mark Declaration',
        content:
          '[DEMO TEST RECORD] Accessories shall be indelibly marked with: rated current in amperes (e.g. 16A), rated voltage in volts (e.g. 250V ~), symbol for nature of supply, manufacturer or responsible vendor identity/trade mark, type reference, and the BIS Standard Mark (ISI mark) accompanied by the 7-digit CML license number CM/L-XXXXXXX.',
        parentClauseNumber: '8',
        hierarchyPath: 'IS 1293:2019 > Clause 8 Marking > Clause 8.1 Statutory Marking',
        pageNumber: 8,
        sourceRef: 'IS 1293:2019, Clause 8.1, Page 8',
        isMandatory: true,
      },
      {
        id: 'cl-demo-1293-9-1',
        clauseNumber: '9.1',
        title: 'Dimensions and Gauge Verification',
        content:
          '[DEMO TEST RECORD] Plugs and socket-outlets shall comply with standard pin dimensions: 6 A plugs shall have pins of 5.1 mm nominal diameter; 16 A plugs shall have pins of 7.06 mm nominal diameter with center-to-center spacing compliant with Figure 1 and Figure 2.',
        parentClauseNumber: '9',
        hierarchyPath: 'IS 1293:2019 > Clause 9 Dimensional Requirements > Clause 9.1 Gauges and Pin Dimensions',
        pageNumber: 12,
        sourceRef: 'IS 1293:2019, Clause 9.1, Page 12',
        isMandatory: true,
      },
      {
        id: 'cl-demo-1293-13-1',
        clauseNumber: '13.1',
        title: 'Resistance to Heat and Fire',
        content:
          '[DEMO TEST RECORD] Insulating material retaining current-carrying parts and parts of the outer enclosure shall be resistant to abnormal heat and fire. Accessories must withstand a glow-wire test conducted at 650°C and 850°C without ignition or persistent flame.',
        parentClauseNumber: '13',
        hierarchyPath: 'IS 1293:2019 > Clause 13 Heat and Fire Resistance > Clause 13.1 Glow-Wire Test',
        pageNumber: 22,
        sourceRef: 'IS 1293:2019, Clause 13.1, Page 22',
        isMandatory: true,
      },
    ],
  },
  {
    id: 'std-demo-is9873',
    standardNumber: 'IS 9873 (Part 1):2019',
    title: '[DEMO TEST RECORD] Safety of Toys — Part 1: Safety Aspects Related to Mechanical and Physical Properties',
    description:
      '[DEMO TEST RECORD] Prescribes safety requirements and testing protocols for toys intended for use by children in various age groups to prevent choking, sharp edges, and physical injury.',
    scope:
      '[DEMO TEST RECORD] This standard specifies statutory requirements for mechanical and physical properties of toys intended for use by children under 14 years of age. Applicable under the Toys (Quality Control) Order, 2020.',
    division: 'MED',
    category: 'Mechanical Engineering / Consumer Products & Toys',
    edition: '3rd Revision',
    year: 2019,
    sourceUrl: 'https://standardsbis.bsbedge.com/demo/is9873-1',
    sourceType: 'BIS_STANDARD_DOCUMENT',
    isDemoRecord: true,
    clauses: [
      {
        id: 'cl-demo-9873-4-1',
        clauseNumber: '4.1',
        title: 'Small Parts Choking Hazards for Children Under 36 Months',
        content:
          '[DEMO TEST RECORD] Toys intended for children under 36 months, and removable components thereof, shall not fit entirely inside the small parts test cylinder having an internal diameter of 31.7 mm and a truncated angle depth of 57.1 mm. Non-compliance presents an acute choking hazard.',
        parentClauseNumber: '4',
        hierarchyPath: 'IS 9873 (Part 1):2019 > Clause 4 Requirements > Clause 4.1 Small Parts',
        pageNumber: 5,
        sourceRef: 'IS 9873 (Part 1):2019, Clause 4.1, Page 5',
        isMandatory: true,
      },
      {
        id: 'cl-demo-9873-4-2',
        clauseNumber: '4.2',
        title: 'Sharp Edges and Accessible Points',
        content:
          '[DEMO TEST RECORD] Accessible edges and points on toys shall not be hazardous. Metal and glass edges must be rolled, chamfered, or protected. Sharp points must not penetrate or lacerate during normal handling or reasonably foreseeable abuse testing.',
        parentClauseNumber: '4',
        hierarchyPath: 'IS 9873 (Part 1):2019 > Clause 4 Requirements > Clause 4.2 Sharp Edges',
        pageNumber: 8,
        sourceRef: 'IS 9873 (Part 1):2019, Clause 4.2, Page 8',
        isMandatory: true,
      },
      {
        id: 'cl-demo-9873-5-1',
        clauseNumber: '5.1',
        title: 'Statutory Age Labelling and Safety Warnings',
        content:
          '[DEMO TEST RECORD] Packaging must state minimum user age and explicit hazard warnings. Toys not intended for children under 36 months that contain small parts must bear the warning: "WARNING: Not suitable for children under 3 years due to small parts — Choking hazard." with the statutory age symbol.',
        parentClauseNumber: '5',
        hierarchyPath: 'IS 9873 (Part 1):2019 > Clause 5 Warnings and Instructions > Clause 5.1 Age Labelling',
        pageNumber: 15,
        sourceRef: 'IS 9873 (Part 1):2019, Clause 5.1, Page 15',
        isMandatory: true,
      },
    ],
  },
  {
    id: 'std-demo-is13252',
    standardNumber: 'IS 13252 (Part 1):2010',
    title: '[DEMO TEST RECORD] Information Technology Equipment — Safety — Part 1: General Requirements',
    description:
      '[DEMO TEST RECORD] Specifies safety requirements for mains-powered or battery-powered information technology equipment, including personal computers, printers, and power adapters.',
    scope:
      '[DEMO TEST RECORD] This standard applies to power-fed or battery-powered information technology equipment, including electrical business equipment and associated equipment. Enforced under the Compulsory Registration Scheme (CRS).',
    division: 'LITD',
    category: 'Electronics and Information Technology Goods',
    edition: '2nd Revision',
    year: 2010,
    sourceUrl: 'https://standardsbis.bsbedge.com/demo/is13252-1',
    sourceType: 'BIS_STANDARD_DOCUMENT',
    isDemoRecord: true,
    clauses: [
      {
        id: 'cl-demo-13252-1-7',
        clauseNumber: '1.7',
        title: 'Marking and Operating Instructions for CRS Registration',
        content:
          '[DEMO TEST RECORD] Equipment shall be clearly marked with rated voltage or rated voltage range (V), nature of supply, rated frequency (Hz), rated current (A or mA), manufacturer identity, and the statutory CRS self-declaration: "Self-Declaration - Conforming to IS 13252 (Part 1) : 2010, R-XXXXXXXX" along with the official BIS CRS portal mark.',
        parentClauseNumber: '1',
        hierarchyPath: 'IS 13252 (Part 1):2010 > Clause 1 General > Clause 1.7 Marking and Instructions',
        pageNumber: 14,
        sourceRef: 'IS 13252 (Part 1):2010, Clause 1.7, Page 14',
        isMandatory: true,
      },
      {
        id: 'cl-demo-13252-2-1',
        clauseNumber: '2.1',
        title: 'Protection from Electric Shock and Energy Hazards',
        content:
          '[DEMO TEST RECORD] Adequate protection shall be provided against contact with live parts. Operator-accessible parts shall not exceed 42.4 V peak or 60 V d.c. under normal conditions. Safe electrical separation between primary circuits and secondary SELV circuits is mandatory.',
        parentClauseNumber: '2',
        hierarchyPath: 'IS 13252 (Part 1):2010 > Clause 2 Safety > Clause 2.1 Electric Shock Protection',
        pageNumber: 28,
        sourceRef: 'IS 13252 (Part 1):2010, Clause 2.1, Page 28',
        isMandatory: true,
      },
      {
        id: 'cl-demo-13252-4-5',
        clauseNumber: '4.5',
        title: 'Thermal Requirements and Abnormal Temperature Rise',
        content:
          '[DEMO TEST RECORD] Under normal operating and single-fault conditions, components and accessible surfaces of IT equipment shall not reach temperatures that could cause burns, ignition of nearby materials, or deterioration of internal insulation.',
        parentClauseNumber: '4',
        hierarchyPath: 'IS 13252 (Part 1):2010 > Clause 4 Physical Requirements > Clause 4.5 Thermal Requirements',
        pageNumber: 45,
        sourceRef: 'IS 13252 (Part 1):2010, Clause 4.5, Page 45',
        isMandatory: true,
      },
    ],
  },
]

/**
 * Pre-computed deterministic knowledge chunks generated from the synthetic demo standards.
 * Guaranteed to be available in-memory even when database is unpopulated or offline.
 */
export const DEMO_KNOWLEDGE_CHUNKS: BisKnowledgeChunkDto[] = DEMO_STANDARDS_KNOWLEDGE.flatMap((std) =>
  chunkStandard(std)
)
