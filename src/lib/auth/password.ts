/**
 * Mật khẩu ngẫu nhiên cho tài khoản đăng nhập bằng Google.
 *
 * Supabase bắt buộc phải có mật khẩu khi tạo user, nhưng hệ thống đăng nhập
 * hoàn toàn bằng Google nên mật khẩu này không ai dùng tới.
 */
export function randomPassword(len = 24): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
