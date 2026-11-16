import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "سیریز ریزسٹر کے ساتھ زینر ریگولیٹر ڈیزائن کریں: ریزسٹر کی جائز حد، منتخب معیاری قدر، اور ان پٹ وولٹیج اور لوڈ بدلنے پر بدترین صورتوں میں زینر کا کرنٹ اور طاقت۔",
  keywords: ["زینر", "zener", "زینر ریگولیٹر", "سیریز ریزسٹر", "وولٹیج ریگولیشن", "زینر طاقت"],
  formulas: [
    { label: "زیادہ سے زیادہ سیریز ریزسٹر (بدترین صورت: کم ترین ان پٹ اور زیادہ ترین لوڈ)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "زیادہ سے زیادہ زینر کرنٹ اور طاقت (زیادہ ترین ان پٹ اور کم ترین لوڈ)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "کم از کم ان پٹ وولٹیج", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "زیادہ سے زیادہ ان پٹ وولٹیج", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "زینر وولٹیج Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "زیادہ سے زیادہ لوڈ کرنٹ", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "کم از کم لوڈ کرنٹ", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "ریگولیشن کے لیے کم از کم زینر کرنٹ", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "درجہ شدہ زینر طاقت (اختیاری)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "مثال: 50 mA تک کے لوڈ کے لیے 10–14 V ان پٹ سے 5.1 V ریگولیٹ کریں۔" },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "کم از کم ان پٹ وولٹیج", { positive: true });
  const Vmax = num(input, "Vmax", "زیادہ سے زیادہ ان پٹ وولٹیج", { positive: true });
  const Vz = num(input, "Vz", "زینر وولٹیج", { positive: true });
  const ILmax = num(input, "ILmax", "زیادہ سے زیادہ لوڈ کرنٹ", { nonNegative: true });
  const ILmin = num(input, "ILmin", "کم از کم لوڈ کرنٹ", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "کم از کم زینر کرنٹ", { positive: true });
  const Pz = num(input, "Pz", "زینر طاقت", { optional: true, positive: true });
  if (Vmax < Vmin) fail("زیادہ سے زیادہ ان پٹ وولٹیج کم از کم ان پٹ وولٹیج سے کم نہیں ہو سکتا۔", "Vmax");
  if (ILmin > ILmax) fail("کم از کم لوڈ کرنٹ زیادہ سے زیادہ لوڈ کرنٹ سے زیادہ نہیں ہو سکتا۔", "ILmin");
  if (Vmin <= Vz) fail(`ریگولیشن میں رہنے کے لیے کم از کم ان پٹ وولٹیج زینر وولٹیج (${fmt(Vz)} V) سے زیادہ ہونا چاہیے۔`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "ریگولیشن کی بدترین صورت: کم ترین ان پٹ وولٹیج اور زیادہ ترین لوڈ کرنٹ؛ زینر کو پھر بھی کم از کم Iz,min گزارنا ہوگا:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `ہم اگلی چھوٹی E12 معیاری قدر منتخب کرتے ہیں: $R_s = ${ntex(Rs)}\\ \\Omega$، تاکہ بدترین صورت میں زینر کرنٹ ${eng(IzAtMin, "A", 4)} ہو۔`,
    { text: "طاقت کی بدترین صورت: زیادہ ترین ان پٹ وولٹیج اور کم ترین لوڈ، اس لیے زینر سے سب سے زیادہ کرنٹ گزرتا ہے:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "سیریز ریزسٹر میں طاقت (بدترین صورت):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "زیادہ سے زیادہ جائز سیریز ریزسٹر", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "منتخب ریزسٹر (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "زیادہ سے زیادہ زینر کرنٹ", value: eng(IzMax, "A", 4) },
    { label: "زیادہ سے زیادہ زینر طاقت", value: eng(PzMax, "W", 4) },
    { label: "زیادہ سے زیادہ ریزسٹر طاقت", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "فیصلہ", value: ok ? `موزوں (${fmt((100 * PzMax) / Pz, 3)}% زینر کی درجہ شدہ طاقت)` : "زینر جل جائے گا: زیادہ طاقت والا زینر منتخب کریں یا ان پٹ کی حد کم کریں" });
    steps.push(ok ? `طاقت ${fmt(PzMax, 4)} W درجہ شدہ طاقت ${fmt(Pz)} W سے کم ہے۔` : `طاقت ${fmt(PzMax, 4)} W درجہ شدہ طاقت ${fmt(Pz)} W سے زیادہ ہے۔`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
