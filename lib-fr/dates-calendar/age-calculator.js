import { fail, isBlank } from "../core/validate.js";
import { parseGregorian, todayUtc, toHijri, fromHijri, iso, gLong, hLong, diffYMD, ymdText, daysW, DAY, WEEKDAYS, addMonths } from "./calendar.js";

export const meta = {
  description: "Calcule votre âge exact en années, mois et jours, en jours, semaines et heures, votre âge en années hégiriennes, le jour de la semaine de votre naissance, et le nombre de jours restant avant votre prochain anniversaire dans les deux calendriers.",
  keywords: ["Calcul de l'âge", "quel âge ai-je", "age calculator", "date de naissance", "anniversaire", "âge en années hégiriennes", "âge en jours"],
  formulas: [{ label: "Âge", tex: "\\text{Age} = t_{\\text{today}} - t_{\\text{birth}}" }],
  inputs: [
    { id: "birth", label: "date de naissance", type: "text", default: "2000-05-15", help: "Au format AAAA-MM-JJ ou JJ/MM/AAAA." },
    { id: "ref", label: "Calcul de l'âge à une date (facultatif)", type: "text", default: "", help: "Laissez vide pour utiliser la date du jour." }
  ],
  example: { values: { birth: "2000-05-15", ref: "2026-11-13" }, expect: ["26 ans, 5 mois et 29 jours"], note: "Exemple : né le 15 mai 2000, âge au 13 novembre 2026." },
  invalid: { values: { birth: "2030-01-01", ref: "2026-01-01" } },
  related: ["date-difference", "hijri-converter", "bmi-bsa", "calorie-needs"]
};

export function solve(input) {
  const b = parseGregorian(input, "birth", "date de naissance");
  const r = isBlank(input.ref) ? todayUtc() : parseGregorian(input, "ref", "Date de calcul");
  if (b > r) fail("La date de naissance est postérieure à la date de calcul.", "birth");
  const ymd = diffYMD(b, r);
  const days = Math.round((r - b) / DAY);
  const hb = toHijri(b), hr = toHijri(r);
  let hy = hr.y - hb.y;
  if (hr.m < hb.m || (hr.m === hb.m && hr.d < hb.d)) hy--;
  const totalMonths = ymd.y * 12 + ymd.m;
  let next = addMonths(b, (ymd.y + 1) * 12);
  if (ymd.m === 0 && ymd.d === 0) next = r;
  const toNext = Math.round((next - r) / DAY);
  let nh = null;
  for (let y = hr.y; y <= hr.y + 1 && nh === null; y++) {
    const t = fromHijri(y, hb.m, Math.min(hb.d, 29));
    if (t !== null && t >= r) nh = t;
  }
  const results = [
    { label: "Âge", value: ymdText(ymd), text: ymdText(ymd) },
    { label: "âge en années hégiriennes", value: `environ ${hy} années hégiriennes` },
    { label: "En mois / semaines / jours", value: `${totalMonths.toLocaleString("en-US")} mois / ${Math.floor(days / 7).toLocaleString("en-US")} semaines / ${days.toLocaleString("en-US")} jours` },
    { label: "Environ en heures", value: `${(days * 24).toLocaleString("en-US")} heures` },
    { label: "Jour de naissance", value: `${WEEKDAYS[new Date(b).getUTCDay()]} — ${hLong(hb)}` },
    { label: "Prochain anniversaire", value: toNext === 0 ? "Aujourd'hui ! Joyeux anniversaire" : `${gLong(next)} (dans ${daysW(toNext)})` }
  ];
  if (nh !== null) results.push({ label: "Prochain anniversaire hégirien", value: `${hLong(toHijri(nh))} = ${gLong(nh)}` });
  return {
    results,
    steps: [
      `Du ${gLong(b)} au ${gLong(r)}.`,
      `On compte les années complètes, puis les mois complets, puis les jours restants : ${ymdText(ymd)}.`,
      `Nombre total de jours = ${days.toLocaleString("en-US")}. L'année hégirienne est plus courte d'environ 11 jours que l'année grégorienne, donc l'âge hégirien est légèrement plus grand (${hy}).`
    ],
    copy: `Âge au ${iso(r)} : ${ymdText(ymd)} (${days.toLocaleString("en-US")} jours)`
  };
}
