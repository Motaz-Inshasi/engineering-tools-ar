import { choice, fail, numList } from "../core/validate.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 120;
const MAX_CHARS = 200000;

const ALGOS = {
  bubble: { label: "Burbuja (Bubble)", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Sí", counter: "Intercambios (Swaps)", head: ["Pasada", "Comparaciones", "Intercambios", "Lista tras la pasada"], description: "Recorre la lista varias veces comparando cada elemento con su vecino y los intercambia si están en orden incorrecto. En cada pasada, el mayor elemento pendiente sube al final. Se detiene cuando una pasada completa no hace intercambios." },
  selection: { label: "Selección (Selection)", best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "No", counter: "Intercambios (Swaps)", head: ["Pasada", "Valor elegido", "Lista tras la pasada"], description: "Busca en la parte sin ordenar el elemento menor (o el mayor, en orden descendente) y lo coloca en la primera posición sin ordenar, con como máximo un intercambio." },
  insertion: { label: "Inserción (Insertion)", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: "Sí", counter: "Desplazamientos (Shifts)", head: ["Paso", "Elemento insertado", "Desplazamientos", "Lista tras la inserción"], description: "Toma cada elemento y lo inserta en su posición dentro de la parte ordenada a su izquierda, desplazando una posición a la derecha los elementos que van después en el orden." },
  merge: { label: "Mezcla (Merge)", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: "Sí", counter: "Escrituras (Writes)", head: ["Paso", "Rango", "Izquierda", "Derecha", "Tras la mezcla"], description: "Divide la lista en dos mitades de forma repetida hasta que cada parte tenga un solo elemento, y luego combina cada par de partes ordenadas en una parte ordenada mayor." },
  quick: { label: "Rápida (Quick) (pivote: último elemento)", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n) promedio y O(n) en el peor caso", stable: "No", counter: "Intercambios (Swaps)", head: ["Paso", "Rango", "Pivote", "Posición final del pivote", "Lista tras la partición"], description: "Elige como pivote el último elemento del rango, pasa los menores a su izquierda y los mayores a su derecha, y repite el proceso en ambas partes." }
};

const ORDERS = { asc: "Ascendente", desc: "Descendente" };

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
  description: "Sigue paso a paso cómo ordenan una lista de números los algoritmos de burbuja, selección, inserción, mezcla y rápida, con el número de comparaciones e intercambios, una tabla por pasada o paso, y su complejidad temporal y espacial.",
  keywords: ["ordenar", "algoritmo de ordenamiento", "bubble sort", "selection sort", "insertion sort", "merge sort", "quick sort", "burbuja", "mezcla", "rápido", "inserción", "selección"],
  formulas: [
    { label: "Número de comparaciones en selección", tex: "\\sum_{i=1}^{n-1}(n-i)=\\frac{n(n-1)}{2}" },
    { label: "Complejidad de la mezcla", tex: "O(n\\log n)" }
  ],
  inputs: [
    { id: "list", label: "Lista", type: "text", wide: true, default: "5, 1, 4, 2, 8", placeholder: "5, 1, 4, 2, 8", help: "De 2 a 30 números, separados por comas o espacios." },
    { id: "algo", label: "Algoritmo", type: "select", default: "bubble", options: [["bubble", "Burbuja (Bubble)"], ["selection", "Selección (Selection)"], ["insertion", "Inserción (Insertion)"], ["merge", "Mezcla (Merge)"], ["quick", "Rápida (Quick) (pivote: último elemento)"]] },
    { id: "order", label: "Orden del resultado", type: "select", default: "asc", options: [["asc", "Ascendente"], ["desc", "Descendente"]] }
  ],
  example: { values: { list: "5, 1, 4, 2, 8", algo: "bubble", order: "asc" }, expect: ["1, 2, 4, 5, 8", "Intercambios (Swaps): 4"], note: "Ejemplo: burbuja con 5, 1, 4, 2, 8 en orden ascendente, que necesita cuatro intercambios." },
  invalid: { values: { list: "5", algo: "bubble", order: "asc" } },
  related: ["search-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("La entrada supera los 200000 caracteres.", "list");
  const list = numList(input, "list", "Lista", { min: 2, max: 30 });
  const algo = choice(input, "algo", "Algoritmo", Object.keys(ALGOS), "bubble");
  const order = choice(input, "order", "Orden del resultado", Object.keys(ORDERS), "asc");
  const dir = order === "asc" ? 1 : -1;
  const info = ALGOS[algo];
  const a = list.slice();
  const run = RUNNERS[algo](a, dir);
  const sortedText = snapshot(a);
  const countText = String(run.count);
  const compText = String(run.comparisons);

  const results = [
    { label: "Lista ordenada", value: sortedText, text: sortedText },
    { label: "Número de comparaciones", value: compText },
    { label: info.counter.replace(/ \(.*\)$/, ""), value: countText },
    { label: "Complejidad temporal (mejor / promedio / peor)", value: `${info.best} / ${info.average} / ${info.worst}` },
    { label: "Complejidad espacial", value: info.space },
    { label: "Estable (Stable)", value: info.stable }
  ];

  const steps = [
    `Algoritmo: ${info.label}. ${info.description}`,
    `Orden del resultado: ${ORDERS[order]}.`,
    `Número de comparaciones: ${compText}.`,
    `${info.counter}: ${countText}.`,
    `Complejidad temporal: mejor caso ${info.best}, promedio ${info.average}, peor caso ${info.worst}.`
  ];

  const shown = run.rows.slice(0, MAX_ROWS);
  const blocks = [{ type: "table", caption: "Traza de los pasos del algoritmo", head: info.head, rows: shown, ltr: true }];
  if (run.rows.length > MAX_ROWS) blocks.push({ type: "note", text: `Se muestran los primeros ${MAX_ROWS} pasos de un total de ${run.rows.length}.`, tone: "warn" });
  if (run.early) blocks.push({ type: "note", text: `El algoritmo se detuvo antes, tras la pasada ${run.rows.length}, porque esa pasada no hizo intercambios: la lista ya está ordenada.` });

  return {
    results,
    steps,
    blocks,
    copy: `${sortedText} | ${info.counter}: ${countText} | Comparaciones: ${compText}`
  };
}
