import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "Demi-onde"], ["center", "Pleine onde avec transformateur à point milieu"], ["bridge", "Pleine onde en pont"]];

export const meta = {
  description: "Redresseur avec condensateur de filtrage : tension crête, tension continue, tension d'ondulation, taux d'ondulation et tension inverse maximale aux bornes de la diode, pour un redresseur demi-onde, pleine onde ou en pont.",
  keywords: ["Redresseur", "Redressement", "rectifier", "Ondulation", "ripple", "Pont", "bridge", "Condensateur de filtrage", "PIV", "Diode"],
  formulas: [
    { label: "Tension d'ondulation (approximation de décharge linéaire)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "Tension continue", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "Type de redresseur", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "Tension du secondaire (efficace)", unit: "V", type: "number", default: "12", help: "Pour un transformateur à point milieu : tension de la moitié de l'enroulement." },
    { id: "f", label: "Fréquence du secteur", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "Condensateur de filtrage", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "Résistance de charge", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "Chute de tension dans la diode", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "Exemple : pont à partir d'un transformateur 12 V, avec un condensateur de 2200 µF et une charge de 100 Ω." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "Type", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "Tension", { positive: true });
  const f = num(input, "f", "Fréquence", { positive: true });
  const C = num(input, "C", "Condensateur", { positive: true });
  const RL = num(input, "RL", "Charge", { positive: true });
  const Vd = num(input, "Vd", "Chute de la diode", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("La tension crête est inférieure à la chute des diodes : il n'y a pas de sortie.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "Tension crête du secondaire, puis après la chute des diodes conductrices :", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `Fréquence d'ondulation ${fmt(fr)} Hz car ${type === "half" ? "le redresseur demi-onde charge le condensateur une fois par cycle" : "le redresseur pleine onde charge le condensateur deux fois par cycle"}.`,
    { text: "Le condensateur se décharge dans la charge entre les impulsions de charge ; la tension d'ondulation crête à crête vaut :", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "Tension continue moyenne et courant :", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "Tension inverse maximale que supporte chaque diode :", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("Attention : le condensateur est trop petit pour la charge ; l'ondulation dépasse la tension elle-même et l'approximation n'est pas valable. Augmentez la capacité.");
  else if (Vr / Vp > 0.2) steps.push("L'ondulation est grande (plus de 20 %) ; l'approximation linéaire est moins précise ici, il est préférable d'augmenter la capacité.");
  const T = 1 / f, pts = [];
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600;
    const s = Math.sin(2 * Math.PI * f * t);
    const rect = Math.max(0, (type === "half" ? s : Math.abs(s)) * Vm - nD * Vd);
    pts.push([t, rect]);
  }
  const out = [];
  let v = Vp;
  for (let i = 0; i <= 600; i++) {
    const t = (3 * T * i) / 600, dt = (3 * T) / 600;
    v = v * Math.exp(-dt / (RL * C));
    v = Math.max(v, pts[i][1]);
    out.push([t, v]);
  }
  return {
    results: [
      { label: "Tension crête après les diodes", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "Tension d'ondulation (crête à crête)", value: eng(Vr, "V", 4) },
      { label: "Tension continue approximative", value: eng(Vdc, "V", 4) },
      { label: "Courant de charge", value: eng(IL, "A", 4) },
      { label: "Taux d'ondulation", value: `${fmt(100 * rf, 3)}%` },
      { label: "Tension inverse maximale PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Tension redressée et tension du condensateur (simulation)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "Après redressement", points: pts, dashed: true }, { name: "Tension de charge", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
