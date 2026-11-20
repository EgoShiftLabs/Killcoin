import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");

test("homepage HTML is under 80 KB, with zero embedded WebP images", () => {
  assert.ok(Buffer.byteLength(html, "utf8") < 80000);
  assert.ok(!html.includes("data:image/webp;base64,"));
});

test("all referenced same-origin media files exist with actual WebP headers", () => {
  const imageRefs = [...html.matchAll(/\.\/assets\/(?:media|operatives)\/[\w-]+\.webp/g)].map(m=>m[0]);
  // 23 references were converted from inline data; 3 recruitment images were already external.
  assert.equal(imageRefs.length, 26);
  const unique = [...new Set(imageRefs)];
  assert.equal(unique.length, 18);
  for (const ref of unique) {
    const full = path.join(root, ref);
    assert.ok(existsSync(full), "Missing: " + ref);
    const bytes = readFileSync(full);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF", ref);
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP", ref);
  }
});

test("the original three lead operative image paths are reused", () => {
  for (const name of ["blackout","vesper","sable"]) {
    assert.ok(html.includes("./assets/operatives/" + name + ".webp"), name);
  }
});

test("dossier JS images point to the same assets as their visible cards", () => {
  for (const slug of ["doge","frog","kols","deployers"]) {
    assert.ok(html.includes("./assets/media/dossier-" + slug + ".webp"), slug);
  }
});

test("all inline JavaScript blocks remain syntactically valid", () => {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(x=>x.trim());
  assert.ok(blocks.length >= 1);
  for (const source of blocks) assert.doesNotThrow(() => new vm.Script(source));
});
