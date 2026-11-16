import { fail, choice, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { parseGregorian, toHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, weeksW, DAY, WEEKDAYS } from "./calendar.js";

export const meta = {
  description: "Calcule la durée entre deux dates en années, mois et jours, en jours, semaines et jours ouvrés, ou ajoute un nombre de jours à une date ou le soustrait pour trouver la date obtenue et le jour correspondant.",
  keywords: ["différence entre deux dates", "nombre de jours entre deux dates", "calcul de durée", "ajouter des jours", "date difference", "days between dates", "jours ouvrés", "combien de jours"],
  formulas: [{ label: "Durée en jours", tex: "\\Delta = \\frac{t_2 - t_1}{86400\\ \\text{s}}" }],
  inputs: [
    { id: "mode", label: "Opération", type: "select", default: "diff", options: [["diff", "différence entre deux dates"], ["add", "Ajouter ou soustraire des jours"]] },
    { id: "d1", label: "Première date (ou début)", type: "text", default: "2026-01-01", help: "Au format AAAA-MM-JJ ou JJ/MM/AAAA." },
    { id: "d2", label: "Deuxième date", type: "text", default: "2026-12-31", when: { mode: ["diff"] } },
    { id: "inclusive", label: "Inclure le dernier jour dans la durée", type: "checkbox", default: "", when: { mode: ["diff"] } },
    { id: "weekend", label: "Week-end (pour le calcul des jours ouvrés)", type: "select", default: "fs", options: [["fs", "Vendredi et samedi"], ["ss", "Samedi et dimanche"], ["f", "Vendredi uniquement"], ["none", "Aucun week-end"]], when: { mode: ["diff"] } },
    { id: "days", label: "Nombre de jours (négatif pour soustraire)", type: "number", default: "100", when: { mode: ["add"] } }
  ],
  example: { values: { mode: "diff", d1: "2026-01-01", d2: "2026-12-31", inclusive: "", weekend: "fs", days: "" }, expect: ["364 jours", "11 mois et 30 jours"], note: "Exemple : combien de jours entre le début et la fin de 2026 ?" },
  invalid: { values: { mode: "diff", d1: "2026-02-30", d2: "2026-12-31" } },
  related: ["age-calculator", "hijri-converter", "study-planner"]
};

const WEEKENDS = { fs: [5, 6], ss: [6, 0], f: [5], none: [] };

export function solve(input) {
  const mode = choice(input, "mode", "Opération", ["diff", "add"], "diff");
  const a = parseGregorian(input, "d1", "Première date");
  if (mode === "add") {
    const k = num(input, "days", "Nombre de jours", { integer: true, min: -1000000, max: 1000000 });
    const t = a + k * DAY;
    if (new Date(t).getUTCFullYear() < 1 || new Date(t).getUTCFullYear() > 9999) fail("La date obtenue est hors de la plage prise en charge.", "days");
    const h = toHijri(t);
    return {
      results: [
        { label: "Date obtenue", value: gLong(t), text: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} jours = ${iso(t)}` },
        { label: "En hégirien (Umm al-Qura)", value: hLong(h) },
        { label: "Jour de la semaine", value: WEEKDAYS[new Date(t).getUTCDay()] }
      ],
      steps: [
        `On convertit ${iso(a)} en numéro de jour séquentiel, puis on ${k >= 0 ? "ajoute" : "soustrait"} ${daysW(Math.abs(k))}.`,
        `Le calcul tient automatiquement compte de la longueur des mois et des années bissextiles (février compte 29 jours une année bissextile).`,
        `Résultat : ${gLong(t)}.`
      ],
      copy: `${iso(a)} ${k >= 0 ? "+" : "−"} ${Math.abs(k)} jours = ${iso(t)}`
    };
  }
  const b = parseGregorian(input, "d2", "Deuxième date");
  const inc = !isBlank(input.inclusive) && input.inclusive !== "0";
  const we = WEEKENDS[choice(input, "weekend", "Week-end", Object.keys(WEEKENDS), "fs")];
  const [s, e] = a <= b ? [a, b] : [b, a];
  const n = Math.round((e - s) / DAY) + (inc ? 1 : 0);
  const ymd = diffYMD(s, inc ? e + DAY : e);
  const full = Math.floor(n / 7), rem = n % 7;
  let work = full * (7 - we.length);
  const sd = new Date(s).getUTCDay();
  for (let i = 0; i < rem; i++) if (!we.includes((sd + full * 7 + i) % 7)) work++;
  const results = [
    { label: "Durée en jours", value: daysW(n), text: `${iso(s)} → ${iso(e)}: ${daysW(n)}` },
    { label: "En années, mois et jours", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "En semaines", value: `${weeksW(full)}${rem ? ` et ${daysW(rem)}` : ""}` },
    { label: "jours ouvrés", value: daysW(work) },
    { label: "En heures", value: `${(n * 24).toLocaleString("en-US")} heures` }
  ];
  const steps = [
    a > b ? "La première date est postérieure à la seconde ; nous avons donc inversé leur ordre pour calculer une durée positive." : `Du ${gLong(s)} au ${gLong(e)}.`,
    `Nombre de jours = différence entre les numéros des deux jours${inc ? " + 1 (pour compter le jour de fin)" : ""} = ${n}.`,
    `On compte d'abord les mois complets, puis les jours restants : ${ymdText(ymd)}.`,
    `Jours ouvrés : on exclut les jours du week-end hebdomadaire (${we.length ? we.map((d) => WEEKDAYS[d]).join(" et ") : "aucun"}), sans exclure les jours fériés officiels.`
  ];
  return { results, steps, copy: `${iso(s)} → ${iso(e)}: ${daysW(n)} (${ymdText(ymd)})` };
}
