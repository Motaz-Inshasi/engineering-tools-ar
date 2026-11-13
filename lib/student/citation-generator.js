import { choice, fail, str } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

const IEEE_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
const MLA_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

function pe(s) {
  return /[.?!]$/.test(s) ? s : `${s}.`;
}

function join(parts, sep = ", ") {
  return parts.filter((p) => p !== "" && p !== null && p !== undefined).join(sep);
}

function parseAuthors(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const t = line.trim();
    if (t === "") return;
    const idx = t.indexOf(",");
    const last = idx < 0 ? t : t.slice(0, idx).trim();
    const given = idx < 0 ? "" : t.slice(idx + 1).trim().replace(/\s+/g, " ");
    if (last === "") fail(`السطر ${i + 1} من المؤلفين: اكتب اللقب قبل الفاصلة، مثل: Smith, John`, "authors");
    out.push({ last, given });
  });
  return out;
}

function initials(given) {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => tok.split("-").filter(Boolean).map((p) => `${p[0].toUpperCase()}.`).join("-"))
    .join(" ");
}

function apaName(a) {
  const i = initials(a.given);
  return i ? `${a.last}, ${i}` : a.last;
}

function apaNames(list) {
  const n = list.map(apaName);
  if (n.length === 1) return n[0];
  return `${n.slice(0, -1).join(", ")}, & ${n[n.length - 1]}`;
}

function ieeeName(a) {
  const i = initials(a.given);
  return i ? `${i} ${a.last}` : a.last;
}

function ieeeNames(list) {
  const n = list.map(ieeeName);
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n.slice(0, -1).join(", ")}, and ${n[n.length - 1]}`;
}

function fullName(a) {
  return a.given ? `${a.given} ${a.last}` : a.last;
}

function mlaNames(list) {
  if (list.length === 0) return "";
  const f = list[0];
  const first = f.given ? `${f.last}, ${f.given}` : f.last;
  if (list.length === 1) return first;
  if (list.length === 2) return `${first}, and ${fullName(list[1])}`;
  return `${first}, et al.`;
}

function ordinal(ed) {
  if (!/^\d+$/.test(ed)) return ed;
  const n = Number(ed);
  const k = n % 100;
  const suf = k >= 11 && k <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th";
  return `${n}${suf} ed.`;
}

function parseDate(raw, key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) fail("تاريخ الوصول يجب أن يكون بالصيغة YYYY-MM-DD.", key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail("تاريخ الوصول ليس تاريخاً صحيحاً.", key);
  return { y, mo, d };
}

function apa(x) {
  const titleSeg = x.type === "book" && x.ed ? `${x.title} (${x.ed})` : x.title;
  const parts = [];
  if (x.authors.length) parts.push(`${apaNames(x.authors)} (${x.year}).`, pe(titleSeg));
  else parts.push(`${titleSeg.replace(/[.?!]+$/, "")} (${x.year}).`);
  if (x.type === "book") parts.push(pe(x.publisher));
  if (x.type === "journal") {
    let j = x.journal;
    if (x.volume) j += `, ${x.volume}${x.issue ? `(${x.issue})` : ""}`;
    else if (x.issue) j += ` (${x.issue})`;
    if (x.pages) j += `, ${x.pages}`;
    parts.push(pe(j));
  }
  if (x.type === "website") {
    if (x.site) parts.push(pe(x.site));
    parts.push(x.url);
  }
  return join(parts, " ");
}

function ieee(x) {
  const names = x.authors.length ? ieeeNames(x.authors) : "";
  if (x.type === "book") {
    const pub = x.city ? `${x.city}: ${x.publisher}` : x.publisher;
    return `${join([names, x.title, x.ed]).replace(/\.$/, "")}. ${join([pub, x.year])}.`;
  }
  const head = `${names ? `${names}, ` : ""}"${x.title},"`;
  if (x.type === "journal") {
    const pages = x.pages ? `${/[-–—]/.test(x.pages) ? "pp." : "p."} ${x.pages}` : "";
    const seg = join([x.journal, x.volume ? `vol. ${x.volume}` : "", x.issue ? `no. ${x.issue}` : "", pages, x.year]);
    return `${head} ${seg}.`;
  }
  const acc = x.accessed ? ` (accessed ${IEEE_MONTHS[x.accessed.mo - 1]} ${x.accessed.d}, ${x.accessed.y})` : "";
  return `${head} ${join([x.site, x.year], ", ")}. [Online]. Available: ${x.url}${acc}.`;
}

function mla(x) {
  const names = mlaNames(x.authors);
  const head = names ? `${pe(names)} ` : "";
  if (x.type === "book") {
    return `${head}${pe(x.title)} ${join([x.ed, x.publisher, x.year])}.`;
  }
  if (x.type === "journal") {
    const pages = x.pages ? `${/[-–—]/.test(x.pages) ? "pp." : "p."} ${x.pages}` : "";
    const seg = join([x.journal, x.volume ? `vol. ${x.volume}` : "", x.issue ? `no. ${x.issue}` : "", x.year, pages]);
    return `${head}"${pe(x.title)}" ${seg}.`;
  }
  const acc = x.accessed ? ` Accessed ${x.accessed.d} ${MLA_MONTHS[x.accessed.mo - 1]} ${x.accessed.y}.` : "";
  return `${head}"${pe(x.title)}" ${join([x.site, x.year], ", ")}, ${x.url}.${acc}`;
}

export const meta = {
  description: "أنشئ مرجع المصدر بثلاثة أنماط شائعة APA 7 وIEEE وMLA 9 للكتب والمقالات العلمية والمواقع الإلكترونية، مع نسخ النتائج الثلاث.",
  keywords: ["توثيق المصادر", "مراجع", "APA", "IEEE", "MLA", "citation", "bibliography", "اقتباس"],
  formulas: [
    { label: "APA 7 (كتاب)", tex: "\\text{Last, F. M. (Year). Title. Publisher.}" },
    { label: "IEEE (كتاب)", tex: "\\text{F. M. Last, Title, Publisher, Year.}" },
    { label: "MLA 9 (كتاب)", tex: "\\text{Last, First. Title. Publisher, Year.}" }
  ],
  inputs: [
    { id: "type", label: "نوع المصدر", type: "select", default: "book", options: [["book", "كتاب"], ["journal", "مقالة في دورية علمية"], ["website", "موقع إلكتروني"]] },
    { id: "authors", label: "المؤلفون", type: "textarea", rows: 3, placeholder: "Smith, John\nDoe, Ann Marie", help: "مؤلف في كل سطر بالصيغة: اللقب، الاسم الأول والأوسط. اتركه فارغاً إن لم يوجد مؤلف." },
    { id: "title", label: "العنوان", type: "text", placeholder: "عنوان الكتاب أو المقالة أو الصفحة", help: "عنوان الكتاب، أو عنوان المقالة، أو عنوان الصفحة." },
    { id: "year", label: "سنة النشر", type: "number", default: "2020" },
    { id: "publisher", label: "الناشر", type: "text", when: { type: ["book"] } },
    { id: "city", label: "مدينة النشر", type: "text", when: { type: ["book"] }, help: "تُستخدم في صيغة IEEE فقط." },
    { id: "edition", label: "الطبعة", type: "text", when: { type: ["book"] }, help: "اختياري، مثل 2 أو 3." },
    { id: "journal", label: "اسم الدورية", type: "text", when: { type: ["journal"] } },
    { id: "volume", label: "المجلد", type: "text", when: { type: ["journal"] } },
    { id: "issue", label: "العدد", type: "text", when: { type: ["journal"] } },
    { id: "pages", label: "الصفحات", type: "text", when: { type: ["journal"] }, placeholder: "45-67", help: "مثل 45-67 أو 12." },
    { id: "site", label: "اسم الموقع", type: "text", when: { type: ["website"] } },
    { id: "url", label: "الرابط", type: "text", when: { type: ["website"] }, placeholder: "https://example.com/page" },
    { id: "accessed", label: "تاريخ الوصول", type: "text", when: { type: ["website"] }, placeholder: "2024-03-05", help: "اختياري بصيغة YYYY-MM-DD." }
  ],
  example: {
    values: { type: "book", authors: "Smith, John", title: "Engineering Basics", year: "2020", publisher: "Pearson", city: "", edition: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: "" },
    expect: ["Smith, J. (2020). Engineering Basics. Pearson."],
    note: "مثال: كتاب من مؤلف واحد بصيغة APA 7."
  },
  invalid: { values: { type: "book", authors: "Smith, John", title: "", year: "2020", publisher: "Pearson" } },
  related: ["word-counter", "gpa-calculator", "study-planner"]
};

export function solve(input) {
  const type = choice(input, "type", "نوع المصدر", ["book", "journal", "website"], "book");
  const authors = parseAuthors(str(input, "authors", "المؤلفون", { optional: true }));
  if (authors.length > 20) fail("يدعم هذا المولّد حتى 20 مؤلفاً في نمط APA.", "authors");
  const title = str(input, "title", "العنوان", { optional: true }).trim();
  if (title === "") fail("أدخل عنوان المصدر.", "title");
  const year = num(input, "year", "سنة النشر", { integer: true, min: 1000, max: 2100 });
  const x = { type, authors, title, year, ed: "", publisher: "", city: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: null };
  if (type === "book") {
    x.publisher = str(input, "publisher", "الناشر", { optional: true }).trim();
    if (x.publisher === "") fail("أدخل اسم الناشر للكتاب.", "publisher");
    x.city = str(input, "city", "مدينة النشر", { optional: true }).trim();
    const ed = str(input, "edition", "الطبعة", { optional: true }).trim();
    x.ed = ed ? ordinal(ed) : "";
  }
  if (type === "journal") {
    x.journal = str(input, "journal", "اسم الدورية", { optional: true }).trim();
    if (x.journal === "") fail("أدخل اسم الدورية.", "journal");
    x.volume = str(input, "volume", "المجلد", { optional: true }).trim();
    x.issue = str(input, "issue", "العدد", { optional: true }).trim();
    x.pages = str(input, "pages", "الصفحات", { optional: true }).trim();
  }
  if (type === "website") {
    x.site = str(input, "site", "اسم الموقع", { optional: true }).trim();
    x.url = str(input, "url", "الرابط", { optional: true }).trim();
    if (x.url === "") fail("أدخل رابط الموقع.", "url");
    const acc = str(input, "accessed", "تاريخ الوصول", { optional: true }).trim();
    if (acc !== "") x.accessed = parseDate(acc, "accessed");
  }
  const a = apa(x), i = ieee(x), m = mla(x);
  return {
    results: [
      { label: "APA 7", value: a, text: a },
      { label: "IEEE", value: i, text: i },
      { label: "MLA 9", value: m, text: m }
    ],
    steps: [
      "APA 7: اللقب، الحرف الأول من الاسم (السنة). العنوان. الناشر أو الدورية والرابط.",
      "IEEE: الحرف الأول من الاسم ثم اللقب، والعنوان بين علامتي تنصيص، ثم الناشر أو الدورية والسنة.",
      "MLA 9: اللقب، الاسم الأول كاملاً، ثم العنوان والناشر أو الدورية والسنة."
    ],
    copy: `APA 7: ${a}\nIEEE: ${i}\nMLA 9: ${m}`,
    values: { type }
  };
}
