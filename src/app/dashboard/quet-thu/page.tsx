import HelpLink from "@/components/HelpLink";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import TestScanner from "@/components/TestScanner";
import { SCAN_ACTORS } from "@/lib/scrapers/catalog";

export default async function QuetThuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Chỉ ĐỌC danh mục hashtag để đánh dấu hashtag nào đã có / mới. Không ghi gì.
  const { data: tags } = await supabase.from("hashtags").select("hashtag_text");
  const knownHashtags = (tags || [])
    .map((t: { hashtag_text: string | null }) => String(t.hashtag_text || "").replace(/^#+/, "").toLowerCase())
    .filter(Boolean);

  const actors = SCAN_ACTORS.map((a) => ({
    id: a.id,
    label: a.label,
    platform: a.platform,
    maxPerKeyword: a.maxPerKeyword,
    minPerKeyword: a.minPerKeyword,
    perKeywordFixed: a.perKeywordFixed,
    capabilities: a.capabilities,
    defaultPerKeyword: a.defaultPerKeyword,
    estUsdPerItem: a.estUsdPerItem,
    note: a.note,
  }));

  return (
    <div className="p-4 md:p-8 bg-stone-50 min-h-full">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <div className="shrink-0 inline-flex items-center justify-center w-11 h-11 bg-emerald-600 rounded-xl text-white shadow-sm">
            <Radar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Quét thử</h1>
            <p className="text-sm text-stone-500 mt-1">
              Quét bằng API key Apify của bạn, xem và đánh giá kết quả, xuất Excel. Kết quả{" "}
              <strong>không</strong> ghi vào cơ sở dữ liệu của dự án.
            </p>
            <HelpLink slug="cong-tac-vien/quet-thu" label="Hướng dẫn quét thử" className="mt-1" />
          </div>
        </div>
        <TestScanner actors={actors} knownHashtags={knownHashtags} />
      </div>
    </div>
  );
}
