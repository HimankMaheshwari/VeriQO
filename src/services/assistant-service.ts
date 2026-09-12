/**
 * BIS Conversational Assistant Service (SIH PS107)
 *
 * Isolated frontend service boundary for BIS Standards, QCOs, and certification queries.
 *
 * IMPORTANT NOTE ON MOCK/DEMO DATA:
 * All responses, citations, clause references, and excerpt texts provided by this mock
 * service are clearly labeled demonstration placeholders. They demonstrate the UI structure
 * of source-backed answers, confidence ratings, and why-this-answer evidence.
 *
 * They do NOT represent certified official statutory text, legally binding rulings, or
 * enforcement orders. Authentic BIS standards documents and gazette citations will be
 * served by Parth's AI/RAG pipeline and Himank's backend API endpoints (/api/v1/assistant/chat).
 */

import {
  type AssistantService,
  type AssistantRequest,
  type AssistantResponse,
  type AssistantMessage,
  type SuggestedPrompt,
  type AssistantMode,
  type StandardContext,
  type AssistantEvidence,
  type AssistantSource,
} from '@/types/assistant'

/**
 * Clearly labeled Mock/Demo Sources Repository to demonstrate structured source-backing
 */
const DEMO_MOCK_SOURCES: Record<string, AssistantSource[]> = {
  water: [
    {
      id: 'demo-src-is-14543',
      documentTitle: 'IS 14543:2016 — Packaged Drinking Water [Demo Specification Placeholder]',
      standardNumber: 'IS 14543:2016',
      clauseReference: 'Clause 4 (Demo Quality Parameters Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Specifies purity guidelines, microbiological test criteria, and packaging standards for packaged water. For authentic statutory text and legal enforcement, refer to the published Bureau of Indian Standards gazette.',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: true,
      relevanceScore: 96,
    },
    {
      id: 'demo-src-is-15410',
      documentTitle: 'IS 15410:2003 — Containers for Packaging Drinking Water [Demo Placeholder]',
      standardNumber: 'IS 15410:2003',
      clauseReference: 'Clause 5 (Demo Container Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Outlines food-grade plastic packaging safety and overall migration guidelines for drinking water containers.',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: true,
      relevanceScore: 90,
    },
  ],
  led: [
    {
      id: 'demo-src-is-16102',
      documentTitle: 'IS 16102 (Part 1):2012 — Self-Ballasted LED Lamps [Demo Specification Placeholder]',
      standardNumber: 'IS 16102 (Part 1):2012',
      clauseReference: 'Safety Requirements (Demo Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Outlines mandatory electrical safety requirements, insulation resistance, and flame safety benchmarks for consumer LED lamps under BIS CRS registration.',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: true,
      relevanceScore: 94,
    },
  ],
  gold: [
    {
      id: 'demo-src-is-1417',
      documentTitle: 'IS 1417:2016 — Gold and Gold Alloys, Jewellery/Artefacts [Demo Placeholder]',
      standardNumber: 'IS 1417:2016',
      clauseReference: 'Fineness & Marking (Demo Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Outlines recognized fineness grades and consumer hallmarking symbols including the 6-digit Hallmark Unique Identification Number (HUID).',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: true,
      relevanceScore: 98,
    },
  ],
  toy: [
    {
      id: 'demo-src-is-9873',
      documentTitle: 'IS 9873 (Part 1):2019 — Safety of Toys [Demo Specification Placeholder]',
      standardNumber: 'IS 9873 (Part 1):2019',
      clauseReference: 'Mechanical & Physical Safety (Demo Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Outlines physical safety and small parts choking hazard prevention benchmarks for children toys under mandatory certification.',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: true,
      relevanceScore: 92,
    },
  ],
  cement: [
    {
      id: 'demo-src-is-269',
      documentTitle: 'IS 269:2015 — Ordinary Portland Cement [Demo Specification Placeholder]',
      standardNumber: 'IS 269:2015',
      clauseReference: 'Strength & Setting Criteria (Demo Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Prescribes physical and compressive strength criteria for structural Ordinary Portland Cement under mandatory Quality Control Orders.',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: true,
      relevanceScore: 91,
    },
  ],
  disinfectant: [
    {
      id: 'demo-src-is-1061',
      documentTitle: 'IS 1061:1997 — Disinfectant Fluids, Phenolic Type [Demo Placeholder]',
      standardNumber: 'IS 1061:1997',
      clauseReference: 'Germicidal Value (Demo Reference)',
      excerpt:
        '[Mock / Demo Excerpt for UI Demonstration]: Specifies disinfectant fluid composition, germicidal value guidelines, and stability testing for phenolic cleaners.',
      sourceUrl: 'https://www.services.bis.gov.in',
      isMandatoryQco: false,
      relevanceScore: 85,
    },
  ],
}

/**
 * Helper to synthesize contextual responses based on user query and active contexts
 * Clearly labeled as demo advisory output
 */
function generateDemoResponse(request: AssistantRequest): {
  content: string
  evidence: AssistantEvidence
} {
  const q = request.query.toLowerCase()
  const mode = request.mode
  const std = request.standardContext
  const prod = request.productContext

  // Determine topic category
  let topic = 'general'
  let matchedSources: AssistantSource[] = []
  let keywords: string[] = []

  if (std?.standardNumber.includes('14543') || q.includes('water') || prod?.productDescription.toLowerCase().includes('water')) {
    topic = 'water'
    matchedSources = DEMO_MOCK_SOURCES.water
    keywords = ['packaged drinking water', 'IS 14543', 'microbiological testing', 'TDS limit', 'Scheme I ISI Mark']
  } else if (std?.standardNumber.includes('16102') || q.includes('led') || q.includes('bulb') || prod?.productDescription.toLowerCase().includes('led')) {
    topic = 'led'
    matchedSources = DEMO_MOCK_SOURCES.led
    keywords = ['LED lamps', 'IS 16102', 'CRS Scheme II', 'electrical insulation', 'lumens per watt']
  } else if (std?.standardNumber.includes('1417') || q.includes('gold') || q.includes('hallmark') || q.includes('huid') || prod?.productDescription.toLowerCase().includes('gold')) {
    topic = 'gold'
    matchedSources = DEMO_MOCK_SOURCES.gold
    keywords = ['gold jewellery', 'IS 1417', 'HUID 6-digit', '22K916 fineness', 'Hallmarking Scheme']
  } else if (std?.standardNumber.includes('9873') || q.includes('toy') || prod?.productDescription.toLowerCase().includes('toy')) {
    topic = 'toy'
    matchedSources = DEMO_MOCK_SOURCES.toy
    keywords = ['toys safety', 'IS 9873', 'small parts choking', 'Toys QCO', 'ISI mark compulsory']
  } else if (std?.standardNumber.includes('269') || q.includes('cement') || prod?.productDescription.toLowerCase().includes('cement')) {
    topic = 'cement'
    matchedSources = DEMO_MOCK_SOURCES.cement
    keywords = ['OPC cement', 'IS 269', 'compressive strength', '43 grade', 'Cement QCO']
  } else if (std?.standardNumber.includes('1061') || q.includes('disinfectant') || q.includes('phenyl') || prod?.productDescription.toLowerCase().includes('cleaner')) {
    topic = 'disinfectant'
    matchedSources = DEMO_MOCK_SOURCES.disinfectant
    keywords = ['phenolic disinfectant', 'IS 1061', 'RW coefficient', 'emulsion stability']
  } else {
    matchedSources = DEMO_MOCK_SOURCES.water
    keywords = ['Bureau of Indian Standards', 'BIS Act 2016', 'Quality Control Orders', 'Conformity Assessment']
  }

  // Compose demo answer content tailored to Consumer vs Authority
  let content = ''

  if (mode === 'authority') {
    // Authority / Officer Copilot Framing
    if (topic === 'water') {
      content = `### Officer Technical Consultation: Packaged Drinking Water [Demo Guidance]

Under the **Bureau of Indian Standards Act, 2016** and relevant Quality Control Orders, packaged drinking water is subject to **compulsory BIS Scheme I (ISI Mark)** certification.

#### Key Inspection Verification Checkpoints (Advisory Demo Overview):
1. **Mandatory ISI Mark & CML License:** Verify that packaging displays the official BIS ISI mark accompanied by an active 7 or 8-digit **CML (Certification Marks License)** number.
2. **Microbiological Sampling Protocol:** Aseptic sample collection per standard sampling methodology is required for laboratory dispatch.
3. **Primary Packaging Safety:** Packaging must conform to applicable food-grade container standards (such as **IS 15410**).
4. **Sampling & Testing Ratios:** Draw representative composite lots per prescribed sampling scale tables in the standard document.

> **Statutory Officer Safeguard:** AI-generated citations are advisory. Official seizure, sampling records (Form II), or penalty proceedings must be executed under the statutory authority of the designated enforcement officer based on published Gazette notifications.`
    } else if (topic === 'gold') {
      content = `### Officer Technical Consultation: Mandatory Hallmarking Enforcement [Demo Guidance]

Under the **Central Hallmarking Order**, gold jewellery and artefacts sold across notified districts must conform to **IS 1417**.

#### Key Inspection Verification Points (Advisory Demo Overview):
1. **3 Mandatory Signs Verification:** Verify presence of (1) BIS triangular mark, (2) Purity/fineness designation (e.g., 22K916, 18K750), and (3) 6-character alphanumeric **HUID (Hallmark Unique Identification Number)**.
2. **HUID Verification Query:** The 6-character HUID can be validated through the official BIS database to inspect registered jeweller details, assaying centre records, and item weight.
3. **Fineness Tolerance:** Gold fineness assaying permits zero negative tolerance on declared karat purity.

> **Statutory Safeguard Notice:** Findings require testing via a recognized Assaying and Hallmarking Centre (AHC) before compounding or prosecution under Section 29 of the BIS Act 2016.`
    } else {
      content = `### Officer Regulatory Consultation: Standard & QCO Assessment [Demo Guidance]

Regarding your query on **${request.query}**:

1. **Regulatory Mandate Status:** Regulated commodities are governed under the BIS Act, 2016 and corresponding sectoral Quality Control Orders (QCO).
2. **Lot Sampling Scale:** Refer to the standardized sampling tables in the applicable Indian Standard annex to establish sample size and lot homogeneity.
3. **Specification Tolerances:** Deviations beyond prescribed tolerance boundaries in standard clauses constitute non-conformity.

> **Statutory Safeguard Notice:** AI-generated information is advisory. Final enforcement, seizure, or compliance decisions must be made by the authorized officer under the BIS Act, 2016 and Legal Metrology Act, 2009.`
    }
  } else {
    // Consumer Assistant Framing
    if (topic === 'water') {
      content = `Namaste! Here is regulatory and standards guidance for **packaged drinking water** [Advisory Demo Guidance]:

### 1. Applicable Indian Standard
Packaged drinking water (other than natural mineral water) is categorized under **IS 14543**. Natural underground spring water is categorized under **IS 13428**.

### 2. Mandatory Quality Control Order (QCO)
Packaged drinking water is under **compulsory BIS certification** in India. Manufacturing, packing, or selling bottled drinking water without a valid **ISI Mark (Scheme I license)** is prohibited.

### 3. What Consumers Should Check on the Label:
- **BIS Standard Mark (ISI Monogram):** Prominently displayed on the bottle or container.
- **CML License Number:** The unique license number underneath the ISI mark (e.g., \`CM/L-xxxxxxx\`).
- **Batch No., Packaging Date & Net Volume:** Mandatory declarations per Legal Metrology rules.
- **FSSAI License Number:** 14-digit food safety registration.

### 4. Consumer Verification
Consumers can verify the CML number on the container through the official **BIS Care Mobile App** to ensure the manufacturer's license is active.`
    } else if (topic === 'gold') {
      content = `Here is consumer guidance on **gold jewellery standards and hallmarking** in India [Advisory Demo Guidance]:

### 1. Applicable Indian Standard
Gold jewellery and artefacts are categorized under **IS 1417** (*Fineness and Marking*).

### 2. Mandatory 3 Hallmarking Signs to Look For:
When purchasing gold jewellery, check for all **3 distinct laser-engraved marks**:
1. **BIS Triangular Hallmark Logo:** Confirms certification by the Bureau of Indian Standards.
2. **Purity / Karat Grade:** e.g., **22K916** (22 Karat / 91.6% pure gold), **18K750** (18 Karat / 75.0% pure gold), or **14K585** (14 Karat / 58.5% pure gold).
3. **6-Digit Alphanumeric HUID:** A unique laser code (e.g., \`AB1234\`) assigned by an authorized Assaying and Hallmarking Centre.

### 3. How Consumers Can Verify:
Use the **BIS Care Mobile App** under *"Verify HUID"* to inspect jeweller registration, hallmarking centre details, and date of hallmarking.`
    } else if (topic === 'led') {
      content = `Here is standards guidance for **domestic LED lamps and lighting** [Advisory Demo Guidance]:

### 1. Applicable Standards
- **IS 16102 (Part 1)** — General Safety Requirements (insulation, fire resistance, electric shock protection).
- **IS 16102 (Part 2)** — Performance Requirements (energy efficiency, lumens per watt).

### 2. Mandatory Scheme: BIS CRS (Scheme II)
Domestic LED bulbs fall under the **Compulsory Registration Scheme (CRS)** of MeitY. The lamp or packaging must display the **Standard Mark with CRS Registration Number** (\`R-xxxxxxxx\`).

### 3. Key Points to Check:
Verify rated wattage (e.g., 9W), operating voltage range, BEE Star Rating label, and the \`R-xxxxxxxx\` registration mark.`
    } else {
      content = `Thank you for your query regarding **${request.query}** [Advisory Demo Guidance].

### Overview:
Under the **Bureau of Indian Standards (BIS)**, commodities in India are governed either by voluntary national standards or mandatory **Quality Control Orders (QCO)** issued by Central Government ministries.

#### Recommended Next Steps:
1. **Locate the IS Code:** Browse your product category in the [Indian Standards Directory](/consumer/standards) to identify the relevant specification.
2. **Check QCO Mandate:** Determine whether mandatory certification (ISI Mark Scheme I, CRS Scheme II, or Hallmarking) applies.
3. **Explore Recognized Testing Labs:** Review accredited testing facilities in the [Testing Labs Directory](/consumer/laboratories).`
    }
  }

  // Construct structured mock advisory evidence
  const evidence: AssistantEvidence = {
    matchedProductDescription: prod
      ? `Product Context: ${prod.productName} — ${prod.productDescription} (Category: ${prod.intendedUseCategory || 'Unspecified'})`
      : std
      ? `Standard Context: ${std.standardNumber} — ${std.title}`
      : 'General consumer regulatory inquiry',
    relevantKeywords: keywords,
    sources: matchedSources,
    contextConsidered: std
      ? `Active Standard Context: ${std.standardNumber} (${std.title}) [Demo Mock Source Binding]`
      : prod
      ? `User-Provided Product Context: ${prod.productName} [Demo Mock Context Binding]`
      : 'Indian Standards Demo Knowledge Base (SIH PS107 Typed Mock Repository)',
    confidenceLevel: 'HIGH',
    advisoryNote:
      '[DEMO / MOCK DATA] This response demonstrates the structured source-backed answer format for SIH PS107. Authentic BIS standard clauses, gazette orders, and conformity assessments will be provided by Parth’s AI/RAG pipeline and Himank’s backend API.',
  }

  return { content, evidence }
}

/**
 * Mock Assistant Service Implementation
 */
export class MockAssistantService implements AssistantService {
  public async sendMessage(request: AssistantRequest): Promise<AssistantResponse> {
    // Artificial small delay (350ms) to simulate streaming / typing state in demo
    await new Promise((res) => setTimeout(res, 350))

    const { content, evidence } = generateDemoResponse(request)

    return {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      content,
      evidence,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  }

  public getInitialWelcomeMessage(mode: AssistantMode, standardContext?: StandardContext): AssistantMessage {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (standardContext) {
      return {
        id: 'welcome-std',
        role: 'assistant',
        timestamp,
        content: `Namaste! I have loaded the consultation context for **${standardContext.standardNumber}** (${standardContext.title}) [Demo Mode].

You can query testing clauses, permissible tolerances, certification markings (ISI Mark / CRS / Hallmarking), or accredited testing laboratories for this standard.`,
        standardContext,
        evidence: {
          relevantKeywords: [standardContext.standardNumber, standardContext.category || 'Standards'],
          sources: DEMO_MOCK_SOURCES.water.slice(0, 1),
          contextConsidered: `Pre-loaded demo context for ${standardContext.standardNumber}`,
          confidenceLevel: 'HIGH',
          advisoryNote:
            '[DEMO / MOCK DATA] Standard context demonstration. Authentic gazette citations will be served by backend AI integration.',
        },
      }
    }

    if (mode === 'authority') {
      return {
        id: 'welcome-auth',
        role: 'assistant',
        timestamp,
        content: `Welcome Officer. I am your **Standards Enforcement Copilot** for technical verification under the BIS Act, 2016 and Legal Metrology Act, 2009 [Demo Mode].

You can query standard clauses, sampling protocols, permissible tolerances, or mandatory Quality Control Order (QCO) gazette references for commodities under inspection.`,
        evidence: {
          relevantKeywords: ['Officer Copilot', 'BIS Act 2016', 'QCO Enforcement', 'Sampling Protocols'],
          sources: DEMO_MOCK_SOURCES.water.slice(0, 1),
          contextConsidered: 'Enforcement Officer Technical Advisory Mode [Demo Repository]',
          confidenceLevel: 'HIGH',
          advisoryNote:
            '[DEMO / MOCK DATA] Officer copilot demonstration. Enforcement actions must be based on published Gazette notifications.',
        },
      }
    }

    return {
      id: 'welcome-consumer',
      role: 'assistant',
      timestamp,
      content: `Namaste! I am your AI assistant for **Indian Standards** and **Bureau of Indian Standards (BIS) regulations** under Smart India Hackathon Problem Statement 107 [Demo Mode].

You can ask me questions about applicable standards for your product, certification procedures (ISI Mark Scheme I, CRS Scheme II, FMCS), accredited testing laboratories, or hallmarking guidelines.`,
    }
  }

  public getSuggestedPrompts(mode: AssistantMode, standardContext?: StandardContext): SuggestedPrompt[] {
    if (standardContext) {
      return [
        {
          id: 'sp-ctx-1',
          category: 'standards',
          title: 'Testing Clauses & Tolerances',
          prompt: `What testing methods and prescribed tolerances apply under ${standardContext.standardNumber}?`,
          badgeText: 'Testing',
        },
        {
          id: 'sp-ctx-2',
          category: 'standards',
          title: 'Mandatory QCO Order',
          prompt: `Is ${standardContext.standardNumber} enforced under a mandatory Quality Control Order (QCO)?`,
          badgeText: 'QCO Mandate',
        },
        {
          id: 'sp-ctx-3',
          category: 'schemes',
          title: 'Certification Markings',
          prompt: `Which BIS certification scheme and packaging mark applies to ${standardContext.standardNumber}?`,
          badgeText: 'Marking',
        },
        {
          id: 'sp-ctx-4',
          category: 'testing',
          title: 'Accredited Laboratories',
          prompt: `Where can I find recognized testing laboratories for ${standardContext.standardNumber}?`,
          badgeText: 'Labs',
        },
      ]
    }

    if (mode === 'authority') {
      return [
        {
          id: 'sp-auth-1',
          category: 'standards',
          title: 'Check Mandatory QCO Status',
          prompt: 'Is packaged drinking water under a mandatory Quality Control Order requiring compulsory ISI mark?',
          badgeText: 'QCO Check',
        },
        {
          id: 'sp-auth-2',
          category: 'testing',
          title: 'Standard Sampling Protocol',
          prompt: 'What is the statutory lot size and sampling protocol for drawing test samples under IS 14543?',
          badgeText: 'Sampling',
        },
        {
          id: 'sp-auth-3',
          category: 'standards',
          title: 'Testing Tolerance Thresholds',
          prompt: 'What are the permissible technical deviations and tolerances before an item is declared non-compliant?',
          badgeText: 'Tolerances',
        },
        {
          id: 'sp-auth-4',
          category: 'schemes',
          title: 'Draft Seizure Reference Points',
          prompt: 'Generate technical reference points for a notice under Section 16/17 of the BIS Act 2016 for counterfeit marks.',
          badgeText: 'BIS Act 2016',
        },
      ]
    }

    return [
      {
        id: 'sp-c-1',
        category: 'standards',
        title: 'Which Standard Applies to My Product?',
        prompt: 'Which Indian Standard may apply to my product, and what details should I check?',
        badgeText: 'Standards Discovery',
      },
      {
        id: 'sp-c-2',
        category: 'schemes',
        title: 'How to Find BIS Certification Info',
        prompt: 'How can I find BIS certification information and verify an ISI mark license?',
        badgeText: 'Certification',
      },
      {
        id: 'sp-c-3',
        category: 'hallmarking',
        title: 'Verify Gold Hallmarking (HUID)',
        prompt: 'What are the 3 mandatory hallmarking signs on gold jewellery and how do I verify a 6-digit HUID?',
        badgeText: 'Gold 22K916',
      },
      {
        id: 'sp-c-4',
        category: 'standards',
        title: 'Help Me Understand This Standard',
        prompt: 'Help me understand the difference between voluntary BIS standards and mandatory Quality Control Orders (QCOs).',
        badgeText: 'Advisory Guidance',
      },
    ]
  }
}

/**
 * Export singleton instance
 */
export const assistantService = new MockAssistantService()
