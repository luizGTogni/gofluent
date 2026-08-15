import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@gofluent/db";
import { registerLexemeEncounter } from "./register-encounter.js";
const now = "2026-01-01T00:00:00.000Z";
describe("registerLexemeEncounter", () => it("atomically appends history, state, and review work", () => {
  const db = openDatabase(":memory:"); runMigrations(db);
  db.prepare("INSERT INTO users (id,created_at,updated_at) VALUES (?,?,?)").run("u",now,now);
  db.prepare("INSERT INTO lexemes (id,language,lemma,created_at,updated_at) VALUES (?,?,?,?,?)").run("l","en","learn",now,now);
  const result = registerLexemeEncounter(db,{ learningValue:0.8, encounter:{id:"e",learnerId:"u",itemType:"LEXEME",itemId:"l",modality:"READING",activity:"STORY",result:"SUCCESS",assistanceUsed:false,createdAt:now},now:new Date(now)});
  expect(result.state.encounters).toBe(1);
  expect((db.prepare("SELECT count(*) AS count FROM encounters").get() as {count:number}).count).toBe(1);
  expect((db.prepare("SELECT count(*) AS count FROM review_queue").get() as {count:number}).count).toBe(1);
}));
