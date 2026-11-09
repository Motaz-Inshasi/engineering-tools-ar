import { choice, str, fail } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const meta = {
  description: "حوّل بين العشري والثنائي والست عشري بعدد بتات محدد: المتمم الثنائي (two's complement) والمتمم الأحادي والإشارة والمقدار، مع مدى القيم وخطوات العكس وإضافة 1.",
  keywords: ["المتمم الثنائي", "two's complement", "ثنائي", "ست عشري", "hex", "binary", "أعداد سالبة", "signed", "unsigned", "بت"],
  formulas: [
    { label: "المتمم الثنائي لعدد سالب", tex: "-x \\;\\to\\; \\overline{x} + 1 = 2^N - x" },
    { label: "المدى بـ N بت", tex: "\\text{unsigned}: [0, 2^N - 1],\\qquad \\text{signed}: [-2^{N-1}, 2^{N-1} - 1]" }
  ],
  inputs: [
    { id: "mode", label: "الاتجاه", type: "select", default: "dec", options: [["dec", "من العشري إلى الثنائي"], ["bin", "من الثنائي إلى العشري"], ["hex", "من الست عشري إلى العشري"]] },
    { id: "x", label: "القيمة", type: "text", default: "-42", help: "للثنائي: 0 و 1 فقط. للست عشري: 0–9 و A–F." },
    { id: "N", label: "عدد البتات N", type: "select", default: "8", options: [["4", "4"], ["8", "8"], ["16", "16"], ["32", "32"], ["64", "64"]] }
  ],
  example: { values: { mode: "dec", x: "-42", N: "8" }, expect: ["11010110", "0xD6"], note: "مثال: −42 بالمتمم الثنائي على 8 بت." },
  invalid: { values: { mode: "dec", x: "300", N: "8" } },
  related: ["number-bases", "logic-gates", "adc"]
};

const group = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

export function encode(v, N) {
  const mod = 1n << BigInt(N);
  const u = ((v % mod) + mod) % mod;
  return u.toString(2).padStart(N, "0");
}

export function decodeSigned(bits) {
  const N = bits.length;
  const u = BigInt("0b" + bits);
  return bits[0] === "1" ? u - (1n << BigInt(N)) : u;
}

export function solve(input) {
  const mode = choice(input, "mode", "الاتجاه", ["dec", "bin", "hex"], "dec");
  const N = Number(choice(input, "N", "عدد البتات", ["4", "8", "16", "32", "64"], "8"));
  const raw = normalizeDigits(str(input, "x", "القيمة")).replace(/[\s_]/g, "");
  const min = -(1n << BigInt(N - 1)), maxS = (1n << BigInt(N - 1)) - 1n, maxU = (1n << BigInt(N)) - 1n;
  const steps = [];
  let bits;
  if (mode === "dec") {
    if (!/^[+-]?\d+$/.test(raw)) fail("أدخل عدداً صحيحاً عشرياً (بلا كسور).", "x");
    const v = BigInt(raw);
    if (v < min || v > maxU) fail(`القيمة خارج مدى ${N} بت: من ${min} إلى ${maxU} (أو حتى ${maxS} للأعداد ذات الإشارة).`, "x");
    bits = encode(v, N);
    if (v >= 0n) {
      steps.push(`العدد موجب، فنكتبه بالثنائي مباشرة ونكمله بأصفار حتى ${N} بت: ${group(bits)}.`);
      if (v > maxS) steps.push(`تنبيه: القيمة أكبر من ${maxS}، فهي صالحة بلا إشارة فقط؛ لو قُرئت بإشارة لكانت ${decodeSigned(bits)}.`);
    } else {
      const pos = encode(-v, N);
      const inv = [...pos].map((b) => (b === "1" ? "0" : "1")).join("");
      steps.push(`نكتب المقدار ${-v} بالثنائي على ${N} بت: ${group(pos)}.`);
      steps.push(`نعكس كل البتات (المتمم الأحادي): ${group(inv)}.`);
      steps.push(`نضيف 1 فنحصل على المتمم الثنائي: ${group(bits)}.`);
      steps.push({ text: "تحقق:", tex: `2^{${N}} - ${-v} = ${(1n << BigInt(N)) + v}` });
    }
  } else if (mode === "bin") {
    if (!/^[01]+$/.test(raw)) fail("القيمة الثنائية يجب أن تحتوي 0 و 1 فقط.", "x");
    if (raw.length > N) fail(`عدد البتات المدخلة (${raw.length}) أكبر من ${N}.`, "x");
    bits = raw.padStart(N, "0");
    if (raw.length < N) steps.push(`أكملنا القيمة بأصفار من اليسار حتى ${N} بت: ${group(bits)}.`);
  } else {
    if (!/^(0x)?[0-9a-fA-F]+$/.test(raw)) fail("القيمة الست عشرية تحتوي 0–9 و A–F فقط.", "x");
    const h = raw.replace(/^0x/i, "");
    const u = BigInt("0x" + h);
    if (u > maxU) fail(`القيمة أكبر من ${N} بت.`, "x");
    bits = u.toString(2).padStart(N, "0");
    steps.push(`كل رقم ست عشري يساوي 4 بتات: ${group(bits)}.`);
  }
  const u = BigInt("0b" + bits), s = decodeSigned(bits);
  const ones = bits[0] === "1" ? -(BigInt("0b" + [...bits].map((b) => (b === "1" ? "0" : "1")).join(""))) : u;
  const sm = bits[0] === "1" ? -BigInt("0b" + (bits.slice(1) || "0")) : u;
  if (mode !== "dec") {
    steps.push(bits[0] === "1"
      ? `البت الأعلى 1، فالعدد سالب بالمتمم الثنائي: القيمة = ${u} − 2^${N} = ${s}.`
      : `البت الأعلى 0، فالعدد موجب وقيمته ${u} بالإشارة وبدونها.`);
  }
  const hex = "0x" + u.toString(16).toUpperCase().padStart(Math.ceil(N / 4), "0");
  return {
    results: [
      { label: "الثنائي (المتمم الثنائي)", value: group(bits), text: bits },
      { label: "الست عشري", value: hex, text: hex },
      { label: "عشري بإشارة (two's complement)", value: s.toString() },
      { label: "عشري بلا إشارة", value: u.toString() },
      { label: "تفسير المتمم الأحادي", value: ones === 0n && bits[0] === "1" ? "-0" : ones.toString() },
      { label: "تفسير الإشارة والمقدار", value: sm === 0n && bits[0] === "1" ? "-0" : sm.toString() },
      { label: `مدى ${N} بت بإشارة`, value: `${min} … ${maxS}` }
    ],
    steps, copy: `${bits} = ${hex} = ${s} (signed) = ${u} (unsigned)`
  };
}
