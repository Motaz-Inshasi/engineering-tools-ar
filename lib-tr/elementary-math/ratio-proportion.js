import { fail, choice, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const MODES = ["simplify", "solve", "divide", "direct", "inverse"];
const TERMS = ["a", "b", "c", "d"];
const N = (x) => fmt(x, 10);

export const meta = {
  description: "Oranı en sade tam sayılarla sadeleştirin, a/b = c/d orantısını çözerek bilinmeyen terimi bulun, verilen oranla bir tutarı paylaştırın ve doğru ile ters orantılı problemleri adımlarıyla çözün.",
  keywords: ["Oran", "Orantı", "ratio", "proportion", "Orana göre paylaştırma", "Doğru orantı", "Ters orantı", "Orantı çözme"],
  formulas: [
    { label: "Doğru orantı", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_2}{x_1}" },
    { label: "Ters orantı", tex: "y_1 x_1 = y_2 x_2\\ \\Rightarrow\\ y_2 = \\frac{y_1\\, x_1}{x_2}" },
    { label: "Orantı a/b = c/d", tex: "a\\cdot d = b\\cdot c" }
  ],
  inputs: [
    { id: "mode", label: "Problem türü", type: "select", default: "simplify", options: [["simplify", "Oranı tam sayılarla sadeleştirme"], ["solve", "a/b = c/d orantısını çözme (bilinmeyen terim)"], ["divide", "Verilen oranla tutarı paylaştırma"], ["direct", "Doğru orantı"], ["inverse", "Ters orantı"]] },
    { id: "ratio", label: "a:b(:c) oranı", type: "text", default: "2:3:5", when: { mode: ["simplify", "divide"] }, help: "İki ile beş parça arasında, iki nokta üst üste ile ayrılmış; ondalık kesir de olabilir." },
    { id: "total", label: "Toplam tutar", type: "number", default: "1200", when: { mode: ["divide"] } },
    { id: "a", label: "Terim a", type: "number", default: "2", when: { mode: ["solve"] }, help: "Orantıyı çözerken yalnızca bir terimi boş bırakın." },
    { id: "b", label: "Terim b", type: "number", default: "3", when: { mode: ["solve"] } },
    { id: "c", label: "Terim c", type: "number", default: "4", when: { mode: ["solve"] } },
    { id: "d", label: "Terim d", type: "number", default: "", when: { mode: ["solve"] } },
    { id: "x1", label: "İlk değer x₁", type: "number", default: "5", when: { mode: ["direct", "inverse"] }, help: "Örnek: 5 işçi." },
    { id: "y1", label: "Karşılık gelen değer y₁", type: "number", default: "12", when: { mode: ["direct", "inverse"] }, help: "Örnek: 12 gün." },
    { id: "x2", label: "İkinci değer x₂", type: "number", default: "6", when: { mode: ["direct", "inverse"] }, help: "Örnek: 6 işçi; sonuç y₂ bilinmeyendir." }
  ],
  example: {
    values: { mode: "inverse", ratio: "2:3:5", total: "1200", a: "", b: "", c: "", d: "", x1: "5", y1: "12", x2: "6" },
    expect: ["y₂ = 10"],
    note: "Örnek: 5 işçi işi 12 günde bitiriyor; 6 işçi kaç günde bitirir? (ters orantı)"
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
  const raw = str(input, "ratio", "Oran");
  const texts = raw.split(":").map((s) => s.trim());
  if (texts.length < 2 || texts.length > 5) fail("2 ile 5 parça arasında, iki nokta üst üste ile ayrılmış bir oran girin, örneğin 2:3:5.", "ratio");
  const parts = texts.map((t) => {
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(t)) fail(`Oranın «${t}» parçası pozitif bir sayı değil.`, "ratio");
    const [ip, fp = ""] = t.split(".");
    const n = BigInt(ip + fp);
    if (n === 0n) fail("Oran parçaları sıfırdan büyük olmalıdır.", "ratio");
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
  if (R.K > 0) steps.push({ text: `Tüm parçaları ${10n ** BigInt(R.K)} ile çarparak tam sayıya çeviriyoruz:`, tex: `${R.texts.join(" : ")} = ${R.scaled.join(" : ")}` });
  if (R.g > 1n) {
    steps.push({ text: "Tüm parçaların en büyük ortak böleni:", tex: `\\gcd(${R.scaled.join(", ")}) = ${R.g}` });
    steps.push({ text: "Her parçayı bu bölene bölüyoruz:", tex: `${R.scaled.join(" : ")} = ${R.red.join(" : ")}` });
  } else {
    steps.push({ text: "1'den büyük ortak bölen yok, bu nedenle oran sadedir:", tex: `\\gcd(${R.scaled.join(", ")}) = 1` });
  }
  const value = R.red.join(" : ");
  return {
    results: [{ label: "Oran en sade biçimde", value }],
    steps,
    copy: `${R.texts.join(" : ")} = ${value}`
  };
}

function divideMode(input) {
  const R = ratioOf(input);
  const total = num(input, "total", "Toplam tutar", { positive: true });
  const r = R.red.map((x) => Number(x));
  const S = r.reduce((x, y) => x + y, 0);
  const shares = r.map((x) => (total * x) / S);
  const steps = [
    { text: "Önce oranı sadeleştirip parçalarını topluyoruz:", tex: `${R.texts.join(" : ")} = ${r.join(" : ")},\\quad S = ${r.join(" + ")} = ${S}` }
  ];
  r.forEach((x, i) => steps.push({ text: `${i + 1} parçasının payı = tutar × parçası ÷ toplam:`, tex: `${ntex(total)} \\times \\frac{${x}}{${S}} = ${N(shares[i])}` }));
  steps.push({ text: "Payların toplamının tutara eşit olduğunu kontrol ediyoruz:", tex: `${shares.map((s) => N(s)).join(" + ")} = ${ntex(total)}` });
  return {
    results: r.map((x, i) => ({ label: `Pay ${i + 1} (${x})`, value: N(shares[i]) })),
    steps,
    copy: `${N(total)}, ${R.red.join(":")} oranında = ${shares.map((s) => N(s)).join(" : ")}`
  };
}

function solveMode(input) {
  const v = {};
  const blanks = [];
  for (const k of TERMS) {
    v[k] = num(input, k, `Terim ${k}`, { optional: true });
    if (v[k] === null) blanks.push(k);
  }
  if (blanks.length !== 1) {
    fail(`Üç terim girin ve bir terimi boş bırakın (${4 - blanks.length} terim girdiniz).`, blanks.length > 1 ? blanks[1] : "a");
  }
  const k = blanks[0];
  if (k !== "b" && v.b === 0) fail("Orantıda b paydası sıfır olamaz.", "b");
  if (k !== "d" && v.d === 0) fail("Orantıda d paydası sıfır olamaz.", "d");
  const divisorKey = { a: "d", b: "c", c: "b", d: "a" }[k];
  if (v[divisorKey] === 0) fail(`Terim ${divisorKey} sıfır olduğu için çözüm yapılamaz.`, divisorKey);

  const known = v;
  const x = k === "a" ? (known.b * known.c) / known.d
    : k === "b" ? (known.a * known.d) / known.c
    : k === "c" ? (known.a * known.d) / known.b
    : (known.b * known.c) / known.a;
  if ((k === "b" || k === "d") && x === 0) fail(`Hesaplanan terim ${k} sıfır; bu, orantıda paydayı sıfır yapar.`, k);
  v[k] = x;
  const { a, b, c, d } = v;

  const formula = {
    a: `a = \\frac{b\\cdot c}{d} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(d)}}`,
    b: `b = \\frac{a\\cdot d}{c} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(c)}}`,
    c: `c = \\frac{a\\cdot d}{b} = \\frac{${ntex(a)}\\cdot ${ntex(d)}}{${ntex(b)}}`,
    d: `d = \\frac{b\\cdot c}{a} = \\frac{${ntex(b)}\\cdot ${ntex(c)}}{${ntex(a)}}`
  }[k];
  const steps = [
    { text: "a/b = c/d orantısında çapraz çarpımlar eşittir:", tex: "a\\cdot d = b\\cdot c" },
    { text: `Terim ${k}'ı bulmak için denklemi çözüyoruz:`, tex: `${formula} = ${ntex(x, 8)}` },
    { text: "Çözümden sonra orantıyı kontrol ediyoruz:", tex: `\\frac{${ntex(a)}}{${ntex(b)}} = ${ntex(a / b, 8)} = ${ntex(c / d, 8)} = \\frac{${ntex(c)}}{${ntex(d)}}` }
  ];
  return {
    results: [
      { label: `Bilinmeyen terim ${k}`, value: N(x) },
      { label: "Tam orantı", value: `${N(a)}/${N(b)} = ${N(c)}/${N(d)}` }
    ],
    steps,
    copy: `${k} = ${N(x)}  (${N(a)}/${N(b)} = ${N(c)}/${N(d)})`
  };
}

function proportionMode(input, inverse) {
  const x1 = num(input, "x1", "İlk değer x₁", { positive: true });
  const y1 = num(input, "y1", "Karşılık gelen değer y₁", { nonNegative: true });
  const x2 = num(input, "x2", "İkinci değer x₂", { positive: true });
  const y2 = inverse ? (y1 * x1) / x2 : (y1 * x2) / x1;
  const k = inverse ? y1 * x1 : y1 / x1;
  const name = inverse ? "Ters" : "Doğru";
  const steps = inverse
    ? [
        { text: "Ters orantıda y·x çarpımı sabit kalır:", tex: "y_1\\cdot x_1 = y_2\\cdot x_2" },
        { text: "y₂'yi bulmak için denklemi çözüyoruz:", tex: `y_2 = \\frac{y_1\\cdot x_1}{x_2} = \\frac{${ntex(y1)}\\cdot ${ntex(x1)}}{${ntex(x2)}} = ${ntex(y2, 8)}` }
      ]
    : [
        { text: "Doğru orantıda y/x oranı sabit kalır:", tex: "\\frac{y_1}{x_1} = \\frac{y_2}{x_2}" },
        { text: "y₂'yi bulmak için denklemi çözüyoruz:", tex: `y_2 = \\frac{y_1\\cdot x_2}{x_1} = \\frac{${ntex(y1)}\\cdot ${ntex(x2)}}{${ntex(x1)}} = ${ntex(y2, 8)}` }
      ];
  return {
    results: [
      { label: "Bilinmeyen değer y₂", value: N(y2) },
      { label: inverse ? "Ters orantı sabiti y·x" : "Doğru orantı sabiti y/x", value: N(k) }
    ],
    steps,
    copy: `y₂ = ${N(y2)} (${name} orantısı)`
  };
}

export function solve(input) {
  const mode = choice(input, "mode", "Problem türü", MODES, "simplify");
  if (mode === "simplify") return simplifyMode(input);
  if (mode === "solve") return solveMode(input);
  if (mode === "divide") return divideMode(input);
  return proportionMode(input, mode === "inverse");
}
