import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseGregorian, toHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, weeksW, DAY, WEEKDAYS } from "./calendar.js";

export const meta = {
  description: "Hitung durasi antara dua tanggal dalam tahun, bulan, dan hari, serta dalam hari, minggu, dan hari kerja, atau tambahkan sejumlah hari ke suatu tanggal atau kurangkan darinya untuk mengetahui tanggal hasilnya beserta harinya.",
  keywords: ["selisih dua tanggal", "jumlah hari di antara dua tanggal", "perhitungan durasi", "tambah hari", "date difference", "days between dates", "hari kerja", "berapa hari"],
  formulas: [{ label: "Durasi dalam hari", tex: "\\Delta = \\frac{t_2 - t_1}{86400\\ \\text{s}}" }],
  inputs: [
    { id: "mode", label: "Operasi", type: "select", default: "diff", options: [["diff", "selisih dua tanggal"], ["add", "Tambah atau kurangi hari"]] },
    { id: "d1", label: "Tanggal pertama (atau awal)", type: "text", default: "2026-01-01", help: "Dalam format YYYY-MM-DD atau DD/MM/YYYY." },
    { id: "d2", label: "Tanggal kedua", type: "text", default: "2026-12-31", when: { mode: ["diff"] } },
    { id: "inclusive", label: "Hitung hari akhir dalam durasi", type: "checkbox", default: "", when: { mode: ["diff"] } },
    { id: "weekend", label: "Akhir pekan (untuk perhitungan hari kerja)", type: "select", default: "fs", options: [["fs", "Jumat dan Sabtu"], ["ss", "Sabtu dan Minggu"], ["f", "Jumat saja"], ["none", "Tanpa akhir pekan"]], when: { mode: ["diff"] } },
    { id: "days", label: "Jumlah hari (negatif untuk mengurangi)", type: "number", default: "100", when: { mode: ["add"] } }
  ],
  example: { values: { mode: "diff", d1: "2026-01-01", d2: "2026-12-31", inclusive: "", weekend: "fs", days: "" }, expect: ["364 hari", "11 bulan dan 30 hari"], note: "Contoh: berapa hari antara awal dan akhir tahun 2026?" },
  invalid: { values: { mode: "diff", d1: "2026-02-30", d2: "2026-12-31" } },
  related: ["age-calculator", "hijri-converter", "study-planner"]
};

const WEEKENDS = { fs: [5, 6], ss: [6, 0], f: [5], none: [] };

export function solve(input) {
  const mode = choice(input, "mode", "Operasi", ["diff", "add"], "diff");
  const a = parseGregorian(input, "d1", "Tanggal pertama");
  if (mode === "add") {
    const k = num(input, "days", "Jumlah hari", { integer: true, min: -1000000, max: 1000000 });
    const t = a + k * DAY;
    if (new Date(t).getUTCFullYear() < 1 || new Date(t).getUTCFullYear() > 9999) fail("Tanggal hasil di luar rentang yang didukung.", "days");
    const h = toHijri(t);
    return {
      results: [
        { label: "Tanggal hasil", value: gLong(t), text: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} hari = ${iso(t)}` },
        { label: "Dalam Hijriah (Ummul Qura)", value: hLong(h) },
        { label: "Hari", value: WEEKDAYS[new Date(t).getUTCDay()] }
      ],
      steps: [
        `Kita ubah ${iso(a)} menjadi nomor hari berurutan, lalu ${k >= 0 ? "tambahkan" : "kurangkan"} ${daysW(Math.abs(k))}.`,
        `Perhitungan secara otomatis memperhitungkan panjang bulan dan tahun kabisat (Februari berjumlah 29 hari pada tahun kabisat).`,
        `Hasil: ${gLong(t)}.`
      ],
      copy: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} hari = ${iso(t)}`
    };
  }
  const b = parseGregorian(input, "d2", "Tanggal kedua");
  const inc = !isBlank(input.inclusive) && input.inclusive !== "0";
  const we = WEEKENDS[choice(input, "weekend", "Akhir pekan", Object.keys(WEEKENDS), "fs")];
  const [s, e] = a <= b ? [a, b] : [b, a];
  const n = Math.round((e - s) / DAY) + (inc ? 1 : 0);
  const ymd = diffYMD(s, inc ? e + DAY : e);
  const full = Math.floor(n / 7), rem = n % 7;
  let work = full * (7 - we.length);
  const sd = new Date(s).getUTCDay();
  for (let i = 0; i < rem; i++) if (!we.includes((sd + full * 7 + i) % 7)) work++;
  const results = [
    { label: "Durasi dalam hari", value: daysW(n), text: `${iso(s)} → ${iso(e)}: ${daysW(n)}` },
    { label: "Dalam tahun, bulan, dan hari", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "Dalam minggu", value: `${weeksW(full)}${rem ? ` dan ${daysW(rem)}` : ""}` },
    { label: "hari kerja", value: daysW(work) },
    { label: "Dalam jam", value: `${(n * 24).toLocaleString("en-US")} jam` }
  ];
  const steps = [
    a > b ? "Tanggal pertama setelah tanggal kedua, sehingga kita tukar urutannya agar durasinya positif." : `Dari ${gLong(s)} hingga ${gLong(e)}.`,
    `Jumlah hari = selisih nomor kedua hari${inc ? " + 1 (untuk memasukkan hari akhir)" : ""} = ${n}.`,
    `Kita hitung bulan penuh terlebih dahulu, lalu sisa hari: ${ymdText(ymd)}.`,
    `Hari kerja: kita kecualikan hari akhir pekan mingguan (${we.length ? we.map((d) => WEEKDAYS[d]).join(" dan") : "Tidak ada"}) tetapi tidak libur resmi.`
  ];
  return { results, steps, copy: `${iso(s)} → ${iso(e)}: ${daysW(n)} (${ymdText(ymd)})` };
}
