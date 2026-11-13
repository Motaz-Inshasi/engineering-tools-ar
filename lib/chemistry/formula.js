import { ELEMENTS } from "./elements.js";

export const BY_SYMBOL = Object.fromEntries(ELEMENTS.map((e) => [e.symbol, e]));

export class FormulaError extends Error {}

const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

export function cleanFormula(s) {
  return String(s)
    .replace(/[₀-₉]/g, (c) => SUB[c])
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, "")
    .replace(/\((s|l|g|aq)\)$/i, "")
    .replace(/[⁺⁻]+$|\^?\d*[+-]$/, "");
}

function parseGroup(s, i, close) {
  const counts = {};
  const add = (el, n) => { counts[el] = (counts[el] || 0) + n; };
  while (i < s.length) {
    const c = s[i];
    if (c === "(" || c === "[" || c === "{") {
      const end = { "(": ")", "[": "]", "{": "}" }[c];
      const [inner, j] = parseGroup(s, i + 1, end);
      i = j;
      const m = s.slice(i).match(/^\d+/);
      const k = m ? Number(m[0]) : 1;
      if (m) i += m[0].length;
      for (const [el, n] of Object.entries(inner)) add(el, n * k);
    } else if (c === ")" || c === "]" || c === "}") {
      if (c !== close) throw new FormulaError(`قوس غير متطابق «${c}».`);
      return [counts, i + 1];
    } else if (/[A-Z]/.test(c)) {
      const m = s.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
      let sym = m[1], len = m[0].length, num = m[2];
      if (!BY_SYMBOL[sym] && sym.length === 2 && BY_SYMBOL[sym[0]]) {
        sym = sym[0];
        const m2 = s.slice(i + 1).match(/^\d*/);
        num = m2[0];
        len = 1 + num.length;
      }
      if (!BY_SYMBOL[sym]) throw new FormulaError(`الرمز «${m[1]}» ليس عنصراً معروفاً. تذكّر أن الحرف الأول كبير والثاني صغير (مثل Cl و Na).`);
      add(sym, num ? Number(num) : 1);
      i += len;
    } else if (/[a-z]/.test(c)) {
      throw new FormulaError(`الحرف «${c}» يجب أن يكون كبيراً في بداية رمز العنصر (مثل ${c.toUpperCase()}).`);
    } else {
      throw new FormulaError(`الرمز «${c}» غير مفهوم في الصيغة.`);
    }
  }
  if (close) throw new FormulaError("يوجد قوس مفتوح لم يُغلق.");
  return [counts, i];
}

export function parseFormula(raw) {
  const s = cleanFormula(raw);
  if (!s) throw new FormulaError("الصيغة فارغة.");
  const total = {};
  for (const part of s.split(/[·•*.]/)) {
    if (!part) throw new FormulaError("صيغة الماء المتبلور غير مكتملة (مثل CuSO4·5H2O).");
    const m = part.match(/^(\d*)(.*)$/);
    const k = m[1] ? Number(m[1]) : 1;
    if (!m[2]) throw new FormulaError("يوجد رقم بلا عنصر في الصيغة.");
    const [c] = parseGroup(m[2], 0, null);
    for (const [el, n] of Object.entries(c)) total[el] = (total[el] || 0) + n * k;
  }
  for (const [el, n] of Object.entries(total)) if (n === 0) delete total[el];
  if (!Object.keys(total).length) throw new FormulaError("الصيغة لا تحتوي عناصر.");
  return total;
}

export function molarMass(counts) {
  return Object.entries(counts).reduce((a, [el, n]) => a + BY_SYMBOL[el].mass * n, 0);
}

export function formulaTex(raw) {
  return cleanFormula(raw).replace(/[·•*]/g, "\\cdot ").replace(/(?<=[A-Za-z)\]}])(\d+)/g, "_{$1}");
}

export function formulaHtmlText(raw) {
  return cleanFormula(raw).replace(/[*•]/g, "·");
}

const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };

export function nullspaceInteger(M) {
  const rows = M.length, cols = M[0].length;
  const A = M.map((r) => r.map((x) => [BigInt(x), 1n]));
  const norm = ([p, q]) => { if (q < 0n) { p = -p; q = -q; } const g = gcd(p, q) || 1n; return [p / g, q / g]; };
  const sub = ([a, b], [c, d]) => norm([a * d - c * b, b * d]);
  const mul = ([a, b], [c, d]) => norm([a * c, b * d]);
  const div = ([a, b], [c, d]) => norm([a * d, b * c]);
  const pivots = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    while (p < rows && A[p][c][0] === 0n) p++;
    if (p === rows) continue;
    [A[r], A[p]] = [A[p], A[r]];
    const pv = A[r][c];
    A[r] = A[r].map((x) => div(x, pv));
    for (let i = 0; i < rows; i++) if (i !== r && A[i][c][0] !== 0n) {
      const f = A[i][c];
      A[i] = A[i].map((x, j) => sub(x, mul(f, A[r][j])));
    }
    pivots.push(c);
    r++;
  }
  const free = [...Array(cols).keys()].filter((c) => !pivots.includes(c));
  return free.map((fc) => {
    const v = Array(cols).fill(null).map(() => [0n, 1n]);
    v[fc] = [1n, 1n];
    pivots.forEach((pc, i) => { v[pc] = norm([-A[i][fc][0], A[i][fc][1]]); });
    let L = 1n;
    for (const [, q] of v) L = (L * q) / gcd(L, q);
    let ints = v.map(([p, q]) => (p * L) / q);
    let g = 0n;
    for (const x of ints) g = gcd(g, x);
    if (g > 1n) ints = ints.map((x) => x / g);
    return ints;
  });
}

export function splitEquation(raw) {
  const s = String(raw).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[₀-₉]/g, (c) => SUB[c]);
  const sides = s.split(/<=>|<->|⇌|→|⟶|->|=>|=/);
  if (sides.length !== 2) throw new FormulaError("اكتب المعادلة بطرفين بينهما سهم واحد مثل: H2 + O2 -> H2O");
  const parse = (side) => side.split(/\s\+\s|\s\+(?=[\dA-Z(\[])|^\+|(?<=[\dA-Za-z)\]])\+(?=[\dA-Z(\[])/).map((x) => x.trim()).filter(Boolean).map((sp) => {
    const m = sp.match(/^(\d+)\s*(?=[A-Z(\[])(.*)$/);
    return m ? m[2] : sp;
  });
  const L = parse(sides[0]), R = parse(sides[1]);
  if (!L.length || !R.length) throw new FormulaError("كل طرف من المعادلة يحتاج مادة واحدة على الأقل.");
  return [L, R];
}

export function balance(raw) {
  const [L, R] = splitEquation(raw);
  const species = [...L, ...R];
  const parsed = species.map((sp) => {
    try { return parseFormula(sp); } catch (e) { throw new FormulaError(`في «${sp}»: ${e.message}`); }
  });
  const els = [...new Set(parsed.flatMap((c) => Object.keys(c)))];
  for (const el of els) {
    const l = parsed.slice(0, L.length).some((c) => c[el]), r = parsed.slice(L.length).some((c) => c[el]);
    if (l !== r) throw new FormulaError(`العنصر ${el} موجود في طرف واحد فقط من المعادلة، فلا يمكن موازنتها.`);
  }
  const M = els.map((el) => species.map((_, j) => (parsed[j][el] || 0) * (j < L.length ? 1 : -1)));
  const ns = nullspaceInteger(M);
  if (ns.length === 0) throw new FormulaError("لا توجد معاملات موجبة توازن هذه المعادلة. تأكد من الصيغ.");
  if (ns.length > 1) throw new FormulaError("المعادلة تقبل أكثر من موازنة مستقلة (تجمع تفاعلين أو أكثر). افصلها إلى تفاعلات منفصلة.");
  let v = ns[0];
  if (v.every((x) => x <= 0n)) v = v.map((x) => -x);
  if (v.some((x) => x <= 0n)) throw new FormulaError("لا توجد معاملات موجبة توازن هذه المعادلة. ربما إحدى المواد في الطرف الخطأ.");
  const coef = v.map(Number);
  return { reactants: L, products: R, species, parsed, elements: els, coef };
}

export function equationText(b) {
  const term = (sp, k) => `${k === 1 ? "" : k} ${formulaHtmlText(sp)}`.trim();
  return `${b.reactants.map((s, i) => term(s, b.coef[i])).join(" + ")} → ${b.products.map((s, i) => term(s, b.coef[b.reactants.length + i])).join(" + ")}`;
}

export function equationTex(b) {
  const term = (sp, k) => `${k === 1 ? "" : k}\\,\\mathrm{${formulaTex(sp)}}`;
  return `${b.reactants.map((s, i) => term(s, b.coef[i])).join(" + ")} \\longrightarrow ${b.products.map((s, i) => term(s, b.coef[b.reactants.length + i])).join(" + ")}`;
}
