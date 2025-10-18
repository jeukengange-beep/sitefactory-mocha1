// Generated stub to satisfy TypeScript configuration for Cloudflare Workers.
// Adjust definitions when worker configuration types are available.

type D1ResultRow = Record<string, unknown>;

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = D1ResultRow>(): Promise<T | null>;
  run<T = unknown>(): Promise<T>;
  all<T = D1ResultRow>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env extends Record<string, unknown> {
  DB: D1Database;
  GOOGLE_AI_API_KEY?: string;
  BING_API_KEY?: string;
}
