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
  d: "0 سے 9 تک کوئی بھی ہندسہ",
  D: "کوئی بھی حرف جو ہندسہ نہ ہو",
  w: "کوئی بھی لاطینی حرف، ہندسہ، یا انڈرسکور _",
  W: "کوئی بھی حرف جو لاطینی حرف، ہندسہ یا _ نہ ہو",
  s: "کوئی بھی خالی جگہ (اسپیس، ٹیب یا نئی سطر)",
  S: "کوئی بھی حرف جو خالی جگہ نہ ہو",
  b: "لفظ کی حد: وہ مقام جو لفظی حرف اور غیر لفظی حرف کے درمیان ہو (کوئی حرف استعمال نہیں ہوتا)",
  B: "لفظ کی حد نہیں: لفظ کے اندر یا باہر کا مقام (کوئی حرف استعمال نہیں ہوتا)",
  n: "نئی سطر (LF)",
  r: "کیریج ریٹرن (CR)",
  t: "ٹیب (Tab)",
  f: "فارم فیڈ (Form feed)",
  v: "عمودی ٹیب (Vertical tab)"
};

const FLAG_INFO = {
  d: "ہر گروپ کے شروع اور آخر کے مقامات شامل کرتا ہے (indices)",
  g: "پہلی مطابقت کے بجائے تمام مطابقتیں تلاش کرتا ہے",
  i: "بڑے اور چھوٹے حروف کا فرق نظرانداز کرتا ہے",
  m: "^ اور $ کو ہر سطر کے شروع اور آخر سے ملاتا ہے",
  s: "نقطہ . نئی سطر سے بھی ملتا ہے (dotAll)",
  u: "پیٹرن کو مکمل Unicode کوڈ پوائنٹس کے طور پر لیتا ہے اور \\p{...} کو سپورٹ کرتا ہے",
  y: "Sticky: مطابقت بالکل lastIndex کے مقام سے شروع ہوتی ہے، کچھ چھوڑے بغیر",
  v: "u کا جدید ورژن، جو اعلیٰ درجے کے حروف کے گروپس کو سپورٹ کرتا ہے"
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
    if (!FLAG_SET.includes(ch)) fail(`فلیگ «${ch}» سپورٹڈ نہیں ہے۔ اجازت شدہ فلیگز: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`فلیگ «${ch}» دہرایا گیا ہے۔`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`JavaScript میں فلیگز کا مجموعہ درست نہیں: ${e.message}`, "flags");
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
  if (pattern.length > MAX_CHARS) fail(`پیٹرن ${MAX_CHARS} حروف سے زیادہ لمبا ہے۔`, "pattern");
  if (text.length > MAX_CHARS) fail(`متن ${MAX_CHARS} حروف سے زیادہ لمبا ہے۔`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`باقاعدہ اظہار کا پیٹرن درست نہیں: ${e.message}`, "pattern");
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
  if (d === undefined) return "پیٹرن کے آخر میں الٹی ترچھی لکیر";
  if (d === "0") return "NUL حرف";
  if (/[1-9]/.test(d)) return `گروپ نمبر ${tok.slice(1)} کا متن واپس کریں`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `نام دیے گئے گروپ «${tok.slice(3, -1)}» کا متن واپس کریں`;
  if (d === "x") return `ہیکساڈیسیمل کوڈ ${tok.slice(2)} والا حرف`;
  if (d === "u") return `Unicode کوڈ ${tok.slice(2)} والا حرف`;
  if (d === "c") return `Ctrl+${tok.slice(2)} کلید کا کنٹرول حرف`;
  if (d === "p") return `کوئی بھی حرف جو زمرے ${tok.slice(2, -1)} سے تعلق رکھتا ہو`;
  if (d === "P") return `کوئی بھی حرف جو زمرے ${tok.slice(2, -1)} سے تعلق نہ رکھتا ہو`;
  return `حرف «${d}» بطور لفظی حرف (خاص معنی منسوخ)`;
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
    if (pattern[i + len] === "?") add(len + 1, `${desc}، غیر حریص (جتنی کم سے کم تعداد ممکن ہو اتنے پر رک جاتا ہے)`);
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
      add(end - i, `گروپ [${body}] میں سے ${neg ? "کوئی بھی حرف جو نہ ہو" : "کوئی ایک حرف"}`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "غیر محفوظ گروپ: عناصر کو جمع کرتا ہے بغیر ان کا متن محفوظ کیے");
      else if (pattern.startsWith("(?<=", i)) add(4, "مثبت پسِ منظر کی تصدیق: جانچتا ہے کہ مقام سے پہلے گروپ کے اندر کا متن موجود ہے، بغیر حروف استعمال کیے");
      else if (pattern.startsWith("(?<!", i)) add(4, "منفی پسِ منظر کی تصدیق: جانچتا ہے کہ مقام سے پہلے گروپ کے اندر کا متن موجود نہیں، بغیر حروف استعمال کیے");
      else if (pattern.startsWith("(?=", i)) add(3, "مثبت آگے کی تصدیق: جانچتا ہے کہ مقام کے بعد گروپ کے اندر کا متن آتا ہے، بغیر حروف استعمال کیے");
      else if (pattern.startsWith("(?!", i)) add(3, "منفی آگے کی تصدیق: جانچتا ہے کہ مقام کے بعد گروپ کے اندر کا متن نہیں آتا، بغیر حروف استعمال کیے");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `نامزد کیپچر گروپ «${pattern.slice(i + 3, end - 1)}» (نمبر ${group})`);
      } else {
        group += 1;
        add(1, `کیپچر گروپ نمبر ${group}`);
      }
    } else if (c === ")") {
      add(1, "گروپ کا اختتام");
    } else if (c === "*") {
      quant(1, "صفر یا اس سے زیادہ بار");
    } else if (c === "+") {
      quant(1, "ایک بار یا اس سے زیادہ");
    } else if (c === "?") {
      quant(1, "صفر یا ایک بار (اختیاری)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `بالکل ${m[1]} بار` : m[3] === "" ? `کم از کم ${m[1]} بار` : `${m[1]} اور ${m[3]} بار کے درمیان`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "متن کا آغاز (یا فلیگ m کے ساتھ سطر کا آغاز)");
    } else if (c === "$") {
      add(1, "متن کا اختتام (یا فلیگ m کے ساتھ سطر کا اختتام)");
    } else if (c === ".") {
      add(1, "کوئی بھی ایک حرف سوائے نئی سطر کے (فلیگ s اسے بھی شامل کرتا ہے)");
    } else if (c === "|") {
      add(1, "متبادل: دونوں میں سے کوئی ایک طرف مطابقت کرے");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `حرف «${ch}» بطور لفظی حرف`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "مطابقت نہیں" : `"${show(v)}"`;
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
  description: "JavaScript کے فارمیٹ میں ایک باقاعدہ اظہار (Regex) کو متن پر آزمائیں: مطابقتوں کی تعداد، تفصیلات اور گروپس دکھائیں، انہیں متن میں نمایاں کریں، پیٹرن کے ہر حصے اور اس کے فلیگز کے معنی بتائیں، اور ضرورت ہو تو مطابقتیں بدلیں۔",
  keywords: ["regex", "regular expression", "باقاعدہ اظہار", "منظم اظہار", "regex ٹیسٹ", "متبادل", "گروپس", "lookahead", "lookbehind"],
  formulas: [{ label: "Regex کی شکل", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "پیٹرن (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "پیٹرن کو / کے بغیر لکھیں، یا پوری شکل جیسے /abc/gi لکھیں تو فلیگز اسی سے لے لیے جائیں گے۔" },
    { id: "flags", label: "فلیگز (Flags)", type: "text", default: "g", help: "dgimsuyv حروف میں سے، ہر فلیگ صرف ایک بار۔" },
    { id: "text", label: "متن", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "متبادل متن (اختیاری)", type: "text", default: "", help: "اگر متبادل نہیں چاہیے تو اسے خالی چھوڑ دیں۔" }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["مطابقتوں کی تعداد: 3"], note: "مثال: مخلوط متن سے ہندسے نکالنا اور انہیں # علامت سے بدلنا۔" },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (صرف پہلی ${MAX_MATCHES})` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "اس متن میں اس پیٹرن کی کوئی مطابقت نہیں ملی۔", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `صرف پہلی ${MAX_MATCHES} مطابقتیں دکھائی گئی ہیں۔`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "مطابقتیں",
      head: ["#", "مطابق متن", "مقام", "لمبائی", "گروپس"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "مطابقتیں نمایاں کیے ہوئے متن:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "متبادل کے بعد متن:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "پیٹرن خالی ہے: متن کے ہر مقام سے مطابقت کرتا ہے۔" });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `پیٹرن ${EXPLAIN_LIMIT} حروف سے زیادہ لمبا ہے، اس لیے اس کی تفصیلی وضاحت نہیں دکھائی گئی۔` });
  else blocks.push({ type: "table", wrap: true, caption: "پیٹرن کی وضاحت", head: ["علامت", "معنی"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "فلیگز", head: ["فلیگ", "معنی"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "بغیر فلیگز: صرف پہلی مطابقت دکھائی جاتی ہے اور حروف کی حالت (بڑے/چھوٹے) الگ شمار ہوتی ہے۔" });
  const results = [
    { label: "مطابقتوں کی تعداد", value: countText },
    { label: "پہلی مطابقت", value: first ? `"${show(first.text)}" مقام ${first.index} پر` : "کوئی نہیں" }
  ];
  const steps = [
    `استعمال شدہ پیٹرن: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "فلیگ g فعال ہے: تلاش پورے متن پر چلتی ہے اور تمام مطابقتیں یکے بعد دیگرے جمع کرتی ہے۔" : "فلیگ g فعال نہیں: صرف پہلی مطابقت دکھائی جاتی ہے۔",
    `پائی گئی مطابقتوں کی تعداد: ${countText}۔`
  ];
  if (a.replaced !== null) steps.push(`متبادل «${show(a.replace)}» کے ساتھ لاگو کیا گیا، اور متبادل میں JavaScript کی طرح گروپ نمبرز اور ناموں کو سپورٹ کیا جاتا ہے۔`);
  const copy = `مطابقتوں کی تعداد: ${countText}` + (first ? `، پہلی مطابقت: "${show(first.text)}" مقام ${first.index} پر` : "، کوئی مطابقت نہیں");
  return { results, steps, copy, blocks };
}
