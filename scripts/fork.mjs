#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const command = args[0];

function flag(name) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

async function loadLocalEnv() {
  const text = await readFile(join(root, ".dev.vars"), "utf8").catch(() => "");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=");
  }
}

const base = () => (process.env.PUBLIC_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.admin) headers.set("authorization", `Bearer ${process.env.ADMIN_KEY || ""}`);
  if (options.body) headers.set("content-type", "application/json");
  const response = await fetch(`${base()}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

async function status() {
  const health = await request("/api/health");
  const results = await request("/api/results");
  console.log(`Fork ${health.buildId}`);
  console.log(results.question);
  console.log(results.evidenceLabel);
  for (const cell of results.cells) {
    if (cell.status === "not-run" && !cell.required) continue;
    console.log(`${cell.required ? "required" : "optional"}  ${cell.profileId} × ${cell.variantId}  ${cell.status}${cell.missionPassed === true ? "  pass" : cell.missionPassed === false ? "  fail" : ""}`);
  }
  console.log(results.adopted ? `Adopted ${results.adopted.variantId} via ${results.adopted.decisionId}` : "No approach adopted.");
}

async function queue() {
  const result = await request("/api/queue", { method: "POST", body: "{}", admin: true });
  for (const item of result.runs) {
    console.log(`\n${item.run.profileName} × ${item.run.variantName}  ${item.existing ? "(existing)" : item.run.id}`);
    if (item.prompt) console.log(item.prompt);
  }
}

async function exportEvidence() {
  const results = await request("/api/results");
  for (const cell of results.cells) {
    if (!cell.runId) continue;
    const run = await request(`/api/runs/${cell.runId}`, { admin: true });
    const dir = join(root, "evidence", cell.runId);
    await mkdir(dir, { recursive: true });
    const manifest = {
      runId: cell.runId,
      profileId: cell.profileId,
      variantId: cell.variantId,
      status: run.status,
      buildId: run.buildId,
      device: run.device,
      outcome: run.outcome,
      events: run.events,
      observations: run.observations,
      artifacts: [],
    };
    for (const artifact of run.artifacts) {
      if (!artifact.url || !artifact.available) {
        manifest.artifacts.push({ ...artifact, file: null, missing: true });
        continue;
      }
      const response = await fetch(`${base()}${artifact.url}`);
      if (!response.ok) {
        manifest.artifacts.push({ ...artifact, file: null, missing: true });
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const extension = artifact.contentType === "image/png" ? "png" : artifact.contentType === "image/webp" ? "webp" : "jpg";
      const file = `${artifact.id}.${extension}`;
      await writeFile(join(dir, file), bytes);
      manifest.artifacts.push({ id: artifact.id, description: artifact.description, file, missing: false });
    }
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    const trace = (run.observations ?? []).map((item) => item.trace).join("\n\n") || "Not captured.";
    await writeFile(join(dir, "trace.md"), `# ${cell.profileId} × ${cell.variantId}\n\n${trace}\n`);
    console.log(`Exported ${dir}`);
  }
}

async function record() {
  const action = flag("action");
  const reason = flag("reason");
  const variant = flag("variant");
  if (!action || !reason || !["choose", "revise", "defer"].includes(action)) {
    throw new Error("record needs --action choose|revise|defer and --reason.");
  }
  if (action === "choose" && !variant) throw new Error("choose needs --variant.");
  const results = await request("/api/results");
  const saved = await request("/api/decisions", {
    method: "POST",
    admin: true,
    body: JSON.stringify({
      action,
      variantId: variant,
      rationale: reason,
      runIds: results.cells.map((cell) => cell.runId).filter(Boolean),
    }),
  });
  const id = saved.id;
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    "---",
    `id: ${id}`,
    `action: ${action}`,
    `variant: ${variant || ""}`,
    `date: ${date}`,
    "---",
    "",
    `# ${results.question}`,
    "",
    `Date: ${date}`,
    `Action: ${action}`,
    `Variant: ${variant || "none"}`,
    `Rationale: ${reason}`,
    "",
    "## Alternatives",
    ...results.variants.map((item) => `- ${item.name}: ${item.assumption}`),
    "",
    `Build: ${results.buildId}`,
    "",
    "## Runs",
    ...results.cells.map((cell) => `- ${cell.profileId} / ${cell.variantId}: ${cell.status}${cell.runId ? ` (${cell.runId})` : ""}${cell.deviceLabel ? ` · ${cell.deviceLabel}` : ""}${cell.missionPassed === true ? " · constraints passed" : cell.missionPassed === false ? " · constraints failed" : ""}`),
    "",
    "Evidence paths are written by `node scripts/fork.mjs export-evidence` under evidence/<run-id>/. Missing captures stay missing.",
    "",
    "Grok's interpretation, when a synthesis exists, is separate from the constraint results above.",
    "",
    "Agent walkthroughs, not real-user research.",
    "",
    "Scope: show discovery in this example application. Revisit when the requirements or the evidence change.",
    "",
  ];
  await mkdir(join(root, "decisions"), { recursive: true });
  await writeFile(join(root, "decisions", `${id}.md`), lines.join("\n"));
  await updateAgents(action, variant, id);
  console.log(`Recorded decisions/${id}.md`);
  console.log("The product default is unchanged until adopt.");
}

async function adopt() {
  const variant = flag("variant");
  const decision = flag("decision");
  if (!variant || !decision) throw new Error("adopt needs --variant and --decision.");
  const file = join(root, "decisions", `${decision}.md`);
  const text = await readFile(file, "utf8");
  const action = text.match(/^action:\s*(\w+)/m)?.[1];
  const chosen = text.match(/^variant:\s*([\w-]+)/m)?.[1];
  if (action !== "choose" || chosen !== variant) {
    throw new Error("Adoption requires a choose decision for that variant.");
  }
  const target = join(root, "src/config/show-search.ts");
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/config/show-search.ts"], { cwd: root, encoding: "utf8" }).trim();
  if (dirty) throw new Error("src/config/show-search.ts has uncommitted edits. Adopt left it untouched.");
  const adoptedAt = new Date().toISOString();
  await writeFile(target, `/**
 * Fork adoption target for show discovery.
 * \`fork adopt\` is the only writer.
 */
export const showSearch = {
  questionId: "show-discovery-001",
  variantId: "${variant}",
  decisionId: "${decision}",
};
// adopted ${adoptedAt}
`);
  await request("/api/adopt", { method: "POST", admin: true, body: JSON.stringify({ variantId: variant, decisionId: decision }) }).catch((error) => {
    console.log(`File updated. The running app was not updated: ${error.message}`);
  });
  await updateAgents("choose", variant, decision, true);
  console.log(`Adopted ${variant} from ${decision}.`);
  if (args.includes("--commit")) {
    execFileSync("git", ["add", "--", "src/config/show-search.ts", "AGENTS.md", `decisions/${decision}.md`], { cwd: root, stdio: "inherit" });
    execFileSync("git", ["commit", "-m", `Adopt ${variant} for show discovery`], { cwd: root, stdio: "inherit" });
  }
}

async function updateAgents(action, variant, id, adopted = false) {
  const agentsPath = join(root, "AGENTS.md");
  const current = await readFile(agentsPath, "utf8");
  let entry = `Show discovery: decision deferred. See decisions/${id}.md. No default was changed.`;
  if (action === "revise") entry = `Show discovery: revision requested. See decisions/${id}.md. No default was changed.`;
  if (action === "choose" && !adopted) entry = `Show discovery: the owner chose ${variant} after the recorded Fork walkthroughs. Adoption is a separate step. See decisions/${id}.md. This does not establish customer preference or conversion benefit.`;
  if (action === "choose" && adopted) entry = `Show discovery: currently use ${capitalise(variant)}, selected by the owner after the recorded Fork walkthroughs. See decisions/${id}.md for rationale, evidence and limitations. This does not establish customer preference or conversion benefit. Revisit when requirements or evidence change.`;
  const block = `<!-- fork:decisions:start -->\n${entry}\n<!-- fork:decisions:end -->`;
  const next = current.includes("<!-- fork:decisions:start -->")
    ? current.replace(/<!-- fork:decisions:start -->[\s\S]*?<!-- fork:decisions:end -->/, block)
    : `${current.trim()}\n\n## Product decisions\n\n${block}\n`;
  await writeFile(agentsPath, next);
}

function capitalise(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

await loadLocalEnv();
try {
  if (command === "status") await status();
  else if (command === "queue") await queue();
  else if (command === "export-evidence") await exportEvidence();
  else if (command === "record") await record();
  else if (command === "adopt") await adopt();
  else {
    console.log("Usage: node scripts/fork.mjs status|queue|export-evidence|record|adopt");
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
