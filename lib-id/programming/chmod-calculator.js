import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "Mengubah izin berkas Unix antara bentuk oktal (seperti 755) dan bentuk simbolik (seperti rwxr-xr-x), dengan pembagian izin untuk pemilik, grup, dan lainnya, bit khusus SUID, SGID, dan sticky, serta perintah chmod siap pakai.",
  keywords: ["chmod", "izin", "Izin berkas", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "Jumlah izin untuk setiap kelas", tex: "d = 4r + 2w + 1x" },
    { label: "Bentuk oktal lengkap", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "Izin", type: "text", default: "755", help: "Tulis seperti 755, 0755, 4755, rwxr-xr-x, atau -rwxr-xr-x." },
    { id: "file", label: "Nama berkas", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "Contoh: izin eksekusi umum untuk skrip." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("Masukkan izin berkas, seperti 755 atau rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("Bentuk oktal hanya menerima angka 0 sampai 7, seperti 755 atau 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("Bentuk simbolik harus terdiri dari 9 simbol seperti rwxr-xr-x, dan boleh diawali karakter jenis berkas.", "perm");
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
  const file = str(input, "file", "Nama berkas", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("Nama berkas berisi karakter yang tidak diizinkan dalam perintah, seperti tanda kutip, $, atau garis miring terbalik.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["Pemilik (u)", "Grup (g)", "Lainnya (o)"];
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
    steps.push({ text: `Jumlah izin untuk ${names[i]}:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "Saat berkas dieksekusi, berkas berjalan dengan izin pemiliknya, dan slot eksekusi pemilik tampil sebagai s atau S."],
    [2, "SGID", "2000", "Saat berkas dieksekusi, berkas berjalan dengan izin grupnya; pada direktori, grup diwariskan ke berkas baru, dan slot eksekusi grup tampil sebagai s atau S."],
    [1, "Sticky", "1000", "Di dalam direktori, pengguna tidak dapat menghapus berkas milik pengguna lain, dan slot eksekusi lainnya tampil sebagai t atau T."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`Bentuk oktal lengkap: ${octal}, dan bentuk simbolik: ${sym}.`);
  const blocks = [
    { type: "table", caption: "Pembagian izin pada setiap kelas", head: ["Kelas", "Baca r = 4", "Tulis w = 2", "Eksekusi x = 1", "Total"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `Bit khusus aktif: ${active.length} dari 3. ${/[ST]/.test(sym) ? "S atau T huruf besar berarti bit khusus aktif tetapi bit eksekusi dasar tidak aktif." : "s atau t huruf kecil berarti bit khusus dan bit eksekusi keduanya aktif."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "Peringatan: izin 777 memberi semua orang akses baca, tulis, dan eksekusi, yang merupakan risiko keamanan dalam sebagian besar kasus.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "Peringatan: izin tulis terbuka untuk pihak lain, artinya pengguna mana pun dapat mengubah berkas ini.", tone: "warn" });
  return {
    results: [
      { label: "Bentuk oktal", value: octal },
      { label: "Bentuk simbolik", value: sym },
      { label: "Perintah chmod", value: command },
      { label: "Bit khusus", value: active.length ? active.map(([, name]) => name).join("، ") : "Tidak ada" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
