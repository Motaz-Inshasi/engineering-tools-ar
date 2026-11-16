import { fail, choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { toHijri, fromHijri, hijriMonthLength, parseGregorian, iso, gLong, hLong, H_MONTHS, H_MIN, H_MAX, DAY } from "./calendar.js";

export const meta = {
  description: "Convertit une date du calendrier grégorien vers le calendrier hégirien et inversement selon le calendrier Umm al-Qura, avec le jour de la semaine, le nombre de jours du mois hégirien et un tableau de tous les jours du mois.",
  keywords: ["conversion de date", "hégirien", "grégorien", "calendrier hégirien", "Umm al-Qura", "hijri", "islamic calendar", "date du jour en hégirien", "Ramadan", "conversion hégirien–grégorien"],
  formulas: [{ label: "Longueur de l'année hégirienne et du mois lunaire, environ", tex: "\\bar{Y}_H \\approx 354.367\\ \\text{jours},\\qquad \\bar{M} \\approx 29.5306\\ \\text{jours}" }],
  inputs: [
    { id: "dir", label: "Sens", type: "select", default: "g2h", options: [["g2h", "Du grégorien vers l'hégirien"], ["h2g", "De l'hégirien vers le grégorien"]] },
    { id: "gdate", label: "Date grégorienne", type: "text", default: "2026-03-20", help: "Au format AAAA-MM-JJ ou JJ/MM/AAAA.", when: { dir: ["g2h"] } },
    { id: "hy", label: "Année hégirienne", type: "number", default: "1447", when: { dir: ["h2g"] } },
    { id: "hm", label: "Mois hégirien", type: "select", default: "9", options: H_MONTHS.map((n, i) => [String(i + 1), `${i + 1} - ${n}`]), when: { dir: ["h2g"] } },
    { id: "hd", label: "Jour", type: "number", default: "1", when: { dir: ["h2g"] } }
  ],
  example: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "1" }, expect: ["1 Ramadan 1447 AH = mercredi 18 février 2026 ap. J.-C."], note: "Exemple : quand commence le Ramadan 1447 AH selon le calendrier Umm al-Qura ?" },
  invalid: { values: { dir: "h2g", gdate: "", hy: "1447", hm: "9", hd: "31" } },
  related: ["date-difference", "age-calculator", "study-planner", "zakat"]
};

export function solve(input) {
  const dir = choice(input, "dir", "Sens", ["g2h", "h2g"], "g2h");
  let t, h;
  const steps = [];
  if (dir === "g2h") {
    t = parseGregorian(input, "gdate", "Date grégorienne");
    h = toHijri(t);
    if (h.y < H_MIN || h.y > H_MAX) fail(`La plage prise en charge va de ${H_MIN} à ${H_MAX} AH (environ 1882 à 2174 ap. J.-C.).`, "gdate");
    steps.push(`On compte les jours depuis le début du calendrier hégirien jusqu'à ${iso(t)} et on les compare aux tables Umm al-Qura des longueurs de mois.`);
  } else {
    const y = num(input, "hy", "Année hégirienne", { integer: true, min: H_MIN, max: H_MAX });
    const m = Number(choice(input, "hm", "Mois hégirien", H_MONTHS.map((_, i) => String(i + 1)), "1"));
    const d = num(input, "hd", "Jour", { integer: true, min: 1, max: 30 });
    const len = hijriMonthLength(y, m);
    if (d > len) fail(`Le mois ${H_MONTHS[m - 1]} ${y} AH n'a que ${len} jours.`, "hd");
    t = fromHijri(y, m, d);
    if (t === null) fail("Cette date n'a pas pu être convertie.", "hy");
    h = { y, m, d };
    steps.push(`On estime la position grégorienne à l'aide de la durée moyenne du mois lunaire (29.53 jours), puis on corrige l'estimation en la comparant jour par jour aux tables Umm al-Qura.`);
  }
  const len = hijriMonthLength(h.y, h.m);
  const start = t - (h.d - 1) * DAY;
  steps.push(`Le mois ${H_MONTHS[h.m - 1]} ${h.y} AH compte ${len} jours et commence le ${gLong(start)}.`);
  steps.push("Le début réel du mois peut différer d'un jour dans certains pays qui se fondent sur l'observation du croissant lunaire.");
  const line = `${hLong(h)} = ${gLong(t)}`;
  const rows = [];
  for (let i = 0; i < len; i++) {
    const tt = start + i * DAY;
    rows.push([`${i + 1} ${H_MONTHS[h.m - 1]}`, gLong(tt), i + 1 === h.d ? "◀" : ""]);
  }
  return {
    results: [
      { label: "Date hégirienne", value: hLong(h) },
      { label: "Date grégorienne", value: gLong(t) },
      { label: "En chiffres", value: `${h.y}/${String(h.m).padStart(2, "0")}/${String(h.d).padStart(2, "0")} AH — ${iso(t)}` },
      { label: `Nombre de jours de ${H_MONTHS[h.m - 1]} ${h.y} AH`, value: `${len} jours` }
    ],
    steps,
    blocks: [{ type: "table", caption: `Jours du mois de ${H_MONTHS[h.m - 1]} ${h.y} AH`, head: ["Hégirien", "Grégorien", ""], rows }],
    copy: line
  };
}

