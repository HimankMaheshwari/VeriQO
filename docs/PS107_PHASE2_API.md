# SIH 2026 PS107 — Phase 2: REST API Specification & Frontend Integration Contract

This document provides the complete API specification for the **Bureau of Indian Standards (BIS) and Intelligent Assistant API layer** implemented in Phase 2 for SIH 2026 Problem Statement 107.

---

## 1. Architectural & Security Principles

1. **Dual-Layer RBAC**:
   - **Layer 1 (Edge Middleware)**: `src/middleware.ts` intercepts all requests to `/api/v1/*` and rejects unauthenticated traffic with `401 Unauthorized`.
   - **Layer 2 (Handler Guards)**: Route handlers invoke `requireAuth()` or `requireRole()`, verifying session tokens independently before executing business logic.
2. **Object-Level Ownership Enforcement (IDOR Protection)**:
   - Assistant conversations (`/api/v1/assistant/conversations/*`) are strictly scoped to `session.user.id`.
   - Cross-user retrieval, deletion, or chat thread injection returns `403 Forbidden`.
3. **Deterministic Separation of Concerns**:
   - BIS standards and licensing logic remain completely independent from Legal Metrology (LMPC) rules.
   - The deterministic rule engine (`src/lib/rules/rule-engine.ts`) remains protected and untouched.
4. **Demo Data Transparency**:
   - Simulated hackathon evaluation records are explicitly flagged with `isDemoRecord: true` or `isDemoData: true`.
   - Responses never impersonate live government production APIs without explicit transparency indicators.
5. **Standardized Response Envelope**:
   - Success: `{ "data": T, "message"?: string }` (HTTP 200 / 201)
   - Error: `{ "error": string, "code"?: string }` (HTTP 400, 401, 403, 404, 500)

---

## 2. API Endpoints Summary

| Method | Endpoint | Description | Audit Action | Auth Required |
|---|---|---|---|---|
| `GET` | `/api/v1/bis/standards` | Search and filter Indian Standards | `BIS_STANDARDS_SEARCH` | Yes |
| `GET` | `/api/v1/bis/standards/[id]` | Retrieve single standard with clauses & QCOs | — | Yes |
| `GET` | `/api/v1/bis/standards/[id]/clauses` | Retrieve paginated clauses for a standard | — | Yes |
| `POST` | `/api/v1/bis/verify/cml` | Verify Scheme-I (ISI Mark) CM/L license | `BIS_LICENSE_VERIFIED` | Yes |
| `POST` | `/api/v1/bis/verify/crs` | Verify Scheme-II Compulsory Registration (CRS) | `BIS_LICENSE_VERIFIED` | Yes |
| `POST` | `/api/v1/bis/verify/huid` | Verify 6-char Hallmarking Unique ID (HUID) | `BIS_LICENSE_VERIFIED` | Yes |
| `POST` | `/api/v1/bis/verify/mark` | Unified dispatcher for any BIS mark / license | `BIS_LICENSE_VERIFIED` | Yes |
| `GET` | `/api/v1/bis/qco` | List and search Quality Control Orders | — | Yes |
| `POST` | `/api/v1/bis/qco/check` | Check mandatory BIS compliance for product / HS code | — | Yes |
| `POST` | `/api/v1/assistant/chat` | Query grounded BIS intelligent assistant | `BIS_ASSISTANT_QUERY` | Yes |
| `GET` | `/api/v1/assistant/conversations` | List conversation threads owned by user | — | Yes |
| `GET` | `/api/v1/assistant/conversations/[id]` | Get conversation messages & citations | — | Yes (Owner) |
| `DELETE` | `/api/v1/assistant/conversations/[id]` | Delete owned conversation thread (cascade) | — | Yes (Owner) |

---

## 3. BIS Standards Catalog Endpoints

### 3.1 `GET /api/v1/bis/standards`
Search and filter Indian Standards in the BIS catalog.

- **Query Parameters**:
  - `q` (string, optional): Keyword query (e.g., `"drinking water"`).
  - `standardNumber` (string, optional): Search by standard number or prefix (e.g., `"IS 10500"`).
  - `division` (string, optional): BIS technical division (e.g., `"FAD"`, `"ETD"`, `"CED"`).
  - `status` (string, optional): `"ACTIVE"`, `"REVISED"`, or `"WITHDRAWN"`.
  - `isMandatory` (boolean, optional): `true` or `false`.
  - `page` (number, default: `1`): Page number (1-indexed).
  - `pageSize` (number, default: `10`, max: `50`): Results per page.
- **Audit**: Writes `BIS_STANDARDS_SEARCH` to database `AuditLog`.
- **Response Example**:
```json
{
  "data": {
    "standards": [
      {
        "id": "demo-std-is-10500-2012",
        "standardNumber": "IS 10500:2012",
        "title": "Drinking Water — Specification (Second Revision) [DEMO TEST RECORD]",
        "description": "Prescribes requirements and methods of sampling and test for drinking water.",
        "edition": "Second Revision",
        "year": 2012,
        "status": "ACTIVE",
        "division": "FAD",
        "icsCode": "13.060.20",
        "isMandatory": true,
        "mandatedByQco": "Drinking Water (Quality Control) Order",
        "clausesCount": 4
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 3.2 `GET /api/v1/bis/standards/[id]`
Retrieve complete metadata, technical clauses, and linked QCOs for a single Indian Standard.

- **Path Parameter**: `id` — Database CUID or standard number (e.g. `IS 10500:2012` URL-encoded).
- **Response Example**:
```json
{
  "data": {
    "id": "demo-std-is-10500-2012",
    "standardNumber": "IS 10500:2012",
    "title": "Drinking Water — Specification (Second Revision) [DEMO TEST RECORD]",
    "division": "FAD",
    "isMandatory": true,
    "mandatedByQco": "Drinking Water (Quality Control) Order",
    "clauses": [
      {
        "id": "demo-clause-10500-4-1",
        "clauseNumber": "4.1",
        "title": "General Requirements (Organoleptic)",
        "content": "Water shall be free from objectionable taste, odour, and visible turbidity...",
        "isMandatory": true,
        "clauseType": "SPECIFICATION",
        "limits": { "ph": { "min": 6.5, "max": 8.5 } }
      }
    ]
  }
}
```
- **Error Cases**:
  - `404 Not Found`: Standard not found in database or catalog.

---

### 3.3 `GET /api/v1/bis/standards/[id]/clauses`
Retrieve paginated technical clauses for a standard.

- **Path Parameter**: `id` — Standard CUID or standard number.
- **Query Parameters**:
  - `clauseNumber` (string, optional): Filter by clause number prefix (e.g. `"4"`).
  - `page` (number, default: `1`): Page number.
  - `pageSize` (number, default: `20`, max: `100`): Clauses per page.
- **Response Example**:
```json
{
  "data": {
    "standardId": "demo-std-is-10500-2012",
    "standardNumber": "IS 10500:2012",
    "standardTitle": "Drinking Water — Specification...",
    "clauses": [ ... ],
    "total": 4,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 4. BIS License & Mark Verification Endpoints

### 4.1 `POST /api/v1/bis/verify/cml`
Verify a BIS Scheme-I (ISI Mark) Certification Marks License (CML).

- **Request Body**:
```json
{
  "licenseNumber": "CM/L-8400123",
  "standardNumber": "IS 10500:2012"
}
```
- **Audit**: Writes `BIS_LICENSE_VERIFIED` with `licenseType: "ISI_CML"`.
- **Response Example (Valid Operative)**:
```json
{
  "data": {
    "isValid": true,
    "status": "OPERATIVE",
    "licenseType": "ISI_CML",
    "licenseNumber": "CM/L-8400123",
    "standardNumber": "IS 10500:2012",
    "licenseeName": "Himalayan Springs Water Pvt Ltd [DEMO TEST RECORD]",
    "brandName": "AquaPure Demo",
    "factoryAddress": "Plot 12, Industrial Area, Solan, Himachal Pradesh - 173212, India",
    "validFrom": "2023-01-01T00:00:00.000Z",
    "validUntil": "2027-12-31T23:59:59.000Z",
    "productCategory": "Drinking Water",
    "isDemoRecord": true,
    "message": "Valid and Operative ISI Certification Marks License (CM/L-8400123) under IS 10500:2012 [DEMO RECORD]."
  }
}
```
- **Error Cases**:
  - `400 Bad Request`: When `licenseNumber` is missing or invalid JSON.

---

### 4.2 `POST /api/v1/bis/verify/crs`
Verify a BIS Scheme-II Compulsory Registration Scheme (CRS) number.

- **Request Body**:
```json
{
  "registrationNumber": "R-41009876",
  "brand": "ApexPower Demo"
}
```
- **Audit**: Writes `BIS_LICENSE_VERIFIED` with `licenseType: "CRS_REGISTRATION"`.
- **Response Example**:
```json
{
  "data": {
    "isValid": true,
    "status": "OPERATIVE",
    "licenseType": "CRS_REGISTRATION",
    "licenseNumber": "R-41009876",
    "standardNumber": "IS 13252 (Part 1):2010",
    "licenseeName": "Apex Electronics Global Corp [DEMO TEST RECORD]",
    "brandName": "ApexPower Demo",
    "isDemoRecord": true,
    "message": "Valid Operative BIS Compulsory Registration (R-41009876)..."
  }
}
```

---

### 4.3 `POST /api/v1/bis/verify/huid`
Verify a 6-character alphanumeric Hallmarking Unique Identification (HUID) code.

- **Request Body**:
```json
{
  "huid": "AB12CD"
}
```
- **Audit**: Writes `BIS_LICENSE_VERIFIED` with `licenseType: "HALLMARK_HUID"`.
- **Response Example**:
```json
{
  "data": {
    "isValid": true,
    "status": "OPERATIVE",
    "licenseType": "HALLMARK_HUID",
    "licenseNumber": "HUID:AB12CD",
    "standardNumber": "IS 1417:2016",
    "licenseeName": "Tanishq Jewellers Franchise [DEMO TEST RECORD]",
    "brandName": "Tanishq Demo",
    "productCategory": "Gold Jewellery 22K (916)",
    "isDemoRecord": true,
    "details": {
      "purityPpm": 916,
      "purityKarat": "22 Karat",
      "articleType": "Gold Bangle",
      "assayingCenter": "Assaying & Hallmarking Centre Delhi (AHC-DL-04)"
    }
  }
}
```

---

### 4.4 `POST /api/v1/bis/verify/mark`
Generic BIS mark verification endpoint. Auto-detects license type from format or accepts explicit `markType`.

- **Request Body**:
```json
{
  "markType": "ISI_CML", // Optional: "ISI_CML" | "CRS_REGISTRATION" | "HALLMARK_HUID"
  "value": "CM/L-8400123"
}
```
- **Auto-Detection Patterns**:
  - `CM/L-XXXXXXX` or 7 digits → `ISI_CML`
  - `R-XXXXXXXX` or 8 digits → `CRS_REGISTRATION`
  - 6 alphanumeric characters → `HALLMARK_HUID`
- **Audit**: Writes `BIS_LICENSE_VERIFIED`.

---

## 5. Quality Control Order (QCO) Endpoints

### 5.1 `GET /api/v1/bis/qco`
List statutory Quality Control Orders with filters.

- **Query Parameters**:
  - `status` (string, optional): `"IN_FORCE"`, `"EXTENDED"`, or `"DRAFT"`.
  - `product` or `category` (string, optional): Filter by commodity keyword (e.g. `"toys"`, `"plugs"`).
  - `standardNumber` (string, optional): Standard code (e.g. `"IS 1293"`).
  - `page`, `pageSize`: Pagination parameters.
- **Response Example**:
```json
{
  "data": {
    "qcos": [
      {
        "id": "demo-qco-plugs-2021",
        "orderTitle": "Plugs and Socket-Outlets (Quality Control) Order, 2021 [DEMO/OFFICIAL REF]",
        "orderNumber": "S.O. 4887(E)",
        "ministry": "Ministry of Commerce and Industry",
        "notifiedDate": "2021-11-25T00:00:00.000Z",
        "effectiveDate": "2022-06-01T00:00:00.000Z",
        "status": "IN_FORCE",
        "standardNumber": "IS 1293:2019",
        "applicableProducts": "Plugs and socket-outlets for rated voltages up to 250V...",
        "isDemoRecord": true
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 5.2 `POST /api/v1/bis/qco/check`
Evaluate whether a product category, product name, or HS Code is subject to mandatory BIS certification.

- **Request Body**:
```json
{
  "productCategory": "plugs and socket-outlets",
  "hsCode": "853669"
}
```
- **Response Example**:
```json
{
  "data": {
    "isMandatoryCertification": true,
    "applicableOrder": {
      "id": "demo-qco-plugs-2021",
      "orderTitle": "Plugs and Socket-Outlets (Quality Control) Order, 2021 [DEMO/OFFICIAL REF]",
      "orderNumber": "S.O. 4887(E)"
    },
    "applicableStandards": ["IS 1293:2019"],
    "effectiveDate": "2022-06-01T00:00:00.000Z",
    "isExempt": false,
    "exemptionReason": null,
    "explanation": "Mandatory BIS certification applies under Plugs and Socket-Outlets (Quality Control) Order, 2021. Products matching \"plugs and socket-outlets\" must conform to IS 1293:2019 and bear the ISI mark.",
    "isDemoData": true
  }
}
```

---

## 6. Intelligent Assistant Endpoints

### 6.1 `POST /api/v1/assistant/chat`
Query the BIS Intelligent Assistant. In Phase 2, queries execute against a deterministic, grounded citation engine. All answers include validated statutory citations and official disclaimers.

- **Request Body**:
```json
{
  "message": "What are the permissible limits for drinking water under IS 10500?",
  "conversationId": "cmty7tp7r000orkwx3gp80ntv", // Optional: to continue thread
  "contextStandardId": "IS 10500:2012" // Optional context
}
```
- **Ownership Check**: If `conversationId` is provided, the API verifies that the authenticated user owns that conversation thread. If another user owns it, the API returns `403 Forbidden`.
- **Audit**: Writes `BIS_ASSISTANT_QUERY`.
- **Response Example**:
```json
{
  "data": {
    "conversationId": "cmty7tp7r000orkwx3gp80ntv",
    "message": "According to Indian Standard IS 10500:2012 (\"Drinking Water — Specification (Second Revision)\"), permissible requirements include:\n- Clause 4.1: General Requirements (Organoleptic)\n- Clause 5.1: Bacteriological Requirements...",
    "citations": [
      {
        "standardNumber": "IS 10500:2012",
        "clauseNumber": "4.1",
        "excerpt": "Water shall be free from objectionable taste, odour...",
        "title": "General Requirements (Organoleptic)"
      }
    ],
    "confidenceScore": 0.95,
    "disclaimer": "Official Disclaimer: This assistant provides automated guidance grounded in Indian Standards catalog and gazette notifications. All statutory enforcement decisions must be corroborated with official BIS publications and authorized certifying officers.",
    "isDemoData": true
  }
}
```

---

### 6.2 `GET /api/v1/assistant/conversations`
List conversation threads belonging to the authenticated user.

- **Security**: Strictly queries by `where: { userId: session.user.id }`.
- **Response Example**:
```json
{
  "data": [
    {
      "id": "cmty7tp7r000orkwx3gp80ntv",
      "title": "What are the permissible limits for drinking water...",
      "contextStandardId": null,
      "messagesCount": 4,
      "createdAt": "2026-09-12T10:01:31.000Z",
      "updatedAt": "2026-09-12T10:01:33.000Z"
    }
  ]
}
```

---

### 6.3 `GET /api/v1/assistant/conversations/[id]`
Retrieve an existing conversation and its complete message history.

- **Path Parameter**: `id` — Conversation CUID.
- **Security**: IDOR check — returns `403 Forbidden` if requested conversation belongs to a different user.
- **Response Example**:
```json
{
  "data": {
    "id": "cmty7tp7r000orkwx3gp80ntv",
    "userId": "cmtoggzeb0000xipg17i85ht2",
    "title": "Drinking Water Limits",
    "createdAt": "2026-09-12T10:01:31.000Z",
    "updatedAt": "2026-09-12T10:01:33.000Z",
    "messages": [
      {
        "id": "msg-001",
        "role": "USER",
        "content": "What are the permissible limits for drinking water under IS 10500?",
        "citations": null,
        "confidenceScore": null,
        "createdAt": "2026-09-12T10:01:31.000Z"
      },
      {
        "id": "msg-002",
        "role": "ASSISTANT",
        "content": "According to Indian Standard IS 10500:2012...",
        "citations": [ ... ],
        "confidenceScore": 0.95,
        "createdAt": "2026-09-12T10:01:32.000Z"
      }
    ]
  }
}
```

---

### 6.4 `DELETE /api/v1/assistant/conversations/[id]`
Delete an owned conversation thread. Automatically cascades and deletes all associated messages.

- **Path Parameter**: `id` — Conversation CUID.
- **Security**: IDOR check — only the owner can delete the conversation.
- **Response Example**:
```json
{
  "data": {
    "id": "cmty7tp7r000orkwx3gp80ntv",
    "deleted": true
  },
  "message": "Conversation deleted successfully"
}
```
- **Error Cases**:
  - `403 Forbidden`: If conversation belongs to another user.
  - `404 Not Found`: If conversation does not exist.

---

## 7. Error Handling Standard

All Phase 2 endpoints return RFC-compliant HTTP status codes with consistent JSON error bodies:

```json
{
  "error": "Descriptive human-readable error message"
}
```

| HTTP Status | Trigger Conditions |
|---|---|
| `400 Bad Request` | Malformed JSON, missing mandatory fields (e.g. empty message, missing licenseNumber). |
| `401 Unauthorized` | Missing, invalid, or expired session token. |
| `403 Forbidden` | Authenticated user attempting to access or delete another user's conversation thread (IDOR defense). |
| `404 Not Found` | Standard or conversation ID not found in the database. |
| `500 Internal Server Error` | Unexpected server or database exception (stack traces and secrets are strictly suppressed). |
