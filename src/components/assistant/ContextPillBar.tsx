'use client'

import React from 'react'
import { type StandardContext, type ProductContext } from '@/types/assistant'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, Package, X, Edit3, Plus } from 'lucide-react'

interface ContextPillBarProps {
  standardContext?: StandardContext
  productContext?: ProductContext
  onRemoveStandard: () => void
  onRemoveProduct: () => void
  onOpenProductModal: () => void
}

export function ContextPillBar({
  standardContext,
  productContext,
  onRemoveStandard,
  onRemoveProduct,
  onOpenProductModal,
}: ContextPillBarProps) {
  if (!standardContext && !productContext) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}
      >
        <span>No specific standard or product context active. Queries will evaluate general BIS guidelines.</span>
        <button
          type="button"
          onClick={onOpenProductModal}
          style={{
            background: 'transparent',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 10px',
            color: 'var(--brand-400)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus size={12} /> Add Product Context
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
        Active Context:
      </span>

      {/* Standard Context Chip */}
      {standardContext && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid var(--brand-500)',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            color: 'var(--text-primary)',
          }}
        >
          <BookOpen size={13} style={{ color: 'var(--brand-400)' }} />
          <span>
            Standard: <strong style={{ color: 'var(--brand-300)', fontFamily: 'var(--font-mono)' }}>{standardContext.standardNumber}</strong>
            {standardContext.title ? ` (${standardContext.title.slice(0, 30)}...)` : ''}
          </span>
          <button
            type="button"
            onClick={onRemoveStandard}
            aria-label="Remove standard context"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Product Context Chip */}
      {productContext && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            color: 'var(--text-primary)',
          }}
        >
          <Package size={13} style={{ color: 'var(--color-success)' }} />
          <span>
            Product: <strong>{productContext.productName}</strong>
          </span>
          <button
            type="button"
            onClick={onOpenProductModal}
            title="Edit product context"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            <Edit3 size={11} />
          </button>
          <button
            type="button"
            onClick={onRemoveProduct}
            aria-label="Remove product context"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Button to add product context if not already present */}
      {!productContext && (
        <button
          type="button"
          onClick={onOpenProductModal}
          style={{
            background: 'transparent',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 8px',
            color: 'var(--brand-400)',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus size={11} /> Set Product Context
        </button>
      )}
    </div>
  )
}
