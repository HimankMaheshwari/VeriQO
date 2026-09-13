'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { type ProductContext } from '@/types/assistant'
import { STANDARDS_CATEGORIES } from '@/types/standards'
import { Package, Sparkles } from 'lucide-react'

interface ProductContextModalProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: ProductContext
  onSave: (context: ProductContext) => void
}

export function ProductContextModal({
  isOpen,
  onClose,
  initialContext,
  onSave,
}: ProductContextModalProps) {
  const [productName, setProductName] = useState(initialContext?.productName || '')
  const [productDescription, setProductDescription] = useState(initialContext?.productDescription || '')
  const [intendedCategory, setIntendedCategory] = useState(initialContext?.intendedUseCategory || 'Food & Agriculture')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialContext) {
      setProductName(initialContext.productName)
      setProductDescription(initialContext.productDescription)
      setIntendedCategory(initialContext.intendedUseCategory || 'Food & Agriculture')
    }
  }, [initialContext, isOpen])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName.trim()) {
      setError('Product name is required.')
      return
    }
    if (!productDescription.trim()) {
      setError('Product description is required to match applicable standards.')
      return
    }

    setError('')
    onSave({
      productName: productName.trim(),
      productDescription: productDescription.trim(),
      intendedUseCategory: intendedCategory,
    })
    onClose()
  }

  const categoryOptions = STANDARDS_CATEGORIES.filter((c) => c !== 'All Sectors').map((c) => ({
    value: c,
    label: c,
  }))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Active Product Context" width={540}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
          Providing product details anchors the AI Assistant to recommend specific Indian Standards (IS codes), testing parameters, and Quality Control Order (QCO) requirements.
        </p>

        {error && (
          <div
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-error-bg)',
              color: 'var(--color-error-dark)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
            }}
          >
            {error}
          </div>
        )}

        <Input
          label="Product Name"
          placeholder="e.g. 20-Litre Packaged Drinking Water Jar"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          required
        />

        <Textarea
          label="Product Description & Material"
          placeholder="e.g. Hermetically sealed 20L polycarbonate bottle containing purified treated drinking water for domestic and commercial usage..."
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={3}
          required
        />

        <Select
          label="Primary Industry Sector / Category"
          options={categoryOptions}
          value={intendedCategory}
          onChange={(e) => setIntendedCategory(e.target.value)}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--space-2)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} /> Save Product Context
          </Button>
        </div>
      </form>
    </Modal>
  )
}
