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
  d: "أي رقم من 0 إلى 9",
  D: "أي حرف ليس رقماً",
  w: "أي حرف لاتيني أو رقم أو الشرطة السفلية _",
  W: "أي حرف ليس حرفاً لاتينياً أو رقماً أو _",
  s: "أي مسافة فارغة (مسافة أو جدولة أو سطر جديد)",
  S: "أي حرف ليس مسافة فارغة",
  b: "حد كلمة: موضع يفصل بين حرف كلمة وغير حرف كلمة (لا يستهلك حرفاً)",
  B: "ليس حد كلمة: موضع داخل الكلمة أو خارجها (لا يستهلك حرفاً)",
  n: "سطر جديد (LF)",
  r: "رجوع العربة (CR)",
  t: "جدولة (Tab)",
  f: "تغذية صفحة (Form feed)",
  v: "جدولة عمودية (Vertical tab)"
};

const FLAG_INFO = {
  d: "يضيف مواضع بداية ونهاية كل مجموعة (indices)",
  g: "يبحث عن كل المطابقات بدلاً من أول مطابقة فقط",
  i: "يتجاهل فرق الأحرف الكبيرة والصغيرة",
  m: "يجعل ^ و $ تطابقان بداية كل سطر ونهايته",
  s: "يجعل النقطة . تطابق سطر جديد أيضاً (dotAll)",
  u: "يعامل النمط برموز Unicode كاملة ويدعم \\p{...}",
  y: "لاصق: تبدأ المطابقة من موضع lastIndex بالضبط دون تخطٍّ",
  v: "إصدار أحدث من u مع دعم مجموعات الأحرف المتقدمة"
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
    if (!FLAG_SET.includes(ch)) fail(`العلم «${ch}» غير مدعوم. الأعلام المسموحة: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`العلم «${ch}» مكرر.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`مجموعة الأعلام غير صالحة في JavaScript: ${e.message}`, "flags");
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
  if (pattern.length > MAX_CHARS) fail(`النمط أطول من ${MAX_CHARS} حرف.`, "pattern");
  if (text.length > MAX_CHARS) fail(`النص أطول من ${MAX_CHARS} حرف.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`نمط التعبير غير صالح: ${e.message}`, "pattern");
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
  if (d === undefined) return "شرطة مائلة عكسية في نهاية النمط";
  if (d === "0") return "حرف NUL";
  if (/[1-9]/.test(d)) return `إرجاع نص المجموعة رقم ${tok.slice(1)}`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `إرجاع نص المجموعة المسماة «${tok.slice(3, -1)}»`;
  if (d === "x") return `الحرف ذو الرمز السداسي ${tok.slice(2)}`;
  if (d === "u") return `الحرف ذو الرمز Unicode ${tok.slice(2)}`;
  if (d === "c") return `حرف تحكم بالمفتاح Ctrl+${tok.slice(2)}`;
  if (d === "p") return `أي حرف ينتمي إلى الفئة ${tok.slice(2, -1)}`;
  if (d === "P") return `أي حرف لا ينتمي إلى الفئة ${tok.slice(2, -1)}`;
  return `الحرف «${d}» حرفياً (إلغاء المعنى الخاص)`;
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
    if (pattern[i + len] === "?") add(len + 1, `${desc}، غير جشعة (تتوقف عند أقل عدد ممكن)`);
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
      add(end - i, `${neg ? "أي حرف ليس من" : "أي حرف واحد من"} المجموعة [${body}]`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "مجموعة بدون التقاط: تجمع العناصر دون حفظ نصها");
      else if (pattern.startsWith("(?<=", i)) add(4, "تأكيد خلفي إيجابي: يتحقق إذا سبق الموضعَ النصُّ داخل المجموعة، دون استهلاك حروف");
      else if (pattern.startsWith("(?<!", i)) add(4, "تأكيد خلفي سلبي: يتحقق إذا لم يسبق الموضعَ النصُّ داخل المجموعة، دون استهلاك حروف");
      else if (pattern.startsWith("(?=", i)) add(3, "تأكيد أمامي إيجابي: يتحقق إذا تلا الموضعَ النصُّ داخل المجموعة، دون استهلاك حروف");
      else if (pattern.startsWith("(?!", i)) add(3, "تأكيد أمامي سلبي: يتحقق إذا لم يتلُ الموضعَ النصُّ داخل المجموعة، دون استهلاك حروف");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `مجموعة التقاط مسمّاة «${pattern.slice(i + 3, end - 1)}» (رقم ${group})`);
      } else {
        group += 1;
        add(1, `مجموعة التقاط رقم ${group}`);
      }
    } else if (c === ")") {
      add(1, "نهاية المجموعة");
    } else if (c === "*") {
      quant(1, "صفر مرة أو أكثر");
    } else if (c === "+") {
      quant(1, "مرة واحدة أو أكثر");
    } else if (c === "?") {
      quant(1, "صفر أو مرة واحدة (اختياري)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `بالضبط ${m[1]} مرة` : m[3] === "" ? `${m[1]} مرة على الأقل` : `بين ${m[1]} و ${m[3]} مرة`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "بداية النص (أو بداية السطر مع العلم m)");
    } else if (c === "$") {
      add(1, "نهاية النص (أو نهاية السطر مع العلم m)");
    } else if (c === ".") {
      add(1, "أي حرف واحد ما عدا سطر جديد (ويشمله العلم s)");
    } else if (c === "|") {
      add(1, "بديل: يتطابق أحد الجانبين");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `الحرف «${ch}» حرفياً`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "غير مطابقة" : `"${show(v)}"`;
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
  description: "اختبر تعبيراً نمطياً (Regex) بصيغة JavaScript على نص: اعرض عدد المطابقات وتفاصيلها ومجموعاتها، وميّزها داخل النص، واشرح كل جزء من النمط ومعنى أعلامه، واستبدل المطابقات عند الحاجة.",
  keywords: ["regex", "regular expression", "تعبير نمطي", "تعبير منتظم", "اختبار regex", "استبدال", "مجموعات", "lookahead", "lookbehind"],
  formulas: [{ label: "شكل التعبير النمطي", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "النمط (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "اكتب النمط دون / ، أو اكتب الصيغة كاملة مثل /abc/gi فتُؤخذ الأعلام منها." },
    { id: "flags", label: "الأعلام (Flags)", type: "text", default: "g", help: "من الأحرف dgimsuyv، كل علم مرة واحدة فقط." },
    { id: "text", label: "النص", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "نص الاستبدال (اختياري)", type: "text", default: "", help: "اتركه فارغاً إن لم ترِد الاستبدال." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["عدد المطابقات: 3"], note: "مثال: استخراج الأرقام من نص مختلط ثم استبدالها بالرمز #." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (أول ${MAX_MATCHES} فقط)` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "لا توجد مطابقات لهذا النمط في النص.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `تم الاقتصار على أول ${MAX_MATCHES} مطابقة.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "المطابقات",
      head: ["#", "النص المطابق", "الموضع", "الطول", "المجموعات"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "النص مع تمييز المطابقات:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "النص بعد الاستبدال:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "النمط فارغ: يطابق كل موضع في النص." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `النمط أطول من ${EXPLAIN_LIMIT} حرف، لذلك لم يُعرض شرحه تفصيلياً.` });
  else blocks.push({ type: "table", wrap: true, caption: "شرح النمط", head: ["الرمز", "المعنى"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "الأعلام", head: ["العلم", "المعنى"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "بدون أعلام: يُعرض أول مطابقة فقط وتبقى حالة الأحرف مميّزة." });
  const results = [
    { label: "عدد المطابقات", value: countText },
    { label: "أول مطابقة", value: first ? `"${show(first.text)}" عند الموضع ${first.index}` : "لا توجد" }
  ];
  const steps = [
    `النمط المستخدم: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "علم g مفعّل: البحث يمرّ على النص كله ويجمع كل المطابقات بالتتابع." : "علم g غير مفعّل: يُعرض أول مطابقة فقط.",
    `عدد المطابقات التي وُجدت: ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`تم تطبيق الاستبدال بالنص «${show(a.replace)}»، ويدعم الاستبدال أرقام المجموعات والأسماء كما في JavaScript.`);
  const copy = `عدد المطابقات: ${countText}` + (first ? `، أول مطابقة: "${show(first.text)}" عند الموضع ${first.index}` : "، لا توجد مطابقات");
  return { results, steps, copy, blocks };
}
