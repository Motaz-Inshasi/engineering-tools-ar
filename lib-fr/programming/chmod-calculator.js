import { fail, str } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

const SYM_RE = /^([r-])([w-])([xsS-])([r-])([w-])([xsS-])([r-])([w-])([xtT-])$/;

export const meta = {
  description: "Convertissez les permissions d'un fichier Unix entre la forme octale (comme 755) et la forme symbolique (comme rwxr-xr-x), avec la répartition des permissions entre le propriétaire, le groupe et les autres, les bits spéciaux SUID, SGID et sticky, ainsi qu'une commande chmod prête à l'emploi.",
  keywords: ["chmod", "permissions", "Permissions des fichiers", "rwx", "755", "644", "setuid", "setgid", "sticky", "Unix", "Linux"],
  formulas: [
    { label: "Somme des permissions pour chaque catégorie", tex: "d = 4r + 2w + 1x" },
    { label: "Forme octale complète", tex: "\\text{mode} = 512\\,s + 64\\,d_u + 8\\,d_g + d_o" }
  ],
  inputs: [
    { id: "perm", label: "Permissions", type: "text", default: "755", help: "Saisissez une valeur comme 755, 0755, 4755, rwxr-xr-x ou -rwxr-xr-x." },
    { id: "file", label: "Nom du fichier", type: "text", default: "script.sh" }
  ],
  example: { values: { perm: "755", file: "script.sh" }, expect: ["chmod 755 script.sh"], note: "Exemple : permissions d'exécution générales pour un script." },
  invalid: { values: { perm: "789", file: "script.sh" } },
  related: ["bitwise-calculator", "number-bases", "unix-timestamp"]
};

function parsePerm(raw) {
  const s = normalizeDigits(String(raw ?? "")).trim();
  if (s === "") fail("Saisissez les permissions du fichier, comme 755 ou rwxr-xr-x.", "perm");
  if (/^[0-7]{3,4}$/.test(s)) return parseInt(s, 8);
  if (/^[0-9]+$/.test(s)) fail("La forme octale n'accepte que les chiffres de 0 à 7, comme 755 ou 4755.", "perm");
  const sym = s.length === 10 && /^[-dlcbps]/.test(s) ? s.slice(1) : s;
  const m = sym.match(SYM_RE);
  if (!m) fail("La forme symbolique doit comporter 9 symboles comme rwxr-xr-x, et peut être précédée d'un caractère indiquant le type de fichier.", "perm");
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
  const file = str(input, "file", "Nom du fichier", { default: "script.sh" });
  if (/[\r\n"'`$\\]/.test(file)) fail("Le nom du fichier contient des caractères non autorisés dans la commande, comme les guillemets, $ ou la barre oblique inverse.", "file");
  const sp = (mode >> 9) & 7;
  const octal = octalOf(mode);
  const sym = symbolicOf(mode);
  const target = /\s/.test(file) ? `'${file}'` : file;
  const command = `chmod ${octal} ${target}`;
  const names = ["Propriétaire (u)", "Groupe (g)", "Autres (o)"];
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
    steps.push({ text: `Somme des permissions pour ${names[i]} :`, tex: `${labels[i]} = ${terms.length ? terms.join(" + ") : "0"} = ${d}` });
  });
  const specialInfo = [
    [4, "SUID", "4000", "Lorsque le fichier est exécuté, il s'exécute avec les permissions de son propriétaire, et la case d'exécution du propriétaire apparaît sous la forme s ou S."],
    [2, "SGID", "2000", "Lorsque le fichier est exécuté, il s'exécute avec les permissions de son groupe ; dans les dossiers, le groupe est hérité par les nouveaux fichiers, et la case d'exécution du groupe apparaît sous la forme s ou S."],
    [1, "Sticky", "1000", "Dans un dossier, un utilisateur ne peut pas supprimer les fichiers des autres, et la case d'exécution des autres apparaît sous la forme t ou T."]
  ];
  const active = specialInfo.filter(([bit]) => sp & bit);
  active.forEach(([, name, code, text]) => steps.push(`${name} (${code}): ${text}`));
  steps.push(`Forme octale complète : ${octal}, et forme symbolique : ${sym}.`);
  const blocks = [
    { type: "table", caption: "Répartition des permissions par catégorie", head: ["Catégorie", "Lecture r = 4", "Écriture w = 2", "Exécution x = 1", "Total"], rows, ltr: true }
  ];
  if (sp) {
    blocks.push({ type: "note", text: `Bits spéciaux activés : ${active.length} sur 3. ${/[ST]/.test(sym) ? "La lettre majuscule S ou T signifie que le bit spécial est activé mais que le bit d'exécution de base ne l'est pas." : "La lettre minuscule s ou t signifie que le bit spécial et le bit d'exécution sont tous deux activés."}` });
  }
  if ((mode & 0o777) === 0o777) blocks.push({ type: "note", text: "Attention : la permission 777 donne à tout le monde les droits de lecture, d'écriture et d'exécution, ce qui constitue un risque de sécurité dans la plupart des cas.", tone: "warn" });
  else if (mode & 2) blocks.push({ type: "note", text: "Attention : le droit d'écriture est accordé aux autres, ce qui signifie que tout utilisateur peut modifier ce fichier.", tone: "warn" });
  return {
    results: [
      { label: "Forme octale", value: octal },
      { label: "Forme symbolique", value: sym },
      { label: "Commande chmod", value: command },
      { label: "Bits spéciaux", value: active.length ? active.map(([, name]) => name).join("، ") : "Aucun" }
    ],
    steps,
    blocks,
    copy: `${command} (${sym})`
  };
}
