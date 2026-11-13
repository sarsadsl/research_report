export const AUDIT_COUNT_TABLES: readonly string[];
export const AUDIT_COUNTS_SQL: string;
export function verifyAuditBearer(secret: unknown, authorization: unknown): Promise<boolean>;
export function parseExpectedRowCounts(value: unknown): Record<string, number> | null;
export function buildAuditSummary(
  input: {
    companies: Array<Record<string, any>>;
    reports: Array<Record<string, any>>;
    runs: Array<Record<string, any>>;
    counts: Array<Record<string, any>>;
    sections: Array<Record<string, any>>;
    earnings: Array<Record<string, any>>;
  },
  requestedSlug?: string | null
): Array<Record<string, any>>;
