import fs from "node:fs";
import path from "node:path";

import { serve } from "@hono/node-server";
import Database from "better-sqlite3";

import { createApp, type WorkerBindings } from "../worker/app";
import { createSQLiteD1Database } from "./sqliteD1Adapter";
import { runMigrations } from "./migrate";

const port = Number(process.env.PORT ?? 8787);
const databasePath = process.env.DATABASE_PATH ?? path.resolve("data", "app.db");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
runMigrations(sqlite);

const bindings: WorkerBindings = {
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  DB: createSQLiteD1Database(sqlite),
  R2_BUCKET: null,
};

const app = createApp();

serve({
  fetch(request) {
    return app.fetch(request, bindings);
  },
  port,
});

console.log(`API server listening on port ${port}`);
