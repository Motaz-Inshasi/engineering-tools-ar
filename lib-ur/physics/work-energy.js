import { choice, fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

const T = (x) => ntex(x, 6);
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);
const MODES = [
  ["ke", "حرکی توانائی KE = ½mv²"],
  ["pe", "ممکنہ توانائی PE = mgh"],
  ["work", "کام W = F d cosθ"],
  ["power", "طاقت P = W/t یا P = Fv"],
  ["fall", "توانائی ضائع ہونے کے ساتھ گرنے کے بعد رفتار"]
];

export const meta = {
  description: "مناسب موڈ منتخب کر کے حرکی توانائی، ممکنہ توانائی، کام، طاقت اور گرنے کی رفتار کا توانائی ضائع ہونے کے فیصد کے ساتھ حساب کریں، مراحل اور SI اکائیوں کے ساتھ۔",
  keywords: ["کام", "توانائی", "حرکی توانائی", "ممکنہ توانائی", "طاقت", "work", "energy", "power", "گرنا"],
  formulas: [
    { label: "حرکی توانائی", tex: "KE = \\tfrac{1}{2}mv^2" },
    { label: "ممکنہ توانائی", tex: "PE = mgh" },
    { label: "کام اور طاقت", tex: "W = Fd\\cos\\theta,\\qquad P = \\frac{W}{t} = Fv" },
    { label: "گرنے کے بعد رفتار", tex: "v = \\sqrt{\\left(v_0^2 + 2gh\\right)\\left(1 - \\frac{L}{100}\\right)}" }
  ],
  inputs: [
    { id: "mode", label: "موڈ", type: "select", default: "ke", options: MODES },
    { id: "m", label: "کمیت m", unit: "kg", type: "number", default: "2", when: { mode: ["ke", "pe"] } },
    { id: "v", label: "رفتار v", unit: "m/s", type: "number", when: { mode: ["ke", "power"] }, help: "طاقت کے موڈ میں: اختیاری، F کے ساتھ P = Fv حساب کرنے کے لیے استعمال ہوتی ہے۔" },
    { id: "h", label: "بلندی h", unit: "m", type: "number", default: "10", when: { mode: ["pe", "fall"] } },
    { id: "g", label: "ثقلی اسراع g", unit: "m/s²", type: "number", default: "9.81", when: { mode: ["pe", "fall"] } },
    { id: "F", label: "قوت F", unit: "N", type: "number", when: { mode: ["work", "power"] }, help: "طاقت کے موڈ میں: اختیاری، v کے ساتھ P = Fv حساب کرنے کے لیے استعمال ہوتی ہے۔" },
    { id: "d", label: "نقل مکانی d", unit: "m", type: "number", when: { mode: ["work"] } },
    { id: "theta", label: "F اور d کے درمیان زاویہ θ", unit: "°", type: "number", default: "0", when: { mode: ["work"] } },
    { id: "W", label: "کام W", unit: "J", type: "number", when: { mode: ["power"] } },
    { id: "t", label: "وقت t", unit: "s", type: "number", when: { mode: ["power"] } },
    { id: "v0", label: "ابتدائی رفتار v0", unit: "m/s", type: "number", when: { mode: ["fall"] } },
    { id: "loss", label: "توانائی کے ضیاع کا فیصد", unit: "%", type: "number", default: "0", when: { mode: ["fall"] }, help: "0 سے 100 تک؛ گرنے کے بعد کل توانائی اسی فیصد کے حساب سے کم کی جاتی ہے۔" }
  ],
  example: { values: { mode: "ke", m: "2", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" }, expect: ["KE = 100 J"], note: "مثال: 10 m/s کی رفتار سے حرکت کرتی 2 kg کی کمیت۔" },
  invalid: { values: { mode: "ke", m: "0", v: "10", g: "", h: "", F: "", d: "", theta: "", W: "", t: "", v0: "", loss: "" } },
  related: ["kinematics", "collisions", "projectile-motion", "formulas-constants"]
};

export function solve(input) {
  const mode = choice(input, "mode", "موڈ", MODES.map((m) => m[0]), "ke");
  const steps = [];
  const results = [];
  let copy;
  let values;
  switch (mode) {
    case "ke": {
      const m = num(input, "m", "کمیت", { positive: true });
      const v = num(input, "v", "رفتار", { nonNegative: true });
      const KE = 0.5 * m * v * v;
      steps.push({ text: "حرکی توانائی:", tex: `KE = \\frac{1}{2}mv^2 = \\frac{1}{2} \\times ${T(m)} \\times (${T(v)})^2 = ${T(KE)}\\ J` });
      results.push({ label: "حرکی توانائی KE", value: `${fmt(KE, 6)} J` });
      copy = `KE = ${fmt(KE, 6)} J`;
      values = { KE };
      break;
    }
    case "pe": {
      const m = num(input, "m", "کمیت", { positive: true });
      const h = num(input, "h", "بلندی");
      const g = num(input, "g", "ثقلی اسراع", { positive: true });
      const PE = m * g * h;
      steps.push({ text: "ثقلی ممکنہ توانائی:", tex: `PE = mgh = ${T(m)} \\times ${T(g)} \\times (${T(h)}) = ${T(PE)}\\ J` });
      results.push({ label: "ممکنہ توانائی PE", value: `${fmt(PE, 6)} J` });
      copy = `PE = ${fmt(PE, 6)} J`;
      values = { PE };
      break;
    }
    case "work": {
      const F = num(input, "F", "قوت F");
      const d = num(input, "d", "نقل مکانی d");
      const theta = num(input, "theta", "زاویہ θ", { min: -360, max: 360 });
      const c = snap(Math.cos((theta * Math.PI) / 180));
      const W = F * d * c;
      steps.push({ text: "مستقل قوت سے کام:", tex: `W = Fd\\cos\\theta = ${T(F)} \\times ${T(d)} \\times \\cos(${T(theta)}^\\circ) = ${T(W)}\\ J` });
      results.push({ label: "کام W", value: `${fmt(W, 6)} J` });
      copy = `W = ${fmt(W, 6)} J`;
      values = { W };
      break;
    }
    case "power": {
      const W = num(input, "W", "کام W");
      const t = num(input, "t", "وقت t", { positive: true });
      const hasF = !isBlank(input.F);
      const hasV = !isBlank(input.v);
      if (hasF !== hasV) fail("P = Fv حساب کرنے کے لیے قوت F اور رفتار v اکٹھے درج کریں، یا دونوں خالی چھوڑ دیں۔", hasF ? "v" : "F");
      const P = W / t;
      steps.push({ text: "اوسط طاقت:", tex: `P = \\frac{W}{t} = \\frac{${T(W)}}{${T(t)}} = ${T(P)}\\ W` });
      results.push({ label: "طاقت P = W/t", value: `${fmt(P, 6)} W` });
      copy = `P = ${fmt(P, 6)} W`;
      values = { P };
      if (hasF) {
        const F = num(input, "F", "قوت F");
        const v = num(input, "v", "رفتار v");
        const Pf = F * v;
        steps.push({ text: "قوت اور رفتار کے لحاظ سے لحظہ بہ لحظہ طاقت:", tex: `P = Fv = ${T(F)} \\times ${T(v)} = ${T(Pf)}\\ W` });
        results.push({ label: "طاقت P = Fv", value: `${fmt(Pf, 6)} W` });
        copy += `، P = Fv = ${fmt(Pf, 6)} W`;
        values.Pf = Pf;
      }
      break;
    }
    case "fall": {
      const v0 = num(input, "v0", "ابتدائی رفتار", { nonNegative: true });
      const h = num(input, "h", "بلندی h", { nonNegative: true });
      const g = num(input, "g", "ثقلی اسراع", { positive: true });
      const loss = num(input, "loss", "توانائی کے ضیاع کا فیصد", { default: 0, min: 0, max: 100 });
      const energy = v0 * v0 + 2 * g * h;
      const vIdeal = Math.sqrt(energy);
      const v = Math.sqrt(energy * (1 - loss / 100));
      steps.push({ text: "بغیر ضیاع کے، توانائی کی بقا سے:", tex: `v_{ideal} = \\sqrt{v_0^2 + 2gh} = ${T(vIdeal)}\\ m/s` });
      steps.push({ text: "توانائی کے ضیاع کے فیصد L کے ساتھ کل توانائی کو عامل (1 - L/100) سے کم کیا جاتا ہے:", tex: `v = \\sqrt{(v_0^2 + 2gh)\\left(1 - \\frac{${T(loss)}}{100}\\right)} = ${T(v)}\\ m/s` });
      results.push({ label: "گرنے کے بعد رفتار v", value: `${fmt(v, 6)} m/s` });
      results.push({ label: "ضیاع کے بغیر رفتار", value: `${fmt(vIdeal, 6)} m/s` });
      copy = `v = ${fmt(v, 6)} m/s، ضیاع کے بغیر = ${fmt(vIdeal, 6)} m/s`;
      values = { v, vIdeal };
      break;
    }
  }
  return { results, steps, copy, values };
}
