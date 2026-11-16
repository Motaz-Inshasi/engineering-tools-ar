import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "نیم‌موج"], ["center", "تمام‌موج با ترانس نقطه‌میانی"], ["bridge", "تمام‌موج پل"]];

export const meta = {
  description: "یکسوساز همراه با خازن صاف‌کننده: ولتاژ اوج، ولتاژ DC، ولتاژ ریپل، ضریب ریپل و حداکثر ولتاژ معکوس دیود، برای یکسوساز نیم‌موج یا تمام‌موج یا پل.",
  keywords: ["یکسوساز", "یکسوسازی", "rectifier", "ریپل", "ripple", "پل", "bridge", "خازن صاف‌کننده", "PIV", "دیود"],
  formulas: [
    { label: "ولتاژ ریپل (تقریب تخلیهٔ خطی)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "ولتاژ DC", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "نوع یکسوساز", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "ولتاژ ثانویه (مؤثر)", unit: "V", type: "number", default: "12", help: "برای ترانس نقطه‌میانی: ولتاژ نصف سیم‌پیچ." },
    { id: "f", label: "فرکانس شبکه", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "خازن صاف‌کننده", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "مقاومت بار", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "افت ولتاژ دیود", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "مثال: یکسوساز پل از ترانس 12 V با خازن 2200 µF و بار 100 Ω." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "نوع", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "ولتاژ", { positive: true });
  const f = num(input, "f", "فرکانس", { positive: true });
  const C = num(input, "C", "خازن", { positive: true });
  const RL = num(input, "RL", "بار", { positive: true });
  const Vd = num(input, "Vd", "افت دیود", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("ولتاژ اوج کمتر از افت دیودها است، پس خروجی وجود ندارد.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "ولتاژ اوج ثانویه و سپس پس از کم کردن افت دیودهای هدایت‌کننده:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `فرکانس ریپل ${fmt(fr)} Hz است، زیرا ${type === "half" ? "یکسوساز نیم‌موج در هر سیکل یک بار خازن را شارژ می‌کند" : "یکسوساز تمام‌موج در هر سیکل دو بار خازن را شارژ می‌کند"}.`,
    { text: "خازن بین پالس‌های شارژ در بار تخلیه می‌شود، پس ریپل از قله تا قله برابر است با:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "میانگین ولتاژ DC و جریان:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "حداکثر ولتاژ معکوسی که هر دیود تحمل می‌کند:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("هشدار: خازن برای بار خیلی کوچک است، پس ریپل بزرگ‌تر از خود ولتاژ است و تقریب معتبر نیست. ظرفیت را افزایش دهید.");
  else if (Vr / Vp > 0.2) steps.push("ریپل زیاد است (بیش از 20%)، و تقریب خطی در اینجا دقت کمتری دارد؛ افزایش ظرفیت توصیه می‌شود.");
  const T = 1 / f, pts = [];
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600;
    const s = Math.sin(2 * Math.PI * f * t);
    const rect = Math.max(0, (type === "half" ? s : Math.abs(s)) * Vm - nD * Vd);
    pts.push([t, rect]);
  }
  const out = [];
  let v = Vp;
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600, dt = (3 * T) / 600;
    v = v * Math.exp(-dt / (RL * C));
    v = Math.max(v, pts[i][1]);
    out.push([t, v]);
  }
  return {
    results: [
      { label: "ولتاژ اوج پس از دیودها", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "ولتاژ ریپل (قله تا قله)", value: eng(Vr, "V", 4) },
      { label: "ولتاژ DC تقریبی", value: eng(Vdc, "V", 4) },
      { label: "جریان بار", value: eng(IL, "A", 4) },
      { label: "ضریب ریپل", value: `${fmt(100 * rf, 3)}%` },
      { label: "حداکثر ولتاژ معکوس PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "ولتاژ یکسوشده و ولتاژ خازن (شبیه‌سازی)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "پس از یکسوسازی", points: pts, dashed: true }, { name: "ولتاژ بار", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
