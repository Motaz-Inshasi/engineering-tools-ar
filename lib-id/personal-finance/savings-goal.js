import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const money = (x) => (Math.abs(x) < 0.005 ? 0 : x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MAX_MONTHS = 1200;
const isInt = (x) => Math.abs(x - Math.round(x)) < 1e-9;

const balanceAt = (PV, PMT, i, m) => (i === 0 ? PV + PMT * m : PV * Math.pow(1 + i, m) + (PMT * (Math.pow(1 + i, m) - 1)) / i);

const monthsText = (m) => {
  const y = Math.floor(m / 12);
  const r = m - y * 12;
  const yt = y === 0 ? "" : y === 1 ? "tahun" : y === 2 ? "dua tahun" : y <= 10 ? `${y} tahun` : `${y} tahun`;
  const rt = r === 0 ? "" : r === 1 ? "bulan" : r === 2 ? "dua bulan" : r <= 10 ? `${r} bulan` : `${r} bulan`;
  if (!yt && !rt) return "0 bulan";
  if (!yt) return rt;
  if (!rt) return yt;
  return `${yt} dan ${rt}`;
};

const yearRows = (PV, PMT, i, months) => {
  const marks = [];
  for (let m = 12; m < months; m += 12) marks.push(m);
  if (months > 0) marks.push(months);
  return marks.map((m) => {
    const b = balanceAt(PV, PMT, i, m);
    const dep = PV + PMT * m;
    return [fmt(m / 12, 4), money(b), money(dep), money(b - dep)];
  });
};

const yearTable = (PV, PMT, i, months) => ({
  type: "table",
  caption: "Perkembangan saldo di akhir setiap tahun",
  head: ["Durasi (dalam tahun)", "Saldo", "Total yang disetorkan", "Bunga sejauh ini"],
  rows: yearRows(PV, PMT, i, months)
});

export const meta = {
  description: "Hitung setoran bulanan yang diperlukan untuk mencapai target keuangan dengan imbal hasil tahunan yang diharapkan dan jangka waktu tertentu, atau hitung jangka waktu yang diperlukan jika Anda mengetahui setoran bulanan, beserta tabel saldo tahunan.",
  keywords: ["tabungan", "target keuangan", "setoran bulanan", "PMT", "menabung", "simpanan", "savings goal"],
  formulas: [
    { label: "Setoran bulanan yang diperlukan (di akhir setiap bulan)", tex: "PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1},\\qquad i = \\frac{r}{12}" },
    { label: "Saldo setelah N bulan", tex: "FV = PV(1+i)^N + PMT\\,\\frac{(1+i)^N - 1}{i}" },
    { label: "Jumlah bulan untuk mencapai target", tex: "N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)}" }
  ],
  inputs: [
    { id: "mode", label: "Apa yang ingin Anda hitung?", type: "select", default: "forward", options: [["forward", "Setoran bulanan yang diperlukan"], ["reverse", "Jangka waktu yang diperlukan untuk setoran bulanan tetap"]] },
    { id: "target", label: "Jumlah target", type: "number", default: "100000" },
    { id: "current", label: "Tabungan saat ini", type: "number", default: "10000" },
    { id: "rate", label: "Imbal hasil tahunan yang diharapkan", unit: "%", type: "number", default: "5", help: "Isi dengan nol jika Anda tidak mengharapkan imbal hasil." },
    { id: "time", label: "Jangka waktu tersedia", type: "number", default: "10", when: { mode: ["forward"] } },
    { id: "timeUnit", label: "Satuan jangka waktu", type: "select", default: "years", options: [["years", "tahun"], ["months", "bulan"]], when: { mode: ["forward"] } },
    { id: "deposit", label: "setoran bulanan", type: "number", default: "500", when: { mode: ["reverse"] }, help: "Disetorkan di akhir setiap bulan." }
  ],
  example: { values: { mode: "forward", target: "100000", current: "10000", rate: "5", time: "10", timeUnit: "years", deposit: "500" }, expect: ["537.92"], note: "Contoh: target 100000 dari 10000 dengan imbal hasil 5% per tahun selama 10 tahun." },
  invalid: { values: { mode: "reverse", target: "100000", current: "10000", rate: "0", time: "10", timeUnit: "years", deposit: "0" } },
  related: ["compound-interest", "loan-amortization", "budget-planner", "zakat"]
};

export function solve(input) {
  const mode = choice(input, "mode", "Jenis perhitungan", ["forward", "reverse"], "forward");
  const target = num(input, "target", "Jumlah target", { positive: true });
  const current = num(input, "current", "Tabungan saat ini", { nonNegative: true, default: 0 });
  const rate = num(input, "rate", "Imbal hasil tahunan", { nonNegative: true, max: 100, default: 0 });
  const i = rate / 1200;
  return mode === "reverse" ? reverse(input, target, current, i) : forward(input, target, current, i);
}

function forward(input, target, current, i) {
  const unit = choice(input, "timeUnit", "Satuan jangka waktu", ["years", "months"], "years");
  const t = num(input, "time", "Jangka waktu", { positive: true });
  const n = unit === "years" ? t * 12 : t;
  if (!isInt(n)) fail("Jangka waktu harus menghasilkan jumlah bulan yang bulat, misalnya 2.5 tahun atau 30 bulan.", "time");
  if (n > MAX_MONTHS) fail("Jangka waktu tidak boleh melebihi 100 tahun.", "time");
  const months = Math.round(n);
  const pmt = balanceAt(current, 0, i, months) >= target ? 0
    : i === 0 ? (target - current) / months
    : ((target - current * Math.pow(1 + i, months)) * i) / (Math.pow(1 + i, months) - 1);
  const reached = pmt === 0;
  const deposited = current + pmt * months;
  const final = balanceAt(current, pmt, i, months);
  const interest = final - deposited;

  const steps = [{ text: "Konversi jangka waktu ke bulan dan tingkat bulanan:", tex: `N = ${months},\\qquad i = \\frac{r}{12} = ${ntex(i, 6)}` }];
  if (reached) steps.push(current >= target ? "Tabungan saat ini sudah mencapai jumlah target, sehingga tidak perlu setoran." : "Saldo Anda saat ini akan tumbuh mencapai target tanpa setoran tambahan.");
  else if (i === 0) steps.push({ text: "Tanpa imbal hasil, setoran bulanan adalah selisih dibagi jumlah bulan:", tex: `PMT = \\frac{FV - PV}{N} = \\frac{${ntex(target)} - ${ntex(current)}}{${months}} = ${ntex(pmt, 8)}` });
  else steps.push({ text: "Setoran bulanan yang diperlukan:", tex: `PMT = \\frac{(FV - PV(1+i)^N)\\, i}{(1+i)^N - 1} = \\frac{(${ntex(target)} - ${ntex(current)} \\times (1+${ntex(i, 6)})^{${months}}) \\times ${ntex(i, 6)}}{(1+${ntex(i, 6)})^{${months}} - 1} = ${ntex(pmt, 8)}` });

  return {
    results: [
      { label: "Setoran bulanan yang diperlukan", value: reached ? "Tidak perlu setoran" : money(pmt) },
      { label: "Jangka waktu", value: monthsText(months) },
      { label: "Total yang akan Anda setorkan", value: money(deposited) },
      { label: "Total bunga yang diharapkan", value: money(interest) },
      { label: "Saldo di akhir jangka waktu", value: money(final) }
    ],
    steps,
    copy: reached
      ? `Target tercapai tanpa setoran, saldo yang diharapkan: ${money(final)}`
      : `Setoran bulanan yang diperlukan: ${money(pmt)} selama ${monthsText(months)}, total bunga yang diharapkan: ${money(interest)}`,
    blocks: [yearTable(current, pmt, i, months)]
  };
}

function reverse(input, target, current, i) {
  const deposit = num(input, "deposit", "setoran bulanan", { nonNegative: true });
  let real = 0;
  if (current < target) {
    if (i === 0) {
      if (!(deposit > 0)) fail("Setoran bulanan harus lebih besar dari nol untuk mencapai target tanpa imbal hasil.", "deposit");
      real = (target - current) / deposit;
    } else {
      const denom = current * i + deposit;
      if (!(denom > 0)) fail("Target tidak dapat dicapai dengan setoran nol dan tabungan awal nol.", "deposit");
      real = Math.log((target * i + deposit) / denom) / Math.log(1 + i);
    }
  }
  const months = Math.ceil(real - 1e-9);
  if (months > MAX_MONTHS) fail("Jangka waktu yang diperlukan melebihi 100 tahun, sehingga naikkan jumlah setoran.", "deposit");
  const final = balanceAt(current, deposit, i, months);
  const deposited = current + deposit * months;
  const interest = final - deposited;

  const steps = [];
  if (months === 0) steps.push("Tabungan saat ini sudah mencapai jumlah target.");
  else {
    steps.push(i === 0
      ? { text: "Tanpa imbal hasil, jumlah bulan adalah selisih dibagi setoran:", tex: `N = \\frac{FV - PV}{PMT} = \\frac{${ntex(target)} - ${ntex(current)}}{${ntex(deposit)}} = ${ntex(real, 6)}` }
      : { text: "Dengan menyelesaikan persamaan saldo untuk jumlah bulan N:", tex: `N = \\frac{\\ln\\left(\\frac{FV\\, i + PMT}{PV\\, i + PMT}\\right)}{\\ln(1+i)} = ${ntex(real, 6)}` });
    steps.push({ text: "Kita bulatkan N ke atas karena setoran dilakukan setiap bulan:", tex: `N = \\lceil ${ntex(real, 6)} \\rceil = ${months}` });
  }

  return {
    results: [
      { label: "Jangka waktu yang diperlukan", value: months === 0 ? "Target sudah tercapai" : `${months} bulan (${monthsText(months)})` },
      { label: "Saldo saat tercapai", value: money(final) },
      { label: "Total yang akan Anda setorkan", value: money(deposited) },
      { label: "Total bunga", value: money(interest) }
    ],
    steps,
    copy: months === 0
      ? "Target sudah tercapai"
      : `Anda memerlukan ${months} bulan (${monthsText(months)}) untuk mencapai ${money(target)} dengan setoran ${money(deposit)} per bulan`,
    blocks: months === 0 ? [] : [yearTable(current, deposit, i, months)]
  };
}
