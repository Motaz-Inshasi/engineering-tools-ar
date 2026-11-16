import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "Unix فائل کی اجازتوں کو آکٹل شکل (مثلاً 755) اور علامتی شکل (مثلاً rwxr-xr-x) کے درمیان تبدیل کریں، مالک، گروپ اور دیگر کے لیے اجازتوں کی تقسیم، خصوصی بٹس SUID، SGID اور Sticky، اور تیار chmod کمانڈ کے ساتھ۔",
  keywords: ["chmod", "اجازتیں", "فائل کی اجازتیں", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "ہر زمرے کے لیے اجازتوں کا مجموعہ", tex: "d = 4r + 2w + 1x" },
    { label: "مکمل آکٹل شکل", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "اجازتیں", type: "text", default: "755", help: "جیسے 755، 0755، 4755، rwxr-xr-x یا -rwxr-xr-x لکھیں۔" },
    { id: "file", label: "فائل کا نام", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "مثال: اسکرپٹ کے لیے عام عمل درآمد کی اجازتیں۔" },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("فائل کی اجازتیں درج کریں، جیسے 755 یا rwxr-xr-x۔", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("آکٹل شکل میں صرف 0 سے 7 تک کے ہندسے قبول ہوتے ہیں، جیسے 755 یا 4755۔", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("علامتی شکل 9 علامات پر مشتمل ہونی چاہیے، جیسے rwxr-xr-x، اور اس سے پہلے فائل کی قسم کا خانہ بھی آ سکتا ہے۔", "perm");
  const digit = (r, w, x) => (r === "r" ? 4 : 0) + (w === "w" ? 2 : 0) + (x === "x" || x === "s" || x === "t" ? 1 : 0);
  const du = digit(m[1], m[2], m[3]);
  const dg = digit(m[4], m[5], m[6]);
  const doth = digit(m[7], m[8], m[9]);
  const sp = (m[3] === "s" || m[3] === "S" ? 4 : 0) | (m[6] === "s" || m[6] === "S" ? 2 : 0) | (m[9] === "t" || m[9] === "T" ? 1 : 0);
  return sp * 512 + du * 64 + dg * 8 + doth;
}

function octalOf(mode) {
  const sp = (mode >> 9) & 7;
  return mode.toString(8).padStart(sp ? 4 : 3, "0");
}

function symbolicOf(mode) {
  const sp = (mode >> 9) & 7;
  const cls = [(mode >> 6) & 7, (mode >> 3) & 7, mode & 7];
  let out = "";
  cls.forEach((d, i) => {
    out += d & 4 ? "r" : "-";
    out += d & 2 ? "w" : "-";
    const ex = d & 1;
    if (i === 2 && sp & 1) out += ex ? "t" : "T";
    else if (i < 2 && sp & (i === 0 ? 4 : 2)) out += ex ? "s" : "S";
    else out += ex ? "x" : "-";
  });
  return out;
}

export function solve(input) {
  const mode = parsePerm(input.perm);
  const file = str(input, "file", "فائل کا نام", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("فائل کے نام میں کمانڈ کے لیے غیر مجاز علامات ہیں، جیسے اقتباسی نشانات، $ یا الٹی ترچھی لکیر۔", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["مالک (u)", "گروپ (g)", "دیگر (o)"];
  const digits = [(mode >> 6) & 7, (mode >> 3) & 7, mode & 7];
  const cell = (on, val) => (on ? `✓ ${val}` : "✗ 0");
  const rows = digits.map((d, i) => [
    names[i],
    cell(d & 4, 4),
    cell(d & 2, 2),
    cell(d & 1, 1),
    String(d)
  ]);
  const steps = [];
  const labels = ["u", "g", "o"];
  digits.forEach((d, i) => {
    const terms = [d & 4 ? "4" : null, d & 2 ? "2" : null, d & 1 ? "1" : null].filter(Boolean);
    steps.push({ text: `${names[i]} کی اجازتوں کا مجموعہ:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "جب فائل چلائی جاتی ہے تو وہ اپنے مالک کی اجازتوں کے ساتھ چلتی ہے، اور مالک کے عمل درآمد کے خانے میں s یا S کے طور پر ظاہر ہوتی ہے۔"],
    [2, "SGID", "2000", "جب فائل چلائی جاتی ہے تو وہ اپنے گروپ کی اجازتوں کے ساتھ چلتی ہے، اور فولڈرز میں نئی فائلوں کو گروپ وراثت میں ملتا ہے، اور گروپ کے عمل درآمد کے خانے میں s یا S کے طور پر ظاہر ہوتی ہے۔"],
    [1, "Sticky", "1000", "فولڈر میں صارف دوسروں کی فائلیں حذف نہیں کر سکتا، اور دیگر کے عمل درآمد کے خانے میں t یا T کے طور پر ظاہر ہوتی ہے۔"]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`مکمل آکٹل شکل: ${octal}، اور علامتی شکل: ${sym}۔`);
  const blocks = [
    { type: "table", caption: "زمروں میں اجازتوں کی تقسیم", head: ["زمرہ", "پڑھنا r = 4", "لکھنا w = 2", "عمل درآمد x = 1", "مجموعہ"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `خصوصی بٹس فعال ہیں: 3 میں سے ${active.length}۔ ${/[ST]/.test(sym) ? "بڑا حرف S یا T کا مطلب ہے کہ خصوصیت فعال ہے، لیکن بنیادی عمل درآمد کا بٹ فعال نہیں۔" : "چھوٹا حرف s یا t کا مطلب ہے کہ خصوصیت اور اس کے ساتھ عمل درآمد دونوں فعال ہیں۔"}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "انتباہ: اجازت 777 سب کو پڑھنے، لکھنے اور چلانے کی اجازت دیتی ہے، جو زیادہ تر صورتوں میں سکیورٹی کا خطرہ ہے۔", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "انتباہ: دیگر کے لیے لکھنے کی اجازت کھلی ہے، یعنی کوئی بھی صارف اس فائل میں تبدیلی کر سکتا ہے۔", tone: "warn" });
  return {
    results: [
      { label: "آکٹل شکل", value: octal },
      { label: "علامتی شکل", value: sym },
      { label: "chmod کمانڈ", value: command },
      { label: "خصوصی بٹس", value: active.length ? active.map(([, name]) => name).join("، ") : "کوئی نہیں" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
