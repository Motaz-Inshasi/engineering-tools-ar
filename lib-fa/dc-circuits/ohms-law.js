import { fail, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex } from "../core/format.js";

export const meta = {
  description: "محاسبه ولتاژ یا جریان یا مقاومت یا توان از هر دو مقدار معلوم با قانون اهم و قانون توان، همراه با گام‌ها و واحدهای مهندسی.",
  keywords: ["قانون اهم", "ohm", "ولتاژ", "جریان", "مقاومت", "توان", "وات", "ولت", "آمپر"],
  formulas: [
    { label: "قانون اهم", tex: "V = I R" },
    { label: "توان", tex: "P = V I = I^2 R = \\frac{V^2}{R}" }
  ],
  inputs: [
    { id: "V", label: "ولتاژ V", unit: "V", type: "number", help: "دو فیلد را خالی بگذارید و فقط دو مقدار وارد کنید." },
    { id: "I", label: "جریان I", unit: "A", type: "number", default: "20m", help: "می‌توانید از پیشوند استفاده کنید: m برای میلی، u برای میکرو، k برای کیلو." },
    { id: "R", label: "مقاومت R", unit: "Ω", type: "number", default: "470" },
    { id: "P", label: "توان P", unit: "W", type: "number" }
  ],
  example: { values: { V: "", I: "20m", R: "470", P: "" }, expect: ["V = 9.4 V", "P = 188 mW"], note: "مثال: جریان 20 mA از یک مقاومت 470 Ω." },
  invalid: { values: { V: "5", I: "1", R: "5", P: "" } },
  related: ["series-parallel-resistors", "voltage-current-divider", "led-resistor", "shunt-resistor"]
};

export function solve(input) {
  const given = ["V", "I", "R", "P"].filter((k) => !isBlank(input[k]));
  if (given.length !== 2) fail(`فقط دو مقدار از چهار مقدار را وارد کنید (شما ${given.length} وارد کرده‌اید).`, given.length > 2 ? given[2] : ["V", "I", "R", "P"].find((k) => isBlank(input[k])));
  const v = {};
  for (const k of given) v[k] = num(input, k, { V: "ولتاژ", I: "جریان", R: "مقاومت", P: "توان" }[k], k === "R" ? { positive: true } : k === "P" ? { nonNegative: true } : {});
  const steps = [];
  const key = given.sort().join("");
  const T = (x) => ntex(x, 6);
  switch (key) {
    case "IV":
      if (v.I === 0) fail("جریان صفر است، پس مقاومت قابل محاسبه نیست.", "I");
      v.R = v.V / v.I; v.P = v.V * v.I;
      if (!(v.R > 0)) fail("برای مقاومت مثبت، ولتاژ و جریان باید علامت یکسان داشته باشند.", "I");
      steps.push({ text: "از قانون اهم:", tex: `R = \\frac{V}{I} = \\frac{${T(v.V)}}{${T(v.I)}} = ${T(v.R)}\\ \\Omega` });
      steps.push({ text: "توان:", tex: `P = VI = ${T(v.V)} \\times ${T(v.I)} = ${T(v.P)}\\ W` });
      break;
    case "RV":
      v.I = v.V / v.R; v.P = (v.V * v.V) / v.R;
      steps.push({ text: "از قانون اهم:", tex: `I = \\frac{V}{R} = \\frac{${T(v.V)}}{${T(v.R)}} = ${T(v.I)}\\ A` });
      steps.push({ text: "توان:", tex: `P = \\frac{V^2}{R} = ${T(v.P)}\\ W` });
      break;
    case "IR":
      v.V = v.I * v.R; v.P = v.I * v.I * v.R;
      steps.push({ text: "از قانون اهم:", tex: `V = IR = ${T(v.I)} \\times ${T(v.R)} = ${T(v.V)}\\ V` });
      steps.push({ text: "توان:", tex: `P = I^2 R = ${T(v.P)}\\ W` });
      break;
    case "PV":
      if (v.V === 0) fail("ولتاژ صفر است، پس جریان از روی توان قابل محاسبه نیست.", "V");
      v.I = v.P / v.V; v.R = (v.V * v.V) / v.P;
      if (v.P === 0) fail("توان صفر با ولتاژ غیرصفر یعنی مقاومت بی‌نهایت.", "P");
      steps.push({ text: "از قانون توان:", tex: `I = \\frac{P}{V} = ${T(v.I)}\\ A,\\qquad R = \\frac{V^2}{P} = ${T(v.R)}\\ \\Omega` });
      break;
    case "IP":
      if (v.I === 0) fail("جریان صفر است، پس ولتاژ از روی توان قابل محاسبه نیست.", "I");
      if (v.P === 0) fail("توان صفر با جریان غیرصفر یعنی مقاومت صفر.", "P");
      v.V = v.P / v.I; v.R = v.P / (v.I * v.I);
      steps.push({ text: "از قانون توان:", tex: `V = \\frac{P}{I} = ${T(v.V)}\\ V,\\qquad R = \\frac{P}{I^2} = ${T(v.R)}\\ \\Omega` });
      break;
    case "PR":
      v.V = Math.sqrt(v.P * v.R); v.I = Math.sqrt(v.P / v.R);
      steps.push({ text: "از قانون توان (ریشه مثبت را می‌گیریم):", tex: `V = \\sqrt{PR} = ${T(v.V)}\\ V,\\qquad I = \\sqrt{\\frac{P}{R}} = ${T(v.I)}\\ A` });
      break;
  }
  steps.push({ text: "بررسی:", tex: `V - IR = ${T(v.V - v.I * v.R)},\\quad P - VI = ${T(v.P - v.V * v.I)}` });
  const out = { V: eng(v.V, "V"), I: eng(v.I, "A"), R: eng(v.R, "Ω"), P: eng(v.P, "W") };
  return {
    results: [
      { label: "ولتاژ V", value: out.V, text: `V = ${out.V}` },
      { label: "جریان I", value: out.I, text: `I = ${out.I}` },
      { label: "مقاومت R", value: out.R, text: `R = ${out.R}` },
      { label: "توان P", value: out.P, text: `P = ${out.P}` }
    ],
    steps, values: v
  };
}
