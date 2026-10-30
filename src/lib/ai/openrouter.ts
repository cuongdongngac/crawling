// ==========================================================
// OpenRouter — lớp gọi AI dùng chung cho toàn ứng dụng.
// CHỈ import từ Server Actions / Route Handlers (key không bao giờ xuống trình duyệt).
// Cấu hình (key + model mặc định) do admin khai báo ở trang Cấu hình,
// lưu trong bảng system_settings (OPENROUTER_API_KEY, OPENROUTER_MODEL).
// ==========================================================
import { getServiceClient } from "@/lib/auth/guards";

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
export const SETTING_KEY = "OPENROUTER_API_KEY";
export const SETTING_MODEL = "OPENROUTER_MODEL";
export const DEFAULT_MODEL = "google/gemini-3.5-flash";

/** Thông tin model rút gọn để hiển thị/chọn. Giá quy ra USD cho 1 triệu token (null = không cố định). */
export type OpenRouterModel = {
  id: string;
  name: string;
  provider: string;
  contextLength: number | null;
  priceIn: number | null;
  priceOut: number | null;
  isFree: boolean;
  inputModalities: string[];
  supportsTools: boolean;
  supportsJson: boolean;
  created: number | null;
  description: string;
};

type RawModel = {
  id: string;
  name?: string;
  created?: number;
  description?: string;
  context_length?: number | null;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  supported_parameters?: string[];
};

function perMillion(v: string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null; // router/auto có giá -1 = thay đổi theo model được chọn
  return Math.round(n * 1_000_000 * 10000) / 10000;
}

function headers(apiKey?: string): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    // OpenRouter dùng 2 header này để ghi nguồn gọi (không bắt buộc).
    "HTTP-Referer": process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    "X-Title": "VPHA M&E",
  };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  return h;
}

/** Danh sách model hiện có trên OpenRouter (công khai, không cần key). Cache 1 giờ. Chỉ lấy model trả về chữ. */
export async function fetchModels(): Promise<OpenRouterModel[]> {
  const out: RawModel[] = [];
  let url: string | null = `${OPENROUTER_BASE}/models`;
  for (let page = 0; url && page < 10; page++) {
    const res: Response = await fetch(url, { headers: headers(), next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Không tải được danh sách model từ OpenRouter (HTTP ${res.status}).`);
    const json = (await res.json()) as { data?: RawModel[]; links?: { next?: string | null } };
    out.push(...(json.data ?? []));
    const next = json.links?.next;
    url = next ? new URL(next, "https://openrouter.ai").toString() : null;
  }
  const seen = new Set<string>();
  return out
    .filter((m) => m?.id && !seen.has(m.id) && seen.add(m.id))
    .filter((m) => {
      const outMods = m.architecture?.output_modalities;
      return !outMods || outMods.includes("text");
    })
    .map((m) => {
      const priceIn = perMillion(m.pricing?.prompt);
      const priceOut = perMillion(m.pricing?.completion);
      const params = m.supported_parameters ?? [];
      return {
        id: m.id,
        name: m.name || m.id,
        provider: m.id.split("/")[0] ?? "",
        contextLength: m.context_length ?? null,
        priceIn,
        priceOut,
        isFree: m.id.endsWith(":free") || (priceIn === 0 && priceOut === 0),
        inputModalities: m.architecture?.input_modalities ?? ["text"],
        supportsTools: params.includes("tools"),
        supportsJson: params.includes("response_format") || params.includes("structured_outputs"),
        created: m.created ?? null,
        description: (m.description ?? "").slice(0, 400),
      };
    });
}

/** Thông tin key: hạn mức, đã dùng. Trả lỗi rõ ràng nếu key sai. */
export async function fetchKeyInfo(apiKey: string) {
  const res = await fetch(`${OPENROUTER_BASE}/key`, { headers: headers(apiKey), cache: "no-store" });
  if (res.status === 401 || res.status === 403) throw new Error("Key không hợp lệ hoặc đã bị thu hồi.");
  if (!res.ok) throw new Error(`OpenRouter trả lỗi HTTP ${res.status}.`);
  const json = (await res.json()) as {
    data?: { label?: string; usage?: number; limit?: number | null; limit_remaining?: number | null; is_free_tier?: boolean };
  };
  const d = json.data ?? {};
  return {
    label: d.label ?? "",
    usage: typeof d.usage === "number" ? d.usage : null,
    limit: typeof d.limit === "number" ? d.limit : null,
    limitRemaining: typeof d.limit_remaining === "number" ? d.limit_remaining : null,
    isFreeTier: d.is_free_tier === true,
  };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
  ms: number;
};

/** Gọi chat completion. Thiếu apiKey/model thì dùng cấu hình hệ thống. */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number; json?: boolean } = {}
): Promise<ChatResult> {
  const cfg = opts.apiKey && opts.model ? null : await getAiConfig();
  const apiKey = opts.apiKey || cfg?.apiKey;
  const model = opts.model || cfg?.model || DEFAULT_MODEL;
  if (!apiKey) throw new Error("Chưa khai báo OpenRouter API key ở trang Cấu hình.");
  const t0 = Date.now();
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: headers(apiKey),
    cache: "no-store",
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      usage: { include: true },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.error?.message ?? text;
    } catch {}
    throw new Error(`OpenRouter lỗi (${res.status}): ${String(msg).slice(0, 300)}`);
  }
  const data = JSON.parse(text);
  const u = data?.usage ?? {};
  return {
    content: data?.choices?.[0]?.message?.content ?? "",
    model: data?.model ?? model,
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
    costUsd: typeof u.cost === "number" ? u.cost : null,
    ms: Date.now() - t0,
  };
}

/** Đọc cấu hình AI hệ thống (service role). */
export async function getAiConfig(): Promise<{ apiKey: string | null; model: string }> {
  const { data } = await getServiceClient()
    .from("system_settings")
    .select("setting_key, setting_value")
    .in("setting_key", [SETTING_KEY, SETTING_MODEL]);
  const map = new Map((data ?? []).map((r) => [r.setting_key as string, r.setting_value as string]));
  return {
    apiKey: map.get(SETTING_KEY) || null,
    model: map.get(SETTING_MODEL) || DEFAULT_MODEL,
  };
}

export function maskKey(k: string | null): string | null {
  if (!k) return null;
  return k.length <= 12 ? "••••" : `${k.slice(0, 8)}…${k.slice(-4)}`;
}
