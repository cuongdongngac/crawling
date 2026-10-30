// ==========================================================
// Bộ chạy AI dùng chung: một lô mục -> một dòng ai_runs + mỗi mục một dòng ai_labels.
//  - Tôn trọng trần chi phí tháng (AI_MONTHLY_BUDGET_USD): hết trần thì dừng, trạng thái BUDGET_STOPPED.
//  - Chạy song song có giới hạn; lỗi một mục không làm hỏng cả lô.
//  - Chỉ dùng phía server (service role).
// ==========================================================
import { getServiceClient } from "@/lib/auth/guards";
import { chatCompletion, getAiConfig, type ChatMessage } from "@/lib/ai/openrouter";
import type { Codebook, LabelValues } from "@/lib/ai/codebook";

export const AI_SETTING_AUTO = "AI_AUTO_ENABLED";
export const AI_SETTING_BUDGET = "AI_MONTHLY_BUDGET_USD";
export const DEFAULT_MONTHLY_BUDGET_USD = 5;

export type AiTask<TIn> = {
  name: string;
  codebook: Codebook;
  promptVersion: string;
  json?: boolean;
  build: (input: TIn) => ChatMessage[];
  parse: (raw: string) => { output: (LabelValues & { reason?: string }) | null; confidence: number | null; error: string | null };
};

export type AiTarget<TIn> = { postId?: string; evalItemId?: number; input: TIn };

export type AiRunSummary = {
  runId: number | null;
  status: "DONE" | "FAILED" | "BUDGET_STOPPED" | "SKIPPED";
  total: number;
  ok: number;
  failed: number;
  costUsd: number;
  message?: string;
};

export async function getAiPolicy(): Promise<{ autoEnabled: boolean; monthlyBudgetUsd: number }> {
  const { data } = await getServiceClient()
    .from("system_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [AI_SETTING_AUTO, AI_SETTING_BUDGET]);
  const m = new Map((data ?? []).map((r) => [r.setting_key as string, r.setting_value as string]));
  const b = Number(m.get(AI_SETTING_BUDGET));
  return {
    autoEnabled: m.get(AI_SETTING_AUTO) === "true",
    monthlyBudgetUsd: Number.isFinite(b) && b >= 0 ? b : DEFAULT_MONTHLY_BUDGET_USD,
  };
}

/** Tổng chi phí AI từ đầu tháng (giờ UTC). null nếu bảng ai_runs chưa tạo. */
export async function getMonthSpendUsd(): Promise<number | null> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data, error } = await getServiceClient()
    .from("ai_runs")
    .select("cost_usd")
    .gte("started_at", start.toISOString());
  if (error) return null;
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd || 0), 0);
}

async function ensureCodebook(cb: Codebook) {
  await getServiceClient()
    .from("label_codebooks")
    .upsert({ version: cb.version, title: cb.title, definition: cb }, { onConflict: "version", ignoreDuplicates: true });
}

export async function runAiTask<TIn>(opts: {
  task: AiTask<TIn>;
  targets: AiTarget<TIn>[];
  model?: string;
  trigger: "CRON" | "MANUAL" | "EVAL";
  triggeredBy?: string | null;
  concurrency?: number;
}): Promise<AiRunSummary> {
  const db = getServiceClient();
  const { task, targets } = opts;
  if (targets.length === 0) return { runId: null, status: "SKIPPED", total: 0, ok: 0, failed: 0, costUsd: 0, message: "Không có mục nào cần xử lý." };

  const cfg = await getAiConfig();
  if (!cfg.apiKey) return { runId: null, status: "SKIPPED", total: 0, ok: 0, failed: 0, costUsd: 0, message: "Chưa khai báo OpenRouter key." };
  const model = opts.model || cfg.model;

  const policy = await getAiPolicy();
  const spent = (await getMonthSpendUsd()) ?? 0;
  if (spent >= policy.monthlyBudgetUsd)
    return { runId: null, status: "BUDGET_STOPPED", total: 0, ok: 0, failed: 0, costUsd: 0, message: `Đã dùng hết trần chi phí AI tháng này ($${spent.toFixed(2)} / $${policy.monthlyBudgetUsd}).` };

  await ensureCodebook(task.codebook);
  const { data: run, error: runErr } = await db
    .from("ai_runs")
    .insert({
      task: task.name,
      codebook_version: task.codebook.version,
      prompt_version: task.promptVersion,
      model,
      trigger: opts.trigger,
      triggered_by: opts.triggeredBy ?? null,
      items_total: targets.length,
    })
    .select("run_id")
    .single();
  if (runErr || !run) throw new Error(`Không tạo được lượt chạy AI: ${runErr?.message}`);
  const runId = run.run_id as number;

  let ok = 0, failed = 0, inTok = 0, outTok = 0, cost = 0, stopped = false;
  const queue = [...targets];

  async function worker() {
    while (queue.length && !stopped) {
      if (spent + cost >= policy.monthlyBudgetUsd) {
        stopped = true;
        break;
      }
      const t = queue.shift()!;
      const base = {
        run_id: runId,
        task: task.name,
        post_id: t.postId ?? null,
        eval_item_id: t.evalItemId ?? null,
        codebook_version: task.codebook.version,
        prompt_version: task.promptVersion,
        model,
      };
      try {
        const r = await chatCompletion(task.build(t.input), { apiKey: cfg.apiKey!, model, temperature: 0, json: task.json, maxTokens: 1200 });
        const p = task.parse(r.content);
        inTok += r.inputTokens;
        outTok += r.outputTokens;
        cost += r.costUsd ?? 0;
        const row = {
          ...base,
          output: p.error ? null : p.output,
          raw_output: r.content.slice(0, 4000),
          confidence: p.confidence,
          input_tokens: r.inputTokens,
          output_tokens: r.outputTokens,
          cost_usd: r.costUsd,
          latency_ms: r.ms,
          error: p.error,
        };
        const { error } = await db.from("ai_labels").insert(row);
        if (error && error.code !== "23505") throw new Error(error.message); // 23505 = đã có nhãn (chạy trùng)
        if (p.error) failed++;
        else ok++;
      } catch (e) {
        failed++;
        await db.from("ai_labels").insert({ ...base, error: (e instanceof Error ? e.message : String(e)).slice(0, 500) });
      }
    }
  }

  let fatal: string | null = null;
  try {
    await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 4, 8)) }, worker));
  } catch (e) {
    fatal = e instanceof Error ? e.message : String(e);
  }

  const status: AiRunSummary["status"] = fatal ? "FAILED" : stopped ? "BUDGET_STOPPED" : "DONE";
  await db
    .from("ai_runs")
    .update({
      status,
      items_ok: ok,
      items_failed: failed,
      input_tokens: inTok,
      output_tokens: outTok,
      cost_usd: Number(cost.toFixed(6)),
      error: fatal,
      finished_at: new Date().toISOString(),
    })
    .eq("run_id", runId);

  return { runId, status, total: targets.length, ok, failed, costUsd: cost, message: fatal ?? undefined };
}
