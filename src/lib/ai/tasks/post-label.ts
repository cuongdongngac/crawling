// Tác vụ POST_LABEL: gắn nhãn một bài theo codebook hiện hành.
// Prompt sinh TỰ ĐỘNG từ codebook => đổi codebook thì prompt khớp theo.
// Sửa câu chữ prompt => tăng PROMPT_VERSION (post-label@2…) để nhãn cũ/mới tách bạch.
import type { ChatMessage } from "@/lib/ai/openrouter";
import { CURRENT_CODEBOOK, validateLabels, type Codebook, type LabelValues } from "@/lib/ai/codebook";
import { redactText } from "@/lib/ai/redact";
import type { AiTask } from "@/lib/ai/runner";

export const POST_LABEL_PROMPT_VERSION = "post-label@1";

function describe(cb: Codebook): string {
  return cb.fields
    .filter((f) => !f.humanOnly)
    .map((f) => {
      if (f.kind === "bool") return `- "${f.key}" (true/false): ${f.label}${f.hint ? ` — ${f.hint}` : ""}`;
      if (f.kind === "text_list") return `- "${f.key}" (mảng chuỗi): ${f.label}${f.hint ? ` — ${f.hint}` : ""}`;
      const vals = f.values.map((v) => `${v.code} = ${v.label}${v.hint ? ` (${v.hint})` : ""}`).join("; ");
      return `- "${f.key}" (${f.multi ? "mảng, có thể rỗng" : "một giá trị"}): ${f.label}. Giá trị: ${vals}`;
    })
    .join("\n");
}

export type PostLabelInput = { text: string; platform?: string | null; hashtags?: string[] };

export function buildPostLabelTask(cb: Codebook = CURRENT_CODEBOOK): AiTask<PostLabelInput> {
  const system = [
    "Bạn là trợ lý nghiên cứu y tế công cộng, gắn nhãn bài đăng mạng xã hội tiếng Việt về thuốc lá điện tử / thuốc lá nung nóng (sản phẩm bị cấm tại Việt Nam từ 2025).",
    "Chỉ dựa vào chữ trong bài. Không suy đoán danh tính người đăng. Thông tin liên hệ đã được che thành [SĐT], [LINK], [TÀI_KHOẢN] — coi đó là dấu hiệu có liên hệ.",
    "Từ lóng thường gặp có thể bị viết biến dạng, viết tắt, dùng emoji, hoặc ngụy trang (\"thanh lý\", \"pass đồ\").",
    "Trả về DUY NHẤT một đối tượng JSON với các khoá sau:",
    describe(cb),
    '- "confidence" (số 0–1): độ chắc chắn chung của bạn',
    '- "reason" (chuỗi ≤ 30 từ, tiếng Việt): lý do chính',
    "Nếu bài không liên quan thì purpose = UNRELATED, các tiêu chí = false, mảng rỗng.",
  ].join("\n");

  return {
    name: "POST_LABEL",
    codebook: cb,
    promptVersion: POST_LABEL_PROMPT_VERSION,
    json: true,
    build(input): ChatMessage[] {
      const tags = (input.hashtags ?? []).slice(0, 30).join(" ");
      const user = [
        `Nền tảng: ${input.platform ?? "không rõ"}`,
        tags ? `Hashtag: ${tags}` : "",
        "Nội dung bài:",
        '"""',
        redactText(input.text),
        '"""',
      ]
        .filter(Boolean)
        .join("\n");
      return [
        { role: "system", content: system },
        { role: "user", content: user },
      ];
    },
    parse(raw) {
      let obj: Record<string, unknown>;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        obj = JSON.parse(m ? m[0] : raw);
      } catch {
        return { output: null, confidence: null, error: "Model không trả JSON hợp lệ" };
      }
      const { labels, errors } = validateLabels(cb, obj, true);
      const c = Number(obj.confidence);
      const out: LabelValues & { reason?: string } = { ...labels };
      if (typeof obj.reason === "string") out.reason = obj.reason.slice(0, 300);
      return {
        output: out,
        confidence: Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : null,
        error: errors.length > 3 ? `Sai định dạng: ${errors.slice(0, 3).join("; ")}` : null,
      };
    },
  };
}
