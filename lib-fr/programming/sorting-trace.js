import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "Tri à bulles", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Oui", counter: "Échanges (Swaps)", head: ["Passage", "Comparaisons", "Échanges", "Liste après le passage"], description: "L'algorithme parcourt la liste plusieurs fois. À chaque passage, il compare chaque élément à son voisin et les échange s'ils ne sont pas dans l'ordre voulu. Le plus grand élément non trié remonte en fin de liste, et l'algorithme s'arrête dès qu'un passage ne fait aucun échange." },
  selection: { label: "Tri par sélection", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Non", counter: "Échanges (Swaps)", head: ["Passage", "Valeur sélectionnée", "Liste après le passage"], description: "Il recherche dans la partie non triée le plus petit élément (ou le plus grand en ordre décroissant), puis le place à la première position non triée avec au plus un échange." },
  insertion: { label: "Tri par insertion", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Oui", counter: "Décalages (Shifts)", head: ["Étape", "Élément inséré", "Décalages", "Liste après l'insertion"], description: "Chaque élément est pris et inséré à sa place dans la partie triée située à sa gauche, en décalant d'un cran vers la droite les éléments qui le suivent dans l'ordre." },
  merge: { label: "Tri fusion", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Oui", counter: "Écritures (Writes)", head: ["Étape", "Plage", "Gauche", "Droite", "Après la fusion"], description: "La liste est découpée de façon répétée en deux moitiés jusqu'à ce que chaque partie ne contienne qu'un seul élément, puis chaque paire de parties triées est fusionnée en une partie triée plus grande." },
  quick: { label: "Tri rapide (pivot = dernier élément)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n) en moyenne et O(n) dans le pire cas", stable: "Non", counter: "Échanges (Swaps)", head: ["Étape", "Plage", "Pivot", "Position finale du pivot", "Liste après le partitionnement"], description: "Le pivot est le dernier élément de la plage. Les éléments qui le précèdent sont placés à sa gauche et ceux qui le suivent à sa droite, puis le processus est répété sur les deux parties." }
};

const ORDERS = { asc: "Croissant", desc: "Décroissant" };

function fmtNum(x) {
  return fmt(x, 10);
}

function snapshot(a) {
  return a.map(fmtNum).join(", ");
}

function runBubble(a, dir) {
  const rows = [];
  const n = a.length;
  let comparisons = 0, swaps = 0, early = false;
  for (let p = 0; p < n - 1; p++) {
    let c = 0, s = 0;
    for (let j = 0; j < n - 1 - p; j++) {
      comparisons++;
      c++;
      if (dir * (a[j] - a[j + 1]) > 0) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps++;
        s++;
      }
    }
    rows.push([String(p + 1), String(c), String(s), snapshot(a)]);
    if (s === 0) {
      early = p < n - 2;
      break;
    }
  }
  return { rows, comparisons, count: swaps, early };
}

function runSelection(a, dir) {
  const rows = [];
  const n = a.length;
  let comparisons = 0, swaps = 0;
  for (let i = 0; i < n - 1; i++) {
    let best = i;
    for (let j = i + 1; j < n; j++) {
      comparisons++;
      if (dir * (a[j] - a[best]) < 0) best = j;
    }
    const chosen = a[best];
    if (best !== i) {
      [a[i], a[best]] = [a[best], a[i]];
      swaps++;
    }
    rows.push([String(i + 1), fmtNum(chosen), snapshot(a)]);
  }
  return { rows, comparisons, count: swaps, early: false };
}

function runInsertion(a, dir) {
  const rows = [];
  let comparisons = 0, shifts = 0;
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    let s = 0;
    while (j >= 0) {
      comparisons++;
      if (dir * (a[j] - key) > 0) {
        a[j + 1] = a[j];
        shifts++;
        s++;
        j--;
      } else {
        break;
      }
    }
    a[j + 1] = key;
    rows.push([String(i), fmtNum(key), String(s), snapshot(a)]);
  }
  return { rows, comparisons, count: shifts, early: false };
}

function runMerge(a, dir) {
  const rows = [];
  let comparisons = 0, writes = 0;
  const merge = (lo, mid, hi) => {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (dir * (left[i] - right[j]) <= 0) a[k++] = left[i++];
      else a[k++] = right[j++];
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
    writes += hi - lo + 1;
    rows.push([String(rows.length + 1), `${lo + 1} – ${hi + 1}`, snapshot(left), snapshot(right), snapshot(a.slice(lo, hi + 1))]);
  };
  const sortRange = (lo, hi) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sortRange(lo, mid);
    sortRange(mid + 1, hi);
    merge(lo, mid, hi);
  };
  sortRange(0, a.length - 1);
  return { rows, comparisons, count: writes, early: false };
}

function runQuick(a, dir) {
  const rows = [];
  let comparisons = 0, swaps = 0;
  const swap = (x, y) => {
    if (x !== y) {
      [a[x], a[y]] = [a[y], a[x]];
      swaps++;
    }
  };
  const partition = (lo, hi) => {
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      comparisons++;
      if (dir * (a[j] - pivot) <= 0) {
        swap(i, j);
        i++;
      }
    }
    swap(i, hi);
    return { p: i, pivot };
  };
  const sortRange = (lo, hi) => {
    if (lo >= hi) return;
    const { p, pivot } = partition(lo, hi);
    rows.push([String(rows.length + 1), `${lo + 1} – ${hi + 1}`, fmtNum(pivot), String(p + 1), snapshot(a)]);
    sortRange(lo, p - 1);
    sortRange(p + 1, hi);
  };
  sortRange(0, a.length - 1);
  return { rows, comparisons, count: swaps, early: false };
}

const RUNNERS = { bubble: runBubble, selection: runSelection, insertion: runInsertion, merge: runMerge, quick: runQuick };

export const meta = {
  description: "Un suivi pas à pas de la manière dont les tris à bulles, par sélection, par insertion, fusion et rapide ordonnent une liste de nombres, avec le nombre de comparaisons et d'échanges, un tableau pour chaque passage ou étape, et leur complexité temporelle et spatiale.",
  keywords: ["tri", "algorithme de tri", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "bulles", "fusion", "rapide", "insertion", "sélection"],
  formulas: [
    { label: "Nombre de comparaisons dans le tri par sélection", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "Complexité du tri fusion", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "Liste", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "De 2 à 30 nombres, séparés par des virgules ou des espaces." },
    { id: "algo", label: "Algorithme", type: "select", default: "bubble", options: [["bubble", "Tri à bulles"], ["selection", "Tri par sélection"], ["insertion", "Tri par insertion"], ["merge", "Tri fusion"], ["quick", "Tri rapide (pivot = dernier élément)"]] },
    { id: "order", label: "Ordre du résultat", type: "select", default: "asc", options: [["asc", "Croissant"], ["desc", "Décroissant"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "Échanges (Swaps) : 4"], note: "Exemple : tri à bulles sur 5, 1, 4, 2, 8 en ordre croissant, qui nécessite quatre échanges." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("La saisie dépasse 200000 caractères.", "list");
  const list = numList(input, "list", "Liste", { min: 2, max: 30 });
  const algo = choice(input, "algo", "Algorithme", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "Ordre du résultat", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "Liste après le tri", value: sortedText, text: sortedText },
    { label: "Comparaisons", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "Complexité temporelle (meilleur / moyen / pire)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "Complexité spatiale", value: info.space },
    { label: "Stable", value: info.stable }
  ];

  const steps = [
    `Algorithme : ${info.label}. ${info.description}`,
    `Ordre du résultat : ${ORDERS[order]}.`,
    `Comparaisons : ${compText}.`,
    `${info.counter}: ${countText}.`,
    `Complexité temporelle : meilleur cas ${info.best}, moyen ${info.average}, pire cas ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "Suivi des étapes de l'algorithme", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `Affichage des ${MAX_ROWS} premières étapes sur ${run.rows.length}.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `L'algorithme s'est arrêté tôt après le passage ${run.rows.length} car ce passage n'a effectué aucun échange : la liste est déjà triée.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter} : ${countText} | Comparaisons : ${compText}`
  };
}
