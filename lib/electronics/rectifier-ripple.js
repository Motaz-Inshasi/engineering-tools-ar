import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "نصف موجة"], ["center", "موجة كاملة بمحول ذي نقطة وسط"], ["bridge", "موجة كاملة بقنطرة"]];

export const meta = {
  description: "المقوّم مع مكثف التنعيم: جهد الذروة والجهد المستمر وجهد التموج ومعامل التموج وأقصى جهد عكسي على الدايود، لمقوّم نصف موجة أو موجة كاملة أو قنطرة.",
  keywords: ["مقوم", "تقويم", "rectifier", "تموج", "ripple", "قنطرة", "bridge", "مكثف تنعيم", "PIV", "دايود"],
  formulas: [
    { label: "جهد التموج (تقريب التفريغ الخطي)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "الجهد المستمر", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "نوع المقوّم", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "جهد الثانوي (فعال)", unit: "V", type: "number", default: "12", help: "لمحول ذي نقطة وسط: جهد نصف الملف." },
    { id: "f", label: "تردد الشبكة", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "مكثف التنعيم", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "مقاومة الحمل", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "هبوط الجهد على الدايود", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "مثال: قنطرة من محول 12 V مع مكثف 2200 µF وحمل 100 Ω." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "النوع", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "الجهد", { positive: true });
  const f = num(input, "f", "التردد", { positive: true });
  const C = num(input, "C", "المكثف", { positive: true });
  const RL = num(input, "RL", "الحمل", { positive: true });
  const Vd = num(input, "Vd", "هبوط الدايود", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("جهد الذروة أقل من هبوط الدايودات، فلا يوجد خرج.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "جهد ذروة الثانوي ثم بعد هبوط الدايودات الموصلة:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `تردد التموج ${fmt(fr)} Hz لأن ${type === "half" ? "المقوّم نصف موجة يشحن المكثف مرة كل دورة" : "المقوّم موجة كاملة يشحن المكثف مرتين كل دورة"}.`,
    { text: "يفرغ المكثف في الحمل بين نبضات الشحن، فجهد التموج من القمة إلى القمة:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "متوسط الجهد المستمر والتيار:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "أقصى جهد عكسي يتحمله كل دايود:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("تحذير: المكثف صغير جداً للحمل، فالتموج أكبر من الجهد نفسه والتقريب لا يصلح. زد السعة.");
  else if (Vr / Vp > 0.2) steps.push("التموج كبير (أكثر من 20%)، والتقريب الخطي أقل دقة هنا؛ يُفضّل زيادة السعة.");
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
      { label: "جهد الذروة بعد الدايودات", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "جهد التموج (قمة لقمة)", value: eng(Vr, "V", 4) },
      { label: "الجهد المستمر التقريبي", value: eng(Vdc, "V", 4) },
      { label: "تيار الحمل", value: eng(IL, "A", 4) },
      { label: "معامل التموج", value: `${fmt(100 * rf, 3)}%` },
      { label: "أقصى جهد عكسي PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "الجهد المقوّم وجهد المكثف (محاكاة)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "بعد التقويم", points: pts, dashed: true }, { name: "جهد الحمل", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
