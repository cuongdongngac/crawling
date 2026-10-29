"use client";

import { useState } from "react";
import { updateProfileInfo } from "@/app/actions/user";

export default function ProfileInfoForm({
  userId,
  initialName,
  initialProvince,
}: {
  userId: string;
  initialName: string | null;
  initialProvince: string | null;
}) {
  const [name, setName] = useState(initialName ?? "");
  const [province, setProvince] = useState(initialProvince ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateProfileInfo(userId, name, province);
    setBusy(false);
    setMsg(res && "error" in res && res.error ? "Lỗi: " + res.error : "Đã lưu.");
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
      <label className="text-sm sm:col-span-1">
        <span className="block font-semibold text-stone-800 mb-1">Họ tên</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg" />
      </label>
      <label className="text-sm">
        <span className="block font-semibold text-stone-800 mb-1">Tỉnh</span>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white">
          <option value="">(chưa gán)</option>
          <option value="HUNG_YEN">Hưng Yên</option>
          <option value="DONG_THAP">Đồng Tháp</option>
          <option value="CENTRAL">Trung ương (VPHA)</option>
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-50">
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
        {msg && <span className="text-xs text-stone-600">{msg}</span>}
      </div>
    </div>
  );
}
