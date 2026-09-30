import { shows } from "../shared/shows.ts";
import { askSystemPrompt } from "../variants/ask/prompt.ts";

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskSuccess {
  ok: true;
  reply: string;
  showIds: string[];
  rejectedIds: string[];
  shows: typeof shows;
  model: string;
  latencyMs: number;
  usage: { promptTokens: number | null; completionTokens: number | null };
  cost: "Not captured";
}

export interface AskFailure {
  ok: false;
  status: number;
  code: string;
  error: string;
  model: string;
  latencyMs: number;
}

const MAX_USER_MESSAGES = 5;
const MAX_CHARS = 400;

export function boundMessages(input: unknown): { messages: AskMessage[] } | { error: string } {
  if (!Array.isArray(input) || input.length === 0) return { error: "A message is required." };
  const cleaned: AskMessage[] = [];
  for (const message of input.slice(-10)) {
    if (!message || typeof message !== "object") return { error: "Each message must be an object." };
    if (message.role !== "user" && message.role !== "assistant") return { error: "Messages must be from the user or the assistant." };
    const content = String(message.content ?? "").trim();
    if (!content) continue;
    const limit = message.role === "user" ? MAX_CHARS : 600;
    if (content.length > limit) return { error: `Each ${message.role} message must be ${limit} characters or fewer.` };
    cleaned.push({ role: message.role, content });
  }
  const userCount = cleaned.filter((message) => message.role === "user").length;
  if (userCount === 0) return { error: "A message is required." };
  if (userCount > MAX_USER_MESSAGES) return { error: `Ask keeps at most ${MAX_USER_MESSAGES} messages in a conversation.` };
  return { messages: cleaned };
}

export async function askCatalogue(
  env: { XAI_API_KEY?: string; GROK_MODEL?: string },
  messages: AskMessage[],
): Promise<AskSuccess | AskFailure> {
  const model = env.GROK_MODEL || "grok-4.20-0309-non-reasoning";
  const started = Date.now();
  if (!env.XAI_API_KEY) {
    return {
      ok: false,
      status: 503,
      code: "ask-unconfigured",
      error: "Ask is unavailable. XAI_API_KEY is not configured.",
      model,
      latencyMs: Date.now() - started,
    };
  }
  const payloadMessages = [{ role: "system", content: askSystemPrompt(shows) }, ...messages];
  try {
    const response = await callModel(env.XAI_API_KEY, model, payloadMessages);
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 429 ? 429 : 502,
        code: "ask-upstream",
        error: "The model did not answer. Nothing was substituted.",
        model,
        latencyMs,
      };
    }
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = readContent(body.choices?.[0]?.message?.content);
    const parsed = parseModelJson(text);
    if (!parsed) {
      return {
        ok: false,
        status: 422,
        code: "ask-malformed",
        error: "The reply could not be read as catalogue matches. Nothing was invented in its place.",
        model,
        latencyMs,
      };
    }
    const known = new Set(shows.map((show) => show.id));
    const rejectedIds = parsed.showIds.filter((id) => !known.has(id));
    const showIds = parsed.showIds.filter((id) => known.has(id)).slice(0, 3);
    return {
      ok: true,
      reply: parsed.reply,
      showIds,
      rejectedIds,
      shows: shows.filter((show) => showIds.includes(show.id)),
      model,
      latencyMs,
      usage: {
        promptTokens: body.usage?.prompt_tokens ?? null,
        completionTokens: body.usage?.completion_tokens ?? null,
      },
      cost: "Not captured",
    };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      code: timedOut ? "ask-timeout" : "ask-upstream",
      error: timedOut
        ? "The reply did not arrive within twenty seconds. You can try again."
        : "The model did not answer. Nothing was substituted.",
      model,
      latencyMs: Date.now() - started,
    };
  }
}

async function callModel(apiKey: string, model: string, messages: Array<{ role: string; content: string }>): Promise<Response> {
  const url = "https://api.x.ai/v1/chat/completions";
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
  const signal = AbortSignal.timeout(20000);
  const reasoning = model.includes("non-reasoning") ? {} : { reasoning_effort: "low" };
  const withJson = await fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      ...reasoning,
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (withJson.status !== 400) return withJson;
  return fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ model, temperature: 0.2, ...reasoning, messages }),
  });
}

function readContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : typeof part === "object" && part && "text" in part ? String(part.text) : ""))
      .join("");
  }
  return "";
}

export function parseModelJson(text: string): { reply: string; showIds: string[] } | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const value = JSON.parse(trimmed) as { reply?: unknown; showIds?: unknown } | null;
    if (!value) return null;
    if (typeof value.reply !== "string" || !Array.isArray(value.showIds)) return null;
    const showIds = value.showIds.filter((id): id is string => typeof id === "string");
    return { reply: value.reply.slice(0, 600), showIds };
  } catch {
    return null;
  }
}
