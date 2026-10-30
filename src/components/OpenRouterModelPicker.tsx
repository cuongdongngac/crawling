"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2, RefreshCw, Search } from "lucide-react";
import { listOpenRouterModels } from "@/app/actions/system-settings";
import type { OpenRouterModel } from "@/lib/ai/openrouter";

type Filter = "all" | "free" | "vision" | "json";
type Sort = "new" | "cheap" | "context" | "name";

export const fmtPrice = (n: number | null) =>
  n === null ? "thay đổi" : n === 0 ? "0" : n < 0.1 ? n.toFixed(3) : n < 10 ? n.toFixed(2) : n.toFixed(0);
export const fmtCtx = (n: number | null) =>
  !n ? "—" : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : `${Math.round(n / 1000)}K`;

/** Danh sách model OpenRouter: tìm kiếm, lọc, sắp xếp, bấm để chọn. Giá USD / 1 triệu token (vào / ra). */
export default function OpenRouterModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [models, setModels] = useState<OpenRouterModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [provider, setProvider] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    listOpenRouterModels().then((r) => {
      if (!alive) return;
      if (r.ok) setModels(r.data);
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, []);

  const reload = () => {
    setError(null);
    startTransition(async () => {
      const r = await listOpenRouterModels();
      if (r.ok) setModels(r.data);
      else setError(r.error);
    });
  };

  const providers = useMemo(() => Array.from(new Set((models ?? []).map((m) => m.provider))).sort(), [models]);

  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = (models ?? []).filter((m) => {
      if (provider && m.provider !== provider) return false;
      if (filter === "free" && !m.isFree) return false;
      if (filter === "vision" && !m.inputModalities.includes("image")) return false;
      if (filter === "json" && !m.supportsJson) return false;
      const hay = `${m.id} ${m.name}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const big = Number.MAX_SAFE_INTEGER;
    list.sort((a, b) => {
      if (sort === "cheap") return (a.priceIn ?? big) + (a.priceOut ?? big) - ((b.priceIn ?? big) + (b.priceOut ?? big));
      if (sort === "context") return (b.contextLength ?? 0) - (a.contextLength ?? 0);
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.created ?? 0) - (a.created ?? 0);
    });
    return list;
  }, [models, q, filter, provider, sort]);

  const selected = models?.find((m) => m.id === value) ?? null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-violet-500 bg-violet-50/50 p-3">
        <div className="text-xs text-violet-700 font-semibold mb-0.5">Model đang chọn</div>
        <div className="font-semibold text-stone-900 break-words">{selected?.name ?? value}</div>
        <div className="text-xs font-mono text-stone-500 break-all">{value}</div>
        {selected && (
          <div className="mt-1 text-xs text-stone-600 flex flex-wrap gap-x-3">
            <span>Vào ${fmtPrice(selected.priceIn)} · Ra ${fmtPrice(selected.priceOut)} / 1 triệu token</span>
            <span>Ngữ cảnh {fmtCtx(selected.contextLength)}</span>
          </div>
        )}
        {models && !selected && (
          <div className="mt-1 text-xs text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Không thấy model này trong danh sách OpenRouter hiện tại — kiểm tra lại mã.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <label className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm model: gemini flash, gpt, qwen…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
          />
        </label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="px-3 py-2.5 text-sm border border-stone-300 rounded-lg bg-white">
          <option value="">Mọi nhà cung cấp</option>
          {providers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="px-3 py-2.5 text-sm border border-stone-300 rounded-lg bg-white">
          <option value="new">Mới nhất</option>
          <option value="cheap">Rẻ nhất</option>
          <option value="context">Ngữ cảnh dài nhất</option>
          <option value="name">Theo tên</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {([
          ["all", "Tất cả"],
          ["free", "Miễn phí"],
          ["vision", "Đọc được ảnh"],
          ["json", "Trả JSON"],
        ] as [Filter, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === k ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-300"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-500">{models ? `${filtered.length}/${models.length} model` : ""}</span>
        <button type="button" onClick={reload} className="p-1.5 rounded-lg hover:bg-stone-100" aria-label="Tải lại danh sách">
          <RefreshCw className="w-4 h-4 text-stone-500" />
        </button>
      </div>

      <div className="border border-stone-200 rounded-xl max-h-[420px] overflow-y-auto divide-y divide-stone-100 bg-white">
        {!models && !error && (
          <div className="p-6 text-center text-sm text-stone-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách model từ OpenRouter…
          </div>
        )}
        {error && <div className="p-4 text-sm text-red-700 bg-red-50">{error} — vẫn có thể gõ mã model ở ô bên dưới.</div>}
        {models && filtered.length === 0 && <div className="p-6 text-center text-sm text-stone-500">Không có model khớp bộ lọc.</div>}
        {filtered.slice(0, 150).map((m) => {
          const active = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`w-full text-left px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 ${
                active ? "bg-violet-50" : "hover:bg-stone-50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-sm font-semibold ${active ? "text-violet-800" : "text-stone-900"}`}>{m.name}</span>
                  {m.isFree && <Badge className="bg-emerald-100 text-emerald-800">Miễn phí</Badge>}
                  {m.inputModalities.includes("image") && <Badge className="bg-sky-100 text-sky-800">Ảnh</Badge>}
                  {m.supportsJson && <Badge className="bg-stone-100 text-stone-700">JSON</Badge>}
                </div>
                <div className="text-xs font-mono text-stone-500 truncate">{m.id}</div>
              </div>
              <div className="text-xs text-stone-600 tabular-nums sm:text-right shrink-0">
                <div>${fmtPrice(m.priceIn)} / ${fmtPrice(m.priceOut)}</div>
                <div className="text-stone-400">{fmtCtx(m.contextLength)} ngữ cảnh</div>
              </div>
            </button>
          );
        })}
        {filtered.length > 150 && (
          <div className="p-2 text-center text-xs text-stone-500">Còn {filtered.length - 150} model — gõ thêm từ khoá để thu hẹp.</div>
        )}
      </div>

      <label className="block">
        <span className="text-xs text-stone-500">Hoặc gõ mã model</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          className="mt-1 w-full px-3 py-2 text-sm font-mono border border-stone-300 rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
        />
      </label>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${className}`}>{children}</span>;
}
