"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/client";

export type ActivityRow = {
  userId: string;
  email: string;
  fullName: string | null;
  province: string | null;
  scans: number;
  postsScanned: number;
  postsVi: number;
  newHashtagsSeen: number;
  costUsd: number;
  proposals: number;
  approved: number;
  approvedFirst: number;
  rejected: number;
  avgCrit: number | null;
};

export type LogRow = {
  id: number;
  who: string;
  actorId: string;
  keywords: string[];
  startedAt: string;
  postsTotal: number | null;
  postsVi: number | null;
  newHashtags: number;
  costUsd: number | null;
  exports: number;
};

const PROVINCE: Record<string, string> = { CENTRAL: "Trung ương", HUNG_YEN: "Hưng Yên", DONG_THAP: "Đồng Tháp" };
const fmtN = (v: number | null | undefined, locale: string) => (v === null || v === undefined ? "–" : v.toLocaleString(locale));

export default function ActivityBoard({ month, rows, logs }: { month: string; rows: ActivityRow[]; logs: LogRow[] }) {
  const t = useT();
  const locale = useLocale();
  const n = (v: number | null | undefined) => fmtN(v, locale);
  const router = useRouter();
  const [province, setProvince] = useState("");

  const list = useMemo(
    () =>
      rows
        .filter((r) => !province || (province === "NONE" ? !r.province : r.province === province))
        .sort((a, b) => b.approvedFirst - a.approvedFirst || b.approved - a.approved || b.proposals - a.proposals || b.scans - a.scans),
    [rows, province],
  );

  async function exportExcel() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("exceljs");
    const ExcelJS = mod.default ?? mod;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(t("Tháng {month}", { month }), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: t("Họ tên"), key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      { header: t("Tỉnh"), key: "province", width: 12 },
      { header: t("Đề xuất được duyệt (sớm nhất)"), key: "approvedFirst", width: 16 },
      { header: t("Đề xuất được duyệt"), key: "approved", width: 12 },
      { header: t("Số phiếu đề xuất"), key: "proposals", width: 12 },
      { header: t("Bị từ chối / trùng"), key: "rejected", width: 12 },
      { header: t("Điểm ba tiêu chí TB"), key: "avgCrit", width: 12 },
      { header: t("Số lần quét thử"), key: "scans", width: 12 },
      { header: t("Số bài quét"), key: "postsScanned", width: 12 },
      { header: t("Bài tiếng Việt"), key: "postsVi", width: 12 },
      { header: t("Hashtag mới thấy"), key: "newHashtagsSeen", width: 12 },
      { header: t("Chi phí Apify (USD, tài khoản cá nhân)"), key: "costUsd", width: 14 },
    ];
    list.forEach((r) =>
      ws.addRow({
        ...r,
        name: r.fullName ?? "",
        province: r.province ? t(PROVINCE[r.province] ?? r.province) : "",
        costUsd: Math.round(r.costUsd * 1000) / 1000,
      }),
    );
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { wrapText: true, vertical: "top" };
    const wl = wb.addWorksheet(t("Nhật ký quét thử"));
    wl.columns = [
      { header: t("Thời điểm"), key: "t", width: 20 },
      { header: t("Người quét"), key: "who", width: 26 },
      { header: t("Công cụ"), key: "actor", width: 32 },
      { header: t("Từ khóa"), key: "kw", width: 30 },
      { header: t("Số bài"), key: "p", width: 10 },
      { header: t("Bài tiếng Việt"), key: "vi", width: 12 },
      { header: t("Hashtag mới"), key: "nh", width: 12 },
      { header: t("Chi phí (USD)"), key: "c", width: 12 },
      { header: t("Lần xuất Excel"), key: "e", width: 12 },
    ];
    logs.forEach((l) =>
      wl.addRow({
        t: new Date(l.startedAt).toLocaleString(locale),
        who: l.who,
        actor: l.actorId,
        kw: l.keywords.join(", "),
        p: l.postsTotal,
        vi: l.postsVi,
        nh: l.newHashtags,
        c: l.costUsd,
        e: l.exports,
      }),
    );
    wl.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = `hoat-dong-cong-tac-vien_${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const th = "py-2 px-2 text-right font-semibold";
  const td = "py-2 px-2 text-right tabular-nums";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-semibold text-stone-800 mb-1">{t("Tháng")}</span>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && router.push(`/dashboard/hoat-dong?thang=${e.target.value}`)}
            className="px-3 py-2 border border-stone-300 rounded-lg bg-white"
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-stone-800 mb-1">{t("Tỉnh")}</span>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="px-3 py-2 border border-stone-300 rounded-lg bg-white">
            <option value="">{t("Tất cả")}</option>
            <option value="HUNG_YEN">{t("Hưng Yên")}</option>
            <option value="DONG_THAP">{t("Đồng Tháp")}</option>
            <option value="CENTRAL">{t("Trung ương")}</option>
            <option value="NONE">{t("Chưa gán tỉnh")}</option>
          </select>
        </label>
        <button
          onClick={exportExcel}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm"
        >
          <Download className="w-4 h-4" /> {t("Xuất Excel")}
        </button>
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
            <tr>
              <th className="py-2 px-3 text-left font-semibold">{t("Cộng tác viên")}</th>
              <th className="py-2 px-2 text-left font-semibold">{t("Tỉnh")}</th>
              <th className={th + " bg-amber-50"} title={t("Được duyệt và là người đề xuất từ đó sớm nhất")}>{t("Duyệt (sớm nhất)")}</th>
              <th className={th}>{t("Duyệt")}</th>
              <th className={th}>{t("Phiếu")}</th>
              <th className={th}>{t("Từ chối/trùng")}</th>
              <th className={th}>{t("Điểm TB")}</th>
              <th className={th}>{t("Lần quét")}</th>
              <th className={th}>{t("Bài quét")}</th>
              <th className={th}>{t("Bài tiếng Việt")}</th>
              <th className={th}>{t("Hashtag mới thấy")}</th>
              <th className={th}>{t("Chi phí")}</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={12} className="py-6 text-center text-stone-500">
                  {t("Chưa có dữ liệu.")}
                </td>
              </tr>
            )}
            {list.map((r) => {
              const idle = r.scans === 0 && r.proposals === 0;
              return (
                <tr key={r.userId} className={"border-b border-stone-100 " + (idle ? "text-stone-400" : "")}>
                  <td className="py-2 px-3">
                    <div className="font-medium text-stone-900">{r.fullName || r.email}</div>
                    {r.fullName && <div className="text-xs text-stone-500">{r.email}</div>}
                  </td>
                  <td className="py-2 px-2">{r.province ? t(PROVINCE[r.province] ?? r.province) : <span className="text-amber-700 text-xs">{t("chưa gán")}</span>}</td>
                  <td className={td + " bg-amber-50 font-bold"}>{n(r.approvedFirst)}</td>
                  <td className={td}>{n(r.approved)}</td>
                  <td className={td}>{n(r.proposals)}</td>
                  <td className={td}>{n(r.rejected)}</td>
                  <td className={td}>{r.avgCrit === null ? "–" : r.avgCrit.toFixed(1)}</td>
                  <td className={td}>{n(r.scans)}</td>
                  <td className={td}>{n(r.postsScanned)}</td>
                  <td className={td}>{n(r.postsVi)}</td>
                  <td className={td}>{n(r.newHashtagsSeen)}</td>
                  <td className={td}>{r.costUsd ? r.costUsd.toFixed(2) + " $" : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
        <h2 className="font-bold text-stone-900 mb-3">{t("Nhật ký quét thử trong tháng ({length})", { length: logs.length })}</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-500">{t("Chưa có lần quét nào.")}</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {logs.slice(0, 100).map((l) => (
              <li key={l.id} className="py-2 flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="text-stone-500 w-36 shrink-0">{new Date(l.startedAt).toLocaleString(locale)}</span>
                <span className="font-medium">{l.who}</span>
                <span className="text-stone-500">{l.actorId.includes("tiktok") ? "TikTok" : "Facebook"}</span>
                <span className="text-stone-700">{l.keywords.join(", ")}</span>
                <span className="ml-auto text-stone-500 tabular-nums">
                  {l.postsTotal === null ? t("chưa tải kết quả") : t("{v0} bài · {v1} tiếng Việt · {newHashtags} hashtag mới", { v0: n(l.postsTotal), v1: n(l.postsVi), newHashtags: l.newHashtags })}
                  {l.costUsd ? ` · ${l.costUsd.toFixed(3)} $` : ""}
                  {l.exports ? t(" · xuất {exports} lần", { exports: l.exports }) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
