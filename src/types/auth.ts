import type { DefaultSession } from 'next-auth'

export type Role =
  | 'CONSUMER'
  | 'AUTHORITY_OFFICER'
  | 'SENIOR_AUTHORITY'
  | 'ADMIN'

export const ROLES: Record<Role, Role> = {
  CONSUMER: 'CONSUMER',
  AUTHORITY_OFFICER: 'AUTHORITY_OFFICER',
  SENIOR_AUTHORITY: 'SENIOR_AUTHORITY',
  ADMIN: 'ADMIN',
}

export const ROLE_LABELS: Record<Role, string> = {
  CONSUMER: 'Consumer',
  AUTHORITY_OFFICER: 'Authority Officer',
  SENIOR_AUTHORITY: 'Senior Authority',
  ADMIN: 'Administrator',
}

// Route prefix → minimum required role
export const ROUTE_ROLE_MAP: Record<string, Role[]> = {
  '/consumer': ['CONSUMER', 'AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'],
  '/authority': ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'],
  '/admin': ['ADMIN'],
  '/api/v1/inspections': ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'],
  '/api/v1/rules': ['AUTHORITY_OFFICER', 'SENIOR_AUTHORITY', 'ADMIN'],
  '/api/v1/users': ['ADMIN'],
  '/api/v1/audit-logs': ['SENIOR_AUTHORITY', 'ADMIN'],
}

// Augment next-auth session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
    } & DefaultSession['user']
  }

  interface User {
    role: Role
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: Role
  }
}
