import { choice, fail, isBlank } from "../core/validate.js";

export const meta = {
  description: "JSON metnini denetler; her hatanın konumunu (satır ve sütun) Türkçe açıklaması ve düzeltme yoluyla belirtir, ardından seçtiğiniz boşluklarla biçimlendirir ya da tek satıra sıkıştırır ve yapısının istatistiklerini gösterir.",
  keywords: ["JSON", "JSON denetleyici", "JSON biçimlendirme", "JSON sıkıştırma", "JSON formatter", "JSON validator", "JSON biçimi"],
  formulas: [{ label: "JSON'da değer", tex: "\\text{value} \\in \\{\\text{object}, \\text{array}, \\text{string}, \\text{number}, \\text{true}, \\text{false}, \\text{null}\\}" }],
  inputs: [
    { id: "text", label: "JSON metni", type: "textarea", rows: 10, wide: true, default: "" },
    { id: "mode", label: "Mod", type: "select", default: "format", options: [["format", "Biçimlendir"], ["minify", "Tek satıra sıkıştır"], ["validate", "Yalnızca denetle"]] },
    { id: "indent", label: "Girinti boşluğu", type: "select", default: "2", options: [["2", "2 boşluk"], ["4", "4 boşluk"], ["tab", "Sekme (Tab)"]], when: { mode: ["format"] } },
    { id: "sortKeys", label: "Anahtarları alfabetik sırala", type: "checkbox", default: "", when: { mode: ["format", "minify"] } }
  ],
  example: {
    values: { text: "{\n  \"name\": \"Mihsab\",\n  \"version\": 1,\n  \"tags\": [\"eğitim\", \"mühendislik\"],\n  \"enabled\": true\n}", mode: "format", indent: "2", sortKeys: "" },
    expect: ["✅ Hata bulunmadı", "Anahtarlar: 4"],
    note: "Örnek: dört anahtarlı geçerli bir JSON nesnesi."
  },
  invalid: { values: { text: "", mode: "format", indent: "2", sortKeys: "" } },
  related: ["html-checker", "bracket-checker", "js-checker", "python-checker", "error-explainer"]
};

const LIMIT = 200000;
const CONTEXT = 3;
const VERDICT_OK = "✅ Hata bulunmadı";
const VERDICT_ERR = "❌ 1 hata bulundu";
const INDENTS = { "2": "  ", "4": "    ", tab: "\t" };
const ROOT_TYPES = { object: "nesne", array: "dizi", string: "metin", number: "sayı", boolean: "mantıksal değer", null: "boş (null)" };
const ESCAPES = new Map([["\"", "\""], ["\\", "\\"], ["/", "/"], ["b", "\b"], ["f", "\f"], ["n", "\n"], ["r", "\r"], ["t", "\t"]]);
const VALUE_START = /[-0-9"{\[a-zA-Z_$]/;
const LITERAL_HINTS = new Map([
  ["True", ["«True» değeri JSON'da geçersiz; doğrusu küçük harflerle yazılır.", "«true» olarak küçük harflerle yazın."]],
  ["False", ["«False» değeri JSON'da geçersiz; doğrusu küçük harflerle yazılır.", "«false» olarak küçük harflerle yazın."]],
  ["None", ["«None» değeri Python diline ait; JSON değeri değildir.", "«null» olarak küçük harflerle yazın."]],
  ["undefined", ["«undefined» değeri JavaScript'e ait; JSON değeri değildir.", "«null» yazın."]],
  ["NaN", ["«NaN» değerine JSON'da izin verilmez.", "«null» kullanın ya da değeri tırnak işaretleri arasında metin olarak yazın."]],
  ["Infinity", ["«Infinity» değerine JSON'da izin verilmez.", "«null» kullanın ya da değeri tırnak işaretleri arasında metin olarak yazın."]]
]);

class JsonProblem extends Error {
  constructor(pos, len, message, suggestion) {
    super(message);
    this.pos = pos;
    this.len = len;
    this.suggestion = suggestion;
  }
}

function fault(pos, len, message, suggestion) {
  throw new JsonProblem(pos, len, message, suggestion);
}

function locate(src, pos) {
  let line = 1, start = 0;
  for (let k = 0; k < pos; k++) if (src[k] === "\n") { line++; start = k + 1; }
  return { line, col: pos - start + 1 };
}

function where(src, pos) {
  const l = locate(src, pos);
  return `Satır ${l.line} (sütun ${l.col})`;
}

const digit = (c) => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

function wordEnd(s, i) {
  let k = i;
  while (k < s.length && /[A-Za-z0-9_$]/.test(s[k])) k++;
  return k;
}

function unclosed(s, open, ch, close) {
  fault(s.length, 0, `${where(s, open)} konumunda açılan «${ch}», dosya sonundan önce kapatılmadı.`, `Uygun yere «${close}» ekleyerek kapatın.`);
}

function skipSpace(st) {
  const s = st.s;
  while (s[st.i] === " " || s[st.i] === "\t" || s[st.i] === "\n") st.i++;
  if (s[st.i] === "/" && s[st.i + 1] === "/") {
    const end = s.indexOf("\n", st.i);
    fault(st.i, (end < 0 ? s.length : end) - st.i, "JSON yorumları desteklemez; burada bir yorum başlıyor.", "Yorumu tamamen silin; JSON dosyaları hiçbir yorumu kabul etmez.");
  }
  if (s[st.i] === "/" && s[st.i + 1] === "*") {
    const end = s.indexOf("*/", st.i + 2);
    fault(st.i, end < 0 ? s.length - st.i : end + 2 - st.i, "JSON yorumları desteklemez; burada çok satırlı bir yorum başlıyor.", "Yorumu tamamen silin; JSON dosyaları hiçbir yorumu kabul etmez.");
  }
}

function parseString(st) {
  const s = st.s, start = st.i;
  let i = start + 1, value = "";
  for (;;) {
    const c = s[i];
    if (c === undefined || c === "\n") fault(start, 1, "Metni başlatan çift tırnak işareti kapatılmadı.", "Metnin sonuna \" ekleyin; metni sonraki satıra taşımayın.");
    if (c === "\"") {
      st.i = i + 1;
      return { type: "string", value, raw: s.slice(start, i + 1) };
    }
    if (c === "\\") {
      const e = s[i + 1];
      if (e === undefined || e === "\n") fault(start, 1, "Metni başlatan çift tırnak işareti kapatılmadı.", "Metnin sonuna \" ekleyin; metni sonraki satıra taşımayın.");
      if (e === "u") {
        const hex = s.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) fault(i, 2, "Kaçış dizisi \\u ardından dört onaltılık rakam (0-9 veya A-F) gelmelidir.", "Doğru örnek: \\u00e9 harfi é'yi temsil eder.");
        value += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      if (!ESCAPES.has(e)) fault(i, 2, `Kaçış dizisi «\\${e}» JSON'da geçersiz.`, "Ters eğik çizgiden sonra izin verilen karakterler: \" \\ / b f n r t u.");
      value += ESCAPES.get(e);
      i += 2;
      continue;
    }
    if (c < " ") fault(i, 1, "Metnin içinde izin verilmeyen bir denetim karakteri var (ör. Tab ya da görünmez bir karakter).", "Bunu \\t gibi bir kaçış dizisiyle değiştirin ya da silin.");
    value += c;
    i++;
  }
}

function parseNumber(st) {
  const s = st.s, start = st.i;
  let i = start;
  if (s[i] === "-") i++;
  if (s[i] === "0") {
    i++;
    if (digit(s[i])) {
      let k = i;
      while (digit(s[k])) k++;
      fault(start, k - start, "JSON'da bir sayı, sıfırla başlayıp ardından bir rakam içeremez.", "Sayının başındaki fazla sıfırları silin; örneğin 01 değeri 1 olur.");
    }
  } else if (digit(s[i])) {
    while (digit(s[i])) i++;
  } else {
    fault(start, 1, "«-» işaretinden sonra bir rakam gelmelidir.", "«-» işaretinden sonra sayıyı yazın, ör. -5; yanlışsa işareti silin.");
  }
  if (s[i] === ".") {
    i++;
    if (!digit(s[i])) fault(i - 1, 1, "Ondalık noktadan sonra bir rakam gelmelidir.", "Noktadan sonra bir rakam yazın, ör. 1.5; ya da noktayı silin.");
    while (digit(s[i])) i++;
  }
  if (s[i] === "e" || s[i] === "E") {
    i++;
    if (s[i] === "+" || s[i] === "-") i++;
    if (!digit(s[i])) fault(start, i - start, "Bilimsel gösterimdeki üs, bir rakamla devam etmelidir.", "Doğru örnek: 1e5 ya da 2.5E-3.");
    while (digit(s[i])) i++;
  }
  st.i = i;
  return { type: "number", raw: s.slice(start, i) };
}

function parseWord(st) {
  const s = st.s, start = st.i, end = wordEnd(s, start);
  const w = s.slice(start, end);
  st.i = end;
  if (w === "true" || w === "false") return { type: "boolean", raw: w };
  if (w === "null") return { type: "null", raw: w };
  if (LITERAL_HINTS.has(w)) {
    const [message, suggestion] = LITERAL_HINTS.get(w);
    fault(start, w.length, message, suggestion);
  }
  fault(start, w.length, `«${w}» geçerli bir JSON değeri değil.`, "İzin verilen değerler: \"\" arasında metin, sayı, true, false veya null.");
}

function parseKey(st) {
  const s = st.s, c = s[st.i];
  if (c === "\"") return parseString(st);
  if (c === "}") fault(st.i, 1, "«}» öncesinde fazla virgül var.", "«}» parantezinden önceki son virgülü silin.");
  if (c === "'") fault(st.i, 1, "Anahtar adı çift tırnak işaretleri arasında olmalıdır, tek tırnak içinde olamaz.", "Anahtar adının çevresindeki ' işaretini \" ile değiştirin.");
  if (isLetter(c)) {
    const w = s.slice(st.i, wordEnd(s, st.i));
    fault(st.i, w.length, `«${w}» anahtar adı tırnak işareti olmadan yazılmış.`, `Adı çift tırnak içine alın: "${w}".`);
  }
  fault(st.i, 1, `Anahtar adı çift tırnak içinde bir metin olmalıdır, ancak «${c}» bulundu.`, "Anahtar adını çift tırnak işaretleri arasında yazın.");
}

function parseObject(st) {
  const s = st.s, open = st.i;
  st.i++;
  const entries = [];
  skipSpace(st);
  if (s[st.i] === "}") {
    st.i++;
    return { type: "object", entries };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    const key = parseKey(st);
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "{", "}");
    if (s[st.i] !== ":") fault(st.i, 1, `Anahtar adından sonra «:» bekleniyordu, ancak «${s[st.i]}» bulundu.`, "Anahtar adı ile değer arasına «:» koyun, ör.: \"name\": \"value\".");
    st.i++;
    entries.push({ key: key.value, raw: key.raw, value: parseValue(st) });
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "}") {
      st.i++;
      return { type: "object", entries };
    }
    if (d === undefined) unclosed(s, open, "{", "}");
    if (d === "]") fault(st.i, 1, `«]» bulundu; oysa ${where(s, open)} konumunda açılan «{» nesnesini kapatmak için «}» bekleniyordu.`, "Burası nesnenin sonuysa «]» yerine «}» yazın; değilse parantezleri denetleyin.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Nesne üyeleri arasında «,» bekleniyordu, ancak yeni bir üye hemen başladı.", "Önceki değerden sonra «,» ekleyin.");
    fault(st.i, 1, `«,» ya da «}» bekleniyordu, ancak «${d}» bulundu.`, "Bu konumun çevresindeki virgülleri ve parantezleri denetleyin.");
  }
}

function parseArray(st) {
  const s = st.s, open = st.i;
  st.i++;
  const items = [];
  skipSpace(st);
  if (s[st.i] === "]") {
    st.i++;
    return { type: "array", items };
  }
  for (;;) {
    skipSpace(st);
    if (s[st.i] === undefined) unclosed(s, open, "[", "]");
    if (s[st.i] === "]") fault(st.i, 1, "«]» öncesinde fazla virgül var.", "«]» parantezinden önceki son virgülü silin.");
    items.push(parseValue(st));
    skipSpace(st);
    const d = s[st.i];
    if (d === ",") {
      st.i++;
      continue;
    }
    if (d === "]") {
      st.i++;
      return { type: "array", items };
    }
    if (d === undefined) unclosed(s, open, "[", "]");
    if (d === "}") fault(st.i, 1, `«[» ile ${where(s, open)} konumunda açılan dizi için «]» bekleniyordu, ancak «}» bulundu.`, "Burası dizinin sonuysa «}» yerine «]» yazın; değilse parantezleri denetleyin.");
    if (VALUE_START.test(d)) fault(st.i, 1, "Dizi öğeleri arasında «,» bekleniyordu, ancak yeni bir öğe hemen başladı.", "İki öğe arasına «,» ekleyin.");
    fault(st.i, 1, `«,» ya da «]» bekleniyordu, ancak «${d}» bulundu.`, "Bu konumun çevresindeki virgülleri ve parantezleri denetleyin.");
  }
}

function parseValue(st) {
  skipSpace(st);
  const s = st.s, c = s[st.i];
  if (c === undefined) fault(st.i, 0, "Dosya bitti, oysa burada bir değer bekleniyordu.", "Eksik değeri tamamlayın ya da önceki virgülü ya da iki noktayı silin.");
  if (c === "{") return parseObject(st);
  if (c === "[") return parseArray(st);
  if (c === "\"") return parseString(st);
  if (c === "'") fault(st.i, 1, "JSON'da metinler çift tırnak işaretiyle yazılır; tek tırnak ' izin verilmez.", "Metnin başındaki ve sonundaki ' işaretlerini \" ile değiştirin.");
  if (c === "-" || digit(c)) return parseNumber(st);
  if (isLetter(c)) return parseWord(st);
  fault(st.i, 1, `Burada bir değer bekleniyordu, ancak «${c}» bulundu.`, "İzin verilen değerler: \"\" arasında metin, sayı, true, false, null, nesne {} veya dizi [].");
}

export function parseJson(src) {
  const st = { s: src, i: 0 };
  try {
    const tree = parseValue(st);
    skipSpace(st);
    if (st.i < src.length) {
      const c = src[st.i];
      if (c === "]" || c === "}") fault(st.i, 1, `Fazla kapanış parantezi «${c}», karşılığında açılış parantezi yok.`, "Silin ya da her açılış parantezinin eşleşen bir kapanış parantezi olduğunu denetleyin.");
      fault(st.i, 1, "Ana değerin bitişinden sonra fazla içerik var.", "JSON dosyası yalnızca bir değer içerebilir; öğeleri [ ] dizisi ya da { } nesnesi içine koyun.");
    }
    return { ok: true, tree };
  } catch (e) {
    if (!(e instanceof JsonProblem)) throw e;
    const at = locate(src, e.pos);
    return { ok: false, problem: { pos: e.pos, len: e.len, line: at.line, col: at.col, message: e.message, suggestion: e.suggestion } };
  }
}

export function formatJson(tree, mode, unit, sortKeys) {
  return serialize(tree, mode === "minify" ? null : unit, sortKeys, 0);
}

function serialize(node, unit, sortKeys, level) {
  if (node.type === "object") {
    if (node.entries.length === 0) return "{}";
    let entries = node.entries;
    if (sortKeys) entries = entries.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    if (unit === null) return "{" + entries.map((e) => e.raw + ":" + serialize(e.value, null, sortKeys, 0)).join(",") + "}";
    const pad = unit.repeat(level + 1);
    return "{\n" + entries.map((e) => pad + e.raw + ": " + serialize(e.value, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "}";
  }
  if (node.type === "array") {
    if (node.items.length === 0) return "[]";
    if (unit === null) return "[" + node.items.map((x) => serialize(x, null, sortKeys, 0)).join(",") + "]";
    const pad = unit.repeat(level + 1);
    return "[\n" + node.items.map((x) => pad + serialize(x, unit, sortKeys, level + 1)).join(",\n") + "\n" + unit.repeat(level) + "]";
  }
  return node.raw;
}

function measure(node, depth, acc) {
  acc.values++;
  if (node.type !== "object" && node.type !== "array") return;
  const d = depth + 1;
  if (d > acc.maxDepth) acc.maxDepth = d;
  if (node.type === "object") {
    acc.keys += node.entries.length;
    for (const e of node.entries) measure(e.value, d, acc);
  } else {
    for (const x of node.items) measure(x, d, acc);
  }
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderLine(text, ranges) {
  const bad = new Array(text.length).fill(false);
  let tail = false;
  for (const [a, b] of ranges) {
    if (a >= text.length) tail = true;
    for (let k = a; k < Math.min(b, text.length); k++) bad[k] = true;
  }
  let html = "";
  let k = 0;
  while (k < text.length) {
    const flag = bad[k];
    let j = k;
    while (j < text.length && bad[j] === flag) j++;
    const chunk = esc(text.slice(k, j));
    html += flag ? `<span class="bad">${chunk}</span>` : chunk;
    k = j;
  }
  if (tail) html += "<span class=\"bad\"> </span>";
  return html;
}

function snippet(src, problems) {
  const lines = src.split("\n");
  const shown = new Set();
  const marks = new Map();
  for (const p of problems) {
    for (let n = Math.max(1, p.line - CONTEXT); n <= Math.min(lines.length, p.line + CONTEXT); n++) shown.add(n);
    if (!marks.has(p.line)) marks.set(p.line, []);
    marks.get(p.line).push([p.col - 1, p.col - 1 + Math.max(1, p.len || 0)]);
  }
  const out = [];
  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (prev && n !== prev + 1) out.push("…");
    out.push(`<span class="ln">${n}</span>${renderLine(lines[n - 1] ?? "", marks.get(n) || [])}`);
    prev = n;
  }
  return `<pre class="code" dir="ltr"><code>${out.join("\n")}</code></pre>`;
}

function errorResult(src, problem, length) {
  const at = `Satır ${problem.line}, sütun ${problem.col}`;
  return {
    results: [
      { label: "Karar", value: VERDICT_ERR },
      { label: "Hata konumu", value: at },
      { label: "Önceki boyut", value: `${length} karakter` }
    ],
    steps: [`${at} konumuna gidin.`, problem.suggestion],
    blocks: [
      { type: "table", wrap: true, head: ["Satır", "Sütun", "Sorun", "Nasıl düzeltilir"], rows: [[String(problem.line), String(problem.col), problem.message, problem.suggestion]] },
      { type: "html", html: snippet(src, [problem]) }
    ],
    copy: `${VERDICT_ERR}
${at}: ${problem.message}
Nasıl düzeltilir: ${problem.suggestion}`
  };
}

export function solve(input) {
  const raw = input.text;
  if (isBlank(raw)) fail("Denetlemek istediğiniz JSON metnini girin.", "text");
  const text = String(raw);
  if (text.length > LIMIT) fail("Metin 200000 karakterden uzun; boyutunu küçültüp denetimi yeniden çalıştırın.", "text");
  const mode = choice(input, "mode", "Mod", ["format", "minify", "validate"], "format");
  const indent = choice(input, "indent", "Girinti boşluğu", ["2", "4", "tab"], "2");
  const sortKeys = !isBlank(input.sortKeys) && String(input.sortKeys) !== "0";
  const src = text.replace(/\r\n?/g, "\n");
  const parsed = parseJson(src);
  if (!parsed.ok) return errorResult(src, parsed.problem, text.length);
  const tree = parsed.tree;
  const acc = { values: 0, keys: 0, maxDepth: 0 };
  measure(tree, 0, acc);
  const output = mode === "validate" ? "" : formatJson(tree, mode, INDENTS[indent], sortKeys);
  const rootLabel = ROOT_TYPES[tree.type];
  const results = [
    { label: "Karar", value: VERDICT_OK },
    { label: "Kök değerin türü", value: rootLabel },
    { label: "Anahtar sayısı", value: String(acc.keys) },
    { label: "Değer sayısı", value: String(acc.values) },
    { label: "En fazla derinlik", value: String(acc.maxDepth) },
    { label: "Önceki boyut", value: `${text.length} karakter` }
  ];
  const blocks = [];
  let step = "Biçimlendirme istenmedi, yalnızca denetlendi.";
  if (output) {
    results.push({ label: "Sonraki boyut", value: `${output.length} karakter` });
    blocks.push({ type: "note", text: mode === "minify" ? "Sonuç tek satıra sıkıştırıldı:" : "Biçimlendirmeden sonraki sonuç:" });
    blocks.push({ type: "html", html: `<pre class="code" dir="ltr"><code>${esc(output)}</code></pre>` });
    step = mode === "minify" ? "Metin dışındaki boşluklar ve boş satırlar kaldırıldı." : "Dosyayı her iç seviyeyi girintileyerek yeniden yazdım.";
  }
  const summary = `${VERDICT_OK}. Kök değerin türü: ${rootLabel}, anahtarlar: ${acc.keys}, değerler: ${acc.values}, en fazla derinlik: ${acc.maxDepth}, boyut: ${text.length} karakter`;
  return {
    results,
    steps: ["Metni okudum ve yapısını JSON kurallarına göre karakter karakter çözümledim.", "Anahtarların çift tırnak içinde olduğunu, virgül ve parantezlerin dengede olduğunu denetledim.", step],
    blocks,
    copy: output ? `${summary}\n${output}` : summary
  };
}
