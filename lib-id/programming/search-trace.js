import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "Linear", complexity: "O(n)", head: ["Langkah", "Indeks", "Nilai", "Sama dengan yang dicari?"], description: "Elemen diperiksa satu per satu dari awal, dan pencarian berhenti pada elemen pertama yang sama dengan nilai yang dicari atau saat mencapai akhir daftar. Daftar tidak harus diurutkan." },
  binary: { label: "Binary", complexity: "O(log n)", head: ["Langkah", "Indeks terendah (low)", "Indeks tertinggi (high)", "Indeks tengah (mid)", "Nilai pada mid", "Perbandingan", "Tindakan"], description: "Nilai yang dicari dibandingkan dengan elemen tengah pada rentang saat ini, lalu separuh rentang yang pasti tidak memuat nilai tersebut dibuang, dan proses diulang hingga nilai ditemukan atau rentang kosong. Daftar harus diurutkan secara menaik." }
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
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "Ya" : "Tidak"]);
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
    const action = sym === "=" ? `Nilai ditemukan pada indeks ${mid}` : sym === "<" ? "Nilai yang dicari lebih kecil, sehingga pencarian dilanjutkan di separuh kiri" : "Nilai yang dicari lebih besar, sehingga pencarian dilanjutkan di separuh kanan";
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
  description: "Menelusuri pencarian linear dan biner langkah demi langkah pada daftar angka, menampilkan posisi nilai jika ditemukan, jumlah perbandingan, serta jumlah perbandingan maksimum yang mungkin untuk ukuran daftar tersebut.",
  keywords: ["pencarian", "pencarian linear", "pencarian biner", "linear search", "binary search", "algoritma pencarian", "Indeks", "logaritmik"],
  formulas: [
    { label: "Jumlah perbandingan maksimum pada pencarian biner", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "Jumlah perbandingan maksimum pada pencarian linear", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "Daftar", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "Angka dipisahkan dengan koma atau spasi. Pencarian biner memerlukan daftar yang terurut; jika tidak terurut, daftar akan diurutkan terlebih dahulu." },
    { id: "target", label: "Angka yang dicari", type: "number", default: "7" },
    { id: "algo", label: "Jenis pencarian", type: "select", default: "binary", options: [["linear", "Linear"], ["binary", "Binary"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["pada indeks 3", "setelah 1 perbandingan"], note: "Contoh: pencarian biner untuk 7 dalam daftar terurut berisi tujuh angka." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("Masukan lebih dari 200000 karakter.", "list");
  const list = numList(input, "list", "Daftar");
  const target = num(input, "target", "Angka yang dicari");
  const algo = choice(input, "algo", "Jenis pencarian", Object.keys(ALGOS), "binary");
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
    { label: "Hasil", value: found ? "Ditemukan" : "Tidak ditemukan" },
    { label: "Indeks (mulai dari 0)", value: found ? String(trace.found) : "—" },
    { label: "Posisi (mulai dari 1)", value: found ? String(trace.found + 1) : "—" },
    { label: "Jumlah perbandingan", value: String(trace.comparisons) },
    { label: "Kompleksitas waktu", value: info.complexity },
    { label: `Jumlah perbandingan maksimum untuk ukuran n = ${n}`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "Daftar terurut yang digunakan", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `Nilai ${targetText} berada pada indeks ${trace.found} (posisi ${trace.found + 1}) setelah ${trace.comparisons} perbandingan`
    : `Nilai ${targetText} tidak ditemukan setelah ${trace.comparisons} perbandingan`;

  const steps = [
    `Algoritma: ${info.label}. ${info.description}`,
    `Jumlah perbandingan: ${trace.comparisons}.`,
    `Kompleksitas waktu: ${info.complexity}, dan jumlah perbandingan maksimum untuk ukuran ini adalah ${maxC}.`,
    found ? `Nilai ${targetText} ditemukan pada indeks ${trace.found}, yaitu pada posisi ${trace.found + 1}.` : `Nilai ${targetText} tidak ditemukan dalam daftar.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "Pencarian biner memerlukan daftar yang diurutkan secara menaik, sehingga daftar diurutkan terlebih dahulu, dan indeks pada hasil serta tabel mengacu pada daftar yang sudah diurutkan." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "Pelacakan langkah pencarian", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Menampilkan ${MAX_ROWS} langkah pertama dari ${trace.rows.length} langkah.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "Nilai terdapat berulang dalam daftar, dan pencarian linear mengembalikan posisi pertamanya." : "Nilai terdapat berulang dalam daftar, dan pencarian biner mengembalikan salah satu posisinya, belum tentu yang pertama." });

  return { results, steps, blocks, copy };
}
