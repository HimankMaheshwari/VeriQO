import React from 'react'
import Link from 'next/link'
import { ShieldCheck, ScanLine, Scale, FileSearch, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-page)',
        overflowX: 'hidden',
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-8)',
          height: 'var(--navbar-height)',
          background: 'rgba(15,23,42,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <ShieldCheck size={18} color="white" />
          </div>
          <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
            VeriQO
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Link
            href="/login"
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              transition: 'color var(--transition-fast)',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              color: 'white',
              background: 'var(--brand-600)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              transition: 'background var(--transition-fast)',
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          padding: 'var(--space-24) var(--space-8) var(--space-16)',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-semibold)',
              color: 'var(--color-info)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <Scale size={12} />
            Legal Metrology Act, 2009 · Bureau of Indian Standards (BIS) Act, 2016 · SIH PS107
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 'var(--font-bold)',
              lineHeight: 1.15,
              marginBottom: 'var(--space-6)',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>AI-Powered </span>
            <span className="gradient-text">Standards &amp; Metrology</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>Compliance Platform</span>
          </h1>

          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-secondary)',
              maxWidth: 680,
              margin: '0 auto var(--space-10)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            Verify packaged commodities against Legal Metrology Rules, query the AI Conversational
            Assistant for Indian Standards &amp; BIS certification schemes, locate testing laboratories, and
            check gold/silver hallmarking — all in one unified platform.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link
              href="/consumer/assistant"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-4) var(--space-8)',
                background: 'linear-gradient(135deg, var(--brand-600), var(--brand-700))',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-semibold)',
                textDecoration: 'none',
                boxShadow: '0 0 24px rgba(59,130,246,0.35)',
                transition: 'all var(--transition-fast)',
              }}
            >
              Ask Standards AI <ArrowRight size={18} />
            </Link>
            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-4) var(--space-8)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Scan Packaged Product
            </Link>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-4) var(--space-8)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              Officer Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section
        style={{
          padding: 'var(--space-16) var(--space-8)',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            textAlign: 'center',
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-bold)',
            marginBottom: 'var(--space-3)',
          }}
        >
          Built for the Entire Compliance Chain
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-12)' }}>
          Three portals. One platform.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {[
            {
              icon: <ScanLine size={24} />,
              iconBg: 'rgba(37,99,235,0.15)',
              iconColor: 'var(--brand-400)',
              title: 'Consumer Portal',
              desc: 'Scan product images, view extracted declarations, check compliance status, file complaints, and track them.',
              features: ['Image Upload', 'Complaint Filing', 'Status Tracking', 'Scan History'],
            },
            {
              icon: <ShieldCheck size={24} />,
              iconBg: 'rgba(245,158,11,0.15)',
              iconColor: 'var(--color-warning)',
              title: 'Authority Portal',
              desc: 'Create formal inspections, review AI analysis, check rule-by-rule compliance, and record enforcement decisions.',
              features: ['Inspection Workflow', 'Rule-by-Rule Check', 'Evidence Review', 'Officer Decision'],
            },
            {
              icon: <FileSearch size={24} />,
              iconBg: 'rgba(99,102,241,0.15)',
              iconColor: 'var(--color-info)',
              title: 'Admin Portal',
              desc: 'Manage users, maintain the versioned legal rule engine, view audit logs, and configure the system.',
              features: ['User Management', 'Rule Versioning', 'Audit Logs', 'System Config'],
            },
            {
              icon: <Sparkles size={24} />,
              iconBg: 'rgba(16,185,129,0.15)',
              iconColor: 'var(--color-success)',
              title: 'AI Standards Assistant (PS107)',
              desc: 'Consult conversational AI on Indian Standards (IS), mandatory QCO orders, BIS certification schemes, test labs, and hallmarking.',
              features: ['IS Standards Catalog', 'BIS Schemes & Licensing', 'Testing Labs Directory', 'Hallmarking & HUID Checker'],
            },
          ].map((card) => (
            <div
              key={card.title}
              className="hover-card"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-8)',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-lg)',
                  background: card.iconBg,
                  color: card.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-5)',
                }}
              >
                {card.icon}
              </div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)', lineHeight: 'var(--leading-relaxed)' }}>
                {card.desc}
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {card.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Legal Foundation notice ───────────────────────────────────── */}
      <section
        style={{
          margin: '0 var(--space-8) var(--space-16)',
          padding: 'var(--space-8)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 1200,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <Scale size={24} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Legal Foundation</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 'var(--leading-relaxed)', margin: 0 }}>
              VeriQO evaluates packaged commodities against the <strong style={{ color: 'var(--text-secondary)' }}>Legal Metrology Act, 2009</strong> and the{' '}
              <strong style={{ color: 'var(--text-secondary)' }}>Legal Metrology (Packaged Commodities) Rules, 2011</strong> and their amendments.
              AI assists with image understanding, OCR, and information extraction — but all final enforcement
              decisions remain reviewable and must be made by an authorized authority officer.
              Legal rules are stored in a versioned, data-driven engine and are never hard-coded into application logic.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-default)',
          padding: 'var(--space-8)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <p>© {new Date().getFullYear()} VeriQO · Legal Metrology Compliance Platform · India</p>
        <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
          AI-assisted declaration extraction and deterministic statutory compliance evaluation.
        </p>
      </footer>
    </div>
  )
}
