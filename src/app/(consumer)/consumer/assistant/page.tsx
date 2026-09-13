import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SUPPORTED_LANGUAGES, type StandardContext, type ProductContext } from '@/types/assistant'
import { AssistantChatContainer } from '@/components/assistant/AssistantChatContainer'
import {
  BookOpen,
  Award,
  FlaskConical,
  Gem,
  Globe,
  Sparkles,
  Bot,
} from 'lucide-react'

export const metadata = {
  title: 'AI Standards Assistant | VeriQO PS107',
  description: 'AI conversational assistant for Indian Standards, BIS certification schemes, testing requirements, and hallmarking.',
}

interface AssistantPageProps {
  searchParams?: {
    standard?: string
    topic?: string
    productName?: string
    productDesc?: string
    cat?: string
    q?: string
  }
}

export default function AssistantPage({ searchParams }: AssistantPageProps) {
  const activeStandard = searchParams?.standard
  const activeTopic = searchParams?.topic
  const activeProductName = searchParams?.productName
  const activeProductDesc = searchParams?.productDesc
  const activeCategory = searchParams?.cat
  const activeQuery = searchParams?.q || activeTopic

  const initialStandardContext: StandardContext | undefined = activeStandard
    ? {
        standardNumber: activeStandard,
        title: activeTopic || 'Indian Standard Specification',
      }
    : undefined

  const initialProductContext: ProductContext | undefined = activeProductName
    ? {
        productName: activeProductName,
        productDescription: activeProductDesc || activeProductName,
        category: activeCategory || undefined,
      }
    : undefined

  return (
    <div>
      <PageHeader
        title="AI Standards & Regulations Assistant"
        description="Source-backed conversational guidance for Indian Standards, BIS certification schemes, testing parameters, and hallmarking (SIH PS107)."
        breadcrumbs={[
          { label: 'Portal', href: '/consumer/dashboard' },
          { label: 'AI Standards Assistant' },
        ]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant="info" dot>SIH PS107 Active</Badge>
            <Badge variant="success">Source-Backed</Badge>
          </div>
        }
      />

      {/* Main Assistant Layout */}
      <div className="responsive-grid-2col">
        {/* Left Column: Interactive Chat Container */}
        <div>
          <AssistantChatContainer
            mode="consumer"
            initialStandardContext={initialStandardContext}
            initialProductContext={initialProductContext}
            initialQuery={activeQuery}
            headerTitle="BIS Standards & Regulations Assistant"
            headerDescription="Conversational Guidance for Indian Standards & Conformity"
          />
        </div>

        {/* Right Column: PS107 Knowledge Quick Index & Multilingual Support */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Regulatory Scope Covered</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { icon: <BookOpen size={16} style={{ color: 'var(--brand-400)' }} />, title: 'Indian Standards (IS)', desc: '20,000+ standards, QCO orders & mandatory marks' },
                { icon: <Award size={16} style={{ color: 'var(--color-warning)' }} />, title: 'Certification Schemes', desc: 'ISI Mark (Scheme I), CRS (Scheme II), FMCS (Scheme X)' },
                { icon: <FlaskConical size={16} style={{ color: 'var(--color-info)' }} />, title: 'Testing Laboratories', desc: 'BIS central, regional & NABL accredited testing facilities' },
                { icon: <Gem size={16} style={{ color: 'var(--color-success)' }} />, title: 'Hallmarking & HUID', desc: 'IS 1417 (Gold), IS 2112 (Silver), 6-digit HUID verification' },
              ].map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <CardTitle style={{ fontSize: 'var(--text-sm)' }}>Supported Indian Languages</CardTitle>
                <Globe size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <span
                    key={lang.code}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {lang.name} ({lang.nativeName})
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
