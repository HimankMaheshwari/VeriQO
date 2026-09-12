# PS107 Phase 5: Unified BIS + Legal Metrology (LMPC) Packaging Verification Architecture

> **Official Architectural Statement**:
> "The existing VeriQO OCR and scan-processing pipeline is shared infrastructure. BIS analysis consumes the existing scan/OCR/product data and does not create a parallel OCR pipeline."

---

## 1. Executive Summary & Core Objective

In Phase 5, the VeriQO packaged commodity verification engine was extended so that an inspection can evaluate **BOTH**:
1. **Legal Metrology / Packaged Commodities Rules (LMPC)** (e.g. MRP, Net Quantity, Date of Packing, Manufacturer/Packer addresses, Unit Sale Price, Consumer Care)
2. **Bureau of Indian Standards (BIS) & Statutory Indian Standards** (e.g. Mandatory QCO applicability, ISI mark presence, CM/L certification licenses, CRS registration numbers, Hallmark HUIDs, Indian Standard specification compliance)

from the **SAME uploaded product inspection**.

---

## 2. Existing OCR Pipeline Reuse & Zero-Duplicate Architecture

### Why a Second OCR Pipeline Was NOT Created
VeriQO already features a high-precision, production-grade image extraction and OCR orchestration pipeline:
- `src/lib/pipeline/process-scan.ts`: Multi-surface image aggregation and storage loading.
- `src/lib/ocr/gemini-ocr.ts`: Gemini Vision OCR engine transcribing all packaging surfaces.
- `src/lib/ocr/fallback-ocr.ts`: Deterministic fallback parser when running offline or without API keys.
- `src/lib/ai/heuristic-analyzer.ts` & `gemini-analyzer.ts`: Physical declaration extraction and product entity identification.

Creating a parallel `bis-ocr.ts` or duplicate extraction pipeline would:
- Double storage read operations and compute overhead.
- Exhaust Gemini API quota by reading the same packaging images multiple times.
- Cause state synchronization and discrepancy issues between LMPC and BIS data stores.

### Architectural Solution
The existing OCR and scan-processing infrastructure is **shared infrastructure**. When a scan is processed, its raw OCR text, image buffers, and extracted declarations are persisted in `ProductScan`. The BIS inspection engine acts as an additive downstream regulatory evaluator that consumes this exact data.

```
                    PRODUCT PACKAGING SURFACES
                                │
                                ▼
                 ┌─────────────────────────────┐
                 │    EXISTING VERIQO OCR      │
                 │   Gemini Vision / Multi-img │
                 │  (processScan shared infra) │
                 └──────────────┬──────────────┘
                                │
                   EXISTING PRODUCT SCAN DATA
              (rawOcrText, extractedDeclarations,
               identifiedProduct, category, etc.)
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
        EXISTING LMPC ENGINE          NEW BIS INSPECTION ENGINE
     (deterministic RuleEngine)                 │
                 │                     ┌────────┴────────┐
                 │                     │                 │
                 │                 Identifier        Candidate
                 │                 Detection         Standards
                 │                     │                 │
                 │                 License /         QCO Checks
                 │                Verification     (Deterministic)
                 │                     │                 │
                 │                     └────────┬────────┘
                 │                              │
                 │                         BIS Findings
                 │                              │
                 └──────────────┬───────────────┘
                                ▼
                     UNIFIED INSPECTION RESULT
                 { lmpc, bis, overall, humanInTheLoop }
                                │
                                ▼
                       HUMAN OFFICER REVIEW
                       (Authoritative Gate)
                                │
                                ▼
                      UNIFIED FORMAL REPORT
```

---

## 3. BIS Integration Point

The primary BIS inspection entry point is:
```typescript
UnifiedInspectionService.evaluateScan(scan: ScanInspectionInput, options?)
```
Exposed via the authenticated REST endpoint:
```
POST /api/v1/bis/scans/[id]/standards-check
GET  /api/v1/bis/scans/[id]/standards-check
```
This endpoint loads the existing `ProductScan` (including its raw OCR text, extracted declarations, and any linked inspections), executes BIS analysis without reprocessing the uploaded images, and returns an integrated dual-domain result.

---

## 4. BIS Identifier Detection

Implemented in `src/lib/bis/inspection/identifier-detector.ts`.

### Statutory Markers Detected & Normalized
1. **Indian Standard (IS) Numbers**:
   - Matches: `IS 10500:2012`, `IS 1293:2019`, `IS:9873 (Part 1):2019`, `IS/ISO ...`
   - Normalized format: `IS <NUMBER>[:<YEAR>]`
2. **Certification Marks License (CML)**:
   - Matches: `CM/L-8400123`, `CML: 8400123`, `Licence No. CM/L 8400123`, 7-digit numbers adjacent to "ISI" or "BIS"
   - Normalized format: `CM/L-XXXXXXX`
3. **Compulsory Registration Scheme (CRS)**:
   - Matches: `R-41009876`, `CRS: R-41009876`, `Regn No. R-41009876`
   - Normalized format: `R-XXXXXXXX`
4. **Hallmark Unique Identification (HUID)**:
   - Matches: 6-character alphanumeric hallmark identifier (e.g. `AB12CD`)
5. **ISI Mark Mentions**:
   - Matches: Explicit claims such as "ISI Mark", "Standard Mark", "Certified by BIS"

### Detection States
- **`DETECTED`**: Pattern confirmed with high confidence; normalized value and context snippet provided.
- **`NOT_DETECTED`**: Indicator is entirely absent from the text.
- **`UNCERTAIN`**: Ambiguous, partial, or malformed mention detected (e.g., `"CM/L-12"` or `"conforms to IS standard"` without a number).

> [!IMPORTANT]
> **Detection $\neq$ Verification**: Detecting the text `CM/L-8400123` on a label proves only that the packaging *claims* that license number. It does not establish that the license is operative or valid in the BIS registry.

---

## 5. Additive Visual BIS Mark Detection

Implemented in `src/lib/bis/inspection/visual-mark-detector.ts`.

### Design & Scope
Some packaging labels feature a graphical ISI or CRS logo with minimal or low-contrast text. To support this:
- An additive vision detector inspects the existing uploaded image buffer(s) stored in `StorageService`.
- It prompts Gemini Vision specifically for the physical graphical marks:
  1. ISI Mark (the official rectangular frame with the "IS" monogram)
  2. CRS Registration Mark
  3. BIS Hallmark (triangle and purity stamp)
- Returns: `{ markType, status: 'DETECTED' | 'NOT_DETECTED' | 'UNCERTAIN', confidence, visualDescription, isDemoRecord }`.

### Safeguards
- **Does not replace OCR**: Operates solely as an auxiliary signal for visual mark presence.
- **Does not establish legal compliance**: Finding a visual mark on packaging without a verified operative CM/L number remains a `POTENTIAL_NON_COMPLIANCE`.
- **Graceful degradation**: In offline or mock mode, or if `GEMINI_API_KEY` is not present, it safely returns `UNCERTAIN` without interrupting the inspection.

---

## 6. Standard Association

Implemented in `src/lib/bis/inspection/standard-associator.ts`.
- **Zero Invention**: Does not hallucinate or guess standard numbers.
- **Precedence**:
  1. Explicit IS number detected on packaging (e.g., `IS 10500:2012`).
  2. Product category and sub-token match against structured BIS catalog (`standardsService.searchStandards`).
  3. Semantic knowledge base retrieval (`knowledgeService.searchKnowledge`).
- If no standard matches: returns `UNKNOWN / NEEDS_REVIEW`.

---

## 7. Quality Control Order (QCO) Applicability

Implemented in `src/lib/bis/inspection/qco-checker.ts`.
- Reuses `QualityControlOrderService`.
- **Deterministic logic only**: Gemini is never permitted to decide whether an order is mandatory.
- **Effective-Date Semantics**:
  - `APPLICABLE`: Mandatory QCO is currently in force.
  - `NOT_YET_EFFECTIVE`: QCO has been notified in the Gazette of India, but its official enforcement date is in the future. Certification remains voluntary until that date.
  - `NOT_APPLICABLE`: Product category does not fall under an active mandatory order.
  - `UNKNOWN`: Insufficient product classification data.

---

## 8. License Verification

Implemented in `src/lib/bis/inspection/license-verifier.ts`.
- Dispatches detected identifiers to `BisLicenseService`:
  - `CML_NUMBER` $\rightarrow$ `verifyCml()`
  - `CRS_REGISTRATION` $\rightarrow$ `verifyCrs()`
  - `HALLMARK_HUID` $\rightarrow$ `verifyHuid()`
- Maps results to `VERIFIED`, `NOT_VERIFIED`, or `UNKNOWN`.
- Propagates `isDemoRecord` provenance directly from the verified entity.

---

## 9. BIS Compliance Findings

Implemented in `src/lib/bis/inspection/bis-findings-engine.ts`.
- Evaluates statutory requirements under the BIS Act, 2016:
  - **Mandatory QCO Violation**: Mandatory QCO applies, but no CML license is detected $\rightarrow$ `POTENTIAL_NON_COMPLIANCE` (Severity: HIGH).
  - **Non-Operative / Expired License**: Declared license is recorded as `EXPIRED`, `CANCELLED`, `SUSPENDED`, or `INVALID_FORMAT` $\rightarrow$ `POTENTIAL_NON_COMPLIANCE` (Severity: CRITICAL).
  - **Operative License Verified**: Declared license is verified as `OPERATIVE` and matches standard $\rightarrow$ `CLEAR` (Severity: INFO).
  - **Ambiguous Declaration**: Malformed CML or uncatalogued standard $\rightarrow$ `NEEDS_REVIEW` (Severity: MEDIUM).
  - **Future QCO / Voluntary**: Notified future QCO or voluntary standard $\rightarrow$ `CLEAR` / `NOT_APPLICABLE`.
- **Conservative Guardrail**: AI or data uncertainty (`UNKNOWN`, `UNCERTAIN`) never automatically converts to a violation.

---

## 10. Unified LMPC + BIS Aggregation

Implemented in `src/lib/bis/inspection/unified-inspection-service.ts`.

```json
{
  "scanId": "cuid...",
  "evaluatedAt": "2026-09-12T...",
  "lmpc": {
    "status": "COMPLIANT",
    "summary": "Packaging declarations comply with Legal Metrology (Packaged Commodities) Rules, 2011.",
    "declarationsCount": 8,
    "violationsCount": 0
  },
  "bis": {
    "status": "CLEAR",
    "identifiers": [...],
    "candidateStandards": [...],
    "qcoChecks": [...],
    "verifications": [...],
    "findings": [...],
    "evidence": [...],
    "isDemoData": true
  },
  "overall": {
    "status": "COMPLIANT",
    "summary": "Packaging conforms to verified Legal Metrology declarations and applicable Indian Standards.",
    "requiresOfficerReview": false,
    "statutoryAuthority": "Legal Metrology Act, 2009 & Bureau of Indian Standards Act, 2016"
  },
  "humanInTheLoop": {
    "stage": "VERIFICATION_RESULT",
    "officerStatus": "PENDING_OFFICER_REVIEW",
    "advisoryNotice": "Automated detections and deterministic rules provide evidentiary analysis. Official regulatory decisions remain under the sole authority of the authorized inspecting officer."
  }
}
```

### Deterministic Aggregation Matrix

| LMPC Status | BIS Status | Unified Overall Status | Rationale |
| :--- | :--- | :--- | :--- |
| `COMPLIANT` | `CLEAR` | **`COMPLIANT`** | Both regulatory frameworks fully satisfied. |
| `COMPLIANT` | `NEEDS_REVIEW` | **`NEEDS_REVIEW`** | LMPC declarations pass; BIS marking/standard requires officer verification. |
| `COMPLIANT` | `POTENTIAL_NON_COMPLIANCE` | **`POTENTIAL_NON_COMPLIANCE`** | LMPC declarations pass; BIS statutory deficiency identified. |
| `POTENTIAL_NON_COMPLIANCE` | `CLEAR` | **`POTENTIAL_NON_COMPLIANCE`** | LMPC packaging violation cannot be overridden by BIS compliance. |
| `POTENTIAL_NON_COMPLIANCE` | `NEEDS_REVIEW` | **`POTENTIAL_NON_COMPLIANCE`** | LMPC non-compliance is never downgraded by BIS uncertainty. |
| `POTENTIAL_NON_COMPLIANCE` | `POTENTIAL_NON_COMPLIANCE` | **`ACTION_REQUIRED`** | Critical dual-domain failure requiring urgent enforcement response. |

---

## 11. Human-in-the-Loop Safeguards

1. **Advisory Evidence Only**: All AI mark detections, OCR extractions, and automated rule evaluations are advisory evidentiary inputs.
2. **Explicit Workflow Stages**:
   - `AUTOMATED_DETECTION`: OCR and pattern extraction from packaging surfaces.
   - `DETERMINISTIC_CHECK`: Rule engine and QCO applicability evaluation.
   - `VERIFICATION_RESULT`: License registry status check.
   - `OFFICER_DECISION`: Final, legally authoritative determination recorded by the human inspecting officer.

---

## 12. Report Integration & Forward Compatibility

Implemented in `src/lib/bis/inspection/unified-report-generator.ts`.
- **Protected Files Untouched**: `src/lib/inspections/report-generator.ts` and `pdf-service.ts` have zero diff.
- **Forward-Compatible Model**: `UnifiedInspectionReportData` matches the existing inspection report payload, adding structured BIS verification data and a 64-character SHA-256 cryptographic security hash.
- **Dual-Domain Rendering**: Generates Markdown and structured payloads with distinct sections:
  - `SECTION 1: LEGAL METROLOGY (PACKAGED COMMODITIES) COMPLIANCE`
  - `SECTION 2: BUREAU OF INDIAN STANDARDS (BIS) VERIFICATION`
  - `SECTION 3: UNIFIED REGULATORY DISPOSITION & OFFICER REVIEW`

---

## 13. Demo / Live Provenance Propagation

- `isDemoRecord` is **not hardcoded**.
- It is propagated from the underlying data source:
  - If a simulated mock standard or demo license is used, `isDemoRecord: true`.
  - When live registry adapters or verified records are connected, `isDemoRecord: false`.
- The overall inspection result flags `isDemoData: true` if any constituent standard, license, or QCO record is a demo record.

---

## 14. Verification & Test Coverage

### Automated Test Suite: `scripts/test-ps107-phase5-unified-verification.ts`
64 assertions testing 28 distinct aspects:
- Existing OCR text reuse & no duplicate OCR execution
- CML, CRS, HUID, and Indian Standard extraction & normalization
- `NOT_DETECTED` and `UNCERTAIN` state assignments
- Catalog & knowledge-base standard association without invention
- Deterministic QCO evaluation (`APPLICABLE`, `NOT_APPLICABLE`, `UNKNOWN`, `NOT_YET_EFFECTIVE`)
- CML, CRS, and HUID registry verification
- Demo-data disclosure & provenance propagation (`true` and `false`)
- Evidence-backed BIS findings and conservative handling of ambiguous references
- Preservation of existing LMPC results
- Dual-domain overall status aggregation
- Scan ownership protection (403 Forbidden for cross-user non-authority access)
- Authentication enforcement (401 Unauthorized)
- Sanitized API responses (404 for missing scans, zero internal stack traces leaked)
- Unified dual-domain report generation with SHA-256 integrity seal
- Additive visual mark detector and confirmation that visual mark presence $\neq$ legal compliance

### Full Suite Summary

| Test Suite | Tests | Result |
| :--- | :---: | :---: |
| `scripts/test-ps107-phase1-foundation.ts` | 32 | **PASS (100%)** |
| `scripts/test-ps107-phase2-api.ts` | 85 | **PASS (100%)** |
| `scripts/test-phase3a-rule-engine.ts` | 59 | **PASS (100%)** |
| `scripts/test-phase4a-inspection-workflow.ts` | 40 | **PASS (100%)** |
| `scripts/test-ps107-phase3-rag-foundation.ts` | 91 | **PASS (100%)** |
| `scripts/test-ps107-phase4-grounded-assistant.ts` | 87 | **PASS (100%)** |
| `scripts/test-ps107-phase5-unified-verification.ts` | 64 | **PASS (100%)** |
| **Total Automated Tests** | **458** | **PASS (100%)** |
