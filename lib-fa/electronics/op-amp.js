import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "معکوس‌کننده"], ["noninv", "غیرمعکوس‌کننده"], ["sum", "جمع‌کنندهٔ معکوس‌کننده"], ["diff", "تفاضلی (تفریق‌کننده)"], ["integ", "انتگرال‌گیر"], ["deriv", "مشتق‌گیر"]];

export const meta = {
  description: "بهرهٔ تقویت‌کنندهٔ عملیاتی ایده‌آل را در مدارهای رایج محاسبه کنید: معکوس‌کننده، غیرمعکوس‌کننده، جمع‌کننده، تفریق‌کننده، انتگرال‌گیر و مشتق‌گیر، همراه با ولتاژ خروجی و هشدار اشباع هنگام عبور از ولتاژ تغذیه.",
  keywords: ["تقویت‌کنندهٔ عملیاتی", "op-amp", "اپ‌امپ", "تقویت‌کنندهٔ معکوس‌کننده", "تقویت‌کنندهٔ غیرمعکوس‌کننده", "جمع‌کننده", "انتگرال‌گیر", "مشتق‌گیر", "بهره"],
  formulas: [
    { label: "معکوس‌کننده و غیرمعکوس‌کننده", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "جمع‌کننده، انتگرال‌گیر و مشتق‌گیر (برای سیگنال سینوسی)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "مدار", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "مقاومت بازخورد Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "مقاومت ورودی Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "ولتاژ ورودی Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "برای انتگرال‌گیر و مشتق‌گیر: دامنهٔ سیگنال سینوسی." },
    { id: "V2", label: "ولتاژ ورودی دوم V2 (V1 = Vin از آن کم می‌شود)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "ولتاژ ورودی V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "مقاومت‌های ورودی جمع‌کننده", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "ولتاژهای ورودی جمع‌کننده", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "فرکانس سیگنال", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "ولتاژ تغذیهٔ ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "مثال: تقویت‌کنندهٔ معکوس‌کننده با بهرهٔ −10 و ورودی 0.5 V." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "مدار", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "ولتاژ تغذیه", { positive: true });
  const steps = ["تقویت‌کنندهٔ ایده‌آل را فرض می‌کنیم: بهرهٔ بی‌نهایت، جریانی وارد پایانه‌های ورودی نمی‌شود و ولتاژ آن‌ها برابر است (اتصال کوتاه مجازی)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "پایانهٔ معکوس‌کننده در زمین مجازی است، پس تمام جریان ورودی از Rf می‌گذرد:" : "ولتاژ پایانهٔ معکوس‌کننده برابر Vin است و Rf و Rin با خروجی یک مقسم تشکیل می‌دهند:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "مقاومت‌های ورودی", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "ولتاژهای ورودی", { max: 10 });
    if (Rs.length !== Vs.length) fail(`تعداد مقاومت‌ها (${Rs.length}) باید با تعداد ولتاژها (${Vs.length}) برابر باشد.`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "جریان‌های ورودی در زمین مجازی جمع می‌شوند و از Rf می‌گذرند:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "با مقاومت‌های یکسان (Rf/Rin در دو طرف) فقط تفاضل تقویت می‌شود:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "فرکانس", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "انتگرال‌گیر: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$ و برای سیگنال سینوسی بهره چنین می‌شود:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "مشتق‌گیر: $v_o = -RC\\frac{dv_i}{dt}$ و برای سیگنال سینوسی بهره چنین می‌شود:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`در فرکانس ${eng(wc / (2 * Math.PI), "Hz", 4)} بهره برابر 1 می‌شود. ${cfg === "integ" ? "در عمل، یک مقاومت موازی با خازن افزوده می‌شود تا از اشباع با ولتاژ DC جلوگیری شود." : "در عمل، یک مقاومت سری با خازن افزوده می‌شود تا نویز فرکانس بالا کاهش یابد."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`هشدار: خروجی محاسبه‌شدهٔ ${fmt(Vout, 4)} V از ولتاژ تغذیهٔ ±${fmt(Vsat)} V بیشتر است، پس خروجی واقعی در حدود ${fmt(Math.sign(Vout) * Vsat, 3)} V اشباع می‌شود.`);
  const results = [];
  if (A !== null) results.push({ label: "بهره", value: A, sig: 6, text: gainText }, { label: "بهره بر حسب دسی‌بل", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "بهره برای هر ورودی", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "دامنهٔ خروجی" : "ولتاژ خروجی", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "وضعیت", value: sat ? "اشباع (خروجی بریده شده)" : "در محدودهٔ خطی" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
