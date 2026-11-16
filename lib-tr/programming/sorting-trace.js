import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "Kabarcık (Bubble)", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Evet", counter: "Yer değiştirmeler (Swaps)", head: ["Geçiş", "Karşılaştırmalar", "Yer değiştirmeler", "Geçişten sonra liste"], description: "Algoritma listeyi defalarca gezer; her geçişte her elemanı komşusuyla karşılaştırır ve istenen sıralamaya aykırıysa yer değiştirir. Her geçişte en büyük sıralanmamış eleman sona çıkar; tam bir geçiş hiç yer değiştirme yapmadan biterse durur." },
  selection: { label: "Seçme (Selection)", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Hayır", counter: "Yer değiştirmeler (Swaps)", head: ["Geçiş", "Seçilen değer", "Geçişten sonra liste"], description: "Sıralanmamış kısımda en küçük elemanı (ya da azalan sırada en büyüğünü) bulur ve en fazla tek yer değiştirmeyle onu ilk sıralanmamış konuma koyar." },
  insertion: { label: "Ekleme (Insertion)", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Evet", counter: "Kaydırmalar (Shifts)", head: ["Adım", "Eklenen eleman", "Kaydırmalar", "Eklemeden sonra liste"], description: "Her elemanı solundaki sıralı kısımda kendi yerine alır; ondan sonra gelen ve sıralamada daha büyük olan elemanları birer adım sağa kaydırır." },
  merge: { label: "Birleştirme (Merge)", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Evet", counter: "Yazmalar (Writes)", head: ["Adım", "Aralık", "Sol", "Sağ", "Birleştirmeden sonra"], description: "Listeyi her parça tek eleman olana kadar tekrar tekrar iki yarıya böler; sonra sıralı iki parçayı birleştirerek daha büyük sıralı parçalar oluşturur." },
  quick: { label: "Hızlı (Quick) (pivot son eleman)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "Ortalama O(log n), en kötü durumda O(n)", stable: "Hayır", counter: "Yer değiştirmeler (Swaps)", head: ["Adım", "Aralık", "Pivot", "Pivotun son konumu", "Bölümlemeden sonra liste"], description: "Aralığın son elemanını pivot olarak seçer; ondan küçükleri soluna, büyükleri sağına taşır, sonra aynı işlemi iki parça üzerinde tekrarlar." }
};

const ORDERS = { asc: "Artan", desc: "Azalan" };

function fmtNum(x) {
  return fmt(x, 10);
}

function snapshot(a) {
  return a.map(fmtNum).join(", ");
}

function runBubble(a, dir) {
  const rows = [];
  const n = a.length;
  let comparisons = 0, swaps = 0, early = false;
  for (let p = 0; p < n - 1; p++) {
    let c = 0, s = 0;
    for (let j = 0; j < n - 1 - p; j++) {
      comparisons++;
      c++;
      if (dir * (a[j] - a[j + 1]) > 0) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        s++;
      }
    }
    rows.push([String(p + 1), String(c), String(s), snapshot(a)]);
    if (s === 0) {
      early = p < n - 2;
      break;
    }
  }
  return { rows, comparisons, count: swaps, early };
}

function runSelection(a, dir) {
  const rows = [];
  const n = a.length;
  let comparisons = 0, swaps = 0;
  for (let i = 0; i < n - 1; i++) {
    let best = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (dir * (a[j] - a[best]) < 0) best = j;
    }
    const chosen = a[best];
    if (best !== i) {
      [a[i], a[best]] = [a[best], a[i]];
      swaps++;
    }
    rows.push([String(i + 1), fmtNum(chosen), snapshot(a)]);
  }
  return { rows, comparisons, count: swaps, early: false };
}

function runInsertion(a, dir) {
  const rows = [];
  let comparisons = 0, shifts = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    let s = 0;
    while (j >= 0) {
      comparisons++;
      if (dir * (a[j] - key) > 0) {
        a[j + 1] = a[j];
        shifts++;
        s++;
        j--;
      } else {
        break;
      }
    }
    a[j + 1] = key;
    rows.push([String(i), fmtNum(key), String(s), snapshot(a)]);
  }
  return { rows, comparisons, count: shifts, early: false };
}

function runMerge(a, dir) {
  const rows = [];
  let comparisons = 0, writes = 0;
  const merge = (lo, mid, hi) => {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (dir * (left[i] - right[j]) <= 0) a[k++] = left[i++];
      else a[k++] = right[j++];
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
    writes += hi - lo + 1;
    rows.push([String(rows.length + 1), `${lo + 1} – ${hi + 1}`, snapshot(left), snapshot(right), snapshot(a.slice(lo, hi + 1))]);
  };
  const sortRange = (lo, hi) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sortRange(lo, mid);
    sortRange(mid + 1, hi);
    merge(lo, mid, hi);
  };
  sortRange(0, a.length - 1);
  return { rows, comparisons, count: writes, early: false };
}

function runQuick(a, dir) {
  const rows = [];
  let comparisons = 0, swaps = 0;
  const swap = (x, y) => {
    if (x !== y) {
      [a[x], a[y]] = [a[y], a[x]];
      swaps++;
    }
  };
  const partition = (lo, hi) => {
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      if (dir * (a[j] - pivot) <= 0) {
        swap(i, j);
        i++;
      }
    }
    swap(i, hi);
    return { p: i, pivot };
  };
  const sortRange = (lo, hi) => {
    if (lo >= hi) return;
    const { p, pivot } = partition(lo, hi);
    rows.push([String(rows.length + 1), `${lo + 1} – ${hi + 1}`, fmtNum(pivot), String(p + 1), snapshot(a)]);
    sortRange(lo, p - 1);
    sortRange(p + 1, hi);
  };
  sortRange(0, a.length - 1);
  return { rows, comparisons, count: swaps, early: false };
}

const RUNNERS = { bubble: runBubble, selection: runSelection, insertion: runInsertion, merge: runMerge, quick: runQuick };

export const meta = {
  description: "Kabarcık, seçme, ekleme, birleştirme ve hızlı sıralamanın bir sayı listesini adım adım nasıl sıraladığını izler; her geçiş ya da adım için karşılaştırma ve yer değiştirme sayısını ve tabloyu, zaman ve alan karmaşıklığıyla birlikte gösterir.",
  keywords: ["sıralama", "sıralama algoritması", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "kabarcık", "birleştirme", "hızlı", "ekleme", "seçme"],
  formulas: [
    { label: "Seçme sıralamasında karşılaştırma sayısı", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "Birleştirme sıralamasının karmaşıklığı", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "Liste", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "2 ile 30 arasında sayı, virgül veya boşlukla ayrılmış." },
    { id: "algo", label: "Algoritma", type: "select", default: "bubble", options: [["bubble", "Kabarcık (Bubble)"], ["selection", "Seçme (Selection)"], ["insertion", "Ekleme (Insertion)"], ["merge", "Birleştirme (Merge)"], ["quick", "Hızlı (Quick) (pivot son eleman)"]] },
    { id: "order", label: "Sonuç sırası", type: "select", default: "asc", options: [["asc", "Artan"], ["desc", "Azalan"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "Yer değiştirmeler (Swaps): 4"], note: "Örnek: 5, 1, 4, 2, 8 listesi için artan sırada kabarcık sıralaması; dört yer değiştirme gerekir." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("Girdi 200000 karakterden uzun.", "list");
  const list = numList(input, "list", "Liste", { min: 2, max: 30 });
  const algo = choice(input, "algo", "Algoritma", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "Sonuç sırası", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "Sıralamadan sonra liste", value: sortedText, text: sortedText },
    { label: "Karşılaştırma sayısı", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "Zaman karmaşıklığı (en iyi / ortalama / en kötü)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "Alan karmaşıklığı", value: info.space },
    { label: "Kararlı (Stable)", value: info.stable }
  ];

  const steps = [
    `Algoritma: ${info.label}. ${info.description}`,
    `Sonuç sırası: ${ORDERS[order]}.`,
    `Karşılaştırma sayısı: ${compText}.`,
    `${info.counter}: ${countText}.`,
    `Zaman karmaşıklığı: en iyi durum ${info.best}, ortalama ${info.average}, en kötü durum ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "Algoritma adımlarının izi", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `Toplam ${run.rows.length} adımın ilk ${MAX_ROWS} tanesi gösterildi.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `${run.rows.length}. geçişten sonra hiç yer değiştirme yapılmadığı için algoritma erken durdu; liste sıralı hale geldi.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | Karşılaştırmalar: ${compText}`
  };
}
