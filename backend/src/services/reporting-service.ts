import {
  getRouteHistory,
  getRouteHistorySummary,
  getHosReport,
  getBillingSummary,
  type ReportFilters,
  type RouteHistoryRow,
  type RouteHistorySummary,
  type HosReportRow,
  type BillingSummaryRow,
} from '../db/queries/reporting.js';
import {
  listAuditLogs,
  countAuditLogs,
  type AuditLogFilters,
} from '../db/queries/audit-logs.js';
import type { AuditLog } from '@dispatch/shared/types/audit-log';

export interface RouteHistoryReport {
  data: RouteHistoryRow[];
  summary: RouteHistorySummary;
  pagination: { limit: number; offset: number; total: number };
}

export interface HosComplianceReport {
  data: HosReportRow[];
  pagination: { limit: number; offset: number };
}

export interface BillingReport {
  data: BillingSummaryRow[];
  pagination: { limit: number; offset: number };
}

export interface AuditLogReport {
  data: AuditLog[];
  pagination: { limit: number; offset: number; total: number };
}

export async function getRouteHistoryReport(
  terminalId: string,
  filters: ReportFilters,
): Promise<RouteHistoryReport> {
  const [data, summary] = await Promise.all([
    getRouteHistory(terminalId, filters),
    getRouteHistorySummary(terminalId, { startDate: filters.startDate, endDate: filters.endDate }),
  ]);
  return {
    data,
    summary,
    pagination: { limit: filters.limit, offset: filters.offset, total: summary.totalRecords },
  };
}

export async function getHosComplianceReport(
  terminalId: string,
  filters: ReportFilters,
): Promise<HosComplianceReport> {
  const data = await getHosReport(terminalId, filters);
  return {
    data,
    pagination: { limit: filters.limit, offset: filters.offset },
  };
}

export async function getBillingReport(
  terminalId: string,
  filters: ReportFilters,
): Promise<BillingReport> {
  const data = await getBillingSummary(terminalId, filters);
  return {
    data,
    pagination: { limit: filters.limit, offset: filters.offset },
  };
}

export async function getAuditLogReport(
  filters: AuditLogFilters,
): Promise<AuditLogReport> {
  const [data, total] = await Promise.all([
    listAuditLogs(filters),
    countAuditLogs({
      startDate: filters.startDate,
      endDate: filters.endDate,
      eventType: filters.eventType,
      entityType: filters.entityType,
      userId: filters.userId,
    }),
  ]);
  return {
    data,
    pagination: { limit: filters.limit, offset: filters.offset, total },
  };
}
