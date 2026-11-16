import { fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";
import { nearest } from "../core/eseries.js";

export const meta = {
  description: "Seri dirençli bir zener regülatörü tasarlayın: seri direnç için izin verilen aralık, seçilen standart değer, zener akımı ve gücü en kötü durumda, giriş gerilimi ve yük değiştiğinde.",
  keywords: ["Zener", "zener", "Zener regülatörü", "Seri direnç", "Gerilim regülasyonu", "Zener gücü"],
  formulas: [
    { label: "En büyük seri direnç (en kötü durum: en düşük giriş ve en büyük yük)", tex: "R_{s,max} = \\frac{V_{in,min} - V_Z}{I_{L,max} + I_{Z,min}}" },
    { label: "Zenerdeki en büyük akım ve güç (en büyük giriş ve en küçük yük)", tex: "I_{Z,max} = \\frac{V_{in,max} - V_Z}{R_s} - I_{L,min},\\quad P_Z = V_Z I_{Z,max}" }
  ],
  inputs: [
    { id: "Vmin", label: "En düşük giriş gerilimi", unit: "V", type: "number", default: "10" },
    { id: "Vmax", label: "En yüksek giriş gerilimi", unit: "V", type: "number", default: "14" },
    { id: "Vz", label: "Zener gerilimi Vz", unit: "V", type: "number", default: "5.1" },
    { id: "ILmax", label: "En büyük yük akımı", unit: "A", type: "number", default: "50m" },
    { id: "ILmin", label: "En küçük yük akımı", unit: "A", type: "number", default: "0" },
    { id: "Izmin", label: "Regülasyon için en küçük zener akımı", unit: "A", type: "number", default: "5m" },
    { id: "Pz", label: "Nominal zener gücü (isteğe bağlı)", unit: "W", type: "number", default: "1" }
  ],
  example: { values: { Vmin: "10", Vmax: "14", Vz: "5.1", ILmax: "50m", ILmin: "0", Izmin: "5m", Pz: "1" }, expect: ["Rs,max = 89.09 Ω", "Rs = 82 Ω"], note: "Örnek: 10–14 V girişten, 50 mA'e kadar yük için 5,1 V regülasyon." },
  invalid: { values: { Vmin: "4", Vmax: "14", Vz: "5.1", ILmax: "50m", Izmin: "5m" } },
  related: ["voltage-regulator", "rectifier-ripple", "led-resistor"]
};

export function solve(input) {
  const Vmin = num(input, "Vmin", "En düşük giriş gerilimi", { positive: true });
  const Vmax = num(input, "Vmax", "En yüksek giriş gerilimi", { positive: true });
  const Vz = num(input, "Vz", "Zener gerilimi", { positive: true });
  const ILmax = num(input, "ILmax", "En büyük yük akımı", { nonNegative: true });
  const ILmin = num(input, "ILmin", "En küçük yük akımı", { nonNegative: true, default: 0 });
  const Izmin = num(input, "Izmin", "En küçük zener akımı", { positive: true });
  const Pz = num(input, "Pz", "Zener gücü", { optional: true, positive: true });
  if (Vmax < Vmin) fail("En yüksek giriş gerilimi, en düşük giriş geriliminden küçük olamaz.", "Vmax");
  if (ILmin > ILmax) fail("En küçük yük akımı, en büyük yük akımını aşamaz.", "ILmin");
  if (Vmin <= Vz) fail(`Regülasyonda kalmak için en düşük giriş gerilimi zener geriliminden (${fmt(Vz)} V) büyük olmalıdır.`, "Vmin");
  const RsMax = (Vmin - Vz) / (ILmax + Izmin);
  const Rs = nearest(RsMax, "E12").below;
  const IzMax = (Vmax - Vz) / Rs - ILmin;
  const PzMax = Vz * IzMax;
  const PRs = Math.pow(Vmax - Vz, 2) / Rs;
  const IzAtMin = (Vmin - Vz) / Rs - ILmax;
  const steps = [
    { text: "Regülasyonun en kötü durumu: en düşük giriş gerilimi ve en büyük yük akımı; zener bu durumda en az Iz,min akımını korumalıdır:", tex: `R_{s,max} = \\frac{${ntex(Vmin)} - ${ntex(Vz)}}{${ntex(ILmax)} + ${ntex(Izmin)}} = ${ntex(RsMax, 5)}\\ \\Omega` },
    `Daha küçük standart E12 değeri seçiyoruz: $R_s = ${ntex(Rs)}\\ \\Omega$; en kötü durumda zener akımı ${eng(IzAtMin, "A", 4)} olur.`,
    { text: "Güç için en kötü durum: en yüksek giriş gerilimi ve en küçük yük; zenerden en büyük akım geçer:", tex: `I_{Z,max} = \\frac{${ntex(Vmax)} - ${ntex(Vz)}}{${ntex(Rs)}} - ${ntex(ILmin)} = ${ntex(IzMax, 5)}\\ A,\\quad P_Z = ${ntex(PzMax, 5)}\\ W` },
    { text: "Seri dirençteki güç (en kötü durum):", tex: `P_{R} = \\frac{(${ntex(Vmax)} - ${ntex(Vz)})^2}{${ntex(Rs)}} = ${ntex(PRs, 5)}\\ W` }
  ];
  const results = [
    { label: "İzin verilen en büyük seri direnç", value: eng(RsMax, "Ω", 4), text: `Rs,max = ${eng(RsMax, "Ω", 4)}` },
    { label: "Seçilen direnç (E12)", value: eng(Rs, "Ω"), text: `Rs = ${eng(Rs, "Ω")}` },
    { label: "Zenerdeki en büyük akım", value: eng(IzMax, "A", 4) },
    { label: "Zenerdeki en büyük güç", value: eng(PzMax, "W", 4) },
    { label: "Dirençteki en büyük güç", value: eng(PRs, "W", 4) }
  ];
  if (Pz !== null) {
    const ok = PzMax <= Pz;
    results.push({ label: "Karar", value: ok ? `Uygun (zener gücünün %${fmt((100 * PzMax) / Pz, 3)}'i)` : "Zener yanacak: daha büyük güçte bir zener seçin veya giriş aralığını daraltın" });
    steps.push(ok ? `${fmt(PzMax, 4)} W güç, nominal ${fmt(Pz)} W'tan küçük.` : `${fmt(PzMax, 4)} W güç, nominal ${fmt(Pz)} W'ı aşıyor.`);
  }
  return { results, steps, copy: `Rs,max = ${eng(RsMax, "Ω", 4)}, Rs = ${eng(Rs, "Ω")}, Iz,max = ${eng(IzMax, "A", 4)}, Pz = ${eng(PzMax, "W", 4)}` };
}
