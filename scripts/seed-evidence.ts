// Preserve the captured 2026-09-30.1 walkthroughs. Never turn model failures into passes.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { forkConfig, assumptionFor } from "../src/shared/config.ts";
import { profileCopy } from "../src/shared/brand.ts";
import { missions } from "../src/shared/evaluate.ts";
import shows from "../src/shared/catalogues/2026-09-30.1.json" with { type: "json" };
const quote = (value: unknown) => value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const insert = (table: string, row: Record<string, unknown>) => `INSERT OR IGNORE INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(quote).join(",")});`;
const sql = ["-- Original Cursor walkthrough exports. Snapshot reconstructed from the matching committed source."];
for (const dir of ((await readdir("evidence")).filter(name => !name.startsWith("."))).filter(name => !name.startsWith(".")).sort()) {
  const m = JSON.parse(await readFile(`evidence/${dir}/manifest.json`, "utf8"));
  const profile = forkConfig.profiles.find(p => p.id === m.profileId)!;
  const time = m.events[0]?.recordedAt ?? m.observations[0]?.createdAt;
  const snapshot = { mission: missions[profile.missionId], profile, profileCopy: profileCopy[profile.id],
    assumption: assumptionFor(m.variantId), catalogue: shows, catalogueVersion: m.buildId, model: "Not captured",
    buildId: m.buildId, question: forkConfig.question, provenance: "Reconstructed from committed source matching original export" };
  sql.push(insert("runs", { id: m.runId, experiment_id: forkConfig.id, variant_id: m.variantId, profile_id: m.profileId,
    mission_snapshot_json: JSON.stringify(snapshot), config_version: m.buildId, build_id: m.buildId,
    actual_device_json: JSON.stringify(m.device), status: m.status, started_at: time, finished_at: null,
    outcome_json: JSON.stringify(m.outcome), session_token_hash: "historical-read-only", created_at: time }));
  for (const e of m.events) sql.push(insert("events", { id: e.id, run_id: m.runId, client_event_id: e.clientEventId,
    type: e.type, payload_json: JSON.stringify(e.payload), recorded_at: e.recordedAt, sequence: e.sequence }));
  for (const o of m.observations) sql.push(insert("observations", { id: o.id, run_id: m.runId,
    trace: o.trace, commentary_json: JSON.stringify(o.commentary), created_at: o.createdAt }));
  for (const a of m.artifacts) sql.push(insert("artifacts", { id: a.id, run_id: m.runId, type: "screenshot",
    storage_reference: a.file ? `asset:/evidence/${m.runId}/${a.file}` : "missing", content_type: "image/png",
    captured_at: m.observations[0]?.createdAt ?? time, available: a.missing ? 0 : 1, description: a.description }));
}
await writeFile("migrations/0002_recorded_evidence.sql", sql.join("\n")+"\n");
console.log("Prepared four historical runs without changing their outcomes.");
