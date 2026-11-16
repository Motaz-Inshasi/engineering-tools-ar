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
  d: "0 ile 9 arasındaki herhangi bir rakam",
  D: "Rakam olmayan herhangi bir karakter",
  w: "Herhangi bir Latin harfi, rakam veya alt çizgi _",
  W: "Latin harfi, rakam ya da _ olmayan herhangi bir karakter",
  s: "Herhangi bir boşluk karakteri (boşluk, sekme veya yeni satır)",
  S: "Boşluk olmayan herhangi bir karakter",
  b: "Kelime sınırı: sözcük karakteriyle sözcük olmayan karakter arasındaki konum (karakter tüketmez)",
  B: "Kelime sınırı değil: sözcüğün içindeki ya da dışındaki konum (karakter tüketmez)",
  n: "Yeni satır (LF)",
  r: "Satır başı (CR)",
  t: "Sekme (Tab)",
  f: "Sayfa besleme (Form feed)",
  v: "Dikey sekme (Vertical tab)"
};

const FLAG_INFO = {
  d: "Her grubun başlangıç ve bitiş konumlarını ekler (indices)",
  g: "İlk eşleşme yerine tüm eşleşmeleri arar",
  i: "Büyük ve küçük harf farkını yok sayar",
  m: "^ ve $ işaretlerini her satırın başına ve sonuna eşleştirir",
  s: "Nokta . karakterinin yeni satırla da eşleşmesini sağlar (dotAll)",
  u: "Deseni tam Unicode karakterleri olarak işler ve \\p{...} desteklenir",
  y: "Yapışkan: eşleşme tam lastIndex konumundan başlar, atlama yapılmaz",
  v: "u bayrağının daha yeni sürümü; gelişmiş karakter kümelerini destekler"
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
    if (!FLAG_SET.includes(ch)) fail(`«${ch}» bayrağı desteklenmiyor. İzin verilen bayraklar: dgimsuyv`, "flags");
    if (seen.has(ch)) fail(`«${ch}» bayrağı yinelenmiş.`, "flags");
    seen.add(ch);
  }
  try {
    new RegExp("", raw);
  } catch (e) {
    fail(`JavaScript'te geçersiz bayrak grubu: ${e.message}`, "flags");
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
  if (pattern.length > MAX_CHARS) fail(`Desen ${MAX_CHARS} karakterden uzun.`, "pattern");
  if (text.length > MAX_CHARS) fail(`Metin ${MAX_CHARS} karakterden uzun.`, "text");
  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    fail(`Geçersiz düzenli ifade deseni: ${e.message}`, "pattern");
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
  if (d === undefined) return "Desenin sonunda ters eğik çizgi";
  if (d === "0") return "NUL karakteri";
  if (/[1-9]/.test(d)) return `${tok.slice(1)} numaralı grubun metnini geri döndür`;
  if (ESCAPES[d] !== undefined) return ESCAPES[d];
  if (d === "k") return `«${tok.slice(3, -1)}» adlı grubun metnini geri döndür`;
  if (d === "x") return `Onaltılık kodu ${tok.slice(2)} olan karakter`;
  if (d === "u") return `Unicode kodu ${tok.slice(2)} olan karakter`;
  if (d === "c") return `Ctrl+${tok.slice(2)} tuş kombinasyonunun kontrol karakteri`;
  if (d === "p") return `${tok.slice(2, -1)} kategorisine ait herhangi bir karakter`;
  if (d === "P") return `${tok.slice(2, -1)} kategorisine ait olmayan herhangi bir karakter`;
  return `«${d}» karakteri tam olarak (özel anlamı iptal edilerek)`;
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
    if (pattern[i + len] === "?") add(len + 1, `${desc}, tembel değil (mümkün olan en az sayıda karakterde durur)`);
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
      add(end - i, `${neg ? "Bu karakterlerden olmayan herhangi bir karakter" : "Bu karakterlerden biri"} [${body}] kümesi`);
    } else if (c === "(") {
      if (pattern.startsWith("(?:", i)) add(3, "Yakalamayan grup: öğeleri toplar, metnini kaydetmez");
      else if (pattern.startsWith("(?<=", i)) add(4, "Olumlu geriye bakış: konumdan önce grubun metni varsa eşleşir; karakter tüketmez");
      else if (pattern.startsWith("(?<!", i)) add(4, "Olumsuz geriye bakış: konumdan önce grubun metni yoksa eşleşir; karakter tüketmez");
      else if (pattern.startsWith("(?=", i)) add(3, "Olumlu ileriye bakış: konumdan sonra grubun metni geliyorsa eşleşir; karakter tüketmez");
      else if (pattern.startsWith("(?!", i)) add(3, "Olumsuz ileriye bakış: konumdan sonra grubun metni gelmiyorsa eşleşir; karakter tüketmez");
      else if (pattern.startsWith("(?<", i)) {
        const end = pattern.indexOf(">", i) + 1;
        group += 1;
        add(end - i, `«${pattern.slice(i + 3, end - 1)}» adlı yakalama grubu (numara ${group})`);
      } else {
        group += 1;
        add(1, `${group} numaralı yakalama grubu`);
      }
    } else if (c === ")") {
      add(1, "Grubun sonu");
    } else if (c === "*") {
      quant(1, "Sıfır veya daha fazla kez");
    } else if (c === "+") {
      quant(1, "Bir veya daha fazla kez");
    } else if (c === "?") {
      quant(1, "Sıfır veya bir kez (isteğe bağlı)");
    } else if (c === "{" && quantAt(pattern, i)) {
      const m = quantAt(pattern, i);
      const desc = m[2] === undefined ? `Tam olarak ${m[1]} kez` : m[3] === "" ? `En az ${m[1]} kez` : `${m[1]} ile ${m[3]} kez arasında`;
      quant(m[0].length, desc);
    } else if (c === "^") {
      add(1, "Metnin başı (ya da m bayrağıyla satırın başı)");
    } else if (c === "$") {
      add(1, "Metnin sonu (ya da m bayrağıyla satırın sonu)");
    } else if (c === ".") {
      add(1, "Yeni satır dışında herhangi bir tek karakter (s bayrağı bunu yeni satırı da kapsayacak şekilde genişletir)");
    } else if (c === "|") {
      add(1, "Seçenek: iki taraftan biri eşleşir");
    } else {
      const ch = String.fromCodePoint(pattern.codePointAt(i));
      add(ch.length, `«${ch}» karakteri tam olarak`);
    }
  }
  return rows;
}

function flagRows(flags) {
  return [...flags].filter((f) => FLAG_INFO[f]).map((f) => [f, FLAG_INFO[f]]);
}

function valueText(v) {
  return v === undefined ? "Eşleşmedi" : `"${show(v)}"`;
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
  description: "JavaScript sözdiziminde bir düzenli ifadeyi (Regex) metin üzerinde test eder: eşleşme sayısını ve ayrıntılarını, gruplarını gösterir, metin içinde vurgular, desenin her parçasını ve bayraklarının anlamını açıklar, gerektiğinde eşleşmeleri değiştirir.",
  keywords: ["regex", "regular expression", "düzenli ifade", "düzenli ifade", "regex testi", "değiştirme", "gruplar", "lookahead", "lookbehind"],
  formulas: [{ label: "Düzenli ifadenin biçimi", tex: "/\\text{pattern}/\\text{flags}" }],
  inputs: [
    { id: "pattern", label: "Desen (Pattern)", type: "text", wide: true, default: "\\d+", placeholder: "\\d+", help: "Deseni / işareti olmadan yazın ya da /abc/gi gibi tam biçimde yazın; bayraklar oradan alınır." },
    { id: "flags", label: "Bayraklar (Flags)", type: "text", default: "g", help: "dgimsuyv harflerinden, her bayrak yalnızca bir kez." },
    { id: "text", label: "Metin", type: "textarea", rows: 6, wide: true, default: "a1b22c333" },
    { id: "replace", label: "Değiştirme metni (isteğe bağlı)", type: "text", default: "", help: "Değiştirme istemiyorsanız boş bırakın." }
  ],
  example: { values: { pattern: "\\d+", flags: "g", text: "a1b22c333", replace: "#" }, expect: ["Eşleşme sayısı: 3"], note: "Örnek: karışık bir metindeki sayıları ayıklayıp # işaretiyle değiştirme." },
  invalid: { values: { pattern: "(", flags: "g", text: "abc", replace: "" } },
  related: ["js-checker", "json-formatter", "cron-explainer", "text-encoding"]
};

export function solve(input) {
  const a = analyze(input);
  const count = a.matches.length;
  const first = a.matches[0];
  const countText = a.truncated ? `${count} (yalnızca ilk ${MAX_MATCHES})` : String(count);
  const blocks = [];
  if (count === 0) blocks.push({ type: "note", text: "Bu desen metinde hiç eşleşmedi.", tone: "warn" });
  if (a.truncated) blocks.push({ type: "note", text: `Yalnızca ilk ${MAX_MATCHES} eşleşme gösterildi.`, tone: "warn" });
  if (count > 0) {
    blocks.push({
      type: "table",
      caption: "Eşleşmeler",
      head: ["#", "Eşleşen metin", "Konum", "Uzunluk", "Gruplar"],
      rows: a.matches.map((m, k) => [k + 1, `"${show(m.text)}"`, m.index, m.text.length, groupsText(m)]),
      ltr: true
    });
  }
  blocks.push({ type: "note", text: "Eşleşmeler işaretlenmiş metin:" });
  blocks.push({ type: "html", html: highlight(a.text, a.matches) });
  if (a.replaced !== null) {
    blocks.push({ type: "note", text: "Değiştirme sonrası metin:" });
    blocks.push({ type: "html", html: codeBlock(escapeHtml(a.replaced)) });
  }
  if (a.pattern === "") blocks.push({ type: "note", text: "Desen boş: metindeki her konumla eşleşir." });
  else if (a.pattern.length > EXPLAIN_LIMIT) blocks.push({ type: "note", text: `Desen ${EXPLAIN_LIMIT} karakterden uzun; ayrıntılı açıklaması gösterilmedi.` });
  else blocks.push({ type: "table", wrap: true, caption: "Desen açıklaması", head: ["Karakter", "Anlam"], rows: explain(a.pattern), ltr: true });
  const fr = flagRows(a.flags);
  if (fr.length) blocks.push({ type: "table", caption: "Bayraklar", head: ["Bayrak", "Anlam"], rows: fr, ltr: true });
  else blocks.push({ type: "note", text: "Bayrak yok: yalnızca ilk eşleşme gösterilir ve harf büyüklüğü ayırt edilir." });
  const results = [
    { label: "Eşleşme sayısı", value: countText },
    { label: "İlk eşleşme", value: first ? `"${show(first.text)}", konum ${first.index}` : "Yok" }
  ];
  const steps = [
    `Kullanılan desen: /${show(a.pattern)}/${a.flags}`,
    a.flags.includes("g") ? "g bayrağı açık: arama metnin tamamında ilerler ve tüm eşleşmeleri ardışık olarak toplar." : "g bayrağı kapalı: yalnızca ilk eşleşme gösterilir.",
    `Bulunan eşleşme sayısı: ${countText}.`
  ];
  if (a.replaced !== null) steps.push(`«${show(a.replace)}» metniyle değiştirme uygulandı; değiştirme, JavaScript'te olduğu gibi grup numaralarını ve adlarını destekler.`);
  const copy = `Eşleşme sayısı: ${countText}` + (first ? `, ilk eşleşme: "${show(first.text)}", konum ${first.index}` : ", eşleşme yok");
  return { results, steps, copy, blocks };
}
