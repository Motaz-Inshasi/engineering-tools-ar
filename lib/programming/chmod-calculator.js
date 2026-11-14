import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "حوّل صلاحيات ملف Unix بين الصيغة الثمانية (مثل 755) والصيغة الرمزية (مثل rwxr-xr-x)، مع توزيع الصلاحيات على المالك والمجموعة والآخرين والبتات الخاصة SUID وSGID وSticky، وأمر chmod الجاهز.",
  keywords: ["chmod", "صلاحيات", "صلاحيات الملفات", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "مجموع الصلاحيات لكل فئة", tex: "d = 4r + 2w + 1x" },
    { label: "الصيغة الثمانية الكاملة", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "الصلاحيات", type: "text", default: "755", help: "اكتب مثل 755 أو 0755 أو 4755 أو rwxr-xr-x أو -rwxr-xr-x." },
    { id: "file", label: "اسم الملف", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "مثال: صلاحيات تنفيذ عامة للسكربت." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("أدخل صلاحيات الملف، مثل 755 أو rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("الصيغة الثمانية تقبل الأرقام من 0 إلى 7 فقط، مثل 755 أو 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("الصيغة الرمزية يجب أن تتكون من 9 رموز مثل rwxr-xr-x، ويمكن أن تسبقها خانة نوع الملف.", "perm");
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
  const file = str(input, "file", "اسم الملف", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("اسم الملف يحتوي على رموز غير مسموحة في الأمر، مثل علامات الاقتباس أو $ أو الفاصلة المائلة العكسية.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["المالك (u)", "المجموعة (g)", "الآخرون (o)"];
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
    steps.push({ text: `مجموع صلاحيات ${names[i]}:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "عند تنفيذ الملف يعمل بصلاحيات مالكه، ويظهر في خانة تنفيذ المالك كحرف s أو S."],
    [2, "SGID", "2000", "عند تنفيذ الملف يعمل بصلاحيات مجموعته، وفي المجلدات تُورَث المجموعة للملفات الجديدة، ويظهر في خانة تنفيذ المجموعة كحرف s أو S."],
    [1, "Sticky", "1000", "في المجلد لا يستطيع المستخدم حذف ملفات غيره، ويظهر في خانة تنفيذ الآخرين كحرف t أو T."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`الصيغة الثمانية الكاملة: ${octal}، والصيغة الرمزية: ${sym}.`);
  const blocks = [
    { type: "table", caption: "توزيع الصلاحيات على الفئات", head: ["الفئة", "قراءة r = 4", "كتابة w = 2", "تنفيذ x = 1", "المجموع"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `البتات الخاصة مفعّلة: ${active.length} من 3. ${/[ST]/.test(sym) ? "الحرف الكبير S أو T يعني أن الخاصية مفعّلة لكن بت التنفيذ الأساسي غير مفعّل." : "الحرف الصغير s أو t يعني أن الخاصية ومعها التنفيذ مفعّلان."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "تحذير: الصلاحية 777 تمنح الجميع القراءة والكتابة والتنفيذ، وهذا خطر أمني في معظم الحالات.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "تحذير: صلاحية الكتابة مفتوحة للآخرين، أي مستخدم يستطيع تعديل هذا الملف.", tone: "warn" });
  return {
    results: [
      { label: "الصيغة الثمانية", value: octal },
      { label: "الصيغة الرمزية", value: sym },
      { label: "أمر chmod", value: command },
      { label: "البتات الخاصة", value: active.length ? active.map(([, name]) => name).join("، ") : "لا توجد" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
