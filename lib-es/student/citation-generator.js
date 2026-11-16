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
    if (last === "") fail(`Línea ${i + 1} de los autores: escriba el apellido antes de la coma, por ejemplo: Smith, John`, "authors");
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
  if (!m) fail("La fecha de acceso debe tener el formato AAAA-MM-DD.", key);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) fail("La fecha de acceso no es una fecha válida.", key);
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
  description: "Cree la referencia de la fuente en tres estilos habituales: APA 7, IEEE y MLA 9, para libros, artículos científicos y sitios web, con opciones para copiar los tres resultados.",
  keywords: ["Citación de fuentes", "referencias", "APA", "IEEE", "MLA", "citation", "bibliography", "cita"],
  formulas: [
    { label: "APA 7 (libro)", tex: "\\text{Last, F. M. (Year). Title. Publisher.}" },
    { label: "IEEE (libro)", tex: "\\text{F. M. Last, Title, Publisher, Year.}" },
    { label: "MLA 9 (libro)", tex: "\\text{Last, First. Title. Publisher, Year.}" }
  ],
  inputs: [
    { id: "type", label: "Tipo de fuente", type: "select", default: "book", options: [["book", "Libro"], ["journal", "Artículo de revista científica"], ["website", "Sitio web"]] },
    { id: "authors", label: "Autores", type: "textarea", rows: 3, placeholder: "Smith, John\nDoe, Ann Marie", help: "Un autor por línea con el formato: apellido, nombre y segundo nombre. Déjelo vacío si no hay autor." },
    { id: "title", label: "Título", type: "text", placeholder: "Título del libro, del artículo o de la página", help: "Título del libro, del artículo o de la página web." },
    { id: "year", label: "Año de publicación", type: "number", default: "2020" },
    { id: "publisher", label: "Editorial", type: "text", when: { type: ["book"] } },
    { id: "city", label: "Ciudad de publicación", type: "text", when: { type: ["book"] }, help: "Se usa solo en el formato IEEE." },
    { id: "edition", label: "Edición", type: "text", when: { type: ["book"] }, help: "Opcional, por ejemplo 2 o 3." },
    { id: "journal", label: "Nombre de la revista", type: "text", when: { type: ["journal"] } },
    { id: "volume", label: "Volumen", type: "text", when: { type: ["journal"] } },
    { id: "issue", label: "Número", type: "text", when: { type: ["journal"] } },
    { id: "pages", label: "Páginas", type: "text", when: { type: ["journal"] }, placeholder: "45-67", help: "por ejemplo 45-67 o 12." },
    { id: "site", label: "Nombre del sitio", type: "text", when: { type: ["website"] } },
    { id: "url", label: "URL", type: "text", when: { type: ["website"] }, placeholder: "https://example.com/page" },
    { id: "accessed", label: "Fecha de acceso", type: "text", when: { type: ["website"] }, placeholder: "2024-03-05", help: "Opcional, con el formato AAAA-MM-DD." }
  ],
  example: {
    values: { type: "book", authors: "Smith, John", title: "Engineering Basics", year: "2020", publisher: "Pearson", city: "", edition: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: "" },
    expect: ["Smith, J. (2020). Engineering Basics. Pearson."],
    note: "Ejemplo: un libro de un solo autor en formato APA 7."
  },
  invalid: { values: { type: "book", authors: "Smith, John", title: "", year: "2020", publisher: "Pearson" } },
  related: ["word-counter", "gpa-calculator", "study-planner"]
};

export function solve(input) {
  const type = choice(input, "type", "Tipo de fuente", ["book", "journal", "website"], "book");
  const authors = parseAuthors(str(input, "authors", "Autores", { optional: true }));
  if (authors.length > 20) fail("Este generador admite hasta 20 autores en estilo APA.", "authors");
  const title = str(input, "title", "Título", { optional: true }).trim();
  if (title === "") fail("Introduzca el título de la fuente.", "title");
  const year = num(input, "year", "Año de publicación", { integer: true, min: 1000, max: 2100 });
  const x = { type, authors, title, year, ed: "", publisher: "", city: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: null };
  if (type === "book") {
    x.publisher = str(input, "publisher", "Editorial", { optional: true }).trim();
    if (x.publisher === "") fail("Introduzca el nombre de la editorial del libro.", "publisher");
    x.city = str(input, "city", "Ciudad de publicación", { optional: true }).trim();
    const ed = str(input, "edition", "Edición", { optional: true }).trim();
    x.ed = ed ? ordinal(ed) : "";
  }
  if (type === "journal") {
    x.journal = str(input, "journal", "Nombre de la revista", { optional: true }).trim();
    if (x.journal === "") fail("Introduzca el nombre de la revista.", "journal");
    x.volume = str(input, "volume", "Volumen", { optional: true }).trim();
    x.issue = str(input, "issue", "Número", { optional: true }).trim();
    x.pages = str(input, "pages", "Páginas", { optional: true }).trim();
  }
  if (type === "website") {
    x.site = str(input, "site", "Nombre del sitio", { optional: true }).trim();
    x.url = str(input, "url", "URL", { optional: true }).trim();
    if (x.url === "") fail("Introduzca la URL del sitio web.", "url");
    const acc = str(input, "accessed", "Fecha de acceso", { optional: true }).trim();
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
      "APA 7: apellido, inicial del nombre (año). Título. Editorial o revista, y enlace.",
      "IEEE: inicial del nombre y luego apellido, título entre comillas, después editorial o revista, y año.",
      "MLA 9: apellido, nombre completo, luego título, editorial o revista, y año."
    ],
    copy: `APA 7: ${a}\nIEEE: ${i}\nMLA 9: ${m}`,
    values: { type }
  };
}
