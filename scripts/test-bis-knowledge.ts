import { BisKnowledgeService } from '../src/lib/bis/bis-knowledge-service'
import { DEMO_BIS_STANDARDS } from './seed-bis-standards'

/**
 * Lightweight in-memory Prisma-like adapter for isolated, deterministic testing
 * of BisKnowledgeService query semantics.
 */
function createInMemoryDb() {
  const store = DEMO_BIS_STANDARDS.map((s, idx) => ({
    id: `bis_demo_${idx + 1}`,
    ...s,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  return {
    bisStandard: {
      async count({ where }: { where?: any } = {}) {
        return (await this.findMany({ where })).length
      },

      async findMany({
        where,
        take,
        skip = 0,
        orderBy,
      }: {
        where?: any
        take?: number
        skip?: number
        orderBy?: any
      } = {}) {
        let results = store.filter((item) => {
          if (!where) return true

          // Mandatory filter
          if (typeof where.isMandatory === 'boolean' && item.isMandatory !== where.isMandatory) {
            return false
          }

          // Category filter
          if (where.category?.contains) {
            const pattern = String(where.category.contains).toLowerCase()
            if (!item.category.toLowerCase().includes(pattern)) return false
          }

          // ProductCategory filter
          if (where.productCategory?.contains) {
            const pattern = String(where.productCategory.contains).toLowerCase()
            if (!item.productCategory?.toLowerCase().includes(pattern)) return false
          }

          // CertificationScheme filter
          if (where.certificationScheme?.contains) {
            const pattern = String(where.certificationScheme.contains).toLowerCase()
            if (!item.certificationScheme?.toLowerCase().includes(pattern)) return false
          }

          // OR text search across fields
          if (Array.isArray(where.OR) && where.OR.length > 0) {
            const matchesOr = where.OR.some((clause: any) => {
              for (const [key, filter] of Object.entries<any>(clause)) {
                const itemVal = (item as any)[key]
                if (filter?.contains && typeof itemVal === 'string') {
                  if (itemVal.toLowerCase().includes(String(filter.contains).toLowerCase())) {
                    return true
                  }
                }
                if (filter?.equals && typeof itemVal === 'string') {
                  if (itemVal.toLowerCase() === String(filter.equals).toLowerCase()) {
                    return true
                  }
                }
              }
              return false
            })
            if (!matchesOr) return false
          }

          return true
        })

        if (skip > 0) results = results.slice(skip)
        if (typeof take === 'number') results = results.slice(0, take)

        return results
      },

      async findFirst({ where }: { where?: any } = {}) {
        const results = await this.findMany({ where, take: 1 })
        return results[0] ?? null
      },
    },
  }
}

async function runTests() {
  console.log('=================================================================')
  console.log('  VeriQO PS107 — BIS Knowledge Retrieval Service Tests')
  console.log('=================================================================\n')

  const testDb = createInMemoryDb()
  const service = new BisKnowledgeService(testDb)

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${testName}`)
      passed++
    } else {
      console.error(`  FAIL: ${testName} ${detail ? `(${detail})` : ''}`)
      failed++
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Search by exact standard number
  // ---------------------------------------------------------------------------
  console.log('[Test 1] Search by exact standard number: "IS 14543"')
  const res1 = await service.searchStandards('IS 14543')
  assert(res1.total >= 1, 'Found at least 1 record for "IS 14543"')
  assert(
    res1.standards.some((s) => s.standardNumber === 'IS 14543'),
    'Returned standard has standardNumber "IS 14543"'
  )
  assert(
    res1.standards[0]?.category === 'Food & Beverages',
    'Returned standard has correct category "Food & Beverages"'
  )
  assert(
    res1.standards[0]?.isMandatory === true,
    'IS 14543 correctly flagged as isMandatory: true'
  )

  // ---------------------------------------------------------------------------
  // 2. Search by product/category
  // ---------------------------------------------------------------------------
  console.log('\n[Test 2] Search by product/category: "Toys"')
  const res2 = await service.searchStandards('Toys')
  assert(res2.total >= 1, 'Found at least 1 record for "Toys"')
  assert(
    res2.standards.some((s) => s.standardNumber === 'IS 9873 (Part 1)'),
    'Returned standard matches toy safety standard "IS 9873 (Part 1)"'
  )

  console.log('\n[Test 2b] Filter by category: "Precious Metals & Jewellery"')
  const res2b = await service.getStandardsByCategory('Precious Metals')
  assert(res2b.length >= 1, 'Found category records for "Precious Metals"')
  assert(
    res2b[0]?.standardNumber === 'IS 15820',
    'IS 15820 found in Precious Metals category'
  )

  // ---------------------------------------------------------------------------
  // 3. Filter mandatory standards
  // ---------------------------------------------------------------------------
  console.log('\n[Test 3] Filter mandatory vs non-mandatory standards')
  const resMandatory = await service.searchStandards('', { isMandatory: true })
  const resNonMandatory = await service.searchStandards('', { isMandatory: false })

  assert(
    resMandatory.standards.every((s) => s.isMandatory === true),
    'All records in isMandatory=true filter have isMandatory: true'
  )
  assert(
    resNonMandatory.standards.every((s) => s.isMandatory === false),
    'All records in isMandatory=false filter have isMandatory: false'
  )
  assert(
    resNonMandatory.standards.some((s) => s.standardNumber === 'IS 10500'),
    'IS 10500 is present in non-mandatory results'
  )
  assert(
    !resNonMandatory.standards.some((s) => s.standardNumber === 'IS 14543'),
    'IS 14543 is NOT present in non-mandatory results'
  )

  // ---------------------------------------------------------------------------
  // 4. No-result query
  // ---------------------------------------------------------------------------
  console.log('\n[Test 4] No-result query: "XYZNonExistentStandard999"')
  const res4 = await service.searchStandards('XYZNonExistentStandard999')
  assert(res4.total === 0, 'Total is 0 for non-existent query')
  assert(res4.standards.length === 0, 'Standards array is empty for non-existent query')

  // ---------------------------------------------------------------------------
  // 5. getStandardByNumber
  // ---------------------------------------------------------------------------
  console.log('\n[Test 5] getStandardByNumber lookup')
  const stdExact = await service.getStandardByNumber('IS 13252 (Part 1)')
  assert(stdExact !== null, 'Found demo standard by exact number "IS 13252 (Part 1)"')
  assert(
    stdExact?.standardNumber === 'IS 13252 (Part 1)',
    'Returned standardNumber matches "IS 13252 (Part 1)"'
  )
  assert(stdExact?.certificationScheme === 'CRS', 'Demo record certification scheme is "CRS"')

  // Non-existent number lookup
  const stdNull = await service.getStandardByNumber('IS 9999999')
  assert(stdNull === null, 'Lookup for non-existent number returns null')

  // ---------------------------------------------------------------------------
  // 6. Case-insensitive lookup
  // ---------------------------------------------------------------------------
  console.log('\n[Test 6] Case-insensitive lookup')
  const stdCase = await service.getStandardByNumber('is 14543')
  assert(stdCase !== null, 'Found standard using lowercase "is 14543"')
  assert(
    stdCase?.standardNumber === 'IS 14543',
    'Case-insensitive lookup returns "IS 14543"'
  )

  // ---------------------------------------------------------------------------
  // 7. Compact result shape
  // ---------------------------------------------------------------------------
  console.log('\n[Test 7] Compact shape validation for LLM context')
  if (stdExact) {
    assert(typeof stdExact.id === 'string', 'Shape contains id string')
    assert(typeof stdExact.standardNumber === 'string', 'Shape contains standardNumber string')
    assert(typeof stdExact.title === 'string', 'Shape contains title string')
    assert(typeof stdExact.category === 'string', 'Shape contains category string')
    assert(typeof stdExact.isMandatory === 'boolean', 'Shape contains isMandatory boolean')
    assert('keyRequirements' in stdExact, 'Shape contains keyRequirements field')
    assert('qcoReference' in stdExact, 'Shape contains qcoReference field')
    assert('certificationScheme' in stdExact, 'Shape contains certificationScheme field')
  }

  console.log('\n-----------------------------------------------------------------')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('-----------------------------------------------------------------\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
