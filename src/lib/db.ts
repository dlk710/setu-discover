import crypto from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var margaPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL || "postgres://marga:marga@localhost:5435/marga";

export const pool =
  globalThis.margaPool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.margaPool = pool;
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  values: unknown[] = [],
  client?: PoolClient,
) {
  const executor = client ?? pool;
  const result = await executor.query<T>(sql, values);
  return result.rows;
}

export function toTextArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeDateInput(value: unknown) {
  if (!value || typeof value !== "string") return null;
  return value;
}

export function normalizeMoneyInput(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}
