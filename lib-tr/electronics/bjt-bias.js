import { choice } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

export const meta = {
  description: "NPN BJT transistörün önyargısını gerilim bölücü veya sabit önyargı ile analiz edin: baz, kollektör ve emiter akımları, VCE gerilimi, çalışma noktası ve çalışma bölgesi (aktif, doyum, kesim).",
  keywords: ["transistör", "BJT", "önyargı", "bias", "Çalışma noktası", "Q-point", "gerilim bölücü", "Doyum", "beta"],
  formulas: [
    { label: "Gerilim bölücü önyargısı (baz için Thevenin eşdeğeri)", tex: "V_{BB} = V_{CC}\\frac{R_2}{R_1 + R_2},\\quad R_{BB} = R_1 \\parallel R_2,\\quad I_B = \\frac{V_{BB} - V_{BE}}{R_{BB} + (\\beta + 1)R_E}" },
    { label: "Çalışma noktası", tex: "I_C = \\beta I_B,\\quad V_{CE} = V_{CC} - I_C R_C - I_E R_E" }
  ],
  inputs: [
    { id: "cfg", label: "Önyargı yöntemi", type: "select", default: "divider", options: [["divider", "gerilim bölücü"], ["fixed", "Sabit önyargı (RB)"]] },
    { id: "Vcc", label: "VCC", unit: "V", type: "number", default: "12" },
    { id: "R1", label: "R1 (VCC'den baza)", unit: "Ω", type: "number", default: "47k", when: { cfg: ["divider"] } },
    { id: "R2", label: "R2 (bazdan toprağa)", unit: "Ω", type: "number", default: "10k", when: { cfg: ["divider"] } },
    { id: "RB", label: "RB", unit: "Ω", type: "number", default: "470k", when: { cfg: ["fixed"] } },
    { id: "RC", label: "RC", unit: "Ω", type: "number", default: "2.2k" },
    { id: "RE", label: "RE", unit: "Ω", type: "number", default: "470" },
    { id: "beta", label: "Akım kazancı β", type: "number", default: "100" },
    { id: "Vbe", label: "VBE", unit: "V", type: "number", default: "0.7" }
  ],
  example: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "100", Vbe: "0.7" }, expect: ["IC = 2.522 mA", "VCE = 5.254 V"], note: "Örnek: 12 V üzerinde 47k/10k bölücü, RC = 2.2k, RE = 470 Ω ve β = 100." },
  invalid: { values: { cfg: "divider", Vcc: "12", R1: "47k", R2: "10k", RC: "2.2k", RE: "470", beta: "0", Vbe: "0.7" } },
  related: ["mosfet", "op-amp", "thevenin-norton", "voltage-current-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Önyargı yöntemi", ["divider", "fixed"], "divider");
  const Vcc = num(input, "Vcc", "VCC", { positive: true });
  const RC = num(input, "RC", "RC", { nonNegative: true });
  const RE = num(input, "RE", "RE", { nonNegative: true });
  const beta = num(input, "beta", "β", { positive: true });
  const Vbe = num(input, "Vbe", "VBE", { nonNegative: true, default: 0.7 });
  const VCEsat = 0.2;
  let VBB, RBB;
  const steps = [];
  if (cfg === "divider") {
    const R1 = num(input, "R1", "R1", { positive: true }), R2 = num(input, "R2", "R2", { positive: true });
    VBB = (Vcc * R2) / (R1 + R2);
    RBB = (R1 * R2) / (R1 + R2);
    steps.push({ text: "Bölücüyü baz üzerinde bir Thevenin eşdeğeriyle değiştiriyoruz:", tex: `V_{BB} = ${ntex(Vcc)}\\frac{${ntex(R2)}}{${ntex(R1)} + ${ntex(R2)}} = ${ntex(VBB, 5)}\\ V,\\quad R_{BB} = ${ntex(RBB, 5)}\\ \\Omega` });
  } else {
    VBB = Vcc;
    RBB = num(input, "RB", "RB", { positive: true });
    steps.push(`Sabit önyargıda baz, RB üzerinden doğrudan VCC'ye bağlanır.`);
  }
  let IB = (VBB - Vbe) / (RBB + (beta + 1) * RE);
  steps.push({ text: "Baz-emiter çevrimi denklemi (KVL):", tex: `I_B = \\frac{${ntex(VBB, 5)} - ${ntex(Vbe)}}{${ntex(RBB, 5)} + (${ntex(beta)} + 1)(${ntex(RE)})} = ${ntex(IB, 5)}\\ A` });
  let region, IC, IE, VCE, VE, VC, VB;
  if (IB <= 0) {
    region = "Kesim";
    IB = 0; IC = 0; IE = 0; VE = 0; VC = Vcc; VCE = Vcc; VB = VBB;
    steps.push("Baz gerilimi baz-emiter eklemini iletime geçirmeye yetmiyor; transistör kesim bölgesinde.");
  } else {
    IC = beta * IB; IE = IC + IB;
    VCE = Vcc - IC * RC - IE * RE;
    region = "Aktif";
    if (VCE < VCEsat) {
      region = "Doyum";
      IC = (Vcc - VCEsat - IB * RE) / (RC + RE);
      if (IC < 0) IC = 0;
      IE = IC + IB;
      VCE = VCEsat;
      steps.push(`Aktif bölgedeki hesap VCE'nin negatif çıktığını veya ${VCEsat} V'tan küçük olduğunu gösterdi; transistör doyumda: VCE = ${VCEsat} V sabitlenir, IC kollektör çevriminden hesaplanır ve IC = βIB bağıntısı artık geçerli değildir.`);
    } else steps.push({ text: "Aktif bölgede:", tex: `I_C = \\beta I_B = ${ntex(IC, 5)}\\ A,\\quad V_{CE} = ${ntex(Vcc)} - I_C(${ntex(RC)}) - I_E(${ntex(RE)}) = ${ntex(VCE, 5)}\\ V` });
    VE = IE * RE; VC = VE + VCE; VB = VE + Vbe;
  }
  const IcSat = (Vcc - VCEsat) / (RC + RE || 1e-30);
  steps.push(`Sürekli yük doğrusu eksenleri $I_{C,sat} \\approx ${ntex(IcSat, 4)}$ A ve $V_{CE,cutoff} = ${ntex(Vcc)}$ V noktalarında keser; çalışma noktası bu doğru üzerindedir.`);
  return {
    results: [
      { label: "Çalışma bölgesi", value: region },
      { label: "IB", value: eng(IB, "A", 4) },
      { label: "IC", value: eng(IC, "A", 4), text: `IC = ${eng(IC, "A", 4)}` },
      { label: "IE", value: eng(IE, "A", 4) },
      { label: "VCE", value: eng(VCE, "V", 4), text: `VCE = ${eng(VCE, "V", 4)}` },
      { label: "Uç gerilimleri VB / VC / VE", value: `${fmt(VB, 4)} / ${fmt(VC, 4)} / ${fmt(VE, 4)} V` },
      { label: "Transistör gücü", value: eng(VCE * IC, "W", 4) }
    ],
    blocks: [{ type: "plot", title: "Yük doğrusu ve çalışma noktası", xLabel: "VCE (V)", yLabel: "IC (A)", includeZero: true, series: [{ name: "Yük doğrusu", points: [[0, IcSat + VCEsat / (RC + RE || 1e-30)], [Vcc, 0]] }, { name: "Q", points: [[VCE, IC]], marker: "o" }] }],
    steps, copy: `${region}: IC = ${eng(IC, "A", 4)}, VCE = ${eng(VCE, "V", 4)}, IB = ${eng(IB, "A", 4)}`
  };
}
