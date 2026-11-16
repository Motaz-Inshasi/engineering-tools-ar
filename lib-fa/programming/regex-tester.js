import { fail } from "../core/validate.js";

const MAX_CHARS = 200000;
const MAX_MATCHES = 500;
const EXPLAIN_LIMIT = 2000;
const LITERAL = /^\/([\s\S]*)\/([A-Za-z]*)$/;
const QUANT = /\{(\d+)(?:(,)(\d*))?\}/y;
const HEX2 = /[0-9a-fA-F]{2}/y;
const HEX4 = /[0-9a-fA-F]{4}/y;
const FLAG_SET = "dgimsuyv";

const ESCAPES = {
  d: "هر رقم از 0 تا 9",
  D: "هر نویسه‌ای که رقم نباشد",
  w: "هر حرف لاتین یا رقم یا خط زیرین _",
  W: "هر نویسه‌ای که حرف لاتین یا رقم یا _ نباشد",
  s: "هر فاصله خالی (فاصله یا تب یا خط جدید)",
  S: "هر نویسه‌ای که فاصله خالی نباشد",
  b: "مرز کلمه: موقعیتی که نویسه کلمه را از نویسه غیرکلمه جدا می‌کند (نویسه‌ای مصرف نمی‌کند)",
  B: "غیرمرز کلمه: موقعیتی درون کلمه یا بیرون آن (نویسه‌ای مصرف نمی‌کند)",
  n: "خط جدید (LF)",
  r: "بازگشت گاری (CR)",
  t: "تب (Tab)",
  f: "تغذیه صفحه (Form feed)",
  v: "تب عمودی (Vertical tab)"
};

const FLAG_INFO = {
  d: "موقعیت شروع و پایان هر گروه را هم اضافه می‌کند (indices)",
  g: "به جای فقط اولین تطابق، همه تطابق‌ها را پیدا می‌کند",
  i: "تفاوت حروف بزرگ و کوچک را نادیده می‌گیرد",
  m: "باعث می‌شود ^ و $ با ابتدا و انتهای هر سطر تطابق داشته باشند",
  s: "باعث می‌شود نقطه . با خط جدید هم تطابق داشته باشد (dotAll)",
  u: "الگو را با نویسه‌های کامل Unicode بررسی می‌کند و \\p{...} را پشتیبانی می‌کند",
  y: "چسبنده: تطابق دقیقاً از موقعیت lastIndex شروع می‌شود، بدون جست‌وجوی جلوتر",
  v: "نسخه جدیدتر u با پشتیبانی از مجموعه‌های نویسه پیشرفته"
};

function show(s) {
  const t = String(s).replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
  return t.split("$").length > 2 ? t.replace(/\$/g, "﹩") : t;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function codeBlock(inner) {
  return `<pre class="code" dir="ltr"><code>${inner}</code></pre>`;
}

function readFlags(raw) {
  const seen = new Set();
  for (const ch of raw) {
    if (!FLAG_SET.includes(ch)) fail(`پرچم «${ch}» پشتیبانی نمی‌شود. پرچم‌های مجاز: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`پرچم «${ch}» تکراری است.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`مجموعه پرچم‌ها در JavaScript نامعتبر است: ${e.message}`, "flags");
  }
  return raw;
}

function nextIndex(text, i, unicode) {
  if (!unicode) return i + 1;
  const cp = text.codePointAt(i);
  return i + (cp !== undefined && cp > 0xffff ? 2 : 1);
}

function toMatch(m) {
  return {
    index: m.index,
    text: m[0],
    groups: m.slice(1),
    named: m.groups ? { ...m.groups } : null
  };
}

export function findMatches(re, text, limit = MAX_MATCHES) {
  const loop = re.global || re.sticky;
  const list = [];
  let truncated = false;
  re.lastIndex = 0;
  for (;;) {
    const m = re.exec(text);
    if (m === null) break;
    if (list.length === limit) {
      truncated = true;
      break;
    }
    list.push(toMatch(m));
    if (!loop) break;
    if (m[0] === "") re.lastIndex = nextIndex(text, re.lastIndex, re.unicode || re.unicodeSets);
  }
  re.lastIndex = 0;
  return { list, truncated };
}

export function analyze(input) {
  const raw = String(input.pattern ?? "");
  const lit = raw.trim().match(LITERAL);
  const pattern = lit ? lit[1] : raw;
  const flags = readFlags(lit ? lit[2] : String(input.flags ?? "").trim());
  const text = String(input.text ?? "");
  const replace = String(input.replace ?? "");
  if (pattern.length > MAX_CHARS) fail(`الگو بیش از ${MAX_CHARS} نویسه است.`, "pattern");
  if (text.length > MAX_CHARS) fail(`متن بیش از ${MAX_CHARS} نویسه است.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`الگوی عبارت نامعتبر است: ${e.message}`, "pattern");
  }
  const { list, truncated } = findMatches(re, text);
  let replaced = null;
  if (replace !== "") {
    re.lastIndex = 0;
    replaced = text.replace(re, replace);
  }
  return { pattern, flags, text, replace, matches: list, truncated, replaced };
}

function sticky(re, s, i) {
  re.lastIndex = i;
  return re.test(s);
}

function quantAt(p, i) {
  QUANT.lastIndex = i;
  return QUANT.exec(p);
}

function closeAt(p, ch, i) {
  const k = p.indexOf(ch, i);
  return k < 0 ? i + 2 : k + 1;
}

function escapeEnd(p, i) {
  const d = p[i + 1];
  if (d === undefined) return i + 1;
  if (d === "x") return sticky(HEX2, p, i + 2) ? i + 4 : i + 2;
  if (d === "u") {
    if (p[i + 2] === "{") return closeAt(p, "}", i);
    return sticky(HEX4, p, i + 2) ? i + 6 : i + 2;
  }
  if (d === "c") return i + 3;
  if ((d === "p" || d === "P") && p[i + 2] === "{") return closeAt(p, "}", i);
  if (d === "k" && p[i + 2] === "<") return closeAt(p, ">", i);
  if (/[1-9]/.test(d)) {
    let j = i + 1;
    while (j < p.length && /\d/.test(p[j])) j++;
    return j;
  }
  return i + 2;
}

function escapeDesc(tok) {
  const d = tok[1];
  if (d === undefined) return "خط مورب معکوس در انتهای الگو";
  if (d === "0") return "نویسه NUL";
  if (/[1-9]/.test(d)) return `بازگرداندن متن گروه شماره ${tok.slice(1)}`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `بازگرداندن متن گروه نام‌دار «${tok.slice(3, -1)}»`;
  if (d === "x") return `نویسه با کد شانزده‌دهی ${tok.slice(2)}`;
  if (d === "u") return `نویسه با کد Unicode ${tok.slice(2)}`;
  if (d === "c") return `نویسه کنترلی با کلید Ctrl+${tok.slice(2)}`;
  if (d === "p") return `هر نویسه‌ای که در دسته ${tok.slice(2, -1)} باشد`;
  if (d === "P") return `هر نویسه‌ای که در دسته ${tok.slice(2, -1)} نباشد`;
  return `نویسه «${d}» به صورت لفظی (لغو معنای ویژه)`;
}

function classEnd(p, i) {
  let j = p[i + 1] === "^" ? i + 2 : i + 1;
  while (j < p.length && p[j] !== "]") j += p[j] === "\\" ? 2 : 1;
  return Math.min(j + 1, p.length);
}

export function explain(pattern) {
  const rows = [];
  const n = pattern.length;
  let i = 0;
  let group = 0;
  const add = (len, desc) => {
    rows.push([show(pattern.slice(i, i + len)), show(desc)]);
    i += len;
  };
  const quant = (len, desc) => {
    if (pattern[i + len] === "?") add(len + 1, `${desc}، غیرحریص (در کمترین تعداد ممکن متوقف می‌شود)`);
    else add(len, desc);
  };
  while (i < n) {
    const c = pattern[i];
    if (c === "\\") {
      const end = escapeEnd(pattern, i);
      add(end - i, escapeDesc(pattern.slice(i, end)));
    } else if (c === "[") {
      const end = classEnd(pattern, i);
      const neg = pattern[i + 1] === "^";
      const body = pattern.slice(i + (neg ? 2 : 1), end - 1);
      add(end - i, `${neg ? "هر نویسه‌ای غیر از" : "هر نویسه‌ای از"} مجموعه [${body}]`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "گروه بدون ضبط: عناصر را بدون ذخیره متنشان کنار هم می‌آورد");
      else if (pattern.startsWith("(?<=", i)) add(4, "تأکید پسین مثبت: بررسی می‌کند که متن داخل گروه قبل از موقعیت آمده باشد، بدون مصرف نویسه");
      else if (pattern.startsWith("(?<!", i)) add(4, "تأکید پسین منفی: بررسی می‌کند که متن داخل گروه قبل از موقعیت نیامده باشد، بدون مصرف نویسه");
      else if (pattern.startsWith("(?=", i)) add(3, "تأکید پیشین مثبت: بررسی می‌کند که متن داخل گروه بعد از موقعیت بیاید، بدون مصرف نویسه");
      else if (pattern.startsWith("(?!", i)) add(3, "تأکید پیشین منفی: بررسی می‌کند که متن داخل گروه بعد از موقعیت نیاید، بدون مصرف نویسه");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `گروه ضبط نام‌دار «${pattern.slice(i + 3, end - 1)}» (شماره ${group})`);
      } else {
        group += 1;
        add(1, `گروه ضبط شماره ${group}`);
      }
    } else if (c === ")") {
      add(1, "پایان گروه");
    } else if (c === "*") {
      quant(1, "صفر بار یا بیشتر");
    } else if (c === "+") {
      quant(1, "یک بار یا بیشتر");
    } else if (c === "?") {
      quant(1, "صفر یا یک بار (اختیاری)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `دقیقاً ${m[1]} بار` : m[3] === "" ? `حداقل ${m[1]} بار` : `بین ${m[1]} و ${m[3]} بار`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "ابتدای متن (یا ابتدای سطر با پرچم m)");
    } else if (c === "$") {
      add(1, "انتهای متن (یا انتهای سطر با پرچم m)");
    } else if (c === ".") {
      add(1, "هر یک نویسه به جز خط جدید (که با پرچم s شامل آن هم می‌شود)");
    } else if (c === "|") {
      add(1, "جایگزین: یکی از دو طرف تطابق پیدا کند");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `نویسه «${ch}» به صورت لفظی`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "بدون تطابق" : `"${show(v)}"`;
}

function groupsText(m) {
  const parts = m.groups.map((v, i) => `${i + 1}: ${valueText(v)}`);
  if (m.named) for (const [k, v] of Object.entries(m.named)) parts.push(`${k}: ${valueText(v)}`);
  return parts.length ? parts.join("، ") : "—";
}

function highlight(text, list) {
  let out = "";
  let pos = 0;
  for (const m of list) {
    if (m.text === "") continue;
    out += escapeHtml(text.slice(pos, m.index)) + `<span class="mark">${escapeHtml(m.text)}</span>`;
    pos = m.index + m.text.length;
  }
  return codeBlock(out + escapeHtml(text.slice(pos)));
}

export const meta = {
  description: "یک عبارت باقاعده (Regex) با قالب JavaScript را روی متن آزمایش کنید: تعداد تطابق‌ها و جزئیات و گروه‌هایشان را نمایش دهید، آن‌ها را داخل متن مشخص کنید، هر بخش از الگو و معنای پرچم‌هایش را توضیح دهید، و در صورت نیاز تطابق‌ها را جایگزین کنید.",
  keywords: ["regex", "regular expression", "عبارت باقاعده", "عبارت منظم", "آزمون regex", "جایگزینی", "گروه‌ها", "lookahead", "lookbehind"],
  formulas: [{ label: "شکل عبارت باقاعده", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "الگو (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "الگو را بدون / بنویسید، یا کل قالب مانند /abc/gi را بنویسید تا پرچم‌ها از آن گرفته شوند." },
    { id: "flags", label: "پرچم‌ها (Flags)", type: "text", default: "g", help: "از نویسه‌های dgimsuyv، هر پرچم فقط یک بار." },
    { id: "text", label: "متن", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "متن جایگزین (اختیاری)", type: "text", default: "", help: "اگر جایگزینی نمی‌خواهید خالی بگذارید." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["تعداد تطابق‌ها: 3"], note: "مثال: استخراج عددها از متنی ترکیبی و سپس جایگزینی آن‌ها با نماد #." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (فقط اولین ${MAX_MATCHES})` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "هیچ تطابقی برای این الگو در متن پیدا نشد.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `فقط اولین ${MAX_MATCHES} تطابق نمایش داده شد.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "تطابق‌ها",
      head: ["#", "متن منطبق", "موقعیت", "طول", "گروه‌ها"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "متن با برجسته‌سازی تطابق‌ها:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "متن پس از جایگزینی:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "الگوی خالی: با هر موقعیت در متن تطابق دارد." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `الگو بیش از ${EXPLAIN_LIMIT} نویسه است، پس شرح آن به تفصیل نمایش داده نشد.` });
  else blocks.push({ type: "table", wrap: true, caption: "شرح الگو", head: ["نماد", "معنا"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "پرچم‌ها", head: ["پرچم", "معنا"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "بدون پرچم: فقط اولین تطابق نمایش داده می‌شود و حساسیت به حروف بزرگ و کوچک حفظ می‌شود." });
  const results = [
    { label: "تعداد تطابق‌ها", value: countText },
    { label: "اولین تطابق", value: first ? `"${show(first.text)}" در موقعیت ${first.index}` : "ندارد" }
  ];
  const steps = [
    `الگوی استفاده‌شده: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "پرچم g فعال است: جست‌وجو کل متن را می‌پیماید و همه تطابق‌ها را پشت‌سرهم جمع می‌کند." : "پرچم g فعال نیست: فقط اولین تطابق نمایش داده می‌شود.",
    `تعداد تطابق‌های یافت‌شده: ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`جایگزینی با متن «${show(a.replace)}» انجام شد، و جایگزینی مانند JavaScript از شماره و نام گروه‌ها پشتیبانی می‌کند.`);
  const copy = `تعداد تطابق‌ها: ${countText}` + (first ? `، اولین تطابق: "${show(first.text)}" در موقعیت ${first.index}` : "، هیچ تطابقی نیست");
  return { results, steps, copy, blocks };
}
