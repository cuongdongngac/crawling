"use strict";
/*
 * Cụm nội dung (lớp 3 của khử trùng lặp: ID -> nguồn đề xuất -> nội dung).
 * Mức khung: gom các bài có caption GIỐNG HỆT nhau (sau chuẩn hóa chữ thường +
 * khoảng trắng) về cùng một content_cluster_id để nhận diện seeding/bot (DEC-004).
 * So khớp mờ (similarity > 0.9) để nhóm phân tích làm sau khi có dữ liệu.
 * ID có dạng UUID xác định từ hash để vừa cột posts.content_cluster_id (uuid).
 */
const crypto = require("node:crypto");

function clusterKey(rawText) {
  const norm = String(rawText || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  if (!norm) return null;
  const hex = crypto.createHash("sha256").update(norm, "utf8").digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

module.exports = { clusterKey };
