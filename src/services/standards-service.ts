/**
 * Standards Discovery Service (SIH PS107)
 *
 * Isolated service layer for Indian Standards (BIS) catalog, Quality Control Orders (QCO),
 * search matching, and AI advisory recommendations.
 *
 * NOTE FOR BACKEND/AI INTEGRATION (Himank / Parth):
 * This service implements the StandardsDiscoveryService contract.
 * When real RAG/vector search endpoints or database tables are ready,
 * replace the internal search implementation with fetch('/api/v1/standards/search', ...)
 * without changing the method signatures or UI components.
 */

import {
  type StandardDiscoveryItem,
  type StandardsDiscoveryService,
  type StandardsFilterState,
  type StandardsDiscoveryResult,
  type MatchLevel,
} from '@/types/standards'

export const AUTHENTIC_STANDARDS_CATALOG: StandardDiscoveryItem[] = [
  {
    id: 'is-14543',
    standardNumber: 'IS 14543:2016',
    title: 'Packaged Drinking Water (Other Than Packaged Natural Mineral Water) — Specification',
    year: 2016,
    category: 'Food & Agriculture',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 3932(E)',
    status: 'ACTIVE',
    shortDescription:
      'Prescribes mandatory microbiological, physical, and chemical requirements for packaged drinking water filled in sealed hermetic containers for direct human consumption.',
    scope:
      'This standard prescribes the requirements and methods of sampling and test for packaged drinking water (other than packaged natural mineral water) offered for direct human consumption in hermetically sealed transparent/translucent containers. Compulsory compliance under BIS Scheme I (ISI Mark) per FSSAI & QCO mandates.',
    criticalParameters: [
      'Total Dissolved Solids (TDS)',
      'Microbiological Purity (E. coli, Coliform, Pseudomonas aeruginosa)',
      'Heavy Metals (Arsenic, Lead, Mercury, Cadmium)',
      'Pesticide Residues (Individual & Total)',
      'Turbidity (NTU) and pH Level',
      'Tamper-Evident Packaging & Net Volume',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 4.1',
        title: 'Microbiological Requirements',
        description: 'Water shall be completely free from Escherichia coli, coliform bacteria, Faecal streptococci, and Pseudomonas aeruginosa in 250 ml sample.',
        testingMethod: 'IS 15185 / IS 5401 Membrane filtration',
        prescribedTolerance: 'Zero (Absent in 250 ml)',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 4.2',
        title: 'Total Dissolved Solids (TDS)',
        description: 'TDS concentration must fall within strict organoleptic limits ensuring palatability and safety without exceeding mineral threshold.',
        testingMethod: 'IS 3025 (Part 16) Gravimetric drying',
        prescribedTolerance: '75 mg/l to 500 mg/l max',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 4.3',
        title: 'Heavy Metal Limits (Lead & Arsenic)',
        description: 'Toxic elemental contaminants must not exceed permissible baseline thresholds.',
        testingMethod: 'IS 3025 (Part 47/37) ICP-MS / AAS',
        prescribedTolerance: 'Lead max 0.01 mg/l, Arsenic max 0.01 mg/l',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 6.1',
        title: 'Packaging in Food-Grade Containers',
        description: 'Packaging containers must conform to IS 15410 (PET/polycarbonate containers) and be tamper-evident sealed.',
        testingMethod: 'Visual seal integrity & overall migration per IS 9845',
        prescribedTolerance: 'Migration not exceeding 10 mg/dm²',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Bottled drinking water (250ml, 500ml, 1L, 2L)',
      'Bulk 20-litre water jars / bubble tops',
      'Sealed water pouches and hermetic cups',
      'Vended packaged drinking water',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 52,
    labCount: 52,
    matchScore: 98,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 3932(E) / FSSAI Notification No. 1-100/FSSAI/SP(Water)/2019',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/14543',
      yearOfPublication: 2016,
      ministryOrDepartment: 'Ministry of Consumer Affairs & FSSAI',
    },
    documentReferenceUrl: 'https://www.standardsbis.in/gemini/browse/standard/is14543',
  },
  {
    id: 'is-13428',
    standardNumber: 'IS 13428:2005',
    title: 'Packaged Natural Mineral Water — Specification',
    year: 2005,
    category: 'Food & Agriculture',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 3932(E)',
    status: 'ACTIVE',
    shortDescription:
      'Specifies purity, natural source mineral content, and sanitary bottling requirements for subterranean natural mineral water.',
    scope:
      'Covers natural mineral water obtained directly from underground sources (spring, tube well, artesian) under conditions guaranteeing microbiological cleanliness without altering original chemical composition.',
    criticalParameters: [
      'Origin from verified natural underground aquifer',
      'Total Dissolved Solids and specific mineralization',
      'Absence of chemical purification / disinfection altering mineral balance',
      'Pesticide Residue Limits (Sub-ppb level)',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 3.1',
        title: 'Source Protection & Natural Characteristics',
        description: 'Water must originate from a protected underground hydrological aquifer free from pollution risks.',
        testingMethod: 'Hydrogeological site audit & chemical profile analysis',
        prescribedTolerance: 'Stable natural mineral profile',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 5.1',
        title: 'Prohibited Treatments',
        description: 'Disinfection treatments by chemicals or addition of minerals is strictly prohibited.',
        testingMethod: 'Chemical tracer analysis',
        prescribedTolerance: 'Physical filtration only (0.2 micron)',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Natural spring water bottles',
      'Himalayan natural mineral water',
      'Imported and domestic premium natural mineral water',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 38,
    labCount: 38,
    matchScore: 92,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 3932(E)',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/13428',
      yearOfPublication: 2005,
      ministryOrDepartment: 'Ministry of Consumer Affairs, Food and Public Distribution',
    },
  },
  {
    id: 'is-1061',
    standardNumber: 'IS 1061:1997',
    title: 'Disinfectant Fluids, Phenolic Type — Specification',
    year: 1997,
    category: 'Chemicals & Plastics',
    isMandatoryQco: false,
    status: 'ACTIVE',
    shortDescription:
      'Specifies composition, germicidal value (Rideal-Walker coefficient), and stability for coal-tar and phenolic based household and institutional disinfectants.',
    scope:
      'Covers requirements for black and white disinfectant fluids containing coal tar acids and phenolic derivatives, widely formulated for household sanitization, hospital floor cleaning, and municipal public health disinfection.',
    criticalParameters: [
      'Germicidal Value (Rideal-Walker RW Coefficient)',
      'Phenolic Content (% by mass)',
      'Emulsion Stability in hard and artificial sea water',
      'Flash Point & Packaging Leak Resistance',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 4.1',
        title: 'Germicidal Value (RW Coefficient)',
        description: 'Measurement of germicidal action against Salmonella typhi under specified test conditions.',
        testingMethod: 'Rideal-Walker testing technique per Annex B of IS 1061',
        prescribedTolerance: 'RW Coefficient grade minimum 5 to 18 depending on grade',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 4.3',
        title: 'Emulsion Stability',
        description: 'The fluid when diluted 1:100 with water must not exhibit oil or tar separation within 6 hours.',
        testingMethod: 'Visual inspection in 100ml graduated cylinder',
        prescribedTolerance: 'No phase separation > 0.5%',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Household black disinfectant fluid (Phenyl)',
      'White disinfectant concentrated floor cleaners',
      'Hospital and municipal sanitary fluid cleaners',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 16,
    labCount: 16,
    matchScore: 84,
    matchLevel: 'HIGH',
    officialSource: {
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/1061',
      yearOfPublication: 1997,
      ministryOrDepartment: 'Department of Chemicals & Petrochemicals',
    },
  },
  {
    id: 'is-16102-1',
    standardNumber: 'IS 16102 (Part 1):2012',
    title: 'Self-Ballasted LED Lamps for General Lighting Services — Part 1: Safety Requirements',
    year: 2012,
    category: 'Electronics & IT',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 2357(E) / CRO Order 2014',
    status: 'ACTIVE',
    shortDescription:
      'Specifies mandatory electrical safety, insulation resistance, mechanical strength, and fire resistance for consumer LED lamps.',
    scope:
      'Covers self-ballasted LED lamps for voltages up to 250V AC 50Hz, intended for domestic and general commercial lighting. Compulsory registration under BIS Compulsory Registration Scheme (CRS Scheme II).',
    criticalParameters: [
      'Electric Shock Protection & Creepage Distance',
      'Insulation Resistance and Dielectric Strength',
      'Cap Temperature Rise & Thermal Dissipation',
      'Resistance to Flame and Ignition (Glow Wire Test)',
      'Marking of Rated Wattage, Voltage, and CRS Registration Logo',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 8.1',
        title: 'Insulation Resistance and Electric Strength',
        description: 'Insulation between live parts and accessible external conductive parts must withstand high voltage without breakdown.',
        testingMethod: '500V DC megohmmeter and 2U+1000V AC dielectric test',
        prescribedTolerance: 'Insulation resistance >= 4 Megaohms',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 9.1',
        title: 'Resistance to Heat and Fire',
        description: 'External insulating materials retaining live parts in position must not ignite or sustain combustion.',
        testingMethod: 'Glow wire flammability test per IS/IEC 60695-2-11 at 650°C',
        prescribedTolerance: 'Self-extinguishing within 30 seconds',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 6.1',
        title: 'Mandatory Marking Requirements',
        description: 'Lamp must clearly display registered trademark, rated power, voltage range, frequency, and BIS CRS Registration number R-xxxxxxxx.',
        testingMethod: 'Legibility test with water and petroleum spirit',
        prescribedTolerance: 'Markings remain legible without peeling',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Domestic LED bulbs (B22, E27 cap)',
      '9W, 12W, 15W domestic general lighting lamps',
      'Retrofit LED tubelights & batten lamps',
      'Smart dimmable self-ballasted LED lamps',
    ],
    applicableScheme: 'SCHEME_II',
    accreditedLabCount: 34,
    labCount: 34,
    matchScore: 96,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 2357(E) / MeitY Compulsory Registration Order',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/16102_1',
      yearOfPublication: 2012,
      ministryOrDepartment: 'Ministry of Electronics and Information Technology (MeitY)',
    },
  },
  {
    id: 'is-16102-2',
    standardNumber: 'IS 16102 (Part 2):2017',
    title: 'Self-Ballasted LED Lamps for General Lighting Services — Part 2: Performance Requirements',
    year: 2017,
    category: 'Electronics & IT',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 2357(E)',
    status: 'ACTIVE',
    shortDescription:
      'Prescribes luminous efficacy (lumens per watt), chromaticity, colour rendering index (CRI), power factor, and lumen maintenance life.',
    scope:
      'Defines the photometric and electrical performance metrics for LED lamps to protect consumers against low-efficiency, substandard illumination products.',
    criticalParameters: [
      'Luminous Efficacy (Minimum lumens/Watt)',
      'Power Factor (PF >= 0.90 for > 5W)',
      'Colour Rendering Index (CRI >= 80 for indoor)',
      'Lumen Maintenance at 2,000 hrs and 6,000 hrs (L70)',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 7.1',
        title: 'Luminous Flux and Efficacy',
        description: 'The measured total initial luminous flux shall be not less than 90% of rated value, and efficacy must satisfy energy benchmark.',
        testingMethod: 'Integrating sphere spectrophotometer',
        prescribedTolerance: 'Min 90-100 lm/W based on BEE rating tier',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 8.2',
        title: 'Power Factor Verification',
        description: 'Power factor must ensure grid quality and prevent harmonic distortion.',
        testingMethod: 'Digital power analyzer at rated 230V 50Hz',
        prescribedTolerance: '>= 0.90 for power ratings > 5W',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Energy efficient LED bulbs',
      'BEE Star-rated consumer lamps',
      'High-lumen LED lamps for commercial stores',
    ],
    applicableScheme: 'SCHEME_II',
    accreditedLabCount: 28,
    labCount: 28,
    matchScore: 90,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 2357(E)',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/16102_2',
      yearOfPublication: 2017,
      ministryOrDepartment: 'Ministry of Electronics and Information Technology (MeitY)',
    },
  },
  {
    id: 'is-1417',
    standardNumber: 'IS 1417:2016',
    title: 'Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Marking (Hallmarking)',
    year: 2016,
    category: 'Jewellery & Precious Metals',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 50(E) / Hallmarking Order 2020',
    status: 'ACTIVE',
    shortDescription:
      'Mandates purity grades (24K, 22K, 20K, 18K, 14K, 9K) and consumer hallmarking symbols including 6-digit alphanumeric HUID for all gold ornaments sold in India.',
    scope:
      'Specifies purity grades, permissible fineness limits, assay testing procedures, and mandatory hallmarking marks for gold jewellery and artefacts sold by registered jewellers across mandatory hallmarking districts in India.',
    criticalParameters: [
      'Fineness assay testing (Fire Assay cupellation method)',
      '6-digit Alphanumeric HUID (Hallmark Unique Identification Number)',
      'BIS Triangle Hallmark Logo & Purity/Fineness marking (e.g. 22K916)',
      'Zero negative tolerance on declared fineness',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 4.1',
        title: 'Prescribed Purity Grades',
        description: 'Gold articles must conform to recognized standards: 24K (995+), 23K (958), 22K (916), 20K (833), 18K (750), 14K (585), 9K (375).',
        testingMethod: 'Cupellation fire assay per IS 1418',
        prescribedTolerance: 'Zero negative tolerance below certified fineness',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 6.1',
        title: 'Mandatory 3 Hallmarking Signs',
        description: 'Every gold ornament must laser-engrave (1) BIS triangular logo, (2) Purity & Fineness grade e.g. 22K916, (3) 6-character HUID.',
        testingMethod: 'Microscopic inspection / BIS Care App database query',
        prescribedTolerance: 'Permanent laser mark, minimum height 0.5 mm',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Gold necklaces, chains, bangles, rings',
      '22K 916 gold ornaments',
      '18K 750 diamond-studded gold jewellery',
      'Gold coins and medallions',
    ],
    applicableScheme: 'HALLMARKING',
    accreditedLabCount: 1450,
    labCount: 1450,
    matchScore: 99,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 50(E) dated 15 Jan 2020',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/1417',
      yearOfPublication: 2016,
      ministryOrDepartment: 'Ministry of Consumer Affairs, Food and Public Distribution',
    },
  },
  {
    id: 'is-2112',
    standardNumber: 'IS 2112:2014',
    title: 'Silver and Silver Alloys, Jewellery/Artefacts — Fineness and Marking',
    year: 2014,
    category: 'Jewellery & Precious Metals',
    isMandatoryQco: false,
    status: 'ACTIVE',
    shortDescription:
      'Specifies purity grades (990, 970, 925 Sterling Silver, 900, 835, 800) and hallmark marking for silver ornaments and utensils.',
    scope:
      'Covers grades of fineness and marking of silver and silver alloy products, utensils, and jewellery. Provides consumer assurance on silver content via BIS hallmarking centers.',
    criticalParameters: [
      'Silver Fineness Assay Testing (Potentiometric titration)',
      'Voluntary Hallmarking Symbol & Fineness grade (e.g. 925 for Sterling Silver)',
      'Total Solder Content Limits in fabricated artefacts',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 4.2',
        title: 'Fineness of Sterling Silver',
        description: 'Articles marked as 925 Sterling Silver must contain minimum 92.5% pure silver by weight.',
        testingMethod: 'Potentiometric titration with potassium thiocyanate per IS 2113',
        prescribedTolerance: 'Minimum 925.0 parts per thousand',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      '925 Sterling silver jewellery',
      'Silver pooja utensils, plates, and glasses',
      'Silver anklets, toe rings, and giftware',
    ],
    applicableScheme: 'HALLMARKING',
    accreditedLabCount: 420,
    labCount: 420,
    matchScore: 82,
    matchLevel: 'HIGH',
    officialSource: {
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/2112',
      yearOfPublication: 2014,
      ministryOrDepartment: 'Ministry of Consumer Affairs, Food and Public Distribution',
    },
  },
  {
    id: 'is-9873-1',
    standardNumber: 'IS 9873 (Part 1):2019',
    title: 'Safety of Toys — Part 1: Safety Aspects Related to Mechanical and Physical Properties',
    year: 2019,
    category: 'Textiles & Garments',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 853(E) / Toys Quality Control Order 2020',
    status: 'ACTIVE',
    shortDescription:
      'Mandates sharp edge avoidance, small parts ingestion choking tests, impact drop tests, and projectile safety for toys intended for children under 14.',
    scope:
      'Prescribes mandatory physical and mechanical safety criteria for toys intended for children under 14 years of age. All imported and domestic toys must carry the ISI Mark under Scheme I before commercial sale in India.',
    criticalParameters: [
      'Choking hazard small parts cylinder test for children under 36 months',
      'Sharp edges and accessible points testing (IS 9873 Part 1 Clause 4.7 & 4.8)',
      'Tension, torque, and drop impact tests simulating aggressive child handling',
      'Acoustic sound pressure limits (max 85 dBA for close-to-ear toys)',
      'Mandatory ISI mark on product packaging and statutory age warnings',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 4.4',
        title: 'Small Parts Ingestion / Choking Test',
        description: 'Toys for children under 36 months shall not contain small parts fitting completely into the truncated test cylinder under specified force.',
        testingMethod: 'Small parts test cylinder with 31.7 mm diameter and 57.1 mm depth',
        prescribedTolerance: 'No detachable part fitting inside cylinder',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 4.7',
        title: 'Sharp Edges and Burrs',
        description: 'Accessible edges of metal, glass, or hard rigid plastic shall not be sharp enough to lacerate human skin.',
        testingMethod: 'Sharp edge tester rotating PTFE cylinder',
        prescribedTolerance: 'No cut in standard tape layer under 6N force',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 5.24',
        title: 'Drop & Impact Resistance',
        description: 'Toy dropped 5 times from 850 mm onto 4 mm steel plate over concrete must not shatter into sharp hazardous fragments.',
        testingMethod: 'Free drop from specified height at room temperature',
        prescribedTolerance: 'No accessible sharp edges or small parts generated',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'Plastic toys, action figures, rattles',
      'Electronic learning and battery-operated toys',
      'Plush / stuffed dolls and soft fabric toys',
      'Toy ride-on cars, tricycles, and puzzle blocks',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 26,
    labCount: 26,
    matchScore: 94,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 853(E) dated 25 Feb 2020',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/9873_1',
      yearOfPublication: 2019,
      ministryOrDepartment: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
    },
  },
  {
    id: 'is-1293',
    standardNumber: 'IS 1293:2019',
    title: 'Plugs and Socket-Outlets for Domestic and Similar Purposes of Rated Voltage up to 250 V',
    year: 2019,
    category: 'Electronics & IT',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 4333(E) / Electrical Accessories QCO',
    status: 'ACTIVE',
    shortDescription:
      'Mandates dimensions, contact resistance, shutter mechanisms, and temperature rise for domestic electrical plugs and wall socket outlets (6A & 16A).',
    scope:
      'Applies to 6A, 10A, and 16A plugs and fixed or portable socket-outlets for AC up to 250V. Under mandatory QCO, non-certified plugs or sockets cannot be manufactured or sold in India.',
    criticalParameters: [
      'Dimensional conformity to standard pin diameter, pitch, and length gauge',
      'Safety shutters on socket apertures preventing accidental probe insertion',
      'Contact temperature rise under continuous full rated load (Max 45K rise)',
      'Resistance to tracking, abnormal heat, and fire (glow wire at 750°C)',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 9.1',
        title: 'Dimensional Gauges and Interoperability',
        description: 'Pin dimensions must comply with strict go/no-go gauges to prevent loose connections or socket jamming.',
        testingMethod: 'Standardized pin dimension micrometers and plug gauges',
        prescribedTolerance: 'Gauge tolerances within ±0.05 mm',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 19.1',
        title: 'Temperature Rise Under Load',
        description: 'Current carrying terminals shall not exceed 45°C temperature rise above ambient during 1-hour test at 1.1x rated current.',
        testingMethod: 'Thermocouple measurement under test bench load',
        prescribedTolerance: 'Delta T <= 45K',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      '6A 3-pin and 2-pin household plugs',
      '16A heavy appliance power plugs (AC, geyser, microwave)',
      'Modular wall switch socket combos',
      'Extension boards and multi-plug adaptors',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 44,
    labCount: 44,
    matchScore: 89,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 4333(E) dated 2 Dec 2019',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/1293',
      yearOfPublication: 2019,
      ministryOrDepartment: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
    },
  },
  {
    id: 'is-269',
    standardNumber: 'IS 269:2015',
    title: 'Ordinary Portland Cement — Specification (33 Grade, 43 Grade and 53 Grade)',
    year: 2015,
    category: 'Civil Engineering & Cement',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 883(E) / Cement Quality Control Order',
    status: 'ACTIVE',
    shortDescription:
      'Specifies compressive strength (28 days), setting times, chemical composition, fineness (Blaine), and sound testing for structural OPC cement.',
    scope:
      'Covers manufacture, chemical and physical requirements of ordinary Portland cement in three strength grades (33, 43 and 53 grade). Cement is under 100% compulsory BIS certification in India.',
    criticalParameters: [
      'Compressive Strength at 3, 7, and 28 days (MPa)',
      'Initial Setting Time (min 30 min) and Final Setting Time (max 600 min)',
      'Soundness by Le Chatelier (max 10 mm) and Autoclave (max 0.8%)',
      'Fineness by Specific Surface (min 225 m²/kg)',
      'Total Loss on Ignition and Insoluble Residue %',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 6.2',
        title: 'Compressive Strength (43 Grade)',
        description: 'Compressive strength of standard cement mortar cubes must satisfy graduated thresholds at 72h, 168h, and 672h.',
        testingMethod: 'IS 4031 (Part 6) Hydraulic compression press',
        prescribedTolerance: '72h: min 23 MPa, 168h: min 33 MPa, 672h: min 43 to 58 MPa',
        isMandatoryCheck: true,
      },
      {
        clauseNumber: 'Clause 6.3',
        title: 'Setting Time Parameters',
        description: 'Allows adequate workability window while guaranteeing setting within legal limits.',
        testingMethod: 'IS 4031 (Part 5) Vicat apparatus needle penetration',
        prescribedTolerance: 'Initial >= 30 min, Final <= 600 min',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      '50kg bagged Ordinary Portland Cement (OPC 43 & 53)',
      'Bulk cement shipments for ready-mix concrete plants',
      'Structural construction binder for bridges and columns',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 88,
    labCount: 88,
    matchScore: 88,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 883(E) / Cement (Quality Control) Order',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/269',
      yearOfPublication: 2015,
      ministryOrDepartment: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
    },
  },
  {
    id: 'is-15410',
    standardNumber: 'IS 15410:2003',
    title: 'Containers for Packaging of Natural Mineral Water and Packaged Drinking Water',
    year: 2003,
    category: 'Food & Agriculture',
    isMandatoryQco: true,
    qcoNotificationNumber: 'S.O. 3932(E)',
    status: 'ACTIVE',
    shortDescription:
      'Specifies material safety, overall migration limits, transparency, drop impact resistance, and closure seal integrity for plastic water bottles and jars.',
    scope:
      'Prescribes requirements for plastic containers manufactured from PET, polycarbonate, and other food-grade polymers used for packaging drinking water and natural mineral water.',
    criticalParameters: [
      'Food Grade Polymer Conformity per IS 9845',
      'Overall Migration Limit into distilled water and 3% acetic acid',
      'Closure leakage under 20 kPa vacuum / pressure',
      'Vertical drop impact resistance from 1.2 m height',
    ],
    clauses: [
      {
        clauseNumber: 'Clause 5.1',
        title: 'Overall Migration Limits',
        description: 'Constituent polymer compounds must not leach harmful substances into simulated aqueous contents.',
        testingMethod: 'IS 9845 Gravimetric residue determination',
        prescribedTolerance: 'Not exceeding 10 mg/dm² or 60 mg/kg',
        isMandatoryCheck: true,
      },
    ],
    applicableCommodities: [
      'PET preforms and blown water bottles',
      '20-litre polycarbonate reusable bubble top water jars',
      'Tamper-evident cap closures for drinking water containers',
    ],
    applicableScheme: 'SCHEME_I',
    accreditedLabCount: 24,
    labCount: 24,
    matchScore: 86,
    matchLevel: 'HIGH',
    officialSource: {
      gazetteNumber: 'S.O. 3932(E)',
      bisPortalUrl: 'https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/is_details/15410',
      yearOfPublication: 2003,
      ministryOrDepartment: 'Ministry of Consumer Affairs & FSSAI',
    },
  },
]

/**
 * Keyword & Category Synonyms Index for semantic scoring
 */
const KEYWORD_SYNONYM_MAP: Record<string, string[]> = {
  water: ['drinking', 'mineral', 'bottle', 'bottled', 'packaged', 'jar', 'bubble', 'aquifer', 'pouch', 'reverse', 'osmosis', 'ro'],
  led: ['lamp', 'bulb', 'lighting', 'light', 'lumens', 'watt', 'b22', 'e27', 'tubelight', 'illumination', 'diode'],
  gold: ['jewellery', 'jewelry', 'ornament', 'hallmark', 'huid', '22k', '18k', '24k', '916', 'purity', 'carat', 'karat'],
  silver: ['jewellery', 'jewelry', 'utensil', 'hallmark', '925', 'sterling', 'fineness', 'metal', 'anklet'],
  phenyl: ['disinfectant', 'cleaner', 'phenolic', 'floor', 'sanitizer', 'germicidal', 'fluid'],
  toy: ['toys', 'doll', 'baby', 'infant', 'child', 'children', 'game', 'rattle', 'plastic', 'choking'],
  plug: ['socket', 'electrical', 'switch', 'outlet', 'pin', '250v', '6a', '16a', 'cord', 'adapter', 'adaptor'],
  cement: ['concrete', 'opc', 'portland', 'mortar', 'construction', 'building', 'grade', '43', '53', 'bag'],
}

/**
 * Helper to compute token overlap and relevance scoring
 */
function calculateMatch(
  item: StandardDiscoveryItem,
  query: string,
  description: string
): { score: number; level: MatchLevel; matchedKeywords: string[]; reasoningText: string } {
  const combinedInput = `${query} ${description}`.trim().toLowerCase()
  if (!combinedInput) {
    return {
      score: 100,
      level: 'HIGH',
      matchedKeywords: [],
      reasoningText: 'Listed in featured Bureau of Indian Standards catalog.',
    }
  }

  // Tokenize input
  const tokens = combinedInput
    .split(/[\s,.;:!?/\-()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)

  const matchedKeywords: string[] = []
  let rawScore = 0

  const stdCode = item.standardNumber.toLowerCase()
  const title = item.title.toLowerCase()
  const category = item.category.toLowerCase()
  const scope = item.scope.toLowerCase()
  const commodities = item.applicableCommodities.map((c) => c.toLowerCase()).join(' ')
  const parameters = item.criticalParameters.map((p) => p.toLowerCase()).join(' ')

  // Check for direct standard number match
  if (tokens.some((token) => stdCode.includes(token) && token.length >= 3)) {
    rawScore += 55
    matchedKeywords.push(item.standardNumber)
  }

  // Token overlap check
  for (const token of tokens) {
    let matchedThisToken = false

    if (title.includes(token)) {
      rawScore += 18
      matchedThisToken = true
    }
    if (commodities.includes(token)) {
      rawScore += 15
      matchedThisToken = true
    }
    if (category.includes(token)) {
      rawScore += 10
      matchedThisToken = true
    }
    if (parameters.includes(token) || scope.includes(token)) {
      rawScore += 8
      matchedThisToken = true
    }

    // Check synonym map
    for (const [key, synonyms] of Object.entries(KEYWORD_SYNONYM_MAP)) {
      if (token === key || synonyms.includes(token)) {
        if (title.includes(key) || commodities.includes(key) || category.includes(key)) {
          rawScore += 12
          matchedThisToken = true
          if (!matchedKeywords.includes(key)) matchedKeywords.push(key)
        }
      }
    }

    if (matchedThisToken && !matchedKeywords.includes(token)) {
      matchedKeywords.push(token)
    }
  }

  // Normalize score between 0 and 99
  const score = Math.min(99, Math.max(10, Math.round(rawScore)))

  let level: MatchLevel = 'LOW'
  if (score >= 70) {
    level = 'HIGH'
  } else if (score >= 40) {
    level = 'MEDIUM'
  }

  // Generate factual advisory reasoning text
  let reasoningText = ''
  if (matchedKeywords.length > 0) {
    reasoningText = `Matches keywords [${matchedKeywords.slice(0, 4).join(', ')}] directly relevant to product scope and applicable commodities.`
  } else {
    reasoningText = `Identified under sector "${item.category}" as a related regulatory standard.`
  }

  if (item.isMandatoryQco) {
    reasoningText += ` Mandatory compliance under Central Quality Control Order ${item.qcoNotificationNumber || 'notification'}.`
  } else {
    reasoningText += ' Currently regulated as a voluntary standard under BIS certification.'
  }

  return { score, level, matchedKeywords, reasoningText }
}

/**
 * Standard Discovery Service Implementation
 */
export class MockStandardsDiscoveryService implements StandardsDiscoveryService {
  private catalog: StandardDiscoveryItem[]

  constructor(initialCatalog: StandardDiscoveryItem[] = AUTHENTIC_STANDARDS_CATALOG) {
    this.catalog = initialCatalog
  }

  public async searchStandards(
    filters: Partial<StandardsFilterState>
  ): Promise<StandardsDiscoveryResult> {
    // Small latency to reflect async operation and demonstrate loading state
    await new Promise((res) => setTimeout(res, 60))

    const query = (filters.query || '').trim()
    const description = (filters.productDescription || '').trim()
    const category = filters.category || 'All Sectors'
    const qcoType = filters.qcoType || 'ALL'
    const sortBy = filters.sortBy || 'RELEVANCE'

    const hasSearched = Boolean(query || description || (category && category !== 'All Sectors') || qcoType !== 'ALL')

    // Filter and score
    let results = this.catalog.map((item) => {
      const matchResult = calculateMatch(item, query, description)
      return {
        ...item,
        matchScore: matchResult.score,
        matchLevel: matchResult.level,
        reasoning: {
          summary: matchResult.reasoningText,
          matchedKeywords: matchResult.matchedKeywords,
          applicabilityNotes: `Applicable to: ${item.applicableCommodities.slice(0, 3).join(', ')}`,
          regulatoryStatusNote: item.isMandatoryQco
            ? `Mandatory under QCO Gazette ${item.qcoNotificationNumber || ''}`
            : 'Voluntary Standard (Conformity Verification Recommended)',
        },
      }
    })

    // Filter by category
    if (category && category !== 'All Sectors') {
      results = results.filter((item) => item.category.toLowerCase() === category.toLowerCase())
    }

    // Filter by QCO Status
    if (qcoType === 'MANDATORY') {
      results = results.filter((item) => item.isMandatoryQco)
    } else if (qcoType === 'VOLUNTARY') {
      results = results.filter((item) => !item.isMandatoryQco)
    }

    // If a specific query or description was provided, filter out zero-token low matches
    if (query || description) {
      results = results.filter((item) => item.matchScore > 25)
    }

    // Sorting
    results.sort((a, b) => {
      if (sortBy === 'RELEVANCE') {
        return b.matchScore - a.matchScore
      }
      if (sortBy === 'STANDARD_ASC') {
        return a.standardNumber.localeCompare(b.standardNumber)
      }
      if (sortBy === 'YEAR_DESC') {
        return b.year - a.year
      }
      return 0
    })

    return {
      items: results,
      totalCount: results.length,
      hasSearched,
      appliedQuery: query,
      appliedDescription: description,
    }
  }

  public async getStandardById(id: string): Promise<StandardDiscoveryItem | null> {
    await new Promise((res) => setTimeout(res, 30))
    const item = this.catalog.find(
      (c) => c.id.toLowerCase() === id.toLowerCase() || c.standardNumber.toLowerCase() === id.toLowerCase()
    )
    return item ?? null
  }

  public async getFeaturedStandards(): Promise<StandardDiscoveryItem[]> {
    return this.catalog.slice(0, 5)
  }

  public async findStandardsByDescription(description: string): Promise<StandardsDiscoveryResult> {
    return this.searchStandards({ productDescription: description })
  }
}

/**
 * Export singleton instance
 */
export const standardsDiscoveryService = new MockStandardsDiscoveryService()
