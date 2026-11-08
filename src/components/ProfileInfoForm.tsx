"use client";

import { useState } from "react";
import { updateProfileInfo } from "@/app/actions/user";
import { useT } from "@/lib/i18n/client";

export default function ProfileInfoForm({
  userId,
  initialName,
  initialProvince,
}: {
  userId: string;
  initialName: string | null;
  initialProvince: string | null;
}) {
  const t = useT();
  const [name, setName] = useState(initialName ?? "");
  const [province, setProvince] = useState(initialProvince ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateProfileInfo(userId, name, province);
    setBusy(false);
    setMsg(res && "error" in res && res.error ? t("Lỗi: ") + res.error : t("Đã lưu."));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <label className="text-sm sm:col-span-1">
        <span className="block font-semibold text-stone-800 mb-1">{t("Họ tên")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg" />
      </label>
      <label className="text-sm">
        <span className="block font-semibold text-stone-800 mb-1">{t("Tỉnh")}</span>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white">
          <option value="">{t("(chưa gán)")}</option>
          <option value="HUNG_YEN">{t("Hưng Yên")}</option>
          <option value="DONG_THAP">{t("Đồng Tháp")}</option>
          <option value="CENTRAL">{t("Trung ương (VPHA)")}</option>
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50">
          {busy ? t("Đang lưu…") : t("Lưu")}
        </button>
        {msg && <span className="text-xs text-stone-600">{t(msg)}</span>}
      </div>
    </div>
  );
}
