import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "Gelembung (Bubble)", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Ya", counter: "Pertukaran (Swaps)", head: ["Putaran", "Perbandingan", "Pertukaran", "Daftar setelah putaran"], description: "Algoritma melewati daftar berulang kali. Pada setiap putaran, setiap elemen dibandingkan dengan tetangganya dan ditukar jika urutannya belum sesuai. Elemen terbesar yang belum terurut naik ke akhir daftar pada setiap putaran, dan algoritma berhenti jika satu putaran penuh tidak melakukan pertukaran." },
  selection: { label: "Seleksi (Selection)", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Tidak", counter: "Pertukaran (Swaps)", head: ["Putaran", "Nilai yang dipilih", "Daftar setelah putaran"], description: "Mencari elemen terkecil pada bagian yang belum terurut (atau terbesar jika urutan menurun), lalu menempatkannya di posisi pertama yang belum terurut dengan paling banyak satu pertukaran." },
  insertion: { label: "Sisipan (Insertion)", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Ya", counter: "Pergeseran (Shifts)", head: ["Langkah", "Elemen yang disisipkan", "Pergeseran", "Daftar setelah penyisipan"], description: "Setiap elemen diambil lalu disisipkan pada posisinya di dalam bagian yang sudah terurut di sebelah kirinya, dengan menggeser elemen-elemen yang setelahnya ke kanan satu langkah." },
  merge: { label: "Penggabungan (Merge)", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Ya", counter: "Penulisan (Writes)", head: ["Langkah", "Rentang", "Kiri", "Kanan", "Setelah penggabungan"], description: "Daftar dibagi berulang menjadi dua bagian hingga setiap bagian berisi satu elemen, lalu setiap dua bagian yang sudah terurut digabungkan menjadi bagian terurut yang lebih besar." },
  quick: { label: "Cepat (Quick), pivot adalah elemen terakhir", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n) rata-rata dan O(n) pada kasus terburuk", stable: "Tidak", counter: "Pertukaran (Swaps)", head: ["Langkah", "Rentang", "Pivot", "Posisi akhir pivot", "Daftar setelah partisi"], description: "Pivot adalah elemen terakhir pada rentang. Elemen yang mendahuluinya dipindahkan ke kirinya dan elemen yang mengikutinya ke kanannya, lalu proses diulang pada kedua bagian." }
};

const ORDERS = { asc: "Menaik", desc: "Menurun" };

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
  description: "Pelacakan langkah demi langkah tentang cara algoritma gelembung, seleksi, sisipan, penggabungan, dan cepat mengurutkan daftar angka, dengan jumlah perbandingan dan pertukaran, tabel untuk setiap putaran atau langkah, serta kompleksitas waktu dan ruangnya.",
  keywords: ["pengurutan", "algoritma pengurutan", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "gelembung", "penggabungan", "cepat", "sisipan", "seleksi"],
  formulas: [
    { label: "Jumlah perbandingan pada seleksi", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "Kompleksitas penggabungan", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "Daftar", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "Dari 2 hingga 30 angka, dipisahkan dengan koma atau spasi." },
    { id: "algo", label: "Algoritma", type: "select", default: "bubble", options: [["bubble", "Gelembung (Bubble)"], ["selection", "Seleksi (Selection)"], ["insertion", "Sisipan (Insertion)"], ["merge", "Penggabungan (Merge)"], ["quick", "Cepat (Quick), pivot adalah elemen terakhir"]] },
    { id: "order", label: "Urutan hasil", type: "select", default: "asc", options: [["asc", "Menaik"], ["desc", "Menurun"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "Pertukaran (Swaps): 4"], note: "Contoh: pengurutan gelembung pada 5, 1, 4, 2, 8 secara menaik, yang membutuhkan empat pertukaran." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("Masukan lebih dari 200000 karakter.", "list");
  const list = numList(input, "list", "Daftar", { min: 2, max: 30 });
  const algo = choice(input, "algo", "Algoritma", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "Urutan hasil", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "Daftar setelah diurutkan", value: sortedText, text: sortedText },
    { label: "Jumlah perbandingan", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "Kompleksitas waktu (terbaik / rata-rata / terburuk)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "Kompleksitas ruang", value: info.space },
    { label: "Stabil (Stable)", value: info.stable }
  ];

  const steps = [
    `Algoritma: ${info.label}. ${info.description}`,
    `Urutan hasil: ${ORDERS[order]}.`,
    `Jumlah perbandingan: ${compText}.`,
    `${info.counter}: ${countText}.`,
    `Kompleksitas waktu: kasus terbaik ${info.best}, rata-rata ${info.average}, kasus terburuk ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "Pelacakan langkah algoritma", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `Menampilkan ${MAX_ROWS} langkah pertama dari ${run.rows.length} langkah.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `Algoritma berhenti lebih awal setelah putaran ${run.rows.length} karena putaran itu tidak melakukan pertukaran, sehingga daftar sudah terurut.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | Perbandingan: ${compText}`
  };
}
