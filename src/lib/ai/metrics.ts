// ==========================================================
// Đo độ tin cậy của AI so với người / đáp án (thuần tính toán, không gọi DB).
// "Liên quan" = purpose khác UNRELATED. Dương tính = bài liên quan (bài cần giữ để đo và phân tích).
//   Độ nhạy  = AI giữ được bao nhiêu % bài thật sự liên quan (thấp => AI bỏ sót bài thật).
//   Độ đặc hiệu = AI loại đúng bao nhiêu % bài thật sự không liên quan.
// ==========================================================
import type { Codebook, LabelValues } from "@/lib/ai/codebook";

export type Pair = { ai: LabelValues | null; ref: LabelValues | null };

export type BinaryStats = {
  n: number;
  tp: number; fp: number; tn: number; fn: number;
  accuracy: number | null;
  accuracyLow: number | null; // cận dưới khoảng tin cậy 95% (Wilson)
  sensitivity: number | null;
  specificity: number | null;
  kappa: number | null;
};

export type FieldAgreement = { key: string; label: string; n: number; agree: number; rate: number | null };

export type PairStats = {
  relevance: BinaryStats;
  purpose: { n: number; agree: number; accuracy: number | null; kappa: number | null; confusion: Record<string, Record<string, number>> };
  fields: FieldAgreement[];
};

export function wilsonLow(k: number, n: number, z = 1.96): number | null {
  if (!n) return null;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return (c - m) / d;
}

function cohenKappa(rows: [string, string][]): number | null {
  const n = rows.length;
  if (n < 2) return null;
  const cats = Array.from(new Set(rows.flat()));
  const po = rows.filter(([a, b]) => a === b).length / n;
  let pe = 0;
  for (const c of cats) pe += (rows.filter(([a]) => a === c).length / n) * (rows.filter(([, b]) => b === c).length / n);
  if (pe >= 1) return po === 1 ? 1 : null;
  return (po - pe) / (1 - pe);
}

const purposeOf = (l: LabelValues | null) => (l && typeof l.purpose === "string" ? l.purpose : null);

export function computePairStats(cb: Codebook, pairs: Pair[]): PairStats {
  const valid = pairs.filter((p) => purposeOf(p.ai) && purposeOf(p.ref));
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const confusion: Record<string, Record<string, number>> = {};
  const purposeRows: [string, string][] = [];
  for (const p of valid) {
    const a = purposeOf(p.ai)!, r = purposeOf(p.ref)!;
    const aRel = a !== "UNRELATED", rRel = r !== "UNRELATED";
    if (aRel && rRel) tp++;
    else if (aRel && !rRel) fp++;
    else if (!aRel && !rRel) tn++;
    else fn++;
    confusion[r] ??= {};
    confusion[r][a] = (confusion[r][a] ?? 0) + 1;
    purposeRows.push([a, r]);
  }
  const n = valid.length;
  const ok = tp + tn;
  const relevance: BinaryStats = {
    n, tp, fp, tn, fn,
    accuracy: n ? ok / n : null,
    accuracyLow: wilsonLow(ok, n),
    sensitivity: tp + fn ? tp / (tp + fn) : null,
    specificity: tn + fp ? tn / (tn + fp) : null,
    kappa: cohenKappa(valid.map((p) => [purposeOf(p.ai) === "UNRELATED" ? "U" : "R", purposeOf(p.ref) === "UNRELATED" ? "U" : "R"])),
  };
  const pAgree = purposeRows.filter(([a, b]) => a === b).length;

  // Các trường còn lại: chỉ so khi cả hai bên đều có giá trị; mảng so đúng tập hợp
  const fields: FieldAgreement[] = [];
  for (const f of cb.fields) {
    if (f.key === "purpose" || f.humanOnly || f.kind === "text_list") continue;
    let m = 0, agree = 0;
    for (const p of valid) {
      const a = p.ai?.[f.key], r = p.ref?.[f.key];
      if (a === null || a === undefined || r === null || r === undefined) continue;
      m++;
      const same = Array.isArray(a) && Array.isArray(r) ? a.length === r.length && a.every((x) => r.includes(x)) : a === r;
      if (same) agree++;
    }
    fields.push({ key: f.key, label: f.label, n: m, agree, rate: m ? agree / m : null });
  }
  return { relevance, purpose: { n, agree: pAgree, accuracy: n ? pAgree / n : null, kappa: cohenKappa(purposeRows), confusion }, fields };
}

/** Kết luận so với ngưỡng dùng AI trong hồ sơ (độ chính xác >= 85%). */
export function thresholdVerdict(s: BinaryStats, threshold = 0.85, minN = 50): { level: "PASS" | "LIKELY" | "FAIL" | "TOO_FEW"; text: string } {
  if (s.n < minN || s.accuracy === null) return { level: "TOO_FEW", text: `Chưa đủ mẫu (cần ít nhất ${minN} bài, đang có ${s.n}).` };
  if ((s.accuracyLow ?? 0) >= threshold) return { level: "PASS", text: `Đạt ngưỡng ${Math.round(threshold * 100)}%, kể cả khi tính sai số mẫu.` };
  if (s.accuracy >= threshold) return { level: "LIKELY", text: `Đạt ${Math.round(threshold * 100)}% theo số đo, nhưng mẫu còn nhỏ: chưa loại được khả năng thật sự thấp hơn ngưỡng.` };
  return { level: "FAIL", text: `Chưa đạt ngưỡng ${Math.round(threshold * 100)}%: tiếp tục để người xác minh, xem các ca AI sai để sửa câu lệnh hoặc đổi model.` };
}
