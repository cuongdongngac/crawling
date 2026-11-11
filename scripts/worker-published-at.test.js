"use strict";
// Chạy: node --test scripts/worker-published-at.test.js
// Giữ hành vi: ngày đăng thiếu/sai không được âm thầm thành "bây giờ".
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolvePublishedAt } = require("./lib/resolve-published-at.cjs");

test("chuỗi ISO hợp lệ được giữ nguyên", () => {
  const r = resolvePublishedAt("2026-10-15T08:30:00.000Z");
  assert.equal(r.valid, true);
  assert.equal(r.iso, "2026-10-15T08:30:00.000Z");
});

test("null/undefined/rỗng/chuỗi rác -> fallback now + invalid", () => {
  const before = Date.now();
  for (const bad of [null, undefined, "", "   ", "not-a-date", "2026-13-99"]) {
    const r = resolvePublishedAt(bad);
    assert.equal(r.valid, false, JSON.stringify(bad));
    const t = new Date(r.iso).getTime();
    assert.ok(t >= before && t <= Date.now() + 5000, JSON.stringify(bad));
  }
});

test("số epoch mili-giây -> chuẩn hóa ISO + valid", () => {
  const r = resolvePublishedAt(1729000000000);
  assert.equal(r.valid, true);
  assert.equal(r.iso, new Date(1729000000000).toISOString());
});
