import React from 'react'
import { cx } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
  color: 'var(--text-secondary)',
}

const wrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
}

const errorStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-error)',
}

const hintStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-muted)',
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, style, ...props }, ref) => {
    return (
      <div style={fieldStyle}>
        {label && (
          <label style={labelStyle}>
            {label}
            {props.required && <span style={{ color: 'var(--color-error)', marginLeft: 3 }}>*</span>}
          </label>
        )}
        <div style={wrapperStyle}>
          {leftIcon && (
            <span style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', display: 'flex' }}>
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            style={{
              ...inputStyle,
              paddingLeft: leftIcon ? 40 : 14,
              paddingRight: rightIcon ? 40 : 14,
              borderColor: error ? 'var(--color-error)' : undefined,
              ...style,
            }}
            className={cx(className)}
            {...props}
          />
          {rightIcon && (
            <span style={{ position: 'absolute', right: 12, color: 'var(--text-muted)', display: 'flex' }}>
              {rightIcon}
            </span>
          )}
        </div>
        {error && <span style={errorStyle}>{error}</span>}
        {hint && !error && <span style={hintStyle}>{hint}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, style, ...props }, ref) => {
    return (
      <div style={fieldStyle}>
        {label && (
          <label style={labelStyle}>
            {label}
            {props.required && <span style={{ color: 'var(--color-error)', marginLeft: 3 }}>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          style={{
            ...inputStyle,
            minHeight: 100,
            resize: 'vertical',
            borderColor: error ? 'var(--color-error)' : undefined,
            ...style,
          }}
          {...props}
        />
        {error && <span style={errorStyle}>{error}</span>}
        {hint && !error && <span style={hintStyle}>{hint}</span>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, style, ...props }, ref) => {
    return (
      <div style={fieldStyle}>
        {label && (
          <label style={labelStyle}>
            {label}
            {props.required && <span style={{ color: 'var(--color-error)', marginLeft: 3 }}>*</span>}
          </label>
        )}
        <select
          ref={ref}
          style={{
            ...inputStyle,
            cursor: 'pointer',
            borderColor: error ? 'var(--color-error)' : undefined,
            ...style,
          }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <span style={errorStyle}>{error}</span>}
        {hint && !error && <span style={hintStyle}>{hint}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'
