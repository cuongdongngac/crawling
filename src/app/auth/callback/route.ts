import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getServiceClient } from "@/lib/auth/guards";

// Chỉ cho phép redirect nội bộ, tránh open redirect qua tham số ?next=
function safeNext(next: string | null): string {
    if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
    return next;
}

export async function GET(req: NextRequest) {
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get("code");
    const next = safeNext(searchParams.get("next"));

    if (!code) {
        return NextResponse.redirect(new URL("/login?error=oauth", origin));
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
        return NextResponse.redirect(new URL("/login?error=oauth", origin));
    }

    // Chốt chặn: chỉ tài khoản do quản trị viên tạo trước (đã có dòng trong profiles)
    // mới được vào. Không cho tự đăng ký.
    const { data: profile } = await getServiceClient()
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

    if (!profile) {
        await supabase.auth.signOut();
        // Google vừa tự tạo auth user mới -> dọn để không tồn đọng tài khoản rác.
        // Chỉ xoá khi tài khoản vừa được tạo (tránh xoá nhầm tài khoản cũ thiếu hồ sơ).
        const justCreated = Date.now() - new Date(data.user.created_at).getTime() < 2 * 60 * 1000;
        if (justCreated) {
            await getServiceClient().auth.admin.deleteUser(data.user.id).catch(() => { });
        }
        return NextResponse.redirect(new URL("/login?error=not_invited", origin));
    }

    return NextResponse.redirect(new URL(next, origin));
}
