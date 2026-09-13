# VeriQO PS107 — Phase 3: Indian Standards Knowledge Base & RAG Foundation

> **IMPORTANT STATUTORY & SYSTEM DISCLAIMER**
> *"Phase 3 provides the knowledge and retrieval foundation. It is not yet production BIS semantic RAG and does not claim live BIS data coverage."*
> All standards, clauses, knowledge chunks, and gazette notifications stored and indexed in Phase 3 are synthetic/demo records clearly flagged with `isDemoRecord: true` and `[DEMO TEST RECORD]`. They are created strictly for architectural validation, deterministic chunking verification, and retrieval testing under SIH 2026 Problem Statement 107.

---

## 1. Executive Summary & Architecture Overview

Phase 3 builds the dedicated **Indian Standards Knowledge Base and Provider-Agnostic Retrieval Foundation** for VeriQO, extending the Phase 1 domain foundation and Phase 2 REST API layers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VeriQO PS107 Architecture                        │
└─────────────────────────────────────────────────────────────────────────────┘
  User Query / Officer Inspection / E-Commerce Scan
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 1. Query Normalization & Statutory Entity Extraction                    │
  │    (IS codes, clause references, chemical limits, units)                │
  └─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 2. Provider-Agnostic Retrieval Layer (IRetrievalProvider)               │
  │    - Exact IS Standard Number Boost (+0.35)                             │
  │    - Clause Number / Hierarchy Match Boost (+0.25)                      │
  │    - Technical Keyword Density & Term Frequency (+0.25)                 │
  │    - Strict Metadata Filters (standardNumber, clauseNumber, category)   │
  └─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 3. BIS Knowledge Base Repository (BisKnowledgeService)                  │
  │    - Postgres/Prisma persistence with graceful in-memory fallback       │
  │    - Deterministic Clause-Aware Chunks (BisKnowledgeChunk)              │
  │    - Gazette & Publication Sources (BisKnowledgeSource)                 │
  │    - Standards & Clause Hierarchy (BisStandard, BisStandardClause)      │
  └─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 4. Assistant Evidence Grounding & Traceability Pipeline                 │
  │    - Top Ranked Statutory Evidence Extraction                           │
  │    - Citation Traceability (Standard -> Clause -> ChunkId -> Source)    │
  │    - Citation Verification & Anti-Fabrication Gate                      │
  │    - Grounded Response Synthesis + Mandatory QCO Alert                  │
  │    - Clear "Insufficient Evidence" fallback on unknown queries          │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Knowledge Base Data Model (Additive Prisma Schema)

All models are **additive** extensions to `prisma/schema.prisma`. Existing Legal Metrology (LMPC), authentication, and inspection tables remain completely untouched.

### 2.1 `BisStandard` (Enhanced)
Stores Indian Standards metadata and gazette references.
- `standardNumber`: Unique standard identifier (e.g., `IS 10500:2012`, `IS 1293:2019`).
- `title`: Official title of the standard.
- `edition`, `year`, `division` (FAD, ETD, CED, MED, etc.), `icsCode`.
- `status`: `ACTIVE`, `REVISED`, `WITHDRAWN`.
- `scope`: Statutory scope and field of application.
- `category`: Sector classification.
- `publishedDate`: Date of gazette notification / standard publication.
- `sourceUrl`, `sourceType`: `GAZETTE`, `BIS_STANDARD_DOCUMENT`, `QCO_NOTIFICATION`.
- `relations`: `clauses`, `licenses`, `qcos`, `knowledgeChunks`, `knowledgeSources`.

### 2.2 `BisStandardClause` (Enhanced)
Stores structural clauses, statutory parameters, and hierarchical paths.
- `standardId`: Foreign key to `BisStandard`.
- `clauseNumber`: Clause number (e.g., `4.1`, `8.1`, `Table 1`).
- `title`: Clause heading.
- `content`: Full statutory clause text.
- `parentClauseNumber`: Parent clause identifier (e.g., `4` for clause `4.1`).
- `hierarchyPath`: Breadcrumb trail (e.g., `IS 10500:2012 > Clause 4 > Clause 4.1`).
- `pageNumber`, `sourceRef`: Exact page and publication source citation.
- `limits`: Structured statutory limits JSON (`min`, `max`, `unit`, `testMethod`).
- `orderIndex`: Sequential ordering index for natural reading order.

### 2.3 `BisKnowledgeChunk` (New Model)
Stores citeable, atomic knowledge chunks generated by the chunking engine.
- `standardId`: Foreign key to `BisStandard`.
- `clauseId`: Foreign key to `BisStandardClause` (nullable for standard-level scope chunks).
- `chunkText`: Complete chunk text including self-contained header and source citation.
- `normalizedText`: Pre-processed lowercase text optimized for lexical retrieval.
- `chunkIndex`: Monotonically increasing index preserving chunk sequence.
- `tokenCount`, `characterCount`: Token volume metadata.
- `sourceReference`: Specific citation reference (e.g., `IS 10500:2012, Clause 4.1, Page 3`).
- `embeddingStatus`: `NOT_REQUIRED`, `PENDING`, `GENERATED` (ready for future vector embedding).
- `metadata`: JSON metadata holding `isDemoRecord`, `clauseType`, `isMandatory`, `hasLimits`.

### 2.4 `BisKnowledgeSource` (New Model)
Tracks source documents, versions, and ingestion batches.
- `sourceName`: Publication name (e.g., `Official Gazette of India`).
- `sourceType`: `GAZETTE`, `BIS_STANDARD_DOCUMENT`, `QCO_NOTIFICATION`, `AMENDMENT`.
- `sourceUrl`, `version`, `checksum`: Document integrity checksums.
- `ingestionStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`.

---

## 3. Ingestion & Deterministic Chunking Pipeline

Located in `src/lib/bis/knowledge/chunking.ts` and `src/lib/bis/knowledge/normalization.ts`.

### 3.1 Clause-Aware Chunking Strategy
Unlike arbitrary fixed-size windowing (e.g. 500-token sliding windows), Indian Standards require statutory context preservation:
1. **Clause Boundary Priority**: Chunks respect statutory clauses (`Clause 4.1`, `Clause 8.1`, `Table 1`).
2. **Independently Citeable Headers**: Every chunk includes a self-contained header:
   ```
   [IS 10500:2012] Drinking Water — Specification
   Clause 4.1 — General Physical and Organoleptic Characteristics
   Hierarchy: IS 10500:2012 > Clause 4 Requirements > Clause 4.1 Physical Characteristics
   Source: IS 10500:2012, Clause 4.1, Page 3
   ```
3. **Hierarchy Breadcrumb**: Retains parent-child relationships (e.g., `Clause 4` -> `Clause 4.1` -> `Clause 4.1.2`).
4. **Clean Boundary Splitting for Long Clauses**: When a clause exceeds `maxChunkCharacters` (default 1000 characters), it splits along sentence boundaries (`. `, `;\n`) without dividing technical terms or chemical limits, appending `(Part 1/2)` and `(Part 2/2)`.
5. **Technical Terminology & Units Preservation**: Normalization preserves units (`mg/l`, `NTU`, `V`, `A`, `°C`), chemical notations (`Pb`, `As`, `Fe`, `CaCO3`), and statutory limits.
6. **100% Deterministic & Idempotent**: Repeated chunking of the same document produces byte-identical IDs, indices, and character counts.

---

## 4. Provider-Agnostic Retrieval Architecture

Located in `src/lib/bis/knowledge/retrieval.ts` and `src/lib/bis/knowledge/knowledge-service.ts`.

### 4.1 `IRetrievalProvider` Interface
The retrieval engine is abstracted behind a clean interface:
```typescript
export interface IRetrievalProvider {
  search(
    chunks: BisKnowledgeChunkDto[],
    filters: KnowledgeSearchFilters
  ): Promise<KnowledgeSearchResult[]>
}
```

### 4.2 Scoring & Ranking Formula
The current `DeterministicLexicalRetrievalProvider` implements multi-factor scoring:
- **Standard Number Match Boost**: `+0.35` for exact IS number match; `+0.25` for prefix match.
- **Clause Number Match Boost**: `+0.25` for exact clause number match.
- **Title & Hierarchy Token Overlap**: Up to `+0.15` based on matching tokens in standard/clause titles.
- **Body Keyword Coverage & Density**: Up to `+0.25` based on statutory token overlap and frequency.
- **Exact Query Substring Bonus**: `+0.10` for verbatim phrase matching.
- **Final Score**: Normalized between `0.00` and `1.00`, sorted descending.

### 4.3 Fallback & Zero-Downtime Reliability
`BisKnowledgeService` attempts Prisma queries first. If the database is offline or unpopulated, it falls back to the in-memory catalog of pre-chunked demo standards, guaranteeing continuous operation in CI, test harnesses, or air-gapped environments.

---

## 5. Upgraded Assistant Retrieval Pipeline

Located in `src/lib/assistant/assistant-service.ts`.

### 5.1 Retrieval-First Pipeline
```
User Query: "What are the permissible lead limits in drinking water under IS 10500?"
  │
  ├─> 1. Normalize query & extract "IS 10500"
  │
  ├─> 2. Query Knowledge Service (searchKnowledge) -> Retrieves 5 ranked chunks
  │
  ├─> 3. Extract top evidence (IS 10500 Clause 4.3: Lead max 0.01 mg/l)
  │
  ├─> 4. Generate Citations traceable to chunk IDs (chk-IS_10500_2012-4_3-3)
  │
  ├─> 5. Validate citations via CitationValidator (ensures standard & clause exist)
  │
  └─> 6. Return Grounded Response Object:
        - reply: Grounded statutory text with clause citations
        - retrievedEvidence: Array of evidence chunks with scores
        - citations: Verified citations with chunkId & sourceReference
        - confidenceScore: 0.85
        - grounded: true
        - insufficientEvidence: false
```

### 5.2 Insufficient Evidence Handling
When a query has no matching standards, clauses, or technical terms in the knowledge base:
- `insufficientEvidence`: `true`
- `grounded`: `false`
- `confidenceScore`: `0.0`
- `citations`: `[]`
- `reply`: Clear statutory notice explaining that no matching standards were found in the local repository and prompting the citizen/officer to specify a recognized IS code.

---

## 6. Citation Verification & Anti-Fabrication Gate

Located in `src/lib/assistant/citation-validator.ts`.

Every citation must be traceable through four verification gates:
1. **Standard Gate**: Standard must exist in the verified repository. Unknown standards (e.g. `IS 999999`) fail validation (`NONEXISTENT_STANDARD`).
2. **Clause Gate**: Clause must exist within the cited standard. Fabricated clauses (e.g. `Clause 99.99` in `IS 10500`) fail validation (`NONEXISTENT_CLAUSE`).
3. **Chunk Gate**: If `chunkId` is provided, it must exist in the knowledge chunk repository. Invented IDs fail validation (`FABRICATED`).
4. **Attribution Gate**: The chunk's standard must match the cited standard. Mismatched standard/chunk pairings fail validation (`MISMATCHED_STANDARD_CLAUSE`).

---

## 7. REST API Endpoints

### 7.1 `GET /api/v1/bis/knowledge/search`
Searches the BIS Knowledge Base.
- **Query Parameters**:
  - `q`: Search string (e.g., `water lead limits`, `glow-wire test`).
  - `standardNumber` (optional): Filter by standard (e.g., `IS 10500:2012`).
  - `clauseNumber` (optional): Filter by clause (e.g., `4.1`).
  - `limit` (optional): Results limit (default: 5, max: 50).
- **Security**: Requires active authenticated session (returns `401 Unauthorized` without session).
- **Audit**: Writes `BIS_STANDARDS_SEARCH` to `AuditLog`.
- **Response Envelope**:
  ```json
  {
    "data": {
      "results": [
        {
          "chunkId": "chk-IS_10500_2012-4_3-3",
          "standardId": "std-demo-is10500",
          "standardNumber": "IS 10500:2012",
          "title": "[DEMO TEST RECORD] Drinking Water — Specification (Second Revision)",
          "clauseNumber": "4.3",
          "clauseTitle": "Toxic Heavy Metals and Substances",
          "relevantText": "[IS 10500:2012] Drinking Water — Specification...",
          "sourceReference": "IS 10500:2012, Clause 4.3, Page 5",
          "relevanceScore": 0.75,
          "hierarchyPath": "IS 10500:2012 > Clause 4 Requirements > Clause 4.3 Toxic Substances",
          "isDemoRecord": true
        }
      ],
      "count": 1,
      "isDemoData": true
    }
  }
  ```

### 7.2 `GET /api/v1/bis/knowledge/chunks/[id]`
Retrieves full details and citation metadata for an individual knowledge chunk.
- **Parameters**: `id` (chunk identifier).
- **Security**: Requires authenticated session (`401 Unauthorized` without session).
- **Returns**: `200 OK` with chunk object or `404 Not Found`.

---

## 8. Synthetic Demo Dataset

The demo dataset in `src/lib/bis/knowledge/demo-knowledge.ts` includes four representative standards:

| Standard Number | Title | Division | Key Clauses & Technical Parameters | Mandatory QCO |
| :--- | :--- | :--- | :--- | :--- |
| **IS 10500:2012** | Drinking Water — Specification | FAD | Cl. 4.1 (pH 6.5-8.5, TDS max 500/2000 mg/l, Turbidity 1/5 NTU), Cl. 4.2 (Hardness, Iron), Cl. 4.3 (Lead max 0.01 mg/l, Arsenic, Mercury), Cl. 5.1 (E. coli nil) | Yes (Packaged Water) |
| **IS 1293:2019** | Plugs and Socket-Outlets up to 250V / 16A | ETD | Cl. 6.1 (6A, 16A ratings), Cl. 8.1 (Marking & ISI monogram), Cl. 9.1 (5.1 mm & 7.06 mm pin diameters), Cl. 13.1 (Glow-wire test at 650°C & 850°C) | Electrical Accessories QCO |
| **IS 9873 (Part 1):2019** | Safety of Toys — Mechanical & Physical Properties | MED | Cl. 4.1 (Small parts cylinder 31.7 mm choking hazard for <36 months), Cl. 4.2 (Sharp edges/points), Cl. 5.1 (Age warning labels) | Toys QCO S.O. 853(E) |
| **IS 13252 (Part 1):2010** | IT Equipment — Safety — General Requirements | LITD | Cl. 1.7 (CRS Self-Declaration R-XXXXXXXX), Cl. 2.1 (Electric shock & SELV circuits < 42.4 V peak), Cl. 4.5 (Thermal rise) | Electronics & IT Goods QCO |

---

## 9. Current Limitations & Roadmap

### 9.1 Current Limitations
1. **Lexical Retrieval vs. Semantic Embedding**: Retrieval is deterministic lexical matching with clause hierarchy and domain token boosts. It does not perform dense vector similarity search.
2. **Synthetic Data Corpus**: Only synthetic demo standards are currently loaded. No live BIS web scraping is active yet.
3. **Template-Based Response Synthesis**: Assistant answers are synthesized deterministically from retrieved evidence; generative LLM rewriting is intentionally deferred.

### 9.2 How Vector Embeddings (pgvector) Will Be Added in Next Phase
The `IRetrievalProvider` interface was specifically designed for seamless upgrade:
1. A new class `PgVectorRetrievalProvider implements IRetrievalProvider` will be created.
2. When standards are ingested, chunk embeddings (e.g. `text-embedding-004` or local MiniLM) will be computed and stored in a vector column in PostgreSQL.
3. Hybrid search (BM25 lexical + vector cosine distance) will be enabled without changing a single line in `BisAssistantService` or `searchKnowledgeRoute`.

### 9.3 How Gemini Will Consume Retrieved Evidence
In the upcoming assistant phase:
1. VeriQO will pass the **structured retrieved evidence** directly into the Gemini prompt context:
   ```json
   {
     "system_instruction": "You are the VeriQO BIS Intelligent Assistant. Answer the user strictly using the retrieved statutory evidence below. Do not extrapolate limits or invent clauses.",
     "retrieved_evidence": [ ...rankedChunks... ],
     "user_query": "..."
   }
   ```
2. The existing `CitationValidator` will act as a post-generation guardrail, ensuring any citations generated by Gemini are corroborated by stored chunks before the response reaches the user.
