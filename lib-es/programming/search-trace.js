import { choice, fail, numList } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt } from "../core/format.js";

const MAX_ROWS = 200;
const MAX_CHARS = 200000;

const ALGOS = {
  linear: { label: "Lineal (Linear)", complexity: "O(n)", head: ["Paso", "Índice", "Valor", "¿Es igual al buscado?"], description: "Revisa los elementos uno a uno desde el principio y se detiene en el primero que sea igual al valor buscado o al llegar al final de la lista. No requiere que la lista esté ordenada." },
  binary: { label: "Binaria (Binary)", complexity: "O(log n)", head: ["Paso", "Índice inferior (low)", "Índice superior (high)", "Índice medio (mid)", "Valor en mid", "Comparación", "Acción"], description: "Compara el valor buscado con el elemento central del rango actual y descarta la mitad donde no puede estar. Repite hasta encontrarlo o hasta que el rango se vacíe. La lista debe estar ordenada de forma ascendente." }
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
    rows.push([String(i + 1), String(i), fmtNum(data[i]), eq ? "Sí" : "No"]);
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
    const action = sym === "=" ? `Encontramos el valor en el índice ${mid}` : sym === "<" ? "El valor buscado es menor, buscamos en la mitad izquierda" : "El valor buscado es mayor, buscamos en la mitad derecha";
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
  description: "Traza paso a paso la búsqueda lineal y la binaria en una lista de números: muestra la posición del valor si existe, el número de comparaciones y el máximo posible para el tamaño de la lista.",
  keywords: ["búsqueda", "búsqueda lineal", "búsqueda binaria", "linear search", "binary search", "algoritmo de búsqueda", "Índice", "logarítmico"],
  formulas: [
    { label: "Máximo de comparaciones en la búsqueda binaria", tex: "\\lfloor \\log_2 n \\rfloor + 1" },
    { label: "Máximo de comparaciones en la búsqueda lineal", tex: "n" }
  ],
  inputs: [
    { id: "list", label: "Lista", type: "text", wide: true, default: "1, 3, 5, 7, 9, 11, 13", placeholder: "1, 3, 5, 7, 9, 11, 13", help: "Números separados por comas o espacios. La búsqueda binaria necesita una lista ordenada; si no lo está, se ordenará primero." },
    { id: "target", label: "Número buscado", type: "number", default: "7" },
    { id: "algo", label: "Tipo de búsqueda", type: "select", default: "binary", options: [["linear", "Lineal (Linear)"], ["binary", "Binaria (Binary)"]] }
  ],
  example: { values: { list: "1, 3, 5, 7, 9, 11, 13", target: "7", algo: "binary" }, expect: ["en el índice 3", "tras 1 comparación"], note: "Ejemplo: búsqueda binaria del 7 en una lista ordenada de siete números." },
  invalid: { values: { list: "", target: "7", algo: "binary" } },
  related: ["sorting-trace", "big-o"]
};

export function solve(input) {
  const raw = String(input.list ?? "");
  if (raw.length > MAX_CHARS) fail("La entrada supera los 200000 caracteres.", "list");
  const list = numList(input, "list", "Lista");
  const target = num(input, "target", "Número buscado");
  const algo = choice(input, "algo", "Tipo de búsqueda", Object.keys(ALGOS), "binary");
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
    { label: "Resultado", value: found ? "Encontrado" : "No encontrado" },
    { label: "Índice (desde 0)", value: found ? String(trace.found) : "—" },
    { label: "Posición (desde 1)", value: found ? String(trace.found + 1) : "—" },
    { label: "Número de comparaciones", value: String(trace.comparisons) },
    { label: "Complejidad temporal", value: info.complexity },
    { label: `Máximo de comparaciones para tamaño n = ${n}`, value: String(maxC) }
  ];
  if (reorder) results.push({ label: "Lista ordenada utilizada", value: data.map(fmtNum).join(", ") });

  const copy = found
    ? `El valor ${targetText} está en el índice ${trace.found} (posición ${trace.found + 1}) tras ${trace.comparisons} comparación(es)`
    : `El valor ${targetText} no se encuentra tras ${trace.comparisons} comparación(es)`;

  const steps = [
    `Algoritmo: ${info.label}. ${info.description}`,
    `Número de comparaciones: ${trace.comparisons}.`,
    `Complejidad temporal: ${info.complexity}; el máximo de comparaciones para este tamaño es ${maxC}.`,
    found ? `Se encontró el valor ${targetText} en el índice ${trace.found}, es decir, en la posición ${trace.found + 1}.` : `No se encontró el valor ${targetText} en la lista.`
  ];

  const blocks = [];
  if (reorder) blocks.push({ type: "note", tone: "warn", text: "La búsqueda binaria requiere una lista ordenada de forma ascendente, así que la lista se ordenó primero, y los índices del resultado y de la tabla se refieren a la lista ordenada." });
  const shown = trace.rows.slice(0, MAX_ROWS);
  blocks.push({ type: "table", caption: "Traza de los pasos de la búsqueda", head: info.head, rows: shown, ltr: true });
  if (trace.rows.length > MAX_ROWS) blocks.push({ type: "note", tone: "warn", text: `Se muestran los primeros ${MAX_ROWS} pasos de un total de ${trace.rows.length}.` });
  if (found && data.filter((v) => v === target).length > 1) blocks.push({ type: "note", text: algo === "linear" ? "El valor está repetido en la lista; la búsqueda lineal devuelve su primera posición." : "El valor está repetido en la lista; la búsqueda binaria devuelve una de sus posiciones, no necesariamente la primera." });

  return { results, steps, blocks, copy };
}
