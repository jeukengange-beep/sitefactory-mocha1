import Database from "better-sqlite3";
import type { Statement } from "better-sqlite3";
import type { D1Database, D1PreparedStatement, D1RunResult } from "../worker/app";

type Row = Record<string, unknown>;
type SqliteDatabase = InstanceType<typeof Database>;

class SQLitePreparedStatement implements D1PreparedStatement {
  private values: unknown[] = [];

  constructor(private readonly statement: Statement) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this;
  }

  async first<T = Row>(): Promise<T | null> {
    const row = this.statement.get(...this.values);
    return (row as T | undefined) ?? null;
  }

  async run(): Promise<D1RunResult> {
    const result = this.statement.run(...this.values);
    const lastInsertRowid = result.lastInsertRowid;
    const meta =
      typeof lastInsertRowid === "number" || typeof lastInsertRowid === "bigint"
        ? { last_row_id: Number(lastInsertRowid) }
        : undefined;

    return {
      success: true,
      ...(meta ? { meta } : {}),
    };
  }

  async all<T = Row>(): Promise<{ results: T[] }> {
    const results = this.statement.all(...this.values);
    return { results: results as T[] };
  }
}

class SQLiteD1Database implements D1Database {
  constructor(private readonly db: SqliteDatabase) {}

  prepare(query: string): D1PreparedStatement {
    const statement = this.db.prepare(query);
    return new SQLitePreparedStatement(statement);
  }
}

export const createSQLiteD1Database = (db: SqliteDatabase): D1Database => {
  return new SQLiteD1Database(db);
};
