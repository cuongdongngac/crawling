"use client";

import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Loader2, Play, Save, ShieldCheck, Sparkles, Trash2, Database, Activity,
} from "lucide-react";
import {
  clearSystemKey, saveSystemSettings, testApifyToken, testOpenRouterKey, testOpenRouterModel, testSocialFetchKey,
  type ApifyAccountInfo, type OpenRouterKeyInfo, type SystemSettingsView,
} from "@/app/actions/system-settings";
import OpenRouterModelPicker from "@/components/OpenRouterModelPicker";
import { useT, useLocale } from "@/lib/i18n/client";

type TestResult = { content: string; model: string; inputTokens: number; outputTokens: number; costUsd: number | null; ms: number };
const usd = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${n.toFixed(2)}`);

/**
 * Form "Khoá hệ thống cho quét chính thức": Apify token + OpenRouter key + model, một nút Lưu.
 * Mọi đọc/ghi đi qua server action (admin), khoá không bao giờ hiện nguyên văn.
 */
export default function SettingsForm({ initial }: { initial: SystemSettingsView }) {
  const t = useT();
  const locale = useLocale();
  const [view, setView] = useState(initial);
  const [apifyToken, setApifyToken] = useState("");
  const [orKey, setOrKey] = useState("");
  const [model, setModel] = useState(initial.openrouter.model);
  const [aiAuto, setAiAuto] = useState(initial.ai.autoEnabled);
  const [aiBudget, setAiBudget] = useState(String(initial.ai.monthlyBudgetUsd));
  const [sfKey, setSfKey] = useState("");
  const [mBudget, setMBudget] = useState(String(initial.socialfetch.monthlyBudgetUsd));
  const [sfPrice, setSfPrice] = useState(String(initial.socialfetch.usdPerCredit));
  const [sfBalance, setSfBalance] = useState<number | null | undefined>(undefined);
  const [apifyInfo, setApifyInfo] = useState<ApifyAccountInfo | null>(null);
  const [orInfo, setOrInfo] = useState<OpenRouterKeyInfo | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setMsg(null);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }
  const fail = (text: string) => setMsg({ kind: "err", text: t(text) });

  const dirty =
    apifyToken.trim() !== "" ||
    orKey.trim() !== "" ||
    model !== view.openrouter.model ||
    aiAuto !== view.ai.autoEnabled ||
    Number(aiBudget) !== view.ai.monthlyBudgetUsd ||
    sfKey.trim() !== "" ||
    Number(mBudget) !== view.socialfetch.monthlyBudgetUsd ||
    Number(sfPrice) !== view.socialfetch.usdPerCredit;

  const onSave = () =>
    run("save", async () => {
      const r = await saveSystemSettings({
        apifyToken,
        openrouterKey: orKey,
        openrouterModel: model,
        aiAutoEnabled: aiAuto,
        aiMonthlyBudgetUsd: Number(aiBudget),
        socialfetchKey: sfKey,
        measureMonthlyBudgetUsd: Number(mBudget),
        socialfetchUsdPerCredit: Number(sfPrice),
      });
      if (!r.ok) return fail(r.error);
      setView(r.data);
      setApifyToken("");
      setOrKey("");
      setSfKey("");
      setMsg({ kind: "ok", text: t("Đã lưu cấu hình. Quét chính thức sẽ dùng khoá mới từ lần chạy kế tiếp.") });
    });

  const onClear = (which: "apify" | "openrouter" | "socialfetch") =>
    run(`clear-${which}`, async () => {
      const name = which === "apify" ? "Apify token" : which === "socialfetch" ? t("khóa Social Fetch") : "OpenRouter key";
      if (!confirm(t("Xoá {name} khỏi hệ thống? Quét chính thức sẽ ngừng dùng khoá này.", { name }))) return;
      const r = await clearSystemKey(which);
      if (!r.ok) return fail(r.error);
      setView(r.data);
      if (which === "apify") setApifyInfo(null);
      else if (which === "openrouter") setOrInfo(null);
      else setSfBalance(undefined);
      setMsg({ kind: "ok", text: t("Đã xoá {name}.", { name }) });
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-stone-100 bg-stone-50/60">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" /> {t("Khoá hệ thống cho quét chính thức")}
        </h2>
        <p className="text-sm text-stone-600 mt-1">
          {t("Chỉ dùng cho")} <b>{t("quét chính thức")}</b>{t(": lịch quét chạy ngầm ghi vào cơ sở dữ liệu, và AI xử lý dữ liệu đó. Quét thử của cộng tác viên dùng key cá nhân của họ, không dùng các khoá này. Khoá chỉ lưu ở máy chủ, chỉ quản trị viên thấy trang này và không hiện lại nguyên văn.")}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* ---------------- Apify ---------------- */}
        <KeySection
          tone="indigo"
          icon={<Database className="w-4 h-4 text-indigo-600" />}
          title={t("Apify — công cụ quét")}
          hasKey={view.apify.hasKey}
          hint={view.apify.keyHint}
          value={apifyToken}
          onChange={setApifyToken}
          placeholder="apify_api_..."
          link={{ href: "https://console.apify.com/settings/integrations", label: t("Lấy token tại Apify Console") }}
          busy={busy}
          busyKey="apify"
          onTest={() =>
            run("test-apify", async () => {
              const r = await testApifyToken(apifyToken);
              if (!r.ok) return fail(r.error);
              setApifyInfo(r.data);
              setMsg({ kind: "ok", text: t("Apify token hợp lệ.") });
            })
          }
          onClear={() => onClear("apify")}
        >
          {apifyInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Stat label={t("Tài khoản")} value={apifyInfo.username || "—"} />
              <Stat label={t("Gói")} value={apifyInfo.plan || "—"} />
              <Stat label={t("Đã dùng tháng này")} value={usd(apifyInfo.monthlyUsageUsd)} />
              <Stat label={t("Hạn mức tháng")} value={usd(apifyInfo.monthlyLimitUsd)} />
            </div>
          )}
        </KeySection>

        {/* ---------------- Social Fetch ---------------- */}
        <KeySection
          tone="indigo"
          icon={<Activity className="w-4 h-4 text-indigo-600" />}
          title={t("Social Fetch — đo tương tác theo link")}
          hasKey={view.socialfetch.hasKey}
          hint={view.socialfetch.keyHint}
          value={sfKey}
          onChange={setSfKey}
          placeholder="sfk_..."
          link={{ href: "https://app.socialfetch.dev/api-keys", label: t("Lấy khóa tại Social Fetch") }}
          busy={busy}
          busyKey="socialfetch"
          onTest={() =>
            run("test-socialfetch", async () => {
              const r = await testSocialFetchKey(sfKey);
              if (!r.ok) return fail(r.error);
              setSfBalance(r.data.balance);
              setMsg({ kind: "ok", text: t("Khóa Social Fetch hợp lệ (kiểm tra số dư không tốn lượt).") });
            })
          }
          onClear={() => onClear("socialfetch")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <label className="block">
              <span className="text-xs text-stone-600">{t("Trần chi phí đo mỗi tháng (USD) — hết trần thì ngừng đo")}</span>
              <input type="number" min={0} max={5000} step={1} value={mBudget} onChange={(e) => setMBudget(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            </label>
            <label className="block">
              <span className="text-xs text-stone-600">{t("Giá mỗi lượt theo gói đang dùng (USD)")}</span>
              <input type="number" min={0.0001} max={1} step={0.0001} value={sfPrice} onChange={(e) => setSfPrice(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
            </label>
            <Stat label={t("Đã dùng tháng này")} value={view.socialfetch.monthSpendUsd === null ? "—" : `$${view.socialfetch.monthSpendUsd.toFixed(2)}`} />
          </div>
          <p className="text-xs text-stone-500">{t("Ví dụ giá: gói Starter 14 USD/1.000 lượt = 0,014; gói Growth 59 USD/25.000 lượt = 0,00236.")}</p>
          {sfBalance !== undefined && <Stat label={t("Số dư lượt")} value={sfBalance === null ? "—" : sfBalance.toLocaleString(locale)} />}
        </KeySection>

        {/* ---------------- OpenRouter ---------------- */}
        <KeySection
          tone="violet"
          icon={<Sparkles className="w-4 h-4 text-violet-600" />}
          title="OpenRouter — AI"
          hasKey={view.openrouter.hasKey}
          hint={view.openrouter.keyHint}
          value={orKey}
          onChange={setOrKey}
          placeholder="sk-or-v1-..."
          link={{ href: "https://openrouter.ai/settings/keys", label: t("Lấy key tại openrouter.ai") }}
          busy={busy}
          busyKey="openrouter"
          onTest={() =>
            run("test-openrouter", async () => {
              const r = await testOpenRouterKey(orKey);
              if (!r.ok) return fail(r.error);
              setOrInfo(r.data);
              setMsg({ kind: "ok", text: t("OpenRouter key hợp lệ.") });
            })
          }
          onClear={() => onClear("openrouter")}
        >
          {orInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Stat label={t("Tên key")} value={orInfo.label || "—"} />
              <Stat label={t("Đã dùng")} value={usd(orInfo.usage)} />
              <Stat label={t("Hạn mức")} value={orInfo.limit === null ? "Không giới hạn" : usd(orInfo.limit)} />
              <Stat label={t("Còn lại")} value={orInfo.limitRemaining === null ? "—" : usd(orInfo.limitRemaining)} />
            </div>
          )}
          {orInfo && orInfo.limit === null && (
            <p className="text-xs text-amber-700 flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {t("Key chưa đặt hạn mức chi tiêu. Nên đặt hạn mức cho key này trên openrouter.ai để tránh phát sinh chi phí ngoài dự kiến.")}
            </p>
          )}

          <div className="pt-2">
            <div className="text-sm font-bold text-stone-900 mb-2">{t("Model mặc định cho AI")}</div>
            <OpenRouterModelPicker
              value={model}
              onChange={(id) => {
                setModel(id);
                setTest(null);
              }}
            />
            <button
              type="button"
              onClick={() =>
                run("test-model", async () => {
                  setTest(null);
                  const r = await testOpenRouterModel({ key: orKey, model });
                  if (!r.ok) return fail(r.error);
                  setTest(r.data);
                })
              }
              disabled={(!view.openrouter.hasKey && !orKey.trim()) || !model || busy !== null}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-300 text-violet-800 bg-white text-sm font-semibold disabled:opacity-50"
            >
              {busy === "test-model" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {t("Thử model")}
            </button>
            {test && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm space-y-2">
                <div className="font-semibold text-emerald-900">{t("Model trả lời:")}</div>
                <div className="text-stone-800 whitespace-pre-wrap">{test.content || t("(trống)")}</div>
                <div className="text-xs text-stone-600 flex flex-wrap gap-x-4">
                  <span>{t("{v0} giây", { v0: (test.ms / 1000).toFixed(1) })}</span>
                  <span>{test.inputTokens} + {test.outputTokens} token</span>
                  <span>{t("Chi phí")} {test.costUsd === null ? "—" : `$${test.costUsd.toFixed(6)}`}</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-violet-100 space-y-3">
            <div className="text-sm font-bold text-stone-900">{t("Chạy AI trên dữ liệu quét chính thức")}</div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiAuto}
                onChange={(e) => setAiAuto(e.target.checked)}
                className="mt-1 w-4 h-4 accent-violet-600"
              />
              <span className="text-sm text-stone-700">
                <b>{t("Tự gắn nhãn bài mới")}</b> {t("sau mỗi lần quét chính thức (mục đích, loại chủ thể, tiêu chí chữ và giao dịch, từ lóng). AI chỉ gợi ý; nhãn được lưu riêng, không sửa dữ liệu bài.")}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
              <label className="block">
                <span className="text-xs text-stone-600">{t("Trần chi phí AI mỗi tháng (USD) — hết trần thì AI tự dừng")}</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={aiBudget}
                  onChange={(e) => setAiBudget(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                />
              </label>
              <Stat
                label={t("Đã dùng tháng này")}
                value={view.ai.monthSpendUsd === null ? "Chưa tạo bảng AI" : `$${view.ai.monthSpendUsd.toFixed(2)}`}
              />
            </div>
          </div>
        </KeySection>

        {msg && (
          <div className={`text-sm rounded-lg p-3 flex items-start gap-2 ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
            {msg.kind === "ok" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span className="break-words">{msg.text}</span>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 p-4 sm:px-6 border-t border-stone-100 bg-white/95 backdrop-blur flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-amber-700 mr-auto">{t("Có thay đổi chưa lưu")}</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || busy !== null}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 text-white text-sm font-semibold rounded-xl hover:bg-emerald-800 disabled:opacity-50 w-full sm:w-auto"
        >
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("Lưu cấu hình")}
        </button>
      </div>
    </div>
  );
}

function KeySection(props: {
  tone: "indigo" | "violet";
  icon: React.ReactNode;
  title: string;
  hasKey: boolean;
  hint: string | null;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  link: { href: string; label: string };
  busy: string | null;
  busyKey: string;
  onTest: () => void;
  onClear: () => void;
  children?: React.ReactNode;
}) {
  const t = useT();
  const box = props.tone === "indigo" ? "border-indigo-100 bg-indigo-50/30" : "border-violet-100 bg-violet-50/30";
  const btn = props.tone === "indigo" ? "border-indigo-300 text-indigo-800" : "border-violet-300 text-violet-800";
  const ring = props.tone === "indigo" ? "focus:ring-indigo-500" : "focus:ring-violet-500";
  const canTest = props.hasKey || props.value.trim() !== "";
  return (
    <section className={`border rounded-xl p-4 sm:p-5 space-y-3 ${box}`}>
      <div className="flex flex-wrap items-center gap-2">
        {props.icon}
        <span className="text-sm font-bold text-stone-900">{props.title}</span>
        {props.hasKey ? (
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{t("Đã có: {hint}", { hint: props.hint })}</span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">{t("Chưa khai báo")}</span>
        )}
      </div>
      <div className="relative">
        <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="password"
          autoComplete="new-password"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.hasKey ? t("Dán khoá mới (để trống = giữ khoá cũ)") : props.placeholder}
          className={`w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-stone-300 rounded-lg outline-none focus:ring-2 bg-white ${ring}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={props.onTest}
          disabled={!canTest || props.busy !== null}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-white text-sm font-semibold disabled:opacity-50 ${btn}`}
        >
          {props.busy === `test-${props.busyKey}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {t("Kiểm tra")}
        </button>
        {props.hasKey && (
          <button
            type="button"
            onClick={props.onClear}
            disabled={props.busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-700 hover:bg-rose-50 text-sm font-semibold disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> {t("Xoá")}
          </button>
        )}
        <a href={props.link.href} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-stone-600 hover:underline">
          {props.link.label} <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {props.children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-stone-200 px-3 py-2">
      <div className="text-[11px] text-stone-500">{label}</div>
      <div className="font-semibold text-stone-900 truncate">{value}</div>
    </div>
  );
}
