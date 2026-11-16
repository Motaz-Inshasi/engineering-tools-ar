import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { fmt, tex as ntex } from "../core/format.js";

export const meta = {
  description: "Concevez l'escalier entre deux niveaux : calculez le nombre de marches, la hauteur de contremarche et la profondeur de marche selon la règle de Blondel, puis vérifiez les critères et la longueur horizontale disponible.",
  keywords: ["escalier", "règle de Blondel", "hauteur de contremarche", "profondeur de marche", "stair", "blondel", "angle de l'escalier"],
  formulas: [
    { label: "Nombre de marches", tex: "n = \\operatorname{round}\\left(\\frac{H}{R_p}\\right)" },
    { label: "Hauteur et profondeur des marches", tex: "R = \\frac{H}{n},\\qquad G = (2R+G) - 2R" },
    { label: "Longueur horizontale et angle de l'escalier", tex: "L_h = (n-1)\\,G,\\qquad \\theta = \\arctan\\frac{R}{G}" }
  ],
  inputs: [
    { id: "H", label: "Hauteur entre niveaux H", unit: "cm", type: "number", default: "300" },
    { id: "riser", label: "Hauteur de contremarche souhaitée R", unit: "cm", type: "number", default: "17", help: "Valeur approximative ; la contremarche est ajustée pour diviser la hauteur exactement." },
    { id: "blondel", label: "Cible de Blondel 2R + G", unit: "cm", type: "number", default: "63", help: "La valeur idéale est comprise entre 60 et 64 cm." },
    { id: "avail", label: "Longueur horizontale disponible", unit: "cm", type: "number", help: "Facultatif : pour vérifier que l'escalier tient dans l'espace." }
  ],
  example: { values: { H: "300", riser: "17", blondel: "63", avail: "" }, expect: ["504.3 cm", "18"], note: "Exemple : une hauteur de 300 cm entre deux niveaux." },
  invalid: { values: { H: "300", riser: "17", blondel: "20", avail: "" } },
  related: ["polygon-area", "far-coverage"]
};

export function solve(input) {
  const H = num(input, "H", "Hauteur entre niveaux", { positive: true });
  const Rp = num(input, "riser", "Hauteur de contremarche souhaitée", { positive: true, max: 30 });
  const B = num(input, "blondel", "Cible de Blondel", { positive: true, max: 100 });
  const avail = num(input, "avail", "Longueur horizontale disponible", { positive: true, optional: true });
  const n = Math.round(H / Rp);
  if (n < 2) fail("La hauteur est trop faible pour la contremarche souhaitée ; l'escalier a besoin d'au moins deux marches.", "H");
  const R = H / n;
  const G = B - 2 * R;
  if (!(G > 0)) fail("La cible de Blondel est trop petite pour cette hauteur ; augmentez-la ou réduisez le nombre de marches.", "blondel");
  const treads = n - 1;
  const run = treads * G;
  const angle = (Math.atan(R / G) * 180) / Math.PI;
  const stringer = Math.hypot(H, run);
  const twoRG = 2 * R + G;
  const checks = [
    { name: "Hauteur de contremarche R", value: `${fmt(R, 4)} cm`, rule: "15 – 18 cm", ok: R >= 15 && R <= 18 },
    { name: "Profondeur de marche G", value: `${fmt(G, 4)} cm`, rule: "≥ 27 cm", ok: G >= 27 },
    { name: "Règle de Blondel 2R + G", value: `${fmt(twoRG, 4)} cm`, rule: "60 – 64 cm", ok: twoRG >= 60 && twoRG <= 64 },
    { name: "angle de l'escalier", value: `${fmt(angle, 3)}°`, rule: "25° – 42°", ok: angle >= 25 && angle <= 42 }
  ];
  if (avail !== null) checks.push({ name: "Longueur horizontale par rapport à la longueur disponible", value: `${fmt(run, 4)} cm`, rule: `≤ ${fmt(avail)} cm`, ok: run <= avail });
  const allOk = checks.every((c) => c.ok);
  const verdict = allOk ? "Adapté et conforme aux critères" : "Nécessite une modification";
  const steps = [
    { text: "Nombre de marches, arrondi à partir de la hauteur souhaitée :", tex: `n = \\operatorname{round}\\left(\\frac{${ntex(H, 6)}}{${ntex(Rp, 6)}}\\right) = ${n}` },
    { text: "Hauteur réelle de la contremarche :", tex: `R = \\frac{H}{n} = \\frac{${ntex(H, 6)}}{${n}} = ${ntex(R, 4)}\\ cm` },
    { text: "Profondeur de marche selon la règle de Blondel :", tex: `G = ${ntex(B, 6)} - 2(${ntex(R, 4)}) = ${ntex(G, 4)}\\ cm` },
    { text: "Longueur horizontale de l'escalier :", tex: `L_h = (n-1)G = ${treads} \\times ${ntex(G, 4)} = ${ntex(run, 4)}\\ cm` },
    { text: "Angle de l'escalier :", tex: `\\theta = \\arctan\\frac{R}{G} = ${ntex(angle, 4)}^\\circ` },
    { text: "Longueur du limon incliné :", tex: `L = \\sqrt{H^2 + L_h^2} = ${ntex(stringer, 4)}\\ cm` }
  ];
  const blocks = [
    { type: "table", caption: "Vérification des critères", head: ["Contrôle", "Valeur", "Critère", "Verdict"], rows: checks.map((c) => [c.name, c.value, c.rule, c.ok ? "Conforme" : "Non conforme"]) }
  ];
  if (!allOk) blocks.push({ type: "note", tone: "warn", text: "Certains critères ne sont pas respectés ; modifiez la hauteur de contremarche souhaitée, la cible de Blondel ou la longueur disponible." });
  return {
    results: [
      { label: "Nombre de contremarches (hauteurs des marches) n", value: `${n}` },
      { label: "Nombre de girons (surfaces des marches)", value: `${treads}` },
      { label: "Hauteur de contremarche R", value: `${fmt(R, 4)} cm` },
      { label: "Profondeur de marche G", value: `${fmt(G, 4)} cm` },
      { label: "Longueur horizontale totale", value: `${fmt(run, 4)} cm` },
      { label: "angle de l'escalier", value: `${fmt(angle, 3)}°` },
      { label: "Longueur du limon incliné", value: `${fmt(stringer, 4)} cm` },
      { label: "Verdict", value: verdict }
    ],
    steps,
    blocks,
    copy: `Marches : ${n}, R = ${fmt(R, 4)} cm, G = ${fmt(G, 4)} cm, longueur horizontale = ${fmt(run, 4)} cm, angle = ${fmt(angle, 3)}°, verdict : ${verdict}`,
    values: { n, treads, R, G, run, angle, stringer, twoRG, allOk }
  };
}
