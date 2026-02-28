import { z } from 'zod';

// Dispatch lifecycle: planned → assigned → dispatched → in-transit → completed/cancelled/delayed
export const DISPATCH_STATUSES = [
  'planned',
  'assigned',
  'dispatched',
  'in_transit',
  'completed',
  'cancelled',
  'delayed',
] as const;
export const DispatchStatusSchema = z.enum(DISPATCH_STATUSES);
export type DispatchStatus = z.infer<typeof DispatchStatusSchema>;

// Stop-level status within a dispatch event
export const STOP_STATUSES = [
  'pending',
  'arrived',
  'completed',
  'skipped',
  'exception',
] as const;
export const StopStatusSchema = z.enum(STOP_STATUSES);
export type StopStatus = z.infer<typeof StopStatusSchema>;

// On-time classification for stops (<=15 min = on-time, <=30 min = delayed, >30 = late)
export const ON_TIME_STATUSES = [
  'early',
  'on_time',
  'delayed',
  'late',
] as const;
export const OnTimeStatusSchema = z.enum(ON_TIME_STATUSES);
export type OnTimeStatus = z.infer<typeof OnTimeStatusSchema>;

// Driver availability types
export const AVAILABILITY_TYPES = [
  'available',
  'not_available',
  'pto',
  'vacation',
  'sick',
  'personal',
] as const;
export const AvailabilityTypeSchema = z.enum(AVAILABILITY_TYPES);
export type AvailabilityType = z.infer<typeof AvailabilityTypeSchema>;

// Vehicle operational status
export const VEHICLE_STATUSES = [
  'active',
  'inactive',
  'maintenance',
  'out_of_service',
] as const;
export const VehicleStatusSchema = z.enum(VEHICLE_STATUSES);
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;

// Vehicle type: straight truck or tractor-trailer
export const VEHICLE_TYPES = [
  'ST',
  'TT',
] as const;
export const VehicleTypeSchema = z.enum(VEHICLE_TYPES);
export type VehicleType = z.infer<typeof VehicleTypeSchema>;

// Equipment type categories
export const EQUIPMENT_TYPES = [
  'truck',
  'trailer',
  'sub_unit',
] as const;
export const EquipmentTypeSchema = z.enum(EQUIPMENT_TYPES);
export type EquipmentType = z.infer<typeof EquipmentTypeSchema>;

// Equipment lifecycle status
export const EQUIPMENT_STATUSES = [
  'active',
  'inactive',
  'maintenance',
  'retired',
] as const;
export const EquipmentStatusSchema = z.enum(EQUIPMENT_STATUSES);
export type EquipmentStatus = z.infer<typeof EquipmentStatusSchema>;

// Equipment operational role
export const EQUIPMENT_OPERATIONAL_STATUSES = [
  'dedicated',
  'substitute',
  'spare',
  'out_of_service',
] as const;
export const EquipmentOperationalStatusSchema = z.enum(EQUIPMENT_OPERATIONAL_STATUSES);
export type EquipmentOperationalStatus = z.infer<typeof EquipmentOperationalStatusSchema>;

// Driver classification
export const WORKER_CLASSIFICATIONS = [
  'W2',
  'Contract',
] as const;
export const WorkerClassificationSchema = z.enum(WORKER_CLASSIFICATIONS);
export type WorkerClassification = z.infer<typeof WorkerClassificationSchema>;

// Terminal type
export const TERMINAL_TYPES = [
  'terminal',
  'hub',
] as const;
export const TerminalTypeSchema = z.enum(TERMINAL_TYPES);
export type TerminalType = z.infer<typeof TerminalTypeSchema>;

// Alert type classifications
export const ALERT_TYPES = [
  'hos_violation',
  'appointment_deviation',
  'schedule_issue',
  'route_deviation',
  'unassigned_route',
  'driver_unavailable',
] as const;
export const AlertTypeSchema = z.enum(ALERT_TYPES);
export type AlertType = z.infer<typeof AlertTypeSchema>;

// Alert severity levels
export const ALERT_SEVERITIES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;
export const AlertSeveritySchema = z.enum(ALERT_SEVERITIES);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

// Dispatch priority
export const DISPATCH_PRIORITIES = [
  'normal',
  'high',
  'urgent',
] as const;
export const DispatchPrioritySchema = z.enum(DISPATCH_PRIORITIES);
export type DispatchPriority = z.infer<typeof DispatchPrioritySchema>;

// Audit log event types (merged from History + UserActivity)
export const AUDIT_EVENT_TYPES = [
  'login',
  'logout',
  'failed_login',
  'profile_update',
  'password_change',
  'availability_change',
  'customer_contact',
  'route_change',
  'truck_maintenance',
  'driver_contact',
  'dispatch_change',
  'alert_acknowledged',
  'alert_resolved',
  'system_change',
] as const;
export const AuditEventTypeSchema = z.enum(AUDIT_EVENT_TYPES);
export type AuditEventType = z.infer<typeof AuditEventTypeSchema>;

// Audit log entity types
export const AUDIT_ENTITY_TYPES = [
  'user',
  'driver',
  'customer',
  'route',
  'vehicle',
  'equipment',
  'terminal',
  'dispatch_event',
  'alert',
  'system',
] as const;
export const AuditEntityTypeSchema = z.enum(AUDIT_ENTITY_TYPES);
export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;
