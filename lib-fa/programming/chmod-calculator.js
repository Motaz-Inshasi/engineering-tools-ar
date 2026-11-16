import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "مجوزهای فایل یونیکس را بین قالب هشتایی (مانند 755) و قالب نمادین (مانند rwxr-xr-x) تبدیل کنید، با توزیع مجوزها بین مالک و گروه و دیگران و بیت‌های ویژه SUID و SGID و Sticky، و دستور آماده chmod.",
  keywords: ["chmod", "مجوز", "مجوزهای فایل", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "مجموع مجوزها برای هر دسته", tex: "d = 4r + 2w + 1x" },
    { label: "قالب هشتایی کامل", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "مجوزها", type: "text", default: "755", help: "مانند 755 یا 0755 یا 4755 یا rwxr-xr-x یا -rwxr-xr-x بنویسید." },
    { id: "file", label: "نام فایل", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "مثال: مجوز اجرای عمومی برای اسکریپت." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("مجوزهای فایل را وارد کنید، مانند 755 یا rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("قالب هشتایی فقط عددهای 0 تا 7 را می‌پذیرد، مانند 755 یا 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("قالب نمادین باید از 9 نماد مانند rwxr-xr-x تشکیل شده باشد و می‌تواند قبل از آن خانه نوع فایل بیاید.", "perm");
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
  const file = str(input, "file", "نام فایل", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("نام فایل شامل نمادهای غیرمجاز در دستور است، مانند گیومه یا $ یا خط مورب معکوس.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["مالک (u)", "گروه (g)", "دیگران (o)"];
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
    steps.push({ text: `مجموع مجوزهای ${names[i]}:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "هنگام اجرای فایل، با مجوزهای مالکش اجرا می‌شود و در خانه اجرای مالک به صورت حرف s یا S نمایش داده می‌شود."],
    [2, "SGID", "2000", "هنگام اجرای فایل، با مجوزهای گروهش اجرا می‌شود؛ در پوشه‌ها گروه به فایل‌های جدید منتقل می‌شود و در خانه اجرای گروه به صورت حرف s یا S نمایش داده می‌شود."],
    [1, "Sticky", "1000", "در پوشه، کاربر نمی‌تواند فایل‌های دیگران را حذف کند و در خانه اجرای دیگران به صورت حرف t یا T نمایش داده می‌شود."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`قالب هشتایی کامل: ${octal} و قالب نمادین: ${sym}.`);
  const blocks = [
    { type: "table", caption: "توزیع مجوزها بین دسته‌ها", head: ["دسته", "خواندن r = 4", "نوشتن w = 2", "اجرا x = 1", "مجموع"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `بیت‌های ویژه فعال: ${active.length} از 3. ${/[ST]/.test(sym) ? "حرف بزرگ S یا T یعنی ویژگی فعال است اما بیت اجرای پایه فعال نیست." : "حرف کوچک s یا t یعنی ویژگی و اجرا هر دو فعال هستند."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "هشدار: مجوز 777 به همه خواندن و نوشتن و اجرا می‌دهد، که در بیشتر موارد خطر امنیتی است.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "هشدار: مجوز نوشتن برای دیگران باز است، یعنی هر کاربری می‌تواند این فایل را تغییر دهد.", tone: "warn" });
  return {
    results: [
      { label: "قالب هشتایی", value: octal },
      { label: "قالب نمادین", value: sym },
      { label: "دستور chmod", value: command },
      { label: "بیت‌های ویژه", value: active.length ? active.map(([, name]) => name).join("، ") : "ندارد" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
