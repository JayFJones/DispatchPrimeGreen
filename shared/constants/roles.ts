import { z } from 'zod';

// Terminal-level roles (scoped to a specific terminal)
export const TERMINAL_ROLES = [
  'dispatcher',
  'team_lead',
  'terminal_manager',
] as const;

// Corporate roles (apply across all terminals)
export const CORPORATE_ROLES = [
  'equipment_manager',
  'safety_manager',
  'compliance_manager',
  'operations_management',
] as const;

// System-level roles
export const SYSTEM_ROLES = [
  'system_admin',
] as const;

export const ALL_ROLES = [
  ...TERMINAL_ROLES,
  ...CORPORATE_ROLES,
  ...SYSTEM_ROLES,
] as const;

export type TerminalRole = (typeof TERMINAL_ROLES)[number];
export type CorporateRole = (typeof CORPORATE_ROLES)[number];
export type SystemRole = (typeof SYSTEM_ROLES)[number];
export type Role = (typeof ALL_ROLES)[number];

export const TerminalRoleSchema = z.enum(TERMINAL_ROLES);
export const CorporateRoleSchema = z.enum(CORPORATE_ROLES);
export const SystemRoleSchema = z.enum(SYSTEM_ROLES);
export const RoleSchema = z.enum(ALL_ROLES);
