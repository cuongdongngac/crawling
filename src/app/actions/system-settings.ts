"use server";

/**
 * Khoá hệ thống cho QUÉT CHÍNH THỨC — chỉ quản trị viên.
 *  - Apify token (APIFY_API_TOKEN): worker/cron dùng để chạy lịch quét ghi vào DB.
 *  - OpenRouter key + model (OPENROUTER_API_KEY / OPENROUTER_MODEL): AI xử lý dữ liệu quét chính thức.
 * Quét thử của cộng tác viên KHÔNG dùng các khoá này (dùng key cá nhân, không lưu).
 *
 * Bảng system_settings đã khoá RLS (docs/migrations/2026-10-30_khoa-system-settings.sql):
 * chỉ đọc/ghi qua service role sau khi requireAdmin(). Khoá không bao giờ trả nguyên văn về trình duyệt.
 */
import { revalidatePath } from "next/cache";
import { getServiceClient, requireAdmin } from "@/lib/auth/guards";
import {
  SETTING_KEY as OR_KEY,
  SETTING_MODEL as OR_MODEL,
  DEFAULT_MODEL,
  chatCompletion,
  fetchKeyInfo,
  fetchModels,
  maskKey,
  type OpenRouterModel,
} from "@/lib/ai/openrouter";
import { AI_SETTING_AUTO, AI_SETTING_BUDGET, getAiPolicy, getMonthSpendUsd } from "@/lib/ai/runner";

const APIFY_KEY = "APIFY_API_TOKEN";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export type SystemSettingsView = {
  apify: { hasKey: boolean; keyHint: string | null; updatedAt: string | null };
  openrouter: { hasKey: boolean; keyHint: string | null; model: string; defaultModel: string; updatedAt: string | null };
  /** Chính sách AI: tự chạy sau mỗi lần quét chính thức + trần chi phí tháng. monthSpendUsd null = chưa tạo bảng ai_runs. */
  ai: { autoEnabled: boolean; monthlyBudgetUsd: number; monthSpendUsd: number | null };
};

export type ApifyAccountInfo = {
  username: string;
  plan: string;
  monthlyUsageUsd: number | null;
  monthlyLimitUsd: number | null;
};

export type OpenRouterKeyInfo = Awaited<ReturnType<typeof fetchKeyInfo>>;

async function readAll() {
  const { data, error } = await getServiceClient()
    .from("system_settings")
    .select("setting_key, setting_value, updated_at")
    .in("setting_key", [APIFY_KEY, OR_KEY, OR_MODEL]);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((r) => [r.setting_key as string, r as { setting_value: string; updated_at: string | null }]));
}

async function view(): Promise<SystemSettingsView> {
  const m = await readAll();
  const ap = m.get(APIFY_KEY);
  const ok = m.get(OR_KEY);
  const [policy, spend] = await Promise.all([getAiPolicy(), getMonthSpendUsd()]);
  return {
    ai: { autoEnabled: policy.autoEnabled, monthlyBudgetUsd: policy.monthlyBudgetUsd, monthSpendUsd: spend },
    apify: { hasKey: !!ap?.setting_value, keyHint: maskKey(ap?.setting_value ?? null), updatedAt: ap?.updated_at ?? null },
    openrouter: {
      hasKey: !!ok?.setting_value,
      keyHint: maskKey(ok?.setting_value ?? null),
      model: m.get(OR_MODEL)?.setting_value || DEFAULT_MODEL,
      defaultModel: DEFAULT_MODEL,
      updatedAt: ok?.updated_at ?? null,
    },
  };
}

async function storedValue(key: string): Promise<string | null> {
  return (await readAll()).get(key)?.setting_value || null;
}

async function fetchApifyAccount(token: string): Promise<ApifyAccountInfo> {
  const h = { Authorization: `Bearer ${token}` };
  const me = await fetch("https://api.apify.com/v2/users/me", { headers: h, cache: "no-store" });
  if (me.status === 401 || me.status === 403) throw new Error("Apify token không hợp lệ hoặc đã bị thu hồi.");
  if (!me.ok) throw new Error(`Apify trả lỗi HTTP ${me.status}.`);
  const u = (await me.json())?.data ?? {};
  let monthlyUsageUsd: number | null = null;
  let monthlyLimitUsd: number | null = null;
  try {
    const lim = await fetch("https://api.apify.com/v2/users/me/limits", { headers: h, cache: "no-store" });
    if (lim.ok) {
      const d = (await lim.json())?.data ?? {};
      monthlyUsageUsd = typeof d?.current?.monthlyUsageUsd === "number" ? d.current.monthlyUsageUsd : null;
      monthlyLimitUsd = typeof d?.limits?.maxMonthlyUsageUsd === "number" ? d.limits.maxMonthlyUsageUsd : null;
    }
  } catch {
    /* không có số liệu hạn mức thì thôi */
  }
  return { username: u.username ?? "", plan: u.plan?.id ?? u.plan?.name ?? "", monthlyUsageUsd, monthlyLimitUsd };
}

// ---------------------------------------------------------------- đọc

export async function getSystemSettings(): Promise<Result<SystemSettingsView>> {
  try {
    await requireAdmin();
    return { ok: true, data: await view() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function listOpenRouterModels(): Promise<Result<OpenRouterModel[]>> {
  try {
    await requireAdmin();
    return { ok: true, data: await fetchModels() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ---------------------------------------------------------------- ghi

/** Lưu cả form. Ô khoá để trống = giữ khoá cũ. Khoá mới được kiểm tra với Apify/OpenRouter trước khi lưu. */
export async function saveSystemSettings(input: {
  apifyToken?: string;
  openrouterKey?: string;
  openrouterModel: string;
  aiAutoEnabled: boolean;
  aiMonthlyBudgetUsd: number;
}): Promise<Result<SystemSettingsView>> {
  try {
    await requireAdmin();
    const now = new Date().toISOString();
    const rows: { setting_key: string; setting_value: string; updated_at: string }[] = [];

    const model = String(input.openrouterModel || "").trim();
    if (!/^[\w.-]+\/[\w.:@-]+$/.test(model)) throw new Error("Mã model không hợp lệ (dạng nhà-cung-cấp/tên-model).");
    rows.push({ setting_key: OR_MODEL, setting_value: model, updated_at: now });

    const budget = Number(input.aiMonthlyBudgetUsd);
    if (!Number.isFinite(budget) || budget < 0 || budget > 1000) throw new Error("Trần chi phí AI phải từ 0 đến 1.000 USD/tháng.");
    rows.push({ setting_key: AI_SETTING_BUDGET, setting_value: String(budget), updated_at: now });
    rows.push({ setting_key: AI_SETTING_AUTO, setting_value: input.aiAutoEnabled ? "true" : "false", updated_at: now });

    const apify = String(input.apifyToken || "").trim();
    if (apify) {
      await fetchApifyAccount(apify);
      rows.push({ setting_key: APIFY_KEY, setting_value: apify, updated_at: now });
    }
    const orKey = String(input.openrouterKey || "").trim();
    if (orKey) {
      if (!orKey.startsWith("sk-or-")) throw new Error("Key OpenRouter thường bắt đầu bằng sk-or-…");
      await fetchKeyInfo(orKey);
      rows.push({ setting_key: OR_KEY, setting_value: orKey, updated_at: now });
    }

    const { error } = await getServiceClient().from("system_settings").upsert(rows, { onConflict: "setting_key" });
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/settings");
    return { ok: true, data: await view() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function clearSystemKey(which: "apify" | "openrouter"): Promise<Result<SystemSettingsView>> {
  try {
    await requireAdmin();
    const { error } = await getServiceClient()
      .from("system_settings")
      .delete()
      .eq("setting_key", which === "apify" ? APIFY_KEY : OR_KEY);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/settings");
    return { ok: true, data: await view() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

// ---------------------------------------------------------------- kiểm tra

/** Kiểm tra Apify token (token vừa gõ, hoặc token đã lưu nếu để trống). */
export async function testApifyToken(token?: string): Promise<Result<ApifyAccountInfo>> {
  try {
    await requireAdmin();
    const t = String(token || "").trim() || (await storedValue(APIFY_KEY));
    if (!t) throw new Error("Chưa có Apify token để kiểm tra.");
    return { ok: true, data: await fetchApifyAccount(t) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function testOpenRouterKey(key?: string): Promise<Result<OpenRouterKeyInfo>> {
  try {
    await requireAdmin();
    const k = String(key || "").trim() || (await storedValue(OR_KEY));
    if (!k) throw new Error("Chưa có OpenRouter key để kiểm tra.");
    return { ok: true, data: await fetchKeyInfo(k) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Hỏi model một câu tiếng Việt ngắn: chạy được không, nhanh/chậm, tốn bao nhiêu. */
export async function testOpenRouterModel(input: { key?: string; model: string }) {
  try {
    await requireAdmin();
    const k = String(input.key || "").trim() || (await storedValue(OR_KEY));
    if (!k) throw new Error("Chưa có OpenRouter key để thử.");
    const r = await chatCompletion(
      [
        { role: "system", content: "Bạn là trợ lý. Trả lời ngắn gọn bằng tiếng Việt." },
        { role: "user", content: 'Hashtag "#vape" trên mạng xã hội thường nói về gì? Trả lời một câu.' },
      ],
      { apiKey: k, model: input.model, maxTokens: 400, temperature: 0 }
    );
    return { ok: true as const, data: r };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
