"use client";

import { useState } from "react";
// Biểu mẫu gắn nhãn sinh từ bảng mã (codebook) -> đổi bảng mã thì biểu mẫu tự đổi theo.
import { CURRENT_CODEBOOK, type CodebookField, type LabelValues } from "@/lib/ai/codebook";
import { useT } from "@/lib/i18n/client";

export type FormValues = Record<string, string | string[] | boolean | null>;

export const PURPOSE_FIELD = CURRENT_CODEBOOK.fields.find((f) => f.key === "purpose")! as Extract<CodebookField, { kind: "enum" }>;

export function labelOf(key: string, code: unknown): string {
  const f = CURRENT_CODEBOOK.fields.find((x) => x.key === key);
  if (!f || f.kind !== "enum") return String(code ?? "");
  return f.values.find((v) => v.code === code)?.label ?? String(code ?? "—");
}

/** Giá trị khởi tạo từ gợi ý AI (bỏ các trường ngoài bảng mã như reason). */
export function fromAi(ai: LabelValues | null | undefined): FormValues {
  const out: FormValues = {};
  for (const f of CURRENT_CODEBOOK.fields) {
    const v = ai?.[f.key];
    out[f.key] = v === undefined ? null : v; // null = chưa chấm
  }
  return out;
}

const chip = (on: boolean, tone: "violet" | "stone" | "red" = "violet") =>
  `px-3 py-1.5 rounded-lg border text-sm transition-colors ${
    on
      ? tone === "red"
        ? "bg-red-600 border-red-600 text-white"
        : tone === "stone"
          ? "bg-stone-800 border-stone-800 text-white"
          : "bg-violet-700 border-violet-700 text-white"
      : "bg-white border-stone-300 text-stone-700 hover:border-stone-500"
  }`;

function same(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x) => b.includes(x));
  return (a ?? null) === (b ?? null);
}

export default function LabelForm({
  values,
  onChange,
  ai,
  disabled,
}: {
  values: FormValues;
  onChange: (v: FormValues) => void;
  ai: LabelValues | null; // để đánh dấu chỗ người sửa khác AI
  disabled?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const set = (k: string, v: FormValues[string]) => onChange({ ...values, [k]: v });
  const filled = CURRENT_CODEBOOK.fields.filter((f) => f.key !== "purpose" && values[f.key] !== null && values[f.key] !== undefined).length;
  const unrelated = values.purpose === "UNRELATED";
  const differs = (k: string) => ai !== null && ai[k] !== undefined && !same(values[k], ai[k]);
  const mark = (k: string) => (differs(k) ? <span className="ml-2 text-[11px] font-semibold text-amber-700">{t("đã sửa so với AI")}</span> : null);

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-stone-800">
          {t(PURPOSE_FIELD.label)} <span className="text-red-600">*</span>
          {mark("purpose")}
        </p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PURPOSE_FIELD.values.map((v, i) => (
            <button
              key={v.code}
              type="button"
              onClick={() => set("purpose", v.code)}
              className={`text-left ${chip(values.purpose === v.code, v.code === "UNRELATED" ? "red" : "violet")}`}
            >
              <span className="inline-block w-5 text-xs opacity-70">{i + 1}</span>
              <span className="font-medium">{t(v.label)}</span>
              {v.hint && <span className={`block text-xs ml-5 ${values.purpose === v.code ? "opacity-80" : "text-stone-500"}`}>{t(v.hint)}</span>}
            </button>
          ))}
        </div>
      </div>

      {!unrelated && (
        <button type="button" onClick={() => setOpen((x) => !x)} className="w-full text-left text-sm border-t border-stone-200 pt-3 text-violet-700 font-medium">
          {t("{v0} Chi tiết theo bảng mã (không bắt buộc) · đã điền {filled}/{v2}", { v0: open ? "▾" : "▸", filled, v2: CURRENT_CODEBOOK.fields.length - 1 })}
        </button>
      )}
      {!unrelated && open && (
        <div className="space-y-3">
          <p className="text-xs text-stone-500">{t("Để \"—\" là chưa chấm (khác với \"Không\").")}</p>
          {CURRENT_CODEBOOK.fields
            .filter((f) => f.key !== "purpose")
            .map((f) => (
              <div key={f.key}>
                <p className="text-sm text-stone-800">
                  {t(f.label)}
                  {f.humanOnly && <span className="ml-2 text-[11px] text-stone-500">{t("(chỉ người chấm — AI không xem ảnh)")}</span>}
                  {mark(f.key)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {f.kind === "bool" &&
                    ([true, false, null] as const).map((b) => (
                      <button key={String(b)} type="button" className={chip(values[f.key] === b, "stone")} onClick={() => set(f.key, b)}>
                        {b === true ? t("Có") : b === false ? t("Không") : "—"}
                      </button>
                    ))}
                  {f.kind === "enum" && f.multi && (
                    <>
                      <button type="button" className={chip(values[f.key] === null || values[f.key] === undefined, "stone")} onClick={() => set(f.key, null)} title={t("Chưa chấm")}>
                        —
                      </button>
                      <button type="button" className={chip(Array.isArray(values[f.key]) && (values[f.key] as string[]).length === 0, "stone")} onClick={() => set(f.key, [])}>
                        {t("Không có")}
                      </button>
                    </>
                  )}
                  {f.kind === "enum" &&
                    f.values.map((v) => {
                      const cur = values[f.key];
                      const on = f.multi ? Array.isArray(cur) && cur.includes(v.code) : cur === v.code;
                      return (
                        <button
                          key={v.code}
                          type="button"
                          className={chip(on, "stone")}
                          title={t(v.hint)}
                          onClick={() => {
                            if (f.multi) {
                              const arr = Array.isArray(cur) ? cur : [];
                              set(f.key, on ? arr.filter((x) => x !== v.code) : [...arr, v.code]);
                            } else set(f.key, on ? null : v.code);
                          }}
                        >
                          {t(v.label)}
                        </button>
                      );
                    })}
                  {f.kind === "text_list" && (
                    <input
                      className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                      placeholder={f.hint ?? t("cách nhau bằng dấu phẩy")}
                      value={Array.isArray(values[f.key]) ? (values[f.key] as string[]).join(", ") : ""}
                      onChange={(e) =>
                        set(
                          f.key,
                          e.target.value
                            .split(",")
                            .map((s) => s.trimStart())
                            .filter((s, i, arr) => s !== "" || i === arr.length - 1),
                        )
                      }
                    />
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </fieldset>
  );
}
