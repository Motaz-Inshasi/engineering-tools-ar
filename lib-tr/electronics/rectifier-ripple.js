import { choice, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const TYPES = [["half", "Yarım dalga"], ["center", "Orta uçlu trafo ile tam dalga"], ["bridge", "Köprü ile tam dalga"]];

export const meta = {
  description: "Filtre kondansatörlü doğrultucu: tepe gerilimi, DC gerilim, dalgalanma gerilimi, dalgalanma faktörü ve diyot üzerindeki en yüksek ters gerilim; yarım dalga, tam dalga veya köprü doğrultucu için.",
  keywords: ["Doğrultucu", "Doğrultma", "rectifier", "Dalgalanma", "ripple", "Köprü", "bridge", "Filtre kondansatörü", "PIV", "Diyot"],
  formulas: [
    { label: "Dalgalanma gerilimi (lineer boşalma yaklaşımı)", tex: "V_{r(pp)} \\approx \\frac{I_{L}}{f_r C},\\quad f_r = f\\ \\text{(half)},\\; 2f\\ \\text{(full)}" },
    { label: "DC gerilim", tex: "V_{DC} \\approx V_p - \\frac{V_{r(pp)}}{2},\\qquad V_p = \\sqrt{2}V_{rms} - n_D V_D" }
  ],
  inputs: [
    { id: "type", label: "Doğrultucu türü", type: "select", default: "bridge", options: TYPES },
    { id: "Vrms", label: "İkincil gerilim (etkin)", unit: "V", type: "number", default: "12", help: "Orta uçlu trafo için: sargının yarısının gerilimi." },
    { id: "f", label: "Şebeke frekansı", unit: "Hz", type: "number", default: "50" },
    { id: "C", label: "Filtre kondansatörü", unit: "F", type: "number", default: "2200u" },
    { id: "RL", label: "Yük direnci", unit: "Ω", type: "number", default: "100" },
    { id: "Vd", label: "Diyot üzerindeki gerilim düşümü", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { type: "bridge", Vrms: "12", f: "50", C: "2200u", RL: "100", Vd: "0.7" }, expect: ["Vp = 15.57 V"], note: "Örnek: 12 V trafo, 2200 µF kondansatör ve 100 Ω yük ile köprü doğrultucu." },
  invalid: { values: { type: "bridge", Vrms: "0.9", f: "50", C: "100u", RL: "100", Vd: "0.7" } },
  related: ["transformer", "zener-regulator", "voltage-regulator", "fourier-series"]
};

export function solve(input) {
  const type = choice(input, "type", "Tür", TYPES.map((t) => t[0]), "bridge");
  const Vrms = num(input, "Vrms", "Gerilim", { positive: true });
  const f = num(input, "f", "Frekans", { positive: true });
  const C = num(input, "C", "Kondansatör", { positive: true });
  const RL = num(input, "RL", "Yük", { positive: true });
  const Vd = num(input, "Vd", "Diyot düşümü", { nonNegative: true, max: 5 });
  const nD = type === "bridge" ? 2 : 1;
  const fr = type === "half" ? f : 2 * f;
  const Vm = Math.SQRT2 * Vrms;
  const Vp = Vm - nD * Vd;
  if (Vp <= 0) fail("Tepe gerilimi diyot düşümlerinden küçük; çıkış yok.", "Vrms");
  let Vr = Vp / (fr * RL * C);
  const clipped = Vr > Vp;
  if (clipped) Vr = Vp;
  const Vdc = Vp - Vr / 2, IL = Vdc / RL;
  const PIV = type === "bridge" ? Vm - Vd : type === "center" ? 2 * Vm - Vd : Vm;
  const rf = Vr / (2 * Math.sqrt(3)) / Vdc;
  const steps = [
    { text: "İkincil tepe gerilimi, iletken diyotların düşümü çıkarıldıktan sonra:", tex: `V_m = \\sqrt{2} \\times ${ntex(Vrms)} = ${ntex(Vm, 5)}\\ V,\\quad V_p = V_m - ${nD} \\times ${ntex(Vd)} = ${ntex(Vp, 5)}\\ V` },
    `Dalgalanma frekansı ${fmt(fr)} Hz, çünkü ${type === "half" ? "Yarım dalga doğrultucu kondansatörü her periyotta bir kez şarj eder." : "Tam dalga doğrultucu kondansatörü her periyotta iki kez şarj eder."}.`,
    { text: "Kondansatör şarj darbeleri arasında yüke boşalır; dalgalanma gerilimi tepeden tepeye:", tex: `V_r \\approx \\frac{V_p}{f_r R_L C} = \\frac{${ntex(Vp, 5)}}{${ntex(fr)} \\times ${ntex(RL)} \\times ${ntex(C)}} = ${ntex(Vr, 5)}\\ V` },
    { text: "Ortalama DC gerilim ve akım:", tex: `V_{DC} \\approx V_p - \\frac{V_r}{2} = ${ntex(Vdc, 5)}\\ V,\\quad I_L = ${ntex(IL, 5)}\\ A` },
    { text: "Her diyodun dayanması gereken en yüksek ters gerilim:", tex: `PIV = ${ntex(PIV, 5)}\\ V` }
  ];
  if (clipped) steps.push("Uyarı: kondansatör yük için çok küçük; dalgalanma gerilimin kendisinden büyük ve yaklaşım geçerli değil. Kapasiteyi artırın.");
  else if (Vr / Vp > 0.2) steps.push("Dalgalanma büyük (%20'den fazla); bu durumda lineer yaklaşım daha az doğrudur; kapasitenin artırılması tercih edilir.");
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
      { label: "Diyotlardan sonraki tepe gerilimi", value: eng(Vp, "V", 4), text: `Vp = ${eng(Vp, "V", 4)}` },
      { label: "Dalgalanma gerilimi (tepeden tepeye)", value: eng(Vr, "V", 4) },
      { label: "Yaklaşık DC gerilim", value: eng(Vdc, "V", 4) },
      { label: "Yük akımı", value: eng(IL, "A", 4) },
      { label: "Dalgalanma faktörü", value: `${fmt(100 * rf, 3)}%` },
      { label: "En yüksek ters gerilim PIV", value: eng(PIV, "V", 4) }
    ],
    blocks: [{ type: "plot", title: "Doğrultulmuş gerilim ve kondansatör gerilimi (simülasyon)", xLabel: "t (s)", yLabel: "V", includeZero: true, series: [{ name: "Doğrultmadan sonra", points: pts, dashed: true }, { name: "Yük gerilimi", points: out }] }],
    steps, copy: `Vp = ${eng(Vp, "V", 4)}, Vr = ${eng(Vr, "V", 4)}, Vdc = ${eng(Vdc, "V", 4)}, PIV = ${eng(PIV, "V", 4)}`
  };
}
