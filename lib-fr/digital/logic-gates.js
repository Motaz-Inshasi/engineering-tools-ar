import { choice, str, fail } from "../core/validate.js";

const GATES = [["AND", "AND"], ["OR", "OR"], ["NOT", "NOT"], ["NAND", "NAND"], ["NOR", "NOR"], ["XOR", "XOR"], ["XNOR", "XNOR"], ["BUF", "BUFFER"]];

export const meta = {
  description: "Calculez la sortie de toute porte logique (AND, OR, NOT, NAND, NOR, XOR et XNOR) pour un nombre d'entrées allant jusqu'à 8, avec la table de vérité complète de la porte et son expression algébrique.",
  keywords: ["Portes logiques", "logic gates", "AND", "OR", "NAND", "NOR", "XOR", "XNOR", "NOT", "Porte"],
  formulas: [
    { label: "Portes de base", tex: "\\text{AND}: A\\cdot B,\\quad \\text{OR}: A + B,\\quad \\text{NOT}: \\overline{A}" },
    { label: "Portes qui en dérivent", tex: "\\text{NAND}: \\overline{A\\cdot B},\\quad \\text{NOR}: \\overline{A + B},\\quad \\text{XOR}: A \\oplus B,\\quad \\text{XNOR}: \\overline{A \\oplus B}" }
  ],
  inputs: [
    { id: "gate", label: "Porte", type: "select", default: "XOR", options: GATES },
    { id: "bits", label: "Valeurs des entrées", type: "text", default: "1 0 1", help: "Valeurs 0 ou 1 séparées par des espaces. NOT et BUFFER n'acceptent qu'une seule entrée." }
  ],
  example: { values: { gate: "XOR", bits: "1 0 1" }, expect: ["Y = 0"], note: "Exemple : XOR à trois entrées ne donne 1 que lorsque le nombre de 1 est impair." },
  invalid: { values: { gate: "AND", bits: "1 2" } },
  related: ["truth-table", "boolean-simplifier", "flip-flops"]
};

export function gate(name, ins) {
  const and = ins.every(Boolean), or = ins.some(Boolean), xor = ins.filter(Boolean).length % 2 === 1;
  const v = { AND: and, OR: or, NAND: !and, NOR: !or, XOR: xor, XNOR: !xor, NOT: !ins[0], BUF: !!ins[0] }[name];
  return v ? 1 : 0;
}

const DESC = {
  AND: "La sortie vaut 1 seulement si toutes les entrées valent 1.",
  OR: "La sortie vaut 1 si au moins une entrée vaut 1.",
  NAND: "Inverse de AND : la sortie vaut 0 seulement si toutes les entrées valent 1. Porte universelle, à partir de laquelle tout circuit peut être construit.",
  NOR: "Inverse de OR : la sortie vaut 1 seulement si toutes les entrées valent 0. Également une porte universelle.",
  XOR: "La sortie vaut 1 si le nombre de 1 est impair (pour deux entrées : si elles sont différentes).",
  XNOR: "La sortie vaut 1 si le nombre de 1 est pair (pour deux entrées : si elles sont égales).",
  NOT: "Inverse l'entrée.",
  BUF: "Recopie l'entrée telle quelle (utilisée pour renforcer le signal)."
};

const TEX = { AND: (v) => v.join(" \\cdot "), OR: (v) => v.join(" + "), NAND: (v) => `\\overline{${v.join(" \\cdot ")}}`, NOR: (v) => `\\overline{${v.join(" + ")}}`, XOR: (v) => v.join(" \\oplus "), XNOR: (v) => `\\overline{${v.join(" \\oplus ")}}`, NOT: (v) => `\\overline{${v[0]}}`, BUF: (v) => v[0] };

export function solve(input) {
  const g = choice(input, "gate", "Porte", GATES.map((x) => x[0]), "AND");
  const raw = str(input, "bits", "Valeurs des entrées").split(/[\s,،]+/).filter(Boolean);
  if (raw.some((b) => b !== "0" && b !== "1")) fail("Chaque valeur d'entrée doit être 0 ou 1.", "bits");
  const ins = raw.map(Number);
  const single = g === "NOT" || g === "BUF";
  if (single && ins.length !== 1) fail(`La porte ${g} n'accepte qu'une seule entrée.`, "bits");
  if (!single && (ins.length < 2 || ins.length > 8)) fail("Le nombre d'entrées doit être compris entre 2 et 8.", "bits");
  const names = ins.map((_, i) => String.fromCharCode(65 + i));
  const y = gate(g, ins);
  const steps = [
    DESC[g],
    { text: "Expression algébrique :", tex: `Y = ${TEX[g](names)}` },
    { text: "Par substitution :", tex: `Y = ${TEX[g](ins.map(String))} = ${y}` }
  ];
  const n = ins.length;
  const rows = [];
  if (n <= 5) for (let m = 0; m < 1 << n; m++) {
    const b = [...m.toString(2).padStart(n, "0")].map(Number);
    const out = gate(g, b);
    const cur = b.every((x, i) => x === ins[i]);
    rows.push([...b.map((x) => (cur ? { text: String(x), color: "var(--accent-soft)", fg: "var(--text)" } : String(x))), cur ? { text: String(out), color: "var(--accent-soft)", fg: "var(--text)" } : String(out)]);
  }
  return {
    results: [{ label: "Sortie Y", value: y, text: `Y = ${y}` }, { label: "Porte", value: `${g} à ${n} ${n === 1 ? "entrée" : "entrées"}` }],
    blocks: rows.length ? [{ type: "table", ltr: true, caption: "Table de vérité de la porte (la ligne en surbrillance correspond aux entrées actuelles)", head: [...names, "Y"], rows }] : [],
    steps, copy: `${g}(${ins.join(", ")}) → Y = ${y}`
  };
}
