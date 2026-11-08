import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, normalizeLang, type Lang, type TFn } from "./index";

/** Ngôn ngữ giao diện của người đang xem (cookie "lang"; mặc định tiếng Việt). */
export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return normalizeLang(c.get(LANG_COOKIE)?.value);
}

/** Hàm dịch cho Server Component: const t = await getT(); */
export async function getT(): Promise<TFn> {
  return makeT(await getLang());
}
