'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  type AssistantMessage,
  type AssistantMode,
  type StandardContext,
  type ProductContext,
} from '@/types/assistant'
import { assistantService } from '@/services/assistant-service'
import { MessageBubble } from '@/components/assistant/MessageBubble'
import { ContextPillBar } from '@/components/assistant/ContextPillBar'
import { ProductContextModal } from '@/components/assistant/ProductContextModal'
import { SuggestedQuestionsGrid } from '@/components/assistant/SuggestedQuestionsGrid'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  Bot,
  Send,
  Mic,
  Plus,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  Info,
  Scale,
  Paperclip,
  CheckCircle2,
} from 'lucide-react'

interface AssistantChatContainerProps {
  mode?: AssistantMode
  initialStandardContext?: StandardContext
  initialProductContext?: ProductContext
  headerTitle?: string
  headerDescription?: string
}

export function AssistantChatContainer({
  mode = 'consumer',
  initialStandardContext,
  initialProductContext,
  headerTitle,
  headerDescription,
}: AssistantChatContainerProps) {
  // Context states
  const [standardContext, setStandardContext] = useState<StandardContext | undefined>(
    initialStandardContext
  )
  const [productContext, setProductContext] = useState<ProductContext | undefined>(
    initialProductContext
  )
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)

  // Chat message states
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize with mode-tailored welcome message
  useEffect(() => {
    const welcome = assistantService.getInitialWelcomeMessage(mode, standardContext)
    setMessages([welcome])
  }, [mode, standardContext])

  // Auto-scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Handle Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim()
    if (!query || isLoading) return

    setInputValue('')
    setErrorMessage(null)

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMessage: AssistantMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: userTimestamp,
      status: 'complete',
      standardContext,
      productContext,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await assistantService.sendMessage({
        query,
        mode,
        conversationId: 'demo-thread-1',
        standardContext,
        productContext,
      })

      const assistantMessage: AssistantMessage = {
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        timestamp: response.timestamp,
        evidence: response.evidence,
        standardContext,
        productContext,
        status: 'complete',
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Failed to send assistant message:', err)
      const failedMessage: AssistantMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'I encountered an issue processing this query against the Indian Standards repository.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'error',
        errorMessage: 'Connection to regulatory knowledge engine timed out. Please try again.',
      }
      setMessages((prev) => [...prev, failedMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Retry
  const handleRetry = (failedMsg: AssistantMessage) => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content)
    }
  }

  // Handle New / Clear Conversation
  const handleClearConversation = () => {
    const welcome = assistantService.getInitialWelcomeMessage(mode, standardContext)
    setMessages([welcome])
    setInputValue('')
    setErrorMessage(null)
  }

  // Handle Keyboard Submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const suggestedPrompts = assistantService.getSuggestedPrompts(mode, standardContext)
  const isAuthority = mode === 'authority'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Statutory / Advisory Safeguard Notice */}
      {isAuthority ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
          }}
        >
          <ShieldAlert size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ color: 'var(--color-warning)' }}>Statutory Officer Safeguard: </strong>
            AI-generated information is advisory. Final enforcement or compliance decisions must be made by the authorized officer under the Bureau of Indian Standards Act, 2016 and Legal Metrology Act, 2009.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--brand-400)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ color: 'var(--brand-300)' }}>Advisory Regulatory Assistant: </strong>
            All answers cite authentic Indian Standards (IS codes), Quality Control Orders (QCOs), and certification guidelines. Output is provided for public awareness and does not constitute a formal certification decision.
          </div>
        </div>
      )}

      {/* Main Chat Shell Card */}
      <Card style={{ minHeight: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Card Header */}
        <CardHeader
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: isAuthority
                  ? 'linear-gradient(135deg, var(--brand-700), var(--brand-900))'
                  : 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--neutral-0)',
              }}
            >
              {isAuthority ? <Scale size={18} /> : <Bot size={18} />}
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {headerTitle || (isAuthority ? 'Standards Enforcement Copilot' : 'BIS Standards & Regulations Assistant')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {headerDescription || 'AI-Powered Regulatory Guidance (SIH PS107)'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge variant={isAuthority ? 'warning' : 'info'} dot>
              {isAuthority ? 'Officer Mode' : 'Consumer Advisory'}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}
            >
              <RotateCcw size={13} /> New Conversation
            </Button>
          </div>
        </CardHeader>

        {/* Active Context Pill Bar */}
        <ContextPillBar
          standardContext={standardContext}
          productContext={productContext}
          onRemoveStandard={() => setStandardContext(undefined)}
          onRemoveProduct={() => setProductContext(undefined)}
          onOpenProductModal={() => setIsProductModalOpen(true)}
        />

        {/* Message Stream Body */}
        <CardBody
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'var(--space-6)',
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 200px)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Render Messages */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onRetry={handleRetry} />
            ))}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 'var(--space-2) 0 var(--space-4) 0' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Spinner size="sm" />
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Consulting Indian Standards repository and Quality Control Orders...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts Section (Shown when few messages or active standard) */}
          {messages.length <= 2 && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <SuggestedQuestionsGrid
                prompts={suggestedPrompts}
                onSelectPrompt={(text) => handleSendMessage(text)}
                title={standardContext ? `Targeted Queries for ${standardContext.standardNumber}` : 'Frequently Asked Regulatory Inquiries'}
              />
            </div>
          )}
        </CardBody>

        {/* Accessible Message Composer Area */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'border-color var(--transition-fast)',
            }}
          >
            {/* Multi-line auto-expandable Textarea */}
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={
                isAuthority
                  ? 'Ask technical regulatory query (e.g. Sampling lot size under IS 14543 or QCO notification date)...'
                  : 'Ask any question regarding Indian Standards (IS codes), ISI mark certification, testing labs, or hallmarking...'
              }
              aria-label="Ask the BIS Assistant"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                resize: 'none',
                padding: '4px 8px',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />

            {/* Composer Footer Row: Action triggers & Send button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 4,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {/* Left Action Buttons: Attachment & Voice (Integration-ready UI) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(true)}
                  title="Attach Product Context (Name, Description, Category)"
                  aria-label="Attach Product Context"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: productContext ? 'var(--color-success)' : 'var(--text-muted)',
                    padding: 6,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '11px',
                  }}
                >
                  <Paperclip size={15} />
                  <span style={{ display: 'none' /* hidden on extra-small */, fontFeatureSettings: '"tnum"' }}>
                    {productContext ? 'Context Attached' : 'Attach Context'}
                  </span>
                </button>

                <button
                  type="button"
                  title="Speech to Text (Integration-Ready UI for Hackathon Demo)"
                  aria-label="Voice Input (Speech to Text)"
                  onClick={() => {
                    alert('Voice recognition microphone interface will connect with Parth’s STT service.')
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: 6,
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                  }}
                >
                  <Mic size={15} />
                </button>
              </div>

              {/* Right Submit Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Enter to send, Shift+Enter for newline
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!inputValue.trim() || isLoading}
                  onClick={() => handleSendMessage()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Send size={14} /> Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Product Context Input Modal */}
      <ProductContextModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        initialContext={productContext}
        onSave={(ctx) => setProductContext(ctx)}
      />
    </div>
  )
}
