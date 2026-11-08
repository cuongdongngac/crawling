"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang } from "@/lib/i18n";

/** Lưu ngôn ngữ giao diện (cookie 1 năm). Không cần đăng nhập. */
export async function setLang(lang: string) {
  const c = await cookies();
  c.set(LANG_COOKIE, normalizeLang(lang), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
