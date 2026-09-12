# VeriQO PS107 — Comprehensive AI/ML Architecture Audit & Analysis

**Author:** Developer 3 — AI/ML Specialist, VeriQO Team  
**Date:** September 13, 2026  
**Scope:** VeriQO Platform Pre-Implementation Audit for Problem Statement PS107 (BIS Standards & AI-Assisted Regulatory Intelligence)  
**Governing Architectural Principle:** `REUSE > EXTEND > MODIFY > REWRITE` (2-Day Transformation Constraint)  
**Status:** Audit Complete — Production Code Untouched  

---

## Executive Summary

This audit establishes the baseline technical state of the **VeriQO** repository before introducing BIS (Bureau of Indian Standards) intelligence capabilities under PS107. 

The current codebase is a production-grade, highly cohesive TypeScript/Next.js 14 App Router application with strict Layer 2 Role-Based Access Control (RBAC), an asynchronous physical packaging scan pipeline, a deterministic Legal Metrology Rule Engine, e-commerce listing verification, comprehensive evidence management, and cryptographically verified report generation.

**Key Findings:**
1. **Existing AI/ML Footprint:** Multimodal vision OCR and structured package declaration extraction powered by Google Gemini (`@google/generative-ai: ^0.24.1`) with deterministic heuristic fallbacks (`HeuristicAnalysisProvider`, `FallbackOcrProvider`).
2. **Vector DB & RAG State:** **Zero vector databases, zero embedding pipelines, and zero RAG infrastructure exist in the repository.** Current search is purely relational PostgreSQL/Prisma with case-insensitive `contains` matching.
3. **Legal Compliance Decoupling:** AI and LLMs are **strictly excluded from making compliance determinations**. AI performs factual transcription and extraction only; legal compliance is 100% evaluated by a pure deterministic rule engine (`evaluateRules`). This hard invariant is preservation-critical.
4. **PS107 Strategy:** PS107 BIS conversational search, product-to-standard matching, and certification guidance must be built by **extending** the existing service abstraction layers (`src/lib/ai/`, `src/lib/search/`), without rewriting or disturbing the existing Legal Metrology compliance core.

---

## 1. Existing AI Architecture

The current VeriQO AI/ML architecture is structured as a layered, fault-tolerant extraction and evaluation engine. It operates synchronously or asynchronously via Next.js server-side API routes.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXISTING VERIQO AI/ML RUNTIME                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

 [Client Upload: Consumer or Officer Portal]
           │
           ▼
 [StorageService: Local / S3]  ────────► [ProductScan & ScanImage Persisted in PostgreSQL]
           │
           ▼
 [processScan Pipeline Orchestrator] (src/lib/pipeline/process-scan.ts)
     │
     ├──► 1. Check GEMINI_API_KEY / GOOGLE_API_KEY (src/lib/ocr/env.ts)
     │
     ├──► 2. OcrService (getOcrService() in src/lib/ocr/index.ts)
     │         ├── If Key Present: GeminiOcrProvider (src/lib/ocr/gemini-ocr.ts)
     │         │     └── Candidate Cascade: gemini-flash-latest → gemini-3.7-flash → 
     │         │                            gemini-3.6-flash → gemini-flash-lite-latest
     │         └── If Missing/Failed: FallbackOcrProvider (src/lib/ocr/fallback-ocr.ts)
     │               └── Returns empty rawText (no synthetic declarations)
     │
     ├──► 3. ProductAnalysisService (getProductAnalysisService() in src/lib/ai/index.ts)
     │         ├── If Key Present: GeminiAnalysisProvider (src/lib/ai/gemini-analyzer.ts)
     │         │     └── Temperature 0.1, responseMimeType: application/json
     │         │     └── 15 Mandatory Packaging Declarations + Commodity Identification
     │         └── If Failed/Missing: HeuristicAnalysisProvider (src/lib/ai/heuristic-analyzer.ts)
     │               └── Deterministic Regex + Pattern Matcher + Known Brands
     │
     ├──► 4. Persistence Layer (Prisma Client)
     │         ├── Update ProductScan (status: COMPLETE, rawOcrText, identifiedProductName...)
     │         ├── Delete & Re-insert ExtractedDeclaration records (15 fields)
     │         └── Link or Upsert Product repository entity
     │
     └──► 5. Audit Logging (src/lib/audit.ts) ──► AuditLog table (Action: PRODUCT_SCAN)

 [Separate Deterministic Rule Evaluation — Zero AI in Legal Judgments]
     │
     └──► runScanRuleEngine() (src/lib/rules/rule-engine.ts)
           ├── Context Builder (src/lib/rules/context-builder.ts)
           ├── Historical RuleVersion Selector (by packaging date)
           ├── 16 Deterministic Boolean/Numeric/Regex Operators (src/lib/rules/operators.ts)
           ├── ComplianceCheck records (PASS | FAIL | WARNING | REQUIRES_REVIEW)
           └── Violation records (Generated strictly for FAIL; WARNING is advisory only)
```

### End-to-End Execution Flow (Actual Code Path)
1. User uploads packaging images via `POST /api/v1/upload` (consumer) or `POST /api/v1/authority/scans` (authority officer).
2. Images are persisted using `StorageService` (`LocalStorageService` under `./uploads` or `S3StorageService`). `ProductScan` and `ScanImage` records are created in Prisma.
3. The client or authority route triggers `POST /api/v1/scans/[id]/process` or `POST /api/v1/authority/scans/[id]/process`, invoking `processScan(scanId)` in [src/lib/pipeline/process-scan.ts](file:///Users/parth/VeriQO/src/lib/pipeline/process-scan.ts).
4. `processScan` retrieves image buffers from storage and calls `OcrService.extractText()`.
5. The combined transcribed OCR text is passed along with image buffers to `ProductAnalysisService.analyzePackage()`.
6. Extracted declarations are normalized and persisted into the `ExtractedDeclaration` table.
7. If linked to an inspection or requested by an officer, `runScanRuleEngine` evaluates statutory rules against the extracted declarations.

---

## 2. Existing OCR Pipeline

The OCR pipeline extracts verbatim textual declarations from packaging images without altering or interpreting statutory meaning.

### Pipeline Flow
```
Packaging Image (Buffer, MimeType)
       │
       ▼
normalizeMimeType() [image/jpeg, image/png, image/webp, image/heic]
       │
       ▼
Base64 Encoding -> inlineData Object
       │
       ▼
Gemini Multimodal generateContent([prompt, imagePart])
       │
       ▼
Model Fallback Cascade (timeout: 30000ms, temperature: 0.0)
  [Primary Model] -> gemini-flash-latest -> gemini-3.7-flash -> gemini-3.6-flash -> gemini-flash-lite-latest -> gemma-4-26b-a4b-it
       │
       ▼
Per-Image Result: { imageId, text, confidence: 0.95 }
       │
       ▼
Aggregation: "--- [Packaging Surface 1] ---\n{text}\n\n--- [Packaging Surface 2] ---..."
       │
       ▼
Persist ScanImage.ocrText & ProductScan.rawOcrText
```

### Module Audit: OCR System

| Attribute | Specification |
|:---|:---|
| **Primary File** | [src/lib/ocr/gemini-ocr.ts](file:///Users/parth/VeriQO/src/lib/ocr/gemini-ocr.ts) |
| **Supporting Files** | [src/lib/ocr/types.ts](file:///Users/parth/VeriQO/src/lib/ocr/types.ts), [src/lib/ocr/env.ts](file:///Users/parth/VeriQO/src/lib/ocr/env.ts), [src/lib/ocr/fallback-ocr.ts](file:///Users/parth/VeriQO/src/lib/ocr/fallback-ocr.ts), [src/lib/ocr/index.ts](file:///Users/parth/VeriQO/src/lib/ocr/index.ts) |
| **Provider / Library** | `@google/generative-ai` (Google Generative AI SDK) |
| **Model Hierarchy** | `process.env.GEMINI_OCR_MODEL` $\to$ `process.env.GEMINI_MODEL` $\to$ `gemini-flash-latest` $\to$ `gemini-3.7-flash` $\to$ `gemini-3.6-flash` $\to$ `gemini-flash-lite-latest` $\to$ `gemma-4-26b-a4b-it` |
| **Inputs** | `images: OcrImageInput[]` where each element has `{ imageId: string, buffer: Buffer, mimeType: string }`. Constrained to max 10 images, max 20MB each. Supported MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/heic`. |
| **Outputs** | `OcrResult`: `{ rawText: string, images: Array<{ imageId: string, text: string, confidence?: number }> }` |
| **Prompt Used** | Verbatim transcription prompt directing model to act as a "high-precision OCR transcription engine for packaged commodities sold in India under the Legal Metrology Act, 2009". Extracts 10 explicit sections (Brand, Net quantity, MRP, Dates, Manufacturer/Packer/Importer, Customer Care, Country of Origin, Batch/Lot, Nutritional table/FSSAI, Hindi/bilingual text). Instructs: *"Output ONLY the exact transcribed text as visible on the packaging. Do not invent text. Do not add conversational commentary."* |
| **Failure Handling** | 1. If `GEMINI_API_KEY` is missing: `getOcrService()` selects `FallbackOcrProvider`, returning empty `rawText` and triggering a clear warning in `process-scan.ts`.<br>2. If candidate model fails (timeout 30s or network error): catches error and iterates through candidate models.<br>3. If all candidate models fail: records confidence `0`, empty text, and logs error detail. |
| **Reusability for PS107** | **High (As-Is / Extend)**: Can transcribe BIS standard marks (ISI mark, CM/L license number, Hallmarking 6-digit HUID code, CRS registration number `R-XXXXXXXX`) directly without architectural changes. |
| **Preservation Status** | **Safe to extend**: Keep default prompt intact; optionally introduce a specialized BIS label OCR prompt mode if needed. |

---

## 3. Existing Vision Pipeline

### Computer Vision Capabilities Audit
Currently, VeriQO does **not** employ local computer vision frameworks (such as OpenCV, TensorFlow.js, Tesseract.js, or ONNX Runtime). Instead, all vision capabilities are offloaded to multimodal LLM vision endpoints.

1. **Packaging Image Ingestion & Storage:**
   - [src/lib/storage.ts](file:///Users/parth/VeriQO/src/lib/storage.ts): Abstracted `StorageService` interface with `LocalStorageService` (`./uploads`) and `S3StorageService` (AWS S3 / MinIO).
   - Sanitizes filenames, generates random UUID storage keys (`scans/${scanId}/${randomUUID()}.${ext}`), and returns `Buffer` objects for downstream processing.
2. **Multimodal Packaging Declaration Reading:**
   - [src/lib/ai/gemini-analyzer.ts](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts): Lines 97-107 attach up to 2 image buffers as `inlineData` parts when raw OCR text is absent or ambiguous.
3. **Bounding Box Schema Provision:**
   - [prisma/schema.prisma](file:///Users/parth/VeriQO/prisma/schema.prisma) line 279 defines `boundingBox Json?` on `ExtractedDeclaration` (`{ x, y, width, height, imageIndex }`).
   - *Current Codebase Status:* Schema exists; Gemini prompts currently extract text snippets (`sourceText`) rather than bounding box pixel coordinates.
4. **Typography & Prominence Inspection:**
   - [src/lib/rules/seed/legal-rules-data.ts](file:///Users/parth/VeriQO/src/lib/rules/seed/legal-rules-data.ts) Rule 9 (`LMPC-2011-R09-SCH2`) evaluates legibility.
   - Physical millimeter font height on uncalibrated photographs is held strictly as an advisory `WARNING` without generating a formal legal violation, preventing false positives from perspective distortion.

---

## 4. Existing LLM Pipeline

### LLM Specifications & Settings

| Parameter | Current Configuration | File Reference |
|:---|:---|:---|
| **SDK / Client** | `@google/generative-ai` v0.24.1 | [package.json:L18](file:///Users/parth/VeriQO/package.json#L18) |
| **API Key Retrieval** | `getGeminiApiKey()` checking: 1. `process.env.GEMINI_API_KEY`, 2. `process.env.GOOGLE_API_KEY`, 3. Direct disk read of `.env.local`, 4. Direct disk read of `.env` | [src/lib/ocr/env.ts:L13-L37](file:///Users/parth/VeriQO/src/lib/ocr/env.ts#L13-L37) |
| **OCR Primary Model** | `process.env.GEMINI_OCR_MODEL \|\| process.env.GEMINI_MODEL \|\| 'gemini-flash-latest'` | [src/lib/ocr/gemini-ocr.ts:L20](file:///Users/parth/VeriQO/src/lib/ocr/gemini-ocr.ts#L20) |
| **Analyzer Primary Model** | `process.env.GEMINI_AI_MODEL \|\| process.env.GEMINI_MODEL \|\| 'gemini-flash-latest'` | [src/lib/ai/gemini-analyzer.ts:L28](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L28) |
| **Model Candidate Fallbacks** | `['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest']` | [src/lib/ai/gemini-analyzer.ts:L35-L42](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L35-L42) |
| **Temperature** | `0.0` for OCR Transcription; `0.1` for Declaration Extraction | [src/lib/ocr/gemini-ocr.ts:L77](file:///Users/parth/VeriQO/src/lib/ocr/gemini-ocr.ts#L77), [src/lib/ai/gemini-analyzer.ts:L119](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L119) |
| **Response Format** | `application/json` (Gemini Structured Outputs mode) in `gemini-analyzer.ts` | [src/lib/ai/gemini-analyzer.ts:L118](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L118) |
| **Timeout Limits** | 30,000ms for OCR; 25,000ms for Declaration Analysis | [src/lib/ocr/gemini-ocr.ts:L80](file:///Users/parth/VeriQO/src/lib/ocr/gemini-ocr.ts#L80), [src/lib/ai/gemini-analyzer.ts:L122](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L122) |
| **Retry / Failover Logic** | Sequential model iteration loop; fallback to deterministic `HeuristicAnalysisProvider` | [src/lib/ai/gemini-analyzer.ts:L112-L143](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L112-L143) |

### Prompts Currently in Codebase

#### 1. Verbatim Packaging OCR Prompt
- **Location:** [src/lib/ocr/gemini-ocr.ts:L51-L66](file:///Users/parth/VeriQO/src/lib/ocr/gemini-ocr.ts#L51-L66)
- **Role:** High-precision transcription engine under Legal Metrology Act, 2009.
- **Constraints:** Extracts verbatim visible text across 10 distinct packaging zones. Zero conversational commentary.

#### 2. Mandatory Declaration & Commodity Identification Prompt
- **Location:** [src/lib/ai/gemini-analyzer.ts:L48-L92](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts#L48-L92)
- **Role:** Package inspection and declaration extraction engine.
- **Rules Enforced:**
  - *"DO NOT INVENT, FABRICATE, OR GUESS MISSING VALUES."*
  - *"If a declaration is not clearly visible... set rawValue to null, normalizedValue to null, confidence to 0, detectionStatus to 'NOT_DETECTED'."*
  - *"DO NOT DECIDE LEGAL COMPLIANCE. Your role is purely factual."*
- **JSON Schema:** Returns `{ product: { productName, brand, category, likelyManufacturer, confidence, status }, declarations: [{ fieldName, rawValue, normalizedValue, confidence, sourceText, detectionStatus }] }`.

### Current LLM Use Cases
- Packaging text extraction from photos.
- 15 mandatory Legal Metrology declaration field extractions (MRP, Net Quantity, Dates, Manufacturer, Packer, Importer, Address, USP, etc.).
- Basic commodity categorization (e.g. *Packaged Food / Biscuits, Personal Care / Soap*).
- **Not currently handling:** General user queries, BIS standards interpretation, interactive Q&A, RAG, claim verification, or testing laboratory recommendations.

---

## 5. Existing Legal Metrology Engine

The Legal Metrology engine is the core statutory authority in VeriQO. **It is preservation-critical and must not be replaced or weakened by LLM generation.**

```
                               ┌────────────────────────┐
                               │ Extracted Declarations │
                               └───────────┬────────────┘
                                           │
                                           ▼
┌───────────────────────┐      ┌────────────────────────┐
│ Active LegalRule &    │ ───► │ RuleEngineContext      │
│ Historical RuleVersion│      │ (src/lib/rules/        │
│ (PostgreSQL/Prisma)   │      │  context-builder.ts)   │
└───────────────────────┘      └───────────┬────────────┘
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │ Pure Deterministic     │
                               │ Evaluation Engine      │
                               │ (evaluateRules())      │
                               └───────────┬────────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  ▼                                                 ▼
     ┌────────────────────────┐                        ┌────────────────────────┐
     │  ComplianceCheck (All) │                        │  Violation Candidate   │
     │  PASS | FAIL | WARNING │                        │  (STRICTLY FOR 'FAIL') │
     └────────────────────────┘                        └────────────────────────┘
                  │                                                 │
                  ▼                                                 ▼
        Prisma ComplianceCheck                              Prisma Violation
```

### Key Preservation Invariants

1. **AI Decisional Exclusion:** AI models never evaluate compliance or determine violations. All checks evaluate deterministic conditional logic against `RuleEngineContext` [src/lib/rules/rule-engine.ts:L24-L32](file:///Users/parth/VeriQO/src/lib/rules/rule-engine.ts#L24-L32).
2. **Historical Version Locking:** Rules are evaluated against their historical version based on the product's manufacturing/packaging date (`selectHistoricalRuleVersion` in [src/lib/rules/applicability-evaluator.ts](file:///Users/parth/VeriQO/src/lib/rules/applicability-evaluator.ts)). Amendments taking effect later (such as Unit Sale Price mandatory commencement on 01/12/2022) do not penalize commodities manufactured prior to effective dates.
3. **The Advisory `WARNING` Safeguard:** Status `WARNING` (e.g. font prominence, minor advisory observations) **never** creates a formal `Violation` record [src/lib/rules/rule-engine.ts:L159-L170](file:///Users/parth/VeriQO/src/lib/rules/rule-engine.ts#L159-L170). Only status `FAIL` generates formal `Violation` candidates.
4. **Statutory Exemption Gates:**
   - **Rule 3 Chapter II Gate:** Packages $>25\text{ kg}$ or $>25\text{ L}$ (and $>50\text{ kg}$ for cement/fertilizer) are exempt from retail packaging rules. Industrial and institutional consumers are exempt from Chapter II.
   - **Rule 26(a) Small Package Exemption:** Packages $\le 10\text{ g}$ or $\le 10\text{ ml}$ are exempt from Chapter II declarations (with statutory provisos excluding tobacco and pan masala).
5. **16 Deterministic Operators:** Implemented in [src/lib/rules/operators.ts](file:///Users/parth/VeriQO/src/lib/rules/operators.ts) (`EXISTS`, `NOT_EXISTS`, `EQUALS`, `NOT_EQUALS`, `MATCHES_REGEX`, `CONTAINS`, `NOT_CONTAINS`, `ONE_OF`, `NUMERIC_GT`, `NUMERIC_GTE`, `NUMERIC_LT`, `NUMERIC_LTE`, `NUMERIC_RANGE`, `DATE_FORMAT_VALID`, `DATE_BEFORE_NOW`, `DAYS_BETWEEN`).
6. **Active Seeded Rules:**
   - `LMPC-2011-R06-1-A`: Manufacturer/Packer/Importer Name & Address
   - `LMPC-2011-R06-1-B`: Generic/Common Name of Commodity
   - `LMPC-2011-R06-1-C`: Net Quantity in SI Metric Units (prohibits non-metric lbs/oz)
   - `LMPC-2011-R06-1-D`: Month and Year of Manufacture/Packing/Import
   - `LMPC-2011-R06-1-DA`: Country of Origin for Imported Products
   - `LMPC-2011-R06-1-E`: Maximum Retail Price (MRP) inclusive of all taxes
   - `LMPC-2011-R06-1-EA`: Unit Sale Price (USP) per g/kg/ml/l/m/piece
   - `LMPC-2011-R06-1-F`: Customer Care / Consumer Helpline Details
   - `LMPC-2011-R09-SCH2`: Display Prominence & Legibility (Advisory Warning only)

---

## 6. Reusable Components

The following components can serve PS107 directly without requiring refactoring or modifications:

| Component | File Path | Capability Reused for PS107 |
|:---|:---|:---|
| **Gemini API Environment & Key Discovery** | [src/lib/ocr/env.ts](file:///Users/parth/VeriQO/src/lib/ocr/env.ts) | Robust API key loader checking process env and hot-reloading `.env.local` / `.env`. |
| **Multimodal Vision OCR Engine** | [src/lib/ocr/gemini-ocr.ts](file:///Users/parth/VeriQO/src/lib/ocr/gemini-ocr.ts) | Can transcribe packaging marks, ISI certification logos, licenses, and packaging text for BIS matching. |
| **OCR Service Factory & Types** | [src/lib/ocr/types.ts](file:///Users/parth/VeriQO/src/lib/ocr/types.ts), [src/lib/ocr/index.ts](file:///Users/parth/VeriQO/src/lib/ocr/index.ts) | Clean interface (`OcrService`) and factory pattern for pluggable OCR backends. |
| **Storage Service** | [src/lib/storage.ts](file:///Users/parth/VeriQO/src/lib/storage.ts) | Full local/S3 file management for product images and generated reports. |
| **Audit Logging Infrastructure** | [src/lib/audit.ts](file:///Users/parth/VeriQO/src/lib/audit.ts) | Winston logger + immutable PostgreSQL `AuditLog` table. |
| **Deterministic Rule Evaluator** | [src/lib/rules/rule-engine.ts](file:///Users/parth/VeriQO/src/lib/rules/rule-engine.ts) | Extensible pure condition evaluator capable of running BIS standard compliance rules alongside LMPC rules. |
| **Condition Operators** | [src/lib/rules/operators.ts](file:///Users/parth/VeriQO/src/lib/rules/operators.ts) | 16 mathematical, date, string, and regex comparison operators ready for BIS condition checking. |
| **Online Scraper & DOM Extractor** | [src/lib/online/extractor.ts](file:///Users/parth/VeriQO/src/lib/online/extractor.ts) | Extracts JSON-LD, OpenGraph, meta tags, and specifications from online product pages. |
| **Safe HTTP Client & SSRF Protection** | [src/lib/online/security.ts](file:///Users/parth/VeriQO/src/lib/online/security.ts) | Enterprise SSRF protection, IP/DNS filtering, and TLS validation for external web requests. |
| **Evidence Management System** | [src/lib/inspections/evidence-service.ts](file:///Users/parth/VeriQO/src/lib/inspections/evidence-service.ts) | Anti-injection validation, physical/online evidence traces, and chronological timelines. |
| **PDFKit Document Generator** | [src/lib/inspections/pdf-service.ts](file:///Users/parth/VeriQO/src/lib/inspections/pdf-service.ts) | High-resolution PDF generation with SHA-256 cryptographic verification hashes. |
| **Authentication & RBAC Helpers** | [src/lib/auth.ts](file:///Users/parth/VeriQO/src/lib/auth.ts), [src/lib/api-helpers.ts](file:///Users/parth/VeriQO/src/lib/api-helpers.ts) | Two-layer route and handler security (`requireAuth`, `requireRole`, `ok`, `badRequest`, etc.). |

---

## 7. Components Requiring Modification

In accordance with the `REUSE > EXTEND > MODIFY > REWRITE` principle, modifications are strictly scoped to non-breaking extensions:

| File Path | Nature of Modification | Rationale & Safety Constraint |
|:---|:---|:---|
| [src/lib/ai/types.ts](file:///Users/parth/VeriQO/src/lib/ai/types.ts) | **Extend Interface** | Add optional BIS fields to `ProductIdentificationResult` and `MANDATORY_DECLARATION_FIELDS` (e.g. `isi_mark`, `cml_number`, `hallmark_huid`, `crs_registration_number`). Must maintain 100% backward compatibility with existing 15 LMPC fields. |
| [src/lib/ai/gemini-analyzer.ts](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts) | **Extend Prompt & JSON Schema** | Instruct the model to recognize BIS certification marks (ISI mark with CM/L number, Hallmark 6-digit alphanumeric HUID, CRS registration mark) from packaging OCR text. Safety constraint: Do not alter LMPC extraction behavior or safety guidelines. |
| [src/lib/ai/heuristic-analyzer.ts](file:///Users/parth/VeriQO/src/lib/ai/heuristic-analyzer.ts) | **Extend Pattern Regex** | Add regex extractors for: CM/L license (`\bCM\/L-?\s*(\d{7,10})\b`), Hallmarking HUID (`\b[A-Z0-9]{6}\b`), and CRS (`\bR-\d{8}\b`). Preserves fallback capability when Gemini API key is absent. |
| [src/lib/pipeline/process-scan.ts](file:///Users/parth/VeriQO/src/lib/pipeline/process-scan.ts) | **Extend Orchestrator** | After LMPC declaration extraction, optionally invoke the new BIS standard discovery service if BIS fields or keywords are detected. |
| [prisma/schema.prisma](file:///Users/parth/VeriQO/prisma/schema.prisma) | **Schema Additions (Non-Destructive)** | Add new models for BIS standards catalog and conversational query history (see Section 10). Do not alter existing tables or delete columns. |
| [src/lib/search/search-service.ts](file:///Users/parth/VeriQO/src/lib/search/search-service.ts) | **Extend Search Entities** | Add `STANDARD` to `entityType` filter and query the new BIS standard registry table in addition to Cases, Complaints, Inspections, and Products. |

---

## 8. New AI Components Required for PS107

PS107 requires comprehensive BIS standards assistance and product compliance discovery. The table below maps each capability to existing modules and specifies I/O requirements:

| PS107 Capability | Analogous Component in Codebase | Required Inputs | Required Outputs |
|:---|:---|:---|:---|
| **1. BIS Conversational Assistant** | None (Only packaging extraction exists) | User conversational query, chat history, user role (`CONSUMER` / `AUTHORITY_OFFICER`) | Streamed or structured answer, cited IS standard codes, confidence score, follow-up suggestions |
| **2. Intent Detection & Routing** | Heuristic keyword matcher in `HeuristicAnalysisProvider` | Natural language text string | Intent enum: `STANDARD_SEARCH`, `MANDATORY_CERTIFICATION_CHECK`, `HALLMARKING_QUERY`, `LAB_SEARCH`, `COMPLAINT_GUIDANCE`, `GENERAL_LMPC` |
| **3. Query Understanding & Expansion** | `normalizeEntityName` in [src/lib/online/normalizer.ts](file:///Users/parth/VeriQO/src/lib/online/normalizer.ts) | Raw user query string | Normalized product keywords, synonyms, Indian Standard number (e.g. "IS 1061"), category tokens |
| **4. BIS Knowledge Retrieval** | `AuthoritySearchService` in [src/lib/search/search-service.ts](file:///Users/parth/VeriQO/src/lib/search/search-service.ts) | Normalized keywords, category, IS number, scope filters | Ranked list of BIS standard records, mandatory status, licensing requirements, testing parameters |
| **5. Reranking & Context Assembly** | Comparison logic in [src/lib/online/comparator.ts](file:///Users/parth/VeriQO/src/lib/online/comparator.ts) | Retrieved standard documents + query | Compact, token-budgeted prompt context containing top-3 relevant standards and clause excerpts |
| **6. Product-to-Standard Matching** | `ProductAnalysisService` in [src/lib/ai/gemini-analyzer.ts](file:///Users/parth/VeriQO/src/lib/ai/gemini-analyzer.ts) | Identified commodity name, category, brand, extracted packaging declarations | Matching Indian Standard (e.g. "Packaged Drinking Water $\to$ IS 14543"), mandatory certification flag, scheme type (Scheme I / Scheme II / Scheme IV) |
| **7. Laboratory & Testing Guidance** | Evidence collection in [src/lib/inspections/evidence-service.ts](file:///Users/parth/VeriQO/src/lib/inspections/evidence-service.ts) | IS standard code, location / state | Recognized BIS labs, test parameters, sample testing duration, conformity assessment checklist |
| **8. Hallmarking Query Handling** | None | 6-digit HUID code, precious metal type (Gold / Silver), purity (e.g. 22K916) | HUID structure validation, verification checklist, assaying centre details, consumer rights |
| **9. Claim & Evidence Verification** | Online-vs-Physical Comparator in [src/lib/online/comparator.ts](file:///Users/parth/VeriQO/src/lib/online/comparator.ts) | Packaging claim text, extracted marks, retrieved standard requirements | Verification verdict: `VERIFIED`, `CONTRADICTED`, `UNSUBSTANTIATED`, with statutory citations |
| **10. Citation Tracking & Confidence Scoring** | `AuditLog` + `Confidence` fields across Prisma models | Generated response text, retrieved context chunks | Array of exact citations (Standard Number, Year, Clause/Section), calculated confidence score (0.00–1.00) |

---

## 9. Proposed AI Pipeline

Two decoupled pipelines designed to meet PS107 requirements while preserving existing functionality:

### A. Query Pipeline (BIS Conversational Intelligence)

```
USER QUERY
   │
   ▼
[1. INTENT DETECTION & ROUTING]
   ├── Reused: Auth session & role validation (src/lib/api-helpers.ts)
   └── New: IntentClassifier (LLM few-shot or pattern-based fast router)
   │
   ▼
[2. QUERY UNDERSTANDING & NORMALIZATION]
   ├── Reused: Tokenizer & normalizer (src/lib/online/normalizer.ts)
   └── New: QueryExpander (Extracts IS code, commodity keywords, purity/certification terms)
   │
   ▼
[3. RETRIEVAL (BIS Standards Knowledge Base)]
   ├── Reused: Prisma relational search infrastructure (src/lib/search/search-service.ts)
   └── New: BisKnowledgeService querying structured BisStandard table + full-text indexing
   │
   ▼
[4. CONTEXT ASSEMBLY & PROMPT INGESTION]
   ├── Reused: Prompt templating patterns (src/lib/ai/gemini-analyzer.ts)
   └── New: Strict grounding context builder (Injects authoritative standard text, bounds hallucinations)
   │
   ▼
[5. LLM GENERATION & REASONING]
   ├── Reused: Gemini API client & model cascade (src/lib/ocr/gemini-ocr.ts)
   └── New: BisAssistantService (temperature: 0.2, structured reasoning, markdown response)
   │
   ▼
[6. CLAIM VERIFICATION & CITATION EXTRACTION]
   ├── Reused: Evidence link structure (src/lib/inspections/evidence-service.ts)
   └── New: CitationTracker (Extracts IS citations and verifies factual alignment against retrieved text)
   │
   ▼
[7. CONFIDENCE SCORING & FINAL RESPONSE]
   └── Data Flow: Delivers JSON payload to frontend containing:
       { answer, citations: [...], matchedStandards: [...], confidence: 0.94, suggestedFollowups: [...] }
```

### B. Product Analysis Pipeline (Packaging $\to$ BIS Matching)

```
PRODUCT IMAGE(S)
   │
   ▼
[1. OCR / MULTIMODAL EXTRACTION]
   ├── Reused 100%: processScan() & GeminiOcrProvider (src/lib/ocr/gemini-ocr.ts)
   └── Output: rawOcrText + ScanImage records
   │
   ▼
[2. PRODUCT PROFILE & DECLARATION EXTRACTION]
   ├── Reused: GeminiAnalysisProvider (src/lib/ai/gemini-analyzer.ts)
   ├── Extended: Prompts recognizing ISI mark, CM/L number, HUID, CRS marks
   └── Output: ExtractedDeclaration records (15 LMPC + 4 BIS fields)
   │
   ▼
[3. STANDARD DISCOVERY & MANDATORY CERTIFICATION CHECK]
   ├── New Component: ProductStandardMatcher
   ├── Input: Identified product name, category, brand, CM/L number from declarations
   ├── Retrieval: Matches product to mandatory BIS Quality Control Orders (QCOs)
   └── Output: Matched IS standards, whether BIS certification is legally mandatory
   │
   ▼
[4. DUAL COMPLIANCE EVALUATION]
   ├── Path A (Existing): Deterministic LMPC Rule Engine (src/lib/rules/rule-engine.ts)
   │     └── Outputs: ComplianceCheck & Violation records under LMPC Rules, 2011
   │
   └── Path B (New): Deterministic BIS Compliance Checker
         └── Checks: Is product under mandatory QCO? If yes, is valid ISI/CRS mark detected?
         └── Outputs: BisComplianceFinding (COMPLIANT | NON_COMPLIANT | UNVERIFIED)
   │
   ▼
[5. EVIDENCE COLLECTION & UNIFIED REPORT]
   ├── Reused: ReportGenerator & PdfService (src/lib/inspections/pdf-service.ts)
   └── Output: Unified Legal Metrology + BIS Standards Inspection Dossier & PDF Report
```

---

## 10. Integration Points

### 1. Frontend Integration
- **Endpoints:**
  - `POST /api/v1/bis/chat`: Interactive conversational assistant. Accepts `{ query: string, history?: ChatMessage[] }`. Returns `{ answer: string, citations: Citation[], standards: StandardSummary[], confidence: number }`.
  - `GET /api/v1/bis/standards`: Search and list BIS standards with filtering by category, mandatory status, and IS number.
  - `GET /api/v1/bis/standards/[code]`: Detailed standard dossier including requirements, testing schemes, and recognized labs.
- **UI Components:**
  - Add a dedicated "BIS Assistant" tab or modal in both Consumer and Authority portals.
  - Enrich scan details view (`ScanDetailClient.tsx` and `AuthorityScanClient.tsx`) with a "BIS Conformity & Standards" card.

### 2. Backend API & Service Layer
- **Service Interfaces:**
  - `BisKnowledgeService`: Interface for querying the BIS standards database.
  - `BisAssistantService`: Coordinates intent detection, retrieval, prompt construction, and response synthesis.
  - `ProductStandardMatcher`: Reusable service matching product declaration profiles to applicable Indian Standards.

### 3. Database Schema Impact (Non-Breaking Extensions)
New Prisma models to support PS107 without altering existing tables:

```prisma
// Proposed New Model: BIS Standards Knowledge Registry
model BisStandard {
  id                  String    @id @default(cuid())
  standardNumber      String    @unique // e.g. "IS 14543", "IS 15820"
  title               String
  description         String    @db.Text
  category            String
  productCategory     String?
  isMandatory         Boolean   @default(false)
  qcoReference        String?   // Quality Control Order notification
  effectiveDate       DateTime?
  certificationScheme String?   // Scheme I (ISI), Scheme II (CRS), Scheme IV (Hallmarking)
  keyRequirements     Json?     // structured testing / technical parameters
  recognizedLabs      Json?     // list of certified testing laboratories
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  matches ProductStandardMatch[]
  @@index([standardNumber])
  @@index([category])
  @@index([isMandatory])
}

// Proposed New Model: Product to Standard Linking
model ProductStandardMatch {
  id              String       @id @default(cuid())
  productScanId   String
  standardId      String
  confidence      Float
  matchType       String       // EXACT_CODE, COMMODITY_MATCH, CATEGORY_INFERRED
  isMandatory     Boolean
  certificationStatus String   // CERTIFIED, UNVERIFIED, MISSING_MANDATORY_MARK
  detectedLicense String?      // e.g. CM/L number or HUID
  createdAt       DateTime     @default(now())

  productScan ProductScan @relation(fields: [productScanId], references: [id], onDelete: Cascade)
  standard    BisStandard @relation(fields: [standardId], references: [id], onDelete: Cascade)

  @@index([productScanId])
  @@index([standardId])
}

// Proposed New Model: BIS Chat Interaction History
model BisQueryLog {
  id           String   @id @default(cuid())
  userId       String
  query        String   @db.Text
  intent       String?
  response     String   @db.Text
  citations    Json?
  confidence   Float?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  @@index([userId])
}
```

### 4. OCR & Vision System Integration
- Contracts remain identical (`extractText(images: OcrImageInput[]): Promise<OcrResult>`).
- Image transcription automatically captures BIS mark typography; no changes to buffer flow or storage keys.

### 5. Report Generation Integration
- [src/lib/inspections/report-generator.ts](file:///Users/parth/VeriQO/src/lib/inspections/report-generator.ts) will consume `ProductStandardMatch` records and append a dedicated "Section 7B: BIS Quality Standards & Conformity" into `InspectionReportData`.
- [src/lib/inspections/pdf-service.ts](file:///Users/parth/VeriQO/src/lib/inspections/pdf-service.ts) will render this section with the same high-contrast, publication-quality styling.

---

## 11. Risks & Mitigation Strategies

| Risk Category | Specific Risk | Technical Impact | Mitigation Strategy |
|:---|:---|:---|:---|
| **Compliance Integrity** | Accidental LLM hallucination of legal violations or rule waivers | Undermines legal validity and regulatory authority | **Decoupled Architecture:** Strict separation between deterministic rule engine (`runScanRuleEngine`) and LLM chat. LLM is never permitted to set `Violation` or `OfficerDecision` tables. |
| **API / Schema Breaking** | Altering existing Prisma models breaks migration state | Breaks active test suites (Phases 3A through 6B) | **Additive-Only Schema:** Only add new tables (`BisStandard`, `ProductStandardMatch`, `BisQueryLog`). Zero modifications or renames on existing columns. |
| **Dependency Bloat** | Installing heavy vector databases or python sidecars | Build failures, package lock churn, 2-day timeline blown | **Zero Heavy Vector DBs:** Implement retrieval using PostgreSQL full-text and indexed keyword filtering with Prisma. No new native dependencies required. |
| **LLM Rate / Token Limits** | High traffic or long prompts exceed Gemini quotas | 429 Rate Limit errors, scan pipeline latency | **Compact Grounded Prompts:** Restrict retrieved context chunks to top-3 standards (< 1,500 tokens). Implement retry cascade already established in `gemini-analyzer.ts`. |
| **Model Inavailability** | Gemini endpoint outage or missing API key | Complete pipeline freeze | **Graceful Fallbacks:** Maintain `HeuristicAnalysisProvider` and `FallbackOcrProvider`. Provide clear error messaging without server crashes. |
| **Role & Data Isolation** | Consumers querying confidential officer enforcement notes | Data leak / privilege escalation | **Layer 2 RBAC:** Enforce strict RBAC in API handlers. The BIS chat endpoint will only retrieve public gazettes and standards; enforcement notes remain isolated behind officer roles. |

---

## 12. Implementation Order (Safe 2-Day Roadmap)

This roadmap prioritizes safety, zero regressions, and maximum component reuse:

```
DAY 1: KNOWLEDGE DATA, SCHEMA & BACKEND SERVICES (Isolated & Additive)
  ├── Step 1: Additive Prisma Schema Update & Migration
  │     └── Add BisStandard, ProductStandardMatch, BisQueryLog
  ├── Step 2: BIS Standards Seed Dataset
  │     └── Curated catalog of top mandatory BIS standards (Water, Cement, Electronics, Steel, Toys, Gold)
  ├── Step 3: BIS Retrieval & Intent Classification Service
  │     └── Fast keyword/token search + intent classification
  └── Step 4: Non-Breaking Extension of Packaging Declaration Analyzer
        └── Recognize ISI marks, CM/L licenses, and Hallmarking HUIDs

DAY 2: CONVERSATIONAL ASSISTANT, PRODUCT MATCHER & UI INTEGRATION
  ├── Step 5: BIS Conversational Engine (BisAssistantService)
  │     └── Grounded Gemini prompt, citation tracking, confidence scoring
  ├── Step 6: Product-to-Standard Matcher Integration
  │     └── Hook into processScan pipeline to auto-discover applicable standards
  ├── Step 7: REST API Endpoints (/api/v1/bis/*)
  │     └── Chat, standards search, and product matching endpoints with Layer 2 RBAC
  ├── Step 8: Frontend Portals (Consumer & Authority)
  │     └── BIS Assistant Chat drawer + Scan result standards badge
  └── Step 9: Regression Verification & End-to-End Testing
        └── Run existing test suites (Phases 3A to 6B) to guarantee 100% preservation
```

### Detailed Step-by-Step Dependency & Risk Matrix

| Step | Scope | Risk Level | Dependencies | Verification Gate |
|:---:|:---|:---:|:---|:---|
| **1** | Additive Prisma schema for `BisStandard`, `ProductStandardMatch`, `BisQueryLog` | **Low** | None | `npx prisma validate && npx prisma db push` |
| **2** | Seed authoritative BIS standards data (Gazettes, QCOs, IS numbers) | **Zero** | Step 1 | `tsx scripts/seed-bis-standards.ts` |
| **3** | Create `BisKnowledgeService` with PostgreSQL text search | **Low** | Step 2 | Unit query tests (find by commodity, IS code) |
| **4** | Extend `gemini-analyzer.ts` & `heuristic-analyzer.ts` with BIS mark regexes | **Low** | None | Existing Phase 2 OCR tests pass |
| **5** | Create `BisAssistantService` (grounded chat, citation extractor, confidence scorer) | **Medium** | Step 3 | Synthetic Q&A evaluation tests |
| **6** | Create `ProductStandardMatcher` & connect to `processScan` | **Medium** | Steps 3, 4 | Scan e2e test verifies LMPC + BIS co-existence |
| **7** | Implement `/api/v1/bis/chat` and `/api/v1/bis/standards` API routes | **Low** | Steps 5, 6 | Postman / fetch tests with Consumer & Officer sessions |
| **8** | Frontend UI integration (Consumer scan view, Authority scan dossier, Chat UI) | **Low** | Step 7 | Browser verification of UI responsiveness |
| **9** | Comprehensive Regression Audit across all existing phases | **Zero** | All | `test-phase3a`, `test-phase3b`, `test-phase4a`, `npm run build` |

---

## 13. Audit Conclusion & Sign-Off

The VeriQO codebase is in an exceptionally clean, well-architected state. It features strict separation of concerns, robust TypeScript typing, comprehensive data-driven legal rules, and zero architectural debt in its existing extraction pipelines.

By strictly adhering to the **`REUSE > EXTEND > MODIFY > REWRITE`** paradigm:
- 100% of existing Legal Metrology compliance features will be preserved.
- No existing tests or workflows will be broken.
- PS107 BIS intelligence capabilities can be introduced seamlessly within the 2-day implementation window as additive modules.

**Status:** Audit Complete. Codebase ready for safe, non-destructive PS107 implementation.
