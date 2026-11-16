import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "İki kat arasında merdiven tasarlayın: Blondel kuralına göre basamak sayısını, basamak yüksekliğini ve derinliğini hesaplayın; ardından ölçütleri ve mevcut yatay uzunluğu kontrol edin.",
  keywords: ["merdiven", "Blondel kuralı", "basamak yüksekliği", "basamak derinliği", "stair", "blondel", "merdiven açısı"],
  formulas: [
    { label: "Basamak sayısı", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "Basamak yüksekliği ve derinliği", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "Yatay uzunluk ve merdiven açısı", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "İki kat arasındaki yükseklik H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "Basamak için tercih edilen yükseklik R", unit: "cm", type: "number", default: "17", help: "Yaklaşık değerdir; yüksekliği tam bölmek için basamak ayarlanır." },
    { id: "blondel", label: "Blondel hedefi 2R + G", unit: "cm", type: "number", default: "63", help: "İdeal değer 60 ile 64 cm arasındadır." },
    { id: "avail", label: "Mevcut yatay uzunluk", unit: "cm", type: "number", help: "İsteğe bağlı: merdivenin alana sığıp sığmadığını kontrol eder." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "Örnek: iki kat arası 300 cm." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "İki kat arasındaki yükseklik", { positive: true });
  const Rp = num(input, "riser", "Tercih edilen basamak yüksekliği", { positive: true, max: 30 });
  const B = num(input, "blondel", "Blondel hedefi", { positive: true, max: 100 });
  const avail = num(input, "avail", "Mevcut yatay uzunluk", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("Yükseklik, tercih edilen basamağa göre çok küçük; merdiven en az iki basamak gerektirir.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("Blondel hedefi bu yükseklik için çok küçük; yüksekliği artırın veya basamak sayısını azaltın.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "Basamak yüksekliği R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "Basamak derinliği G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "Blondel kuralı 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "merdiven açısı", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "Yatay uzunluk ile mevcut alanın karşılaştırması", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "Uygun, ölçütlere uyuyor" : "Düzenleme gerekiyor";
  const steps = [
    { text: "Tercih edilen yüksekliğe göre yuvarlanmış basamak sayısı:", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "Gerçek basamak yüksekliği:", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "Blondel kuralından basamak derinliği:", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "Merdivenin yatay uzunluğu:", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "Merdiven açısı:", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "Eğimli kiriş uzunluğu:", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "Ölçüt kontrolü", head: ["Kontrol", "Değer", "Ölçüt", "Karar"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "Uygun" : "Uygun değil"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "Bazı ölçütler karşılanmıyor; tercih edilen yüksekliği, Blondel hedefini veya mevcut uzunluğu düzenleyin." });
  return {
    results: [
      { label: "Yükseklik (riser) sayısı n", value: `${n}` },
      { label: "Basamak tablası sayısı", value: `${treads}` },
      { label: "Basamak yüksekliği R", value: `${fmt(R, 4)} cm` },
      { label: "Basamak derinliği G", value: `${fmt(G, 4)} cm` },
      { label: "Toplam yatay uzunluk", value: `${fmt(run, 4)} cm` },
      { label: "merdiven açısı", value: `${fmt(angle, 3)}°` },
      { label: "Eğimli kiriş uzunluğu", value: `${fmt(stringer, 4)} cm` },
      { label: "Karar", value: verdict }
    ],
    steps,
    blocks,
    copy: `Basamak sayısı: ${n}, R = ${fmt(R, 4)} cm, G = ${fmt(G, 4)} cm, yatay uzunluk = ${fmt(run, 4)} cm, açı = ${fmt(angle, 3)}°, karar: ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
