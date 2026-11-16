import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "Doğrusal (Linear)", complexity: "O(n)", head: ["Adım", "İndeks", "Değer", "Aranan değere eşit mi?"], description: "Elemanları baştan başlayarak tek tek kontrol ederiz; aranan değere eşit ilk elemanda ya da listenin sonunda dururuz. Listenin sıralı olması gerekmez." },
  binary: { label: "İkili (Binary)", complexity: "O(log n)", head: ["Adım", "Alt indeks (low)", "Üst indeks (high)", "Orta indeks (mid)", "mid değeri", "Karşılaştırma", "İşlem"], description: "Aranan değeri mevcut aralığın orta elemanıyla karşılaştırırız, değerin bulunamayacağı yarıyı atarız ve değeri bulana ya da aralık boşalana kadar tekrarlarız. Listenin artan sırada sıralı olması gerekir." }
};

function fmtNum(x) {
  return fmt(x, 10);
}

function maxBinary(n) {
  let m = 0;
  for (let x = n; x > 0; x = Math.floor(x / 2)) m++;
  return m;
}

function linearTrace(data, target) {
  const rows = [];
  let found = -1;
  for (let i = 0; i < data.length; i++) {
    const eq = data[i] === target;
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "Evet" : "Hayır"]);
    if (eq) {
      found = i;
      break;
    }
  }
  return { rows, found, comparisons: rows.length };
}

function binaryTrace(data, target) {
  const rows = [];
  let lo = 0, hi = data.length - 1, found = -1, step = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = data[mid];
    step++;
    const sym = target === v ? "=" : target < v ? "<" : ">";
    const action = sym === "=" ? `${mid} indeksinde değeri bulduk` : sym === "<" ? "Aranan değer daha küçük, sol yarıda arıyoruz" : "Aranan değer daha büyük, sağ yarıda arıyoruz";
    rows.push([String(step), String(lo), String(hi), String(mid), fmtNum(v), `${fmtNum(target)} ${sym} ${fmtNum(v)}`, action]);
    if (sym === "=") {
      found = mid;
      break;
    }
    if (sym === "<") hi = mid - 1;
    else lo = mid + 1;
  }
  return { rows, found, comparisons: rows.length };
}

export const meta = {
  description: "Doğrusal ve ikili aramayı bir sayı listesi üzerinde adım adım izler; değerin konumunu (bulunursa), karşılaştırma sayısını ve liste boyutu için mümkün olan en fazla karşılaştırma sayısını gösterir.",
  keywords: ["arama", "doğrusal arama", "ikili arama", "linear search", "binary search", "arama algoritması", "İndeks", "logaritmik"],
  formulas: [
    { label: "İkili aramada en fazla karşılaştırma sayısı", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "Doğrusal aramada en fazla karşılaştırma sayısı", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "Liste", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "Virgül veya boşlukla ayrılmış sayılar. İkili arama sıralı bir liste gerektirir; liste sıralı değilse önce sıralanır." },
    { id: "target", label: "Aranan sayı", type: "number", default: "7" },
    { id: "algo", label: "Arama türü", type: "select", default: "binary", options: [["linear", "Doğrusal (Linear)"], ["binary", "İkili (Binary)"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["3 indeksinde", "1 karşılaştırmadan sonra"], note: "Örnek: yedi elemanlı sıralı bir listede 7 için ikili arama." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("Girdi 200000 karakterden uzun.", "list");
  const list = numList(input, "list", "Liste");
  const target = num(input, "target", "Aranan sayı");
  const algo = choice(input, "algo", "Arama türü", Object.keys(ALGOS), "binary");
  const info = ALGOS[algo];

  const isSorted = list.every((v, i) => i === 0 || list[i - 1] <= v);
  const reorder = algo === "binary" && !isSorted;
  const data = reorder ? [...list].sort((x, y) => x - y) : list;

  const trace = algo === "binary" ? binaryTrace(data, target) : linearTrace(data, target);
  const found = trace.found >= 0;
  const n = data.length;
  const maxC = algo === "binary" ? maxBinary(n) : n;
  const targetText = fmtNum(target);

  const results = [
    { label: "Sonuç", value: found ? "Bulundu" : "Bulunamadı" },
    { label: "İndeks (0 tabanlı)", value: found ? String(trace.found) : "—" },
    { label: "Konum (1 tabanlı)", value: found ? String(trace.found + 1) : "—" },
    { label: "Karşılaştırma sayısı", value: String(trace.comparisons) },
    { label: "Zaman karmaşıklığı", value: info.complexity },
    { label: `n = ${n} boyutu için en fazla karşılaştırma sayısı`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "Kullanılan sıralı liste", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `${targetText} değeri ${trace.found} indeksinde (konum ${trace.found + 1}) bulundu, ${trace.comparisons} karşılaştırmadan sonra`
    : `${targetText} değeri ${trace.comparisons} karşılaştırmadan sonra bulunamadı`;

  const steps = [
    `Algoritma: ${info.label}. ${info.description}`,
    `Karşılaştırma sayısı: ${trace.comparisons}.`,
    `Zaman karmaşıklığı: ${info.complexity}; bu boyut için en fazla karşılaştırma sayısı ${maxC}.`,
    found ? `${targetText} değeri ${trace.found} indeksinde, yani ${trace.found + 1} konumunda bulundu.` : `${targetText} değeri listede bulunamadı.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "İkili arama sıralı bir liste gerektirir, bu yüzden liste önce sıralandı; sonuçtaki ve tablodaki indeksler sıralı listeye aittir." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "Arama adımlarının izi", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Toplam ${trace.rows.length} adımın ilk ${MAX_ROWS} tanesi gösterildi.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "Listede değer tekrar ediyor; doğrusal arama ilk konumunu döndürür." : "Listede değer tekrar ediyor; ikili arama konumlarından birini döndürür, bu mutlaka ilk konum olmayabilir." });

  return { results, steps, blocks, copy };
}
