import { readTF } from "../signals/common.js";
import { roots, toTex as ptex, toDescending } from "../core/polynomial.js";
import { fmt, niceTex } from "../core/format.js";
import { fail } from "../core/validate.js";

export const meta = {
  description: "بررسی پایداری سیستم با معیار راث-هورویتز: جدول کامل راث همراه با دو حالت خاص (صفر در ستون اول، و سطر کامل از صفرها)، تعداد ریشه‌ها در نیم‌صفحه راست، و بررسی با محاسبه مستقیم ریشه‌ها.",
  keywords: ["راث", "هورویتز", "routh", "hurwitz", "جدول راث", "پایداری", "stability", "معادله مشخصه"],
  formulas: [
    { label: "هر سطر با ضرب متقاطع دو سطر بالای آن ساخته می‌شود", tex: "b_i = \\frac{a_{1}\\,a_{2i} - a_{0}\\,a_{2i+1}}{a_{1}}" },
    { label: "تعداد ریشه‌ها در نیم‌صفحه راست = تعداد تغییر علامت در ستون اول", tex: "N_{RHP} = N_{\\text{sign}}" }
  ],
  inputs: [
    { id: "p", label: "چندجمله‌ای مشخصه بر حسب s", type: "expr", default: "s^4 + 2s^3 + 3s^2 + 4s + 5", help: "مثلاً $s^3 + 6s^2 + 11s + 6$ (فقط طرف چپ معادله را وارد کنید)." }
  ],
  example: { values: { p: "s^4 + 2s^3 + 3s^2 + 4s + 5" }, expect: ["RHP = 2"], note: "مثال معروف کتاب درسی: $s^4 + 2s^3 + 3s^2 + 4s + 5$ دو تغییر علامت دارد، یعنی دو ریشه ناپایدار." },
  invalid: { values: { p: "5" } },
  related: ["transfer-function", "step-response", "bode-plot", "steady-state-error"]
};

export function routhTable(desc) {
  const n = desc.length - 1;
  const width = Math.ceil((n + 1) / 2);
  const scale = Math.max(...desc.map(Math.abs));
  const eps = 1e-9 * scale;
  const rows = [desc.filter((_, i) => i % 2 === 0), desc.filter((_, i) => i % 2 === 1)].map((r) => [...r, ...Array(width - r.length + 1).fill(0)]);
  const notes = [];
  let usedEps = false, auxRow = null;
  const isZero = (x) => Math.abs(x) <= 1e-10 * scale;
  for (let i = 2; i <= n; i++) {
    const prev = rows[i - 1], prev2 = rows[i - 2];
    if (prev.every(isZero)) {
      const order = n - (i - 2);
      const aux = prev2.map((c, k) => c * (order - 2 * k));
      rows[i - 1] = aux.map((c, k) => (order - 2 * k > 0 ? c : 0));
      notes.push({ row: i - 1, kind: "zeroRow", aux: prev2.slice(0, Math.floor(order / 2) + 1), order });
      auxRow = { order, coeffs: prev2.slice(0, Math.floor(order / 2) + 1) };
    } else if (isZero(prev[0])) {
      prev[0] = eps;
      usedEps = true;
      notes.push({ row: i - 1, kind: "eps" });
    }
    const a = rows[i - 1], b = rows[i - 2];
    const row = [];
    for (let k = 0; k < width; k++) row.push((a[0] * (b[k + 1] || 0) - b[0] * (a[k + 1] || 0)) / a[0]);
    row.push(0);
    rows.push(row.map((x) => (isZero(x) ? 0 : x)));
  }
  if (rows.length > n + 1) rows.length = n + 1;
  const first = rows.map((r) => r[0]);
  let changes = 0;
  for (let i = 1; i < first.length; i++) if (Math.sign(first[i]) !== Math.sign(first[i - 1]) && first[i] !== 0 && first[i - 1] !== 0) changes++;
  return { rows: rows.map((r) => r.slice(0, width)), first, changes, notes, usedEps, auxRow, n };
}

export function solve(input) {
  const tf = readTF(input, "p", "چندجمله‌ای", { polynomial: true });
  const asc = tf.num.map((c) => c / tf.den[0]);
  let desc = toDescending(asc);
  const n = desc.length - 1;
  if (n < 1) fail("چندجمله‌ای باید حداقل از درجه یک باشد.", "p");
  if (desc[0] < 0) desc = desc.map((c) => -c);
  const steps = [{ text: "معادله مشخصه:", tex: `${ptex(asc, "s")} = 0` }];
  const missing = desc.some((c) => c === 0), negative = desc.some((c) => c < 0);
  if (missing || negative) steps.push(`شرط لازم برقرار نیست: ${negative ? "ضریب منفی وجود دارد" : "ضریب صفر وجود دارد"}، پس سیستم به‌طور کامل پایدار نیست. جدول را ادامه می‌دهیم تا تعداد ریشه‌های ناپایدار را بیابیم.`);
  else steps.push("شرط لازم برقرار است: همه ضرایب موجودند و مثبت‌اند. جدول را برای اطمینان می‌سازیم.");
  const T = routhTable(desc);
  steps.push("دو سطر اول ضرایب متناوب چندجمله‌ای هستند، و هر سطر بعد از آن با ضرب متقاطع دو سطر بالای خود محاسبه می‌شود و بر عنصر اول سطر قبلی تقسیم می‌شود.");
  for (const note of T.notes) {
    if (note.kind === "eps") steps.push(`در سطر $s^{${n - note.row}}$ صفر در ستون اول ظاهر شد، پس آن را با عدد مثبت بسیار کوچک $\\varepsilon$ جایگزین کردیم و ادامه دادیم.`);
    else steps.push({ text: `سطر $s^{${n - note.row}}$ کاملاً صفر است، پس چندجمله‌ای کمکی را از سطر قبلی می‌سازیم و سطر صفر را با ضرایب مشتق آن جایگزین می‌کنیم. این یعنی ریشه‌هایی نسبت به مبدأ متقارن وجود دارد (ممکن است روی محور موهومی باشند):`, tex: `A(s) = ${note.aux.map((c, k) => `${niceTex(c, 6)}s^{${note.order - 2 * k}}`).join(" + ")}` });
  }
  const rs = roots(asc);
  const rhp = rs.filter((r) => r.re > 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  const jw = rs.filter((r) => Math.abs(r.re) <= 1e-10 * Math.max(1, Math.hypot(r.re, r.im))).length;
  steps.push(`تعداد تغییر علامت در ستون اول = ${T.changes}، که تعداد ریشه‌ها در نیم‌صفحه راست است.`);
  steps.push(`برای بررسی، ریشه‌ها را به‌صورت عددی محاسبه کردیم: ${rhp} در نیم‌صفحه راست و ${jw} روی محور موهومی.`);
  const verdict = rhp > 0 ? "ناپایدار" : jw > 0 ? "پایداری مرزی (ریشه‌ها روی محور موهومی)" : "پایدار";
  const rows = T.rows.map((r, i) => [{ tex: `s^{${n - i}}`, th: true }, ...r.map((x, k) => (k === 0 && T.notes.some((q) => q.kind === "eps" && q.row === i) ? { tex: "\\varepsilon" } : fmt(x, 6)))]);
  return {
    results: [
      { label: "حکم", value: verdict },
      { label: "تغییرات علامت در ستون اول", value: T.changes },
      { label: "ریشه‌ها در نیم‌صفحه راست (RHP)", value: rhp, text: `RHP = ${rhp}` },
      { label: "ریشه‌ها روی محور موهومی", value: jw }
    ],
    blocks: [{ type: "table", caption: "جدول راث", head: ["", ...Array.from({ length: T.rows[0].length }, (_, k) => `ستون ${k + 1}`)], rows }],
    steps, copy: `${verdict}, RHP = ${rhp}, sign changes = ${T.changes}`
  };
}
