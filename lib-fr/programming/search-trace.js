import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "Recherche linéaire", complexity: "O(n)", head: ["Étape", "Indice", "Valeur", "Égale à la cible ?"], description: "Les éléments sont vérifiés un par un depuis le début, et la recherche s'arrête au premier élément égal à la valeur recherchée ou à la fin de la liste. La liste n'a pas besoin d'être triée." },
  binary: { label: "Recherche dichotomique", complexity: "O(log n)", head: ["Étape", "Indice minimal (low)", "Indice maximal (high)", "Indice médian (mid)", "Valeur à mid", "Comparaison", "Action"], description: "La valeur recherchée est comparée à l'élément médian de la plage actuelle, puis la moitié où la valeur ne peut pas se trouver est écartée. Cette étape est répétée jusqu'à trouver la valeur ou jusqu'à ce que la plage soit vide. La liste doit être triée par ordre croissant." }
};

function fmtNum(x) {
  return fmt(x, 10);
}

function maxBinary(n) {
  let m = 0;
  for (let x = n; x > 0; x = Math.floor(x / 2)) m++;
  return m;
}

function linearTrace(data, target) {
  const rows = [];
  let found = -1;
  for (let i = 0; i < data.length; i++) {
    const eq = data[i] === target;
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "Oui" : "Non"]);
    if (eq) {
      found = i;
      break;
    }
  }
  return { rows, found, comparisons: rows.length };
}

function binaryTrace(data, target) {
  const rows = [];
  let lo = 0, hi = data.length - 1, found = -1, step = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = data[mid];
    step++;
    const sym = target === v ? "=" : target < v ? "<" : ">";
    const action = sym === "=" ? `Valeur trouvée à l'indice ${mid}` : sym === "<" ? "La valeur recherchée est plus petite, on cherche donc dans la moitié gauche" : "La valeur recherchée est plus grande, on cherche donc dans la moitié droite";
    rows.push([String(step), String(lo), String(hi), String(mid), fmtNum(v), `${fmtNum(target)} ${sym} ${fmtNum(v)}`, action]);
    if (sym === "=") {
      found = mid;
      break;
    }
    if (sym === "<") hi = mid - 1;
    else lo = mid + 1;
  }
  return { rows, found, comparisons: rows.length };
}

export const meta = {
  description: "Suivi pas à pas de la recherche linéaire et de la recherche dichotomique sur une liste de nombres, avec la position de la valeur si elle est trouvée, le nombre de comparaisons et le nombre maximal de comparaisons possible pour la taille de la liste.",
  keywords: ["recherche", "recherche linéaire", "recherche dichotomique", "linear search", "binary search", "algorithme de recherche", "Indice", "logarithmique"],
  formulas: [
    { label: "Nombre maximal de comparaisons en recherche dichotomique", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "Nombre maximal de comparaisons en recherche linéaire", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "Liste", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "Nombres séparés par des virgules ou des espaces. La recherche dichotomique nécessite une liste triée ; si elle ne l'est pas, elle sera d'abord triée." },
    { id: "target", label: "Nombre recherché", type: "number", default: "7" },
    { id: "algo", label: "Type de recherche", type: "select", default: "binary", options: [["linear", "Recherche linéaire"], ["binary", "Recherche dichotomique"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["à l'indice 3", "après 1 comparaison"], note: "Exemple : recherche dichotomique de 7 dans une liste triée de sept nombres." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("La saisie dépasse 200000 caractères.", "list");
  const list = numList(input, "list", "Liste");
  const target = num(input, "target", "Nombre recherché");
  const algo = choice(input, "algo", "Type de recherche", Object.keys(ALGOS), "binary");
  const info = ALGOS[algo];

  const isSorted = list.every((v, i) => i === 0 || list[i - 1] <= v);
  const reorder = algo === "binary" && !isSorted;
  const data = reorder ? [...list].sort((x, y) => x - y) : list;

  const trace = algo === "binary" ? binaryTrace(data, target) : linearTrace(data, target);
  const found = trace.found >= 0;
  const n = data.length;
  const maxC = algo === "binary" ? maxBinary(n) : n;
  const targetText = fmtNum(target);

  const results = [
    { label: "Résultat", value: found ? "Trouvée" : "Introuvable" },
    { label: "Indice (base 0)", value: found ? String(trace.found) : "—" },
    { label: "Position (base 1)", value: found ? String(trace.found + 1) : "—" },
    { label: "Comparaisons", value: String(trace.comparisons) },
    { label: "Complexité temporelle", value: info.complexity },
    { label: `Nombre maximal de comparaisons pour la taille n = ${n}`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "Liste triée utilisée", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `La valeur ${targetText} se trouve à l'indice ${trace.found} (position ${trace.found + 1}) après ${trace.comparisons} comparaison(s)`
    : `La valeur ${targetText} est introuvable après ${trace.comparisons} comparaison(s)`;

  const steps = [
    `Algorithme : ${info.label}. ${info.description}`,
    `Comparaisons : ${trace.comparisons}.`,
    `Complexité temporelle : ${info.complexity}, et le nombre maximal de comparaisons pour cette taille est ${maxC}.`,
    found ? `La valeur ${targetText} a été trouvée à l'indice ${trace.found}, c'est-à-dire à la position ${trace.found + 1}.` : `La valeur ${targetText} ne se trouve pas dans la liste.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "La recherche dichotomique exige une liste triée par ordre croissant ; la liste a donc d'abord été triée, et les indices du résultat et du tableau se réfèrent à la liste triée." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "Suivi des étapes de la recherche", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Affichage des ${MAX_ROWS} premières étapes sur ${trace.rows.length}.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "La valeur est dupliquée dans la liste, et la recherche linéaire renvoie sa première position." : "La valeur est dupliquée dans la liste, et la recherche dichotomique renvoie l'une de ses positions, pas forcément la première." });

  return { results, steps, blocks, copy };
}
