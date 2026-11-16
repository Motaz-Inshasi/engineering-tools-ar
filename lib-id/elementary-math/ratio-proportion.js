import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "Sederhanakan rasio menjadi bilangan bulat dalam bentuk paling sederhana, selesaikan proporsi a/b = c/d untuk mencari suku yang tidak diketahui, bagi suatu jumlah sesuai rasio yang diberikan, dan selesaikan soal proporsi langsung dan terbalik dengan langkah-langkahnya.",
  keywords: ["rasio", "proporsi", "ratio", "proportion", "pembagian sesuai rasio", "proporsi langsung", "proporsi terbalik", "menyelesaikan proporsi"],
  formulas: [
    { label: "Proporsi langsung", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "Proporsi terbalik", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "Proporsi a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "Jenis soal", type: "select", default: "simplify", options: [["simplify", "Sederhanakan rasio menjadi bilangan bulat"], ["solve", "Selesaikan proporsi a/b = c/d (suku tidak diketahui)"], ["divide", "Bagi suatu jumlah sesuai rasio yang diberikan"], ["direct", "proporsi langsung"], ["inverse", "proporsi terbalik"]] },
    { id: "ratio", label: "Rasio a:b(:c)", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "Dari 2 sampai 5 bagian dipisahkan titik dua, dan boleh berupa desimal." },
    { id: "total", label: "Jumlah total", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "Suku a", type: "number", default: "2", when: { mode: ["solve"] }, help: "Dalam proporsi yang diselesaikan, kosongkan hanya satu suku." },
    { id: "b", label: "Suku b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "Suku c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "Suku d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "Nilai pertama x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "Contoh: 5 pekerja." },
    { id: "y1", label: "Nilai yang sesuai y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "Contoh: 12 hari." },
    { id: "x2", label: "Nilai kedua x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "Contoh: 6 pekerja, dan hasilnya y₂ adalah yang tidak diketahui." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "Contoh: 5 pekerja menyelesaikan pekerjaan dalam 12 hari, berapa hari yang dibutuhkan 6 pekerja? (proporsi terbalik)"
  },
  invalid: { values: { mode: "solve", a: "2", b: "", c: "4", d: "" } },
  related: ["fractions", "percentage", "quadratic"]
};

function gcd(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x;
}

function ratioOf(input) {
  const raw = str(input, "ratio", "Rasio");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("Masukkan rasio dari 2 sampai 5 bagian dipisahkan titik dua, misalnya 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`Bagian «${t}» dalam rasio bukan bilangan positif.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("Bagian rasio harus lebih besar dari nol.", "ratio");
    return { n, scale: fp.length };
  });
  const K = Math.max(...parts.map((p) => p.scale));
  const scaled = parts.map((p) => p.n * 10n ** BigInt(K - p.scale));
  const g = scaled.reduce((x, y) => gcd(x, y));
  return { K, texts, scaled, g, red: scaled.map((x) => x / g) };
}

function simplifyMode(input) {
  const R = ratioOf(input);
  const steps = [];
  if (R.K > 0) steps.push({ text: `Kita kalikan semua bagian dengan ${10n ** BigInt(R.K)} agar menjadi bilangan bulat:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "FPB dari semua bagian:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "Kita bagi setiap bagian dengan FPB ini:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "Tidak ada faktor persekutuan lebih besar dari 1, sehingga rasionya sudah sederhana:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "Rasio dalam bentuk paling sederhana", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "Jumlah total", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "Kita sederhanakan rasio dahulu lalu jumlahkan bagian-bagiannya:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `Bagian ${i + 1} = jumlah × bagiannya ÷ total:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "Kita periksa bahwa jumlah bagian sama dengan jumlah total:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `Bagian ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)} dengan rasio ${R.red.join(":")} = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `Suku ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`Masukkan tiga suku dan kosongkan satu suku (Anda memasukkan ${4 - blanks.length} suku).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("Penyebut b tidak boleh sama dengan nol dalam proporsi.", "b");
  if (k !== "d" && v.d === 0) fail("Penyebut d tidak boleh sama dengan nol dalam proporsi.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`Tidak dapat diselesaikan karena suku ${divisorKey} sama dengan nol.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`Suku ${k} yang dihitung sama dengan nol, sehingga menjadi penyebut yang bernilai nol dalam proporsi.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "Dalam proporsi a/b = c/d, hasil kali silang kedua sisi sama:", tex: "a\\cdot d = b\\cdot c" },
    { text: `Kita selesaikan persamaan untuk mencari suku ${k}:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "Kita periksa proporsi setelah diselesaikan:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `Suku tidak diketahui ${k}`, value: N(x) },
      { label: "Proporsi lengkap", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "Nilai pertama x₁", { positive: true });
  const y1 = num(input, "y1", "Nilai yang sesuai y₁", { nonNegative: true });
  const x2 = num(input, "x2", "Nilai kedua x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "terbalik" : "langsung";
  const steps = inverse
    ? [
        { text: "Dalam proporsi terbalik, hasil kali y·x tetap:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "Kita selesaikan persamaan untuk mencari y₂:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "Dalam proporsi langsung, perbandingan y/x tetap:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "Kita selesaikan persamaan untuk mencari y₂:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "Nilai tidak diketahui y₂", value: N(y2) },
      { label: inverse ? "Konstanta proporsi terbalik y·x" : "Konstanta proporsi langsung y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (proporsi ${name})`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Jenis soal", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
