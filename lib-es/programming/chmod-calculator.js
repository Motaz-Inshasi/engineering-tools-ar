import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "Convierte permisos de archivos Unix entre el formato octal (como 755) y el simbólico (como rwxr-xr-x), desglosa los permisos por propietario, grupo y otros, los bits especiales SUID, SGID y Sticky, y el comando chmod listo para usar.",
  keywords: ["chmod", "permisos", "permisos de archivos", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "Suma de permisos por categoría", tex: "d = 4r + 2w + 1x" },
    { label: "Formato octal completo", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "Permisos", type: "text", default: "755", help: "Escribe, por ejemplo, 755, 0755, 4755, rwxr-xr-x o -rwxr-xr-x." },
    { id: "file", label: "Nombre del archivo", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "Ejemplo: permisos de ejecución generales para el script." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("Introduce los permisos del archivo, por ejemplo 755 o rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("El formato octal solo acepta los dígitos del 0 al 7, por ejemplo 755 o 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("El formato simbólico debe tener 9 caracteres, como rwxr-xr-x, y puede ir precedido por el tipo de archivo.", "perm");
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
  const file = str(input, "file", "Nombre del archivo", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("El nombre del archivo contiene caracteres no permitidos en el comando, como comillas, $ o la barra invertida.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["Propietario (u)", "Grupo (g)", "Otros (o)"];
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
    steps.push({ text: `Suma de permisos de ${names[i]}:`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "Al ejecutar el archivo, se usan los permisos de su propietario, y aparece en el campo de ejecución del propietario como s o S."],
    [2, "SGID", "2000", "Al ejecutar el archivo, se usan los permisos de su grupo; en las carpetas, el grupo se hereda por los archivos nuevos, y aparece en el campo de ejecución del grupo como s o S."],
    [1, "Sticky", "1000", "En una carpeta, el usuario no puede borrar archivos de otros; aparece en el campo de ejecución de otros como t o T."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`Formato octal completo: ${octal}, y formato simbólico: ${sym}.`);
  const blocks = [
    { type: "table", caption: "Distribución de permisos por categoría", head: ["Categoría", "Lectura r = 4", "Escritura w = 2", "Ejecución x = 1", "Total"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `Bits especiales activos: ${active.length} de 3. ${/[ST]/.test(sym) ? "La letra mayúscula S o T indica que la propiedad está activa, pero el bit de ejecución básico no lo está." : "La letra minúscula s o t indica que la propiedad y el permiso de ejecución están activos."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "Advertencia: el permiso 777 concede lectura, escritura y ejecución a todos, lo que es un riesgo de seguridad en la mayoría de los casos.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "Advertencia: el permiso de escritura está abierto a otros; cualquier usuario puede modificar este archivo.", tone: "warn" });
  return {
    results: [
      { label: "Formato octal", value: octal },
      { label: "Formato simbólico", value: sym },
      { label: "Comando chmod", value: command },
      { label: "Bits especiales", value: active.length ? active.map(([, name]) => name).join("، ") : "Ninguno" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
