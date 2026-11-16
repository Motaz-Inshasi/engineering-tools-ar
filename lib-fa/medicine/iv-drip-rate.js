import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { tex as ntex, fmt } from "../core/format.js";

const NOTE = { type: "note", tone: "warn", text: "صرفاً برای آموزش و تمرین است و جایگزین پزشک، داروساز یا پروتکل معتبر مؤسسهٔ شما نیست." };

export const meta = {
  description: "آهنگ تزریق وریدی را بر حسب میلی‌لیتر در ساعت و تعداد قطره در دقیقه را برای چند ضریب لولهٔ سرم محاسبه کنید، همراه با مقدار دقیق و مقدار گردشده به نزدیک‌ترین قطرهٔ کامل.",
  keywords: ["تزریق وریدی", "تعداد قطره", "gtt/min", "آهنگ تزریق", "IV drip rate", "drop factor", "mL/h"],
  formulas: [
    { label: "آهنگ جریان", tex: "R = \\frac{V}{T}" },
    { label: "قطره در دقیقه", tex: "N = \\frac{R \\times DF}{60}" }
  ],
  inputs: [
    { id: "volume", label: "حجم محلول", unit: "mL", type: "number", default: "1000" },
    { id: "hours", label: "مدت بر حسب ساعت", unit: "h", type: "number", default: "8", help: "عدد صحیح از 0 تا 999." },
    { id: "minutes", label: "مدت بر حسب دقیقه", unit: "min", type: "number", default: "0", help: "عدد صحیح از 0 تا 59." },
    { id: "dropFactor", label: "ضریب لوله", unit: "gtt/mL", type: "select", default: "20", options: [["10", "10 قطره در mL"], ["15", "15 قطره در mL"], ["20", "20 قطره در mL"], ["60", "60 قطره در mL (میکرو)"]] }
  ],
  example: { values: { volume: "1000", hours: "8", minutes: "0", dropFactor: "15" }, expect: ["125 mL/h", "31 gtt/min"], note: "مثال: 1000 mL در 8 ساعت با لولهٔ 15 قطره در mL." },
  invalid: { values: { volume: "1000", hours: "0", minutes: "0", dropFactor: "15" } },
  related: ["drug-dosage", "fluid-requirements", "bmi-bsa", "creatinine-clearance", "lab-units"]
};

export function solve(input) {
  const V = num(input, "volume", "حجم محلول", { positive: true });
  const hours = num(input, "hours", "مدت بر حسب ساعت", { integer: true, min: 0, max: 999 });
  const minutes = num(input, "minutes", "مدت بر حسب دقیقه", { integer: true, min: 0, max: 59 });
  const DF = Number(choice(input, "dropFactor", "ضریب لوله", ["10", "15", "20", "60"], "20"));
  const T = hours * 60 + minutes;
  if (T <= 0) fail("مدتی بزرگ‌تر از صفر وارد کنید (ساعت یا دقیقه).", "hours");
  const rate = V * 60 / T;
  const exactDrops = rate * DF / 60;
  const drops = Math.round(exactDrops);
  const steps = [
    { text: "مدت کل بر حسب دقیقه:", tex: `T = ${ntex(hours)} \\times 60 + ${ntex(minutes)} = ${ntex(T)}\\ min` },
    { text: "آهنگ جریان بر حسب میلی‌لیتر در ساعت:", tex: `R = \\frac{${ntex(V)}}{${ntex(T / 60, 6)}} = ${ntex(rate, 6)}\\ mL/h` },
    { text: "تعداد قطره در دقیقه (مقدار دقیق):", tex: `N = \\frac{${ntex(rate, 6)} \\times ${DF}}{60} = ${ntex(exactDrops, 6)}\\ gtt/min` },
    { text: "به نزدیک‌ترین قطرهٔ کامل گرد می‌کنیم:", tex: `N \\approx ${drops}\\ gtt/min` }
  ];
  const blocks = [NOTE];
  if (drops === 0) blocks.unshift({ type: "note", tone: "warn", text: "پس از گرد کردن، آهنگ کمتر از یک قطره در دقیقه می‌شود و با این لوله نمی‌توان آن را تنظیم کرد. از لولهٔ با ضریب بیشتر یا پمپ تزریق استفاده کنید." });
  return {
    results: [
      { label: "آهنگ جریان", value: `${fmt(rate, 6)} mL/h`, text: `${fmt(rate, 6)} mL/h` },
      { label: "قطره در دقیقه (دقیق)", value: `${fmt(exactDrops, 6)} gtt/min` },
      { label: "قطره در دقیقه (گرد شده)", value: `${drops} gtt/min`, text: `${drops} gtt/min` }
    ],
    steps,
    blocks,
    copy: `آهنگ جریان ${fmt(rate, 6)} mL/h و قطره‌ها ${fmt(exactDrops, 6)} به ${drops} gtt/min گرد می‌شوند`
  };
}
