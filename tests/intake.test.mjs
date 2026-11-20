// Standalone tests for Google Apps Script receiver, using deterministic mock services.
// Run: node --test tests/intake.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../apps-script/Code.gs", import.meta.url), "utf8");
let requestNumber = 0;
function valid(extra = {}) {
  requestNumber++;
  return {
    requestId: "abcdef0123456789-" + requestNumber,
    profile: "$EXAMPLE",
    rant: "Project promised locked liquidity, then withdrew it.",
    receipt: "https://example.org/tx/abc",
    attest: "yes",
    ...extra
  };
}
function harness() {
  const rows = [], cache = new Map(), props = new Map();
  const clock = {ms: Date.parse("2026-11-20T00:10:00Z")};
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.ms])); }
    static now() { return clock.ms; }
  }
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: () => ({
      setNumberFormat() { return this; },
      setValues(data) { rows.push(data[0]); return this; }
    }),
    setFrozenRows() {}
  };
  let lockHeld = false;
  const ctx = {
    console: {warn() {}, error() {}}, Math, Date: FakeDate, JSON, String, Number,
    HtmlService: {
      createHtmlOutput: html => ({html, setXFrameOptionsMode() { return this; }}),
      XFrameOptionsMode: {ALLOWALL: 1}
    },
    SpreadsheetApp: {getActiveSpreadsheet: () => ({getSheetByName: () => sheet}), flush() {}},
    PropertiesService: {getScriptProperties: () => ({
      getProperty: k => props.get(k) ?? null,
      setProperty(k, v) { props.set(k, v); }
    })},
    LockService: {getScriptLock: () => ({
      waitLock() { assert.equal(lockHeld, false); lockHeld = true; },
      releaseLock() { assert.equal(lockHeld, true); lockHeld = false; }
    })},
    CacheService: {getScriptCache: () => ({
      get: k => cache.get(k) ?? null,
      put(k, v) { cache.set(k, v); }
    })},
    Utilities: {formatDate: (date, zone, pattern) => {
      const day = date.toISOString().slice(0, 10).replace(/-/g, "");
      return pattern === "yyMMdd" ? day.slice(2) : day;
    }}
  };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  const post = params => {
    const html = ctx.doPost({parameter: params}).html;
    const match = html.match(/postMessage\((\{.*?\}),/);
    assert.ok(match, "Apps Script should return a structured acknowledgement");
    return JSON.parse(match[1].replace(/\\u003c/g, "<"));
  };
  const rateState = () => JSON.parse(props.get("AGENCY_RATE_COUNTERS") ?? "{}");
  return {post, rows, cache, props, clock, rateState};
}

test("valid project nomination persists one row with a case number", () => {
  const h = harness(), res = h.post(valid());
  assert.equal(res.ok, true);
  assert.match(res.caseId, /^KC-261120-/);
  assert.equal(h.rows.length, 1);
  assert.equal(h.rows[0][5], "PENDING REVIEW");
});

test("attestation is required on the backend", () => {
  const h = harness();
  assert.equal(h.post(valid({attest: ""})).ok, false);
  assert.equal(h.rows.length, 0);
});

test("obvious email, US phone, international phone and street address are rejected", () => {
  const rejected = [
    "Email me at dev@example.com for details",
    "Call 313-555-0123 now",
    "Please phone +13135550123",
    "Come to 123 Main Street tomorrow"
  ];
  for (const rant of rejected) {
    const h = harness();
    assert.equal(h.post(valid({rant})).ok, false, rant);
    assert.equal(h.rows.length, 0);
  }
});

test("email embedded in receipt URL is also rejected", () => {
  const h = harness();
  assert.equal(h.post(valid({receipt: "https://example.com/dev@example.com"})).ok, false);
});

test("contract addresses and non-contact project details are accepted", () => {
  for (const profile of [
    "0x1234567890123456789012345678901234567890",
    "9xQeWvG816bUx9EPfGp3SXGNE6u8VTA9cbm2UfbfUys",
    "$TEST"
  ]) {
    const h = harness();
    assert.equal(h.post(valid({profile})).ok, true, profile);
  }
});

test("honeypot blocks submissions without consuming the rate counter", () => {
  const h = harness();
  assert.equal(h.post(valid({website: "bot"})).ok, false);
  assert.equal(h.rows.length, 0);
  assert.equal(h.rateState().dayCount, undefined);
});

test("same request ID returns original case without a second row or counter", () => {
  const h = harness(), req = valid();
  const a = h.post(req), b = h.post(req);
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.equal(a.caseId, b.caseId);
  assert.equal(h.rows.length, 1);
  assert.equal(h.rateState().dayCount, 1);
});

test("per-project throttle prevents one repeatedly named target exhausting all slots", () => {
  const h = harness(); let accepted = 0;
  for (let i = 0; i < 15; i++) if (h.post(valid()).ok) accepted++;
  assert.equal(accepted, 8);
  assert.equal(h.rows.length, 8);
});

test("global ten-minute cap is enforced even when target names rotate", () => {
  const h = harness(); let accepted = 0;
  for (let i = 0; i < 45; i++) if (h.post(valid({profile: "$TOKEN" + i})).ok) accepted++;
  assert.equal(accepted, 30);
  assert.equal(h.rateState().windowCount, 30);
});

test("new ten-minute window resets burst cap but preserves day count", () => {
  const h = harness();
  for (let i = 0; i < 30; i++) assert.equal(h.post(valid({profile: "$P" + i})).ok, true);
  h.clock.ms += 600000;
  assert.equal(h.post(valid({profile: "$NEW"})).ok, true);
  assert.equal(h.rateState().dayCount, 31);
  assert.equal(h.rateState().windowCount, 1);
});

test("300-per-UTC-day ceiling persists beyond six hours and cache loss", () => {
  const h = harness();
  for (let w = 0; w < 10; w++) {
    for (let i = 0; i < 30; i++) {
      assert.equal(h.post(valid({profile: "$T" + w + "X" + i})).ok, true);
    }
    h.clock.ms += 600000;
  }
  assert.equal(h.rateState().dayCount, 300);
  h.cache.clear(); // simulate eviction of the volatile response cache
  h.clock.ms += 7 * 60 * 60000;
  assert.equal(h.post(valid({profile: "$AFTER"})).ok, false);
  assert.equal(h.rows.length, 300);
});

test("the next UTC day resets the daily ceiling", () => {
  const h = harness();
  h.post(valid());
  h.clock.ms = Date.parse("2026-11-21T00:01:00Z");
  assert.equal(h.post(valid()).ok, true);
  assert.equal(h.rateState().day, "20261121");
  assert.equal(h.rateState().dayCount, 1);
});

test("sheet formula payloads are neutralized", () => {
  const h = harness();
  assert.equal(h.post(valid({rant: "=IMPORTXML(1,2) is what this project did"})).ok, true);
  assert.equal(h.rows[0][3].startsWith("'="), true);
});
