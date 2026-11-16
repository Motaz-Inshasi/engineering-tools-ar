import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "Converts Unix file permissions between octal form (such as 755) and symbolic form (such as rwxr-xr-x), showing how permissions are distributed among the owner, the group, and others, the special bits SUID, SGID, and sticky, plus a ready-to-use chmod command.",
  keywords: ["chmod", "permissions", "File permissions", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "Sum of permissions for each class", tex: "d = 4r + 2w + 1x" },
    { label: "Full octal form", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "Permissions", type: "text", default: "755", help: "Write something like 755, 0755, 4755, rwxr-xr-x, or -rwxr-xr-x." },
    { id: "file", label: "File name", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "Example: general execute permissions for a script." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("Enter the file permissions, such as 755 or rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("Octal form accepts only digits from 0 to 7, such as 755 or 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("Symbolic form must consist of 9 symbols such as rwxr-xr-x, and may be preceded by a file type character.", "perm");
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
  const file = str(input, "file", "File name", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("The file name contains characters that are not allowed in the command, such as quotation marks, $, or backslashes.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["Owner (u)", "Group (g)", "Others (o)"];
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
    steps.push({ text: `Sum of permissions for ${names[i]}:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "When the file is executed, it runs with its owner's permissions, and the owner's execute slot shows as s or S."],
    [2, "SGID", "2000", "When the file is executed, it runs with its group's permissions; in directories, the group is inherited by new files, and the group's execute slot shows as s or S."],
    [1, "Sticky", "1000", "In a directory, a user cannot delete other users' files, and the others' execute slot shows as t or T."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`Full octal form: ${octal}, and symbolic form: ${sym}.`);
  const blocks = [
    { type: "table", caption: "Distribution of permissions across classes", head: ["Class", "Read r = 4", "Write w = 2", "Execute x = 1", "Total"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `Special bits enabled: ${active.length} of 3. ${/[ST]/.test(sym) ? "Uppercase S or T means the special bit is enabled but the basic execute bit is not." : "Lowercase s or t means the special bit and the execute bit are both enabled."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "Warning: permission 777 gives everyone read, write, and execute access, which is a security risk in most cases.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "Warning: write permission is open to others, meaning any user can modify this file.", tone: "warn" });
  return {
    results: [
      { label: "Octal form", value: octal },
      { label: "Symbolic form", value: sym },
      { label: "chmod command", value: command },
      { label: "Special bits", value: active.length ? active.map(([, name]) => name).join("، ") : "None" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
