import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

type SqliteDatabase = InstanceType<typeof Database>;

export const runMigrations = (db: SqliteDatabase, migrationsDirectory = path.resolve("migrations")) => {
  db.exec(MIGRATIONS_TABLE);

  const applied = new Set<string>();
  const rows = db.prepare("SELECT id FROM migrations").all() as { id: string }[];
  for (const row of rows) {
    applied.add(row.id);
  }

  if (!fs.existsSync(migrationsDirectory)) {
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    if (applied.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDirectory, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    if (!sql.trim()) {
      continue;
    }

    db.exec(sql);
    db.prepare("INSERT INTO migrations (id) VALUES (?)").run(file);
  }
};
