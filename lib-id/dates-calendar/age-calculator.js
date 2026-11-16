import { fail, isBlank } from "../core/validate.js";
import { parseGregorian, todayUtc, toHijri, fromHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, DAY, WEEKDAYS, addMonths } from "./calendar.js";

export const meta = {
  description: "Hitung usia Anda secara tepat dalam tahun, bulan, dan hari, serta dalam hari, minggu, dan jam, usia Anda dalam tahun Hijriah, hari dalam minggu saat Anda lahir, dan berapa hari lagi menuju ulang tahun berikutnya dalam kedua kalender.",
  keywords: ["Kalkulator usia", "berapa usia saya", "age calculator", "tanggal lahir", "ulang tahun", "usia dalam tahun Hijriah", "usia dalam hari"],
  formulas: [{ label: "Usia", tex: "\\text{Age} = t_{\\text{today}} - t_{\\text{birth}}" }],
  inputs: [
    { id: "birth", label: "tanggal lahir", type: "text", default: "2000-05-15", help: "Dalam format YYYY-MM-DD atau DD/MM/YYYY." },
    { id: "ref", label: "Hitung usia pada tanggal (opsional)", type: "text", default: "", help: "Kosongkan untuk menggunakan tanggal hari ini." }
  ],
  example: { values: { birth: "2000-05-15", ref: "2026-11-13" }, expect: ["26 tahun, 5 bulan, dan 29 hari"], note: "Contoh: lahir pada 15 Mei 2000, dengan usia pada 13 November 2026." },
  invalid: { values: { birth: "2030-01-01", ref: "2026-01-01" } },
  related: ["date-difference", "hijri-converter", "bmi-bsa", "calorie-needs"]
};

export function solve(input) {
  const b = parseGregorian(input, "birth", "tanggal lahir");
  const r = isBlank(input.ref) ? todayUtc() : parseGregorian(input, "ref", "Tanggal perhitungan");
  if (b > r) fail("Tanggal lahir setelah tanggal perhitungan.", "birth");
  const ymd = diffYMD(b, r);
  const days = Math.round((r - b) / DAY);
  const hb = toHijri(b), hr = toHijri(r);
  let hy = hr.y - hb.y;
  if (hr.m < hb.m || (hr.m === hb.m && hr.d < hb.d)) hy--;
  const totalMonths = ymd.y * 12 + ymd.m;
  let next = addMonths(b, (ymd.y + 1) * 12);
  if (ymd.m === 0 && ymd.d === 0) next = r;
  const toNext = Math.round((next - r) / DAY);
  let nh = null;
  for (let y = hr.y; y <= hr.y + 1 && nh === null; y++) {
    const t = fromHijri(y, hb.m, Math.min(hb.d, 29));
    if (t !== null && t >= r) nh = t;
  }
  const results = [
    { label: "Usia", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "usia dalam tahun Hijriah", value: `Sekitar ${hy} tahun Hijriah` },
    { label: "Dalam bulan / minggu / hari", value: `${totalMonths.toLocaleString("en-US")} bulan / ${Math.floor(days / 7).toLocaleString("en-US")} minggu / ${days.toLocaleString("en-US")} hari` },
    { label: "Perkiraan dalam jam", value: `${(days * 24).toLocaleString("en-US")} jam` },
    { label: "Hari lahir", value: `${WEEKDAYS[new Date(b).getUTCDay()]} — ${hLong(hb)}` },
    { label: "Ulang tahun berikutnya", value: toNext === 0 ? "Hari ini! Selamat ulang tahun" : `${gLong(next)} (dalam ${daysW(toNext)})` }
  ];
  if (nh !== null) results.push({ label: "Ulang tahun Hijriah berikutnya", value: `${hLong(toHijri(nh))} = ${gLong(nh)}` });
  return {
    results,
    steps: [
      `Dari ${gLong(b)} hingga ${gLong(r)}.`,
      `Kita hitung tahun penuh, lalu bulan penuh, lalu sisa hari: ${ymdText(ymd)}.`,
      `Total hari = ${days.toLocaleString("en-US")}. Tahun Hijriah sekitar 11 hari lebih pendek daripada tahun Masehi, sehingga usia Hijriah sedikit lebih besar (${hy}).`
    ],
    copy: `Usia pada ${iso(r)}: ${ymdText(ymd)} (${days.toLocaleString("en-US")} hari)`
  };
}
