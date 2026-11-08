"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LANG, localeOf, makeT, type Lang, type TFn } from "./index";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Đặt ở layout gốc; ngôn ngữ đọc từ cookie phía máy chủ nên không lệch khi hydrate. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** Hàm dịch cho Client Component: const t = useT(); */
export function useT(): TFn {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

/** Locale cho toLocaleString / Intl theo ngôn ngữ giao diện ("vi-VN" | "en-GB"). */
export function useLocale(): string {
  return localeOf(useLang());
}
