'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Mic, X, Check, Volume2, Sparkles, AlertCircle } from 'lucide-react'

interface VoiceInputBarProps {
  isActive: boolean
  onClose: () => void
  onInsertTranscript: (text: string) => void
  language?: string
}

const DEMO_VOICE_QUERIES_EN = [
  'What BIS standards apply to packaged drinking water?',
  'How do I verify a 6-digit HUID code on gold jewellery?',
  'Is ISI mark compulsory for domestic LED bulbs?',
  'What is the difference between voluntary standards and mandatory QCOs?',
]

const DEMO_VOICE_QUERIES_HI = [
  'पैकेज्ड पेयजल के लिए कौन से भारतीय मानक लागू हैं?',
  'सोने के आभूषण पर 6 अंकों का HUID कोड कैसे सत्यापित करें?',
  'क्या घरेलू एलईडी बल्बों के लिए आईएसआई मार्क अनिवार्य है?',
  'स्वैच्छिक मानकों और अनिवार्य गुणवत्ता नियंत्रण आदेशों (QCO) में क्या अंतर है?',
]

interface SpeechRecognitionResultItem {
  transcript: string
}

interface SpeechRecognitionResultList {
  [index: number]: { [index: number]: SpeechRecognitionResultItem }
  length: number
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

interface ISpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: () => void
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => ISpeechRecognitionInstance

export function VoiceInputBar({
  isActive,
  onClose,
  onInsertTranscript,
  language = 'en',
}: VoiceInputBarProps) {
  const [seconds, setSeconds] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [hasSpeechApi, setHasSpeechApi] = useState(false)
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null)

  const isHindi = language === 'hi'
  const suggestedQueries = isHindi ? DEMO_VOICE_QUERIES_HI : DEMO_VOICE_QUERIES_EN

  // Timer while active
  useEffect(() => {
    if (!isActive) {
      setSeconds(0)
      setLiveTranscript('')
      return
    }

    const interval = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  // Optional Browser Web Speech API hook (graceful client-side enhancement)
  useEffect(() => {
    if (!isActive) return

    if (typeof window !== 'undefined') {
      const windowWithSpeech = window as unknown as {
        SpeechRecognition?: SpeechRecognitionConstructor
        webkitSpeechRecognition?: SpeechRecognitionConstructor
      }
      const SpeechRecognition =
        windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition

      if (SpeechRecognition) {
        setHasSpeechApi(true)
        try {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = isHindi ? 'hi-IN' : 'en-IN'

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let current = ''
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0]?.transcript || ''
            }
            if (current) {
              setLiveTranscript(current)
            }
          }

          recognition.onerror = () => {
            // Non-fatal: keep fallback UI active
          }

          recognition.start()
          recognitionRef.current = recognition
        } catch {
          // Non-fatal: fallback active
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
        recognitionRef.current = null
      }
    }
  }, [isActive, isHindi])

  if (!isActive) return null

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleSelectQuery = (q: string) => {
    onInsertTranscript(q)
    onClose()
  }

  const handleInsertCurrent = () => {
    const textToInsert = liveTranscript.trim() || suggestedQueries[0]
    onInsertTranscript(textToInsert)
    onClose()
  }

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Voice input recording panel"
      style={{
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Header Row: Live Recording Indicator, Waveform & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Animated red recording dot */}
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-error)',
              boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.25)',
              animation: 'pulse-ring 1.5s infinite',
            }}
          />

          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isHindi ? 'ध्वनि इनपुट सुन रहा है... (पूर्वावलोकन)' : 'Listening for Voice Query... (Integration Preview)'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Duration: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatTime(seconds)}</strong>
              {hasSpeechApi ? ' · Browser Speech Active' : ' · Integration Preview'}
            </div>
          </div>
        </div>

        {/* Audio Wave Simulation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            height: 20,
            padding: '0 8px',
          }}
          aria-hidden="true"
        >
          {[14, 20, 10, 18, 12].map((height, i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: `${height}px`,
                background: 'var(--brand-400)',
                borderRadius: 'var(--radius-full)',
                animation: `pulse-ring 1s infinite ${i * 0.15}s ease-in-out alternate`,
              }}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="primary"
            size="xs"
            onClick={handleInsertCurrent}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28 }}
          >
            <Check size={12} /> {isHindi ? 'सम्मिलित करें' : 'Insert Transcript'}
          </Button>

          <Button
            variant="secondary"
            size="xs"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28 }}
          >
            <X size={12} /> {isHindi ? 'रद्द करें' : 'Cancel'}
          </Button>
        </div>
      </div>

      {/* Live Transcript Display */}
      {liveTranscript ? (
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--brand-500)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            color: 'var(--brand-300)',
            fontStyle: 'italic',
          }}
        >
          &ldquo;{liveTranscript}&rdquo;
        </div>
      ) : null}

      {/* Demo Speech Queries (One-click Voice Test) */}
      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Sparkles size={12} style={{ color: 'var(--brand-400)' }} />
          <span>{isHindi ? 'त्वरित ध्वनि प्रश्न चुनें (डेमो परीक्षण):' : 'Or select a sample voice query for demo testing:'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {suggestedQueries.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSelectQuery(q)}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              &ldquo;{q}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Integration Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '10px',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 6,
        }}
      >
        <AlertCircle size={12} style={{ color: 'var(--brand-400)', flexShrink: 0 }} />
        <span>
          {isHindi
            ? 'ध्वनि पहचान पूर्वावलोकन: वास्तविक उत्पादन में, ऑडियो स्ट्रीम सीधे स्पीच-टू-टेक्स्ट एआई मॉडल से जुड़ेगी।'
            : 'Voice Recognition Preview: Audio streams to Whisper / Speech-to-Text inference in production. Transcripts can be edited before sending.'}
        </span>
      </div>
    </div>
  )
}
