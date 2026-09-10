import React from 'react'
import styles from './Card.module.css'
import { cx } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
  style?: React.CSSProperties
}

export function Card({ children, className, hover, glass, style }: CardProps) {
  return (
    <div
      className={cx(
        styles.card,
        hover && styles['card-hover'],
        glass && styles['card-glass'],
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cx(styles['card-header'], className)} style={style}>{children}</div>
}

export function CardTitle({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={cx(styles['card-title'], className)} style={style}>{children}</h3>
}

export function CardBody({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cx(styles['card-body'], className)} style={style}>{children}</div>
}

export function CardFooter({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={cx(styles['card-footer'], className)} style={style}>{children}</div>
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  accentColor?: string
  iconBg?: string
  iconColor?: string
  className?: string
}

export function StatCard({ label, value, icon, accentColor, iconBg, iconColor, className }: StatCardProps) {
  return (
    <div
      className={cx(styles['stat-card'], className)}
      style={
        {
          '--accent-color': accentColor,
          '--icon-bg': iconBg,
          '--icon-color': iconColor,
        } as React.CSSProperties
      }
    >
      <div className={styles['stat-icon']}>{icon}</div>
      <div className={styles['stat-value']}>{value}</div>
      <div className={styles['stat-label']}>{label}</div>
    </div>
  )
}
