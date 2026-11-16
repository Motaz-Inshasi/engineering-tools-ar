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
    if (last === "") fail(`Line ${i + 1} of the authors: write the surname before the comma, for example: Smith, John`, "authors");
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
  if (!m) fail("Access date must be in YYYY-MM-DD format.", key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail("The access date is not a valid date.", key);
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
  description: "Create a source reference in three common styles: APA 7, IEEE and MLA 9, for books, journal articles and websites, with copy options for all three results.",
  keywords: ["Citing sources", "references", "APA", "IEEE", "MLA", "citation", "bibliography", "citation"],
  formulas: [
    { label: "APA 7 (book)", tex: "\\text{Last, F. M. (Year). Title. Publisher.}" },
    { label: "IEEE (book)", tex: "\\text{F. M. Last, Title, Publisher, Year.}" },
    { label: "MLA 9 (book)", tex: "\\text{Last, First. Title. Publisher, Year.}" }
  ],
  inputs: [
    { id: "type", label: "Source type", type: "select", default: "book", options: [["book", "Book"], ["journal", "Journal article"], ["website", "Website"]] },
    { id: "authors", label: "Authors", type: "textarea", rows: 3, placeholder: "Smith, John\nDoe, Ann Marie", help: "One author per line in the form: Last name, First and middle names. Leave empty if there is no author." },
    { id: "title", label: "Title", type: "text", placeholder: "Title of the book, article or page", help: "Title of the book, article, or web page." },
    { id: "year", label: "Publication year", type: "number", default: "2020" },
    { id: "publisher", label: "Publisher", type: "text", when: { type: ["book"] } },
    { id: "city", label: "City of publication", type: "text", when: { type: ["book"] }, help: "Used in IEEE format only." },
    { id: "edition", label: "Edition", type: "text", when: { type: ["book"] }, help: "Optional, e.g. 2 or 3." },
    { id: "journal", label: "Journal name", type: "text", when: { type: ["journal"] } },
    { id: "volume", label: "Volume", type: "text", when: { type: ["journal"] } },
    { id: "issue", label: "Issue", type: "text", when: { type: ["journal"] } },
    { id: "pages", label: "Pages", type: "text", when: { type: ["journal"] }, placeholder: "45-67", help: "e.g. 45-67 or 12." },
    { id: "site", label: "Website name", type: "text", when: { type: ["website"] } },
    { id: "url", label: "URL", type: "text", when: { type: ["website"] }, placeholder: "https://example.com/page" },
    { id: "accessed", label: "Access date", type: "text", when: { type: ["website"] }, placeholder: "2024-03-05", help: "Optional, in YYYY-MM-DD format." }
  ],
  example: {
    values: { type: "book", authors: "Smith, John", title: "Engineering Basics", year: "2020", publisher: "Pearson", city: "", edition: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: "" },
    expect: ["Smith, J. (2020). Engineering Basics. Pearson."],
    note: "Example: a book by one author in APA 7 format."
  },
  invalid: { values: { type: "book", authors: "Smith, John", title: "", year: "2020", publisher: "Pearson" } },
  related: ["word-counter", "gpa-calculator", "study-planner"]
};

export function solve(input) {
  const type = choice(input, "type", "Source type", ["book", "journal", "website"], "book");
  const authors = parseAuthors(str(input, "authors", "Authors", { optional: true }));
  if (authors.length > 20) fail("This generator supports up to 20 authors in APA style.", "authors");
  const title = str(input, "title", "Title", { optional: true }).trim();
  if (title === "") fail("Enter the source title.", "title");
  const year = num(input, "year", "Publication year", { integer: true, min: 1000, max: 2100 });
  const x = { type, authors, title, year, ed: "", publisher: "", city: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: null };
  if (type === "book") {
    x.publisher = str(input, "publisher", "Publisher", { optional: true }).trim();
    if (x.publisher === "") fail("Enter the publisher name for the book.", "publisher");
    x.city = str(input, "city", "City of publication", { optional: true }).trim();
    const ed = str(input, "edition", "Edition", { optional: true }).trim();
    x.ed = ed ? ordinal(ed) : "";
  }
  if (type === "journal") {
    x.journal = str(input, "journal", "Journal name", { optional: true }).trim();
    if (x.journal === "") fail("Enter the journal name.", "journal");
    x.volume = str(input, "volume", "Volume", { optional: true }).trim();
    x.issue = str(input, "issue", "Issue", { optional: true }).trim();
    x.pages = str(input, "pages", "Pages", { optional: true }).trim();
  }
  if (type === "website") {
    x.site = str(input, "site", "Website name", { optional: true }).trim();
    x.url = str(input, "url", "URL", { optional: true }).trim();
    if (x.url === "") fail("Enter the website URL.", "url");
    const acc = str(input, "accessed", "Access date", { optional: true }).trim();
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
      "APA 7: Last name, first initial (Year). Title. Publisher or journal, and link.",
      "IEEE: first initial then last name, title in quotation marks, then publisher or journal and year.",
      "MLA 9: Last name, full first name, then title, publisher or journal, and year."
    ],
    copy: `APA 7: ${a}\nIEEE: ${i}\nMLA 9: ${m}`,
    values: { type }
  };
}
