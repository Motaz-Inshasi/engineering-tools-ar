import assert from "node:assert/strict";
import { copyText } from "../../assets/js/ui.js";

export function close(actual, expected, rel = 1e-9, msg = "") {
  const ok = actual === expected || Math.abs(actual - expected) <= Math.max(1e-12, rel * Math.max(Math.abs(actual), Math.abs(expected)));
  assert.ok(ok, `${msg} expected ${expected}, got ${actual}`);
}

export function throwsInput(fn, field) {
  assert.throws(fn, (e) => {
    assert.equal(e.name, "InputError", `expected InputError, got ${e.name}: ${e.message}`);
    assert.match(e.message, /[؀-ۿ]/);
    if (field) assert.equal(e.field, field);
    return true;
  });
}

export function rng(seed = 12345) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function resultValue(res, labelPart) {
  const r = res.results.find((x) => x.label.includes(labelPart));
  assert.ok(r, `no result with label containing «${labelPart}»: ${res.results.map((x) => x.label).join(" | ")}`);
  return r.value;
}

export function checkExample(mod) {
  const res = mod.solve(mod.meta.example.values);
  const text = copyText(res);
  for (const e of mod.meta.example.expect) assert.ok(text.includes(e), `example output should contain «${e}» but was:\n${text}`);
  assert.throws(() => mod.solve(mod.meta.invalid.values), (e) => e.name === "InputError");
  assert.ok(res.steps && res.steps.length > 0, "steps required");
  return res;
}

export { assert };
