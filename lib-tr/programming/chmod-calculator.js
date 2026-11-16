import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "Unix dosya izinlerini sekizli biçim (ör. 755) ile sembolik biçim (ör. rwxr-xr-x) arasında çevirir; sahip, grup ve diğerleri için izinleri, SUID, SGID ve Sticky özel bitlerini gösterir ve hazır chmod komutunu üretir.",
  keywords: ["chmod", "izinler", "dosya izinleri", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "Her kategori için izin toplamı", tex: "d = 4r + 2w + 1x" },
    { label: "Tam sekizli biçim", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "İzinler", type: "text", default: "755", help: "755, 0755, 4755, rwxr-xr-x veya -rwxr-xr-x gibi yazın." },
    { id: "file", label: "Dosya adı", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "Örnek: betik için genel çalıştırma izinleri." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("Dosya izinlerini girin, ör. 755 veya rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("Sekizli biçim yalnızca 0 ile 7 arasındaki rakamları kabul eder, ör. 755 veya 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("Sembolik biçim rwxr-xr-x gibi 9 karakterden oluşmalı; başına dosya türü karakteri de gelebilir.", "perm");
  const digit = (r, w, x) => (r === "r" ? 4 : 0) + (w === "w" ? 2 : 0) + (x === "x" || x === "s" || x === "t" ? 1 : 0);
  const du = digit(m[1], m[2], m[3]);
  const dg = digit(m[4], m[5], m[6]);
  const doth = digit(m[7], m[8], m[9]);
  const sp = (m[3] === "s" || m[3] === "S" ? 4 : 0) | (m[6] === "s" || m[6] === "S" ? 2 : 0) | (m[9] === "t" || m[9] === "T" ? 1 : 0);
  return sp * 512 + du * 64 + dg * 8 + doth;
}

function octalOf(mode) {
  const sp = (mode >> 9) & 7;
  return mode.toString(8).padStart(sp ? 4 : 3, "0");
}

function symbolicOf(mode) {
  const sp = (mode >> 9) & 7;
  const cls = [(mode >> 6) & 7, (mode >> 3) & 7, mode & 7];
  let out = "";
  cls.forEach((d, i) => {
    out += d & 4 ? "r" : "-";
    out += d & 2 ? "w" : "-";
    const ex = d & 1;
    if (i === 2 && sp & 1) out += ex ? "t" : "T";
    else if (i < 2 && sp & (i === 0 ? 4 : 2)) out += ex ? "s" : "S";
    else out += ex ? "x" : "-";
  });
  return out;
}

export function solve(input) {
  const mode = parsePerm(input.perm);
  const file = str(input, "file", "Dosya adı", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("Dosya adı komutta izin verilmeyen karakterler içeriyor, ör. tırnak işaretleri, $ veya ters eğik çizgi.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["Sahip (u)", "Grup (g)", "Diğerleri (o)"];
  const digits = [(mode >> 6) & 7, (mode >> 3) & 7, mode & 7];
  const cell = (on, val) => (on ? `✓ ${val}` : "✗ 0");
  const rows = digits.map((d, i) => [
    names[i],
    cell(d & 4, 4),
    cell(d & 2, 2),
    cell(d & 1, 1),
    String(d)
  ]);
  const steps = [];
  const labels = ["u", "g", "o"];
  digits.forEach((d, i) => {
    const terms = [d & 4 ? "4" : null, d & 2 ? "2" : null, d & 1 ? "1" : null].filter(Boolean);
    steps.push({ text: `${names[i]} izinlerinin toplamı:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "Dosya çalıştırıldığında sahibinin izinleriyle çalışır; sahibin çalıştırma hanesinde s veya S olarak görünür."],
    [2, "SGID", "2000", "Dosya çalıştırıldığında grubunun izinleriyle çalışır; klasörlerde yeni dosyalar grubu devralır ve grubun çalıştırma hanesinde s veya S olarak görünür."],
    [1, "Sticky", "1000", "Klasörde kullanıcı başkasına ait dosyaları silemez; diğerlerinin çalıştırma hanesinde t veya T olarak görünür."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`Tam sekizli biçim: ${octal}, sembolik biçim: ${sym}.`);
  const blocks = [
    { type: "table", caption: "Kategorilere göre izin dağılımı", head: ["Kategori", "Okuma r = 4", "Yazma w = 2", "Çalıştırma x = 1", "Toplam"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `Etkin özel bitler: ${active.length} / 3. ${/[ST]/.test(sym) ? "Büyük S veya T harfi, özelliğin etkin olduğu ama temel çalıştırma bitinin etkin olmadığı anlamına gelir." : "Küçük s veya t harfi, özelliğin ve çalıştırma izninin birlikte etkin olduğu anlamına gelir."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "Uyarı: 777 izni herkese okuma, yazma ve çalıştırma yetkisi verir; çoğu durumda ciddi bir güvenlik riskidir.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "Uyarı: diğerleri için yazma izni açık; bu dosyayı herhangi bir kullanıcı değiştirebilir.", tone: "warn" });
  return {
    results: [
      { label: "Sekizli biçim", value: octal },
      { label: "Sembolik biçim", value: sym },
      { label: "chmod komutu", value: command },
      { label: "Özel bitler", value: active.length ? active.map(([, name]) => name).join("، ") : "yok" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
