import { parseNumber } from "./format.js";
import { fail } from "./validate.js";
import { solveLinear } from "./matrix.js";

const GROUND = new Set(["0", "gnd", "GND", "g"]);

export function parseNetlist(text, key = "net") {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.replace(/[#;].*$/, "").trim()).filter(Boolean);
  if (!lines.length) fail("Masukkan elemen rangkaian, satu elemen per baris.", key);
  if (lines.length > 60) fail("Jumlah maksimum elemen adalah 60.", key);
  const els = [];
  const names = new Set();
  lines.forEach((line, i) => {
    const p = line.split(/[\s,،]+/);
    const where = `Baris ${i + 1} («${line}»)`;
    if (p.length !== 4) fail(`${where}: Format harus: nama simpul1 simpul2 nilai.`, key);
    const [name, a, b, vs] = p;
    const kind = name[0].toUpperCase();
    if (!"RVI".includes(kind)) fail(`${where}: Nama elemen harus diawali R, V, atau I.`, key);
    if (names.has(name.toUpperCase())) fail(`${where}: Nama ${name} duplikat.`, key);
    names.add(name.toUpperCase());
    if (a === b) fail(`${where}: Kedua ujung elemen berada pada simpul yang sama.`, key);
    const value = parseNumber(vs);
    if (!isFinite(value)) fail(`${where}: Nilai «${vs}» bukan angka yang valid.`, key);
    if (kind === "R" && !(value > 0)) fail(`${where}: Resistansi harus lebih besar dari nol (gunakan sumber tegangan 0 untuk merepresentasikan hubung singkat).`, key);
    els.push({ name, kind, a: GROUND.has(a) ? "0" : a, b: GROUND.has(b) ? "0" : b, value });
  });
  return els;
}

export function nodesOf(els) {
  const set = [];
  for (const e of els) for (const n of [e.a, e.b]) if (n !== "0" && !set.includes(n)) set.push(n);
  return set.sort((x, y) => (isFinite(x) && isFinite(y) ? Number(x) - Number(y) : x < y ? -1 : 1));
}

export function solveMNA(els, key = "net") {
  if (!els.some((e) => e.a === "0" || e.b === "0")) fail("Rangkaian memerlukan simpul ground bernama 0 (atau gnd).", key);
  const nodes = nodesOf(els);
  const vs = els.filter((e) => e.kind === "V");
  const n = nodes.length, m = vs.length, size = n + m;
  if (size === 0) fail("Rangkaian tidak memiliki simpul selain ground.", key);
  const A = Array.from({ length: size }, () => new Array(size).fill(0));
  const z = new Array(size).fill(0);
  const idx = (node) => (node === "0" ? -1 : nodes.indexOf(node));
  for (const e of els) {
    const i = idx(e.a), j = idx(e.b);
    if (e.kind === "R") {
      const g = 1 / e.value;
      if (i >= 0) A[i][i] += g;
      if (j >= 0) A[j][j] += g;
      if (i >= 0 && j >= 0) { A[i][j] -= g; A[j][i] -= g; }
    } else if (e.kind === "I") {
      if (i >= 0) z[i] -= e.value;
      if (j >= 0) z[j] += e.value;
    }
  }
  vs.forEach((e, k) => {
    const r = n + k, i = idx(e.a), j = idx(e.b);
    if (i >= 0) { A[i][r] += 1; A[r][i] += 1; }
    if (j >= 0) { A[j][r] -= 1; A[r][j] -= 1; }
    z[r] = e.value;
  });
  const res = solveLinear(A, z);
  if (res.rankA < size) fail("Rangkaian tidak dapat diselesaikan: ada simpul yang terisolasi dari ground, atau loop sumber tegangan, atau sumber arus tanpa jalur.", key);
  const x = res.R.slice(0, size).map((r) => r[size]);
  const V = { 0: 0 };
  nodes.forEach((nd, k) => { V[nd] = x[k]; });
  const branches = els.map((e) => {
    const vab = V[e.a] - V[e.b];
    let i;
    if (e.kind === "R") i = vab / e.value;
    else if (e.kind === "V") i = x[n + vs.indexOf(e)];
    else i = e.value;
    return { ...e, v: vab, i, p: vab * i };
  });
  return { nodes, V, branches, A, z, x, n, m };
}

export function kclResiduals(sol) {
  const out = {};
  for (const nd of sol.nodes) out[nd] = 0;
  for (const b of sol.branches) {
    if (b.a !== "0") out[b.a] += b.i;
    if (b.b !== "0") out[b.b] -= b.i;
  }
  return out;
}

export function netlistText(els) {
  return els.map((e) => `${e.name} ${e.a} ${e.b} ${e.value}`).join("\n");
}
