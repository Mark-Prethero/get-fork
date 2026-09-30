import { api, adminToken, saveRunToken } from "./api.ts";
import { esc, shell } from "./render.ts";

interface QueueItem {
  run: { id: string; variantName: string; profileName: string; status: string };
  token: string | null;
  prompt: string | null;
  existing: boolean;
}

export async function renderAdmin(root: HTMLElement): Promise<void> {
  root.innerHTML = shell("admin", `
    <p class="kicker">Runs</p>
    <h2>Hand the mission to Grok Bot</h2>
    <p class="quiet">A button here queues a run. It does not mean the Bot has started.</p>
    <form class="form" data-key>
      <label for="admin">Admin session</label>
      <input id="admin" type="password" autocomplete="off" />
      <button class="primary" type="submit">Save session</button>
    </form>
    <div class="row" style="margin-top:16px">
      <button class="ghost" type="button" data-queue>Queue the four required runs</button>
      <button class="ghost" type="button" data-queue data-retry="true">Retry unsuccessful required runs</button>
      <button class="ghost" type="button" data-explain>Request synthesis</button>
    </div>
    <p class="note" data-status></p>
    <div data-prompts></div>
  `);
  const status = root.querySelector("[data-status]");
  root.querySelector("[data-key]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget as HTMLFormElement).get("admin") ?? root.querySelector<HTMLInputElement>("#admin")?.value ?? "").trim();
    if (value) sessionStorage.setItem("fork.admin", value);
    if (status) status.textContent = "Admin session saved in this tab.";
  });
  root.querySelectorAll<HTMLButtonElement>("[data-queue]").forEach((button) => button.addEventListener("click", () => {
    void api<{ runs: QueueItem[] }>("/api/queue", { method: "POST", body: JSON.stringify({ retryErrors: button.dataset.retry === "true" }) }, adminToken()).then((result) => {
      const host = root.querySelector("[data-prompts]");
      if (!host) return;
      for (const item of result.runs) if (item.token) saveRunToken(item.run.id, item.token);
      host.innerHTML = result.runs.map((item) => `
        <article class="mission">
          <h3>${esc(item.run.profileName)} · ${esc(item.run.variantName)}</h3>
          <p>${item.existing ? "Already queued or recorded. The original session token is not shown again." : "New run. Copy this handoff once."}</p>
          <p><a href="/run/${esc(item.run.id)}" data-link>Open run</a></p>
          ${item.prompt ? `<textarea readonly rows="12">${esc(item.prompt)}</textarea>` : ""}
        </article>
      `).join("");
    }).catch((error: unknown) => {
      if (status) status.textContent = error instanceof Error ? error.message : "Could not queue runs.";
    });
  }));
  root.querySelector("[data-explain]")?.addEventListener("click", () => {
    void api<{ ok: boolean; text?: string; error?: string }>("/api/explain", { method: "POST", body: "{}" }, adminToken()).then((result) => {
      if (status) status.textContent = result.ok ? result.text ?? "" : result.error ?? "Synthesis unavailable.";
    }).catch((error: unknown) => {
      if (status) status.textContent = error instanceof Error ? error.message : "Synthesis unavailable.";
    });
  });
}
