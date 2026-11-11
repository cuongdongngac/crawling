"use strict";
// Chạy: node --test scripts/worker-content-cluster.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { clusterKey } = require("./lib/content-cluster.cjs");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test("cùng nội dung -> cùng cụm, khác nội dung -> khác cụm", () => {
  const a = clusterKey("Pod mini đủ màu, giao toàn quốc #pod");
  const b = clusterKey("Pod mini đủ màu, giao toàn quốc #pod");
  const c = clusterKey("Hoàn toàn khác");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, UUID_RE);
});

test("không phân biệt hoa/thường và khoảng trắng thừa", () => {
  assert.equal(clusterKey("  Giá TỐT  ib "), clusterKey("giá tốt ib"));
});

test("caption rỗng -> null (không gom)", () => {
  assert.equal(clusterKey(""), null);
  assert.equal(clusterKey("   "), null);
  assert.equal(clusterKey(null), null);
});
