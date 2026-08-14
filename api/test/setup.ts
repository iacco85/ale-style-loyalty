import { env } from "cloudflare:test";
import { beforeAll } from "vitest";
import schemaSql from "../schema.sql?raw";

beforeAll(async () => {
  const statements = schemaSql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
});
