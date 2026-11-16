import { choice, numList, fail } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";
import { eng, tex as ntex, fmt } from "../core/format.js";

const CFG = [["inv", "Evirici"], ["noninv", "Evirmeyen"], ["sum", "Evirici toplayıcı"], ["diff", "Fark (çıkarıcı)"], ["integ", "İntegratör"], ["deriv", "Türevleyici"]];

export const meta = {
  description: "İdeal işlemsel kuvvetlendiricinin kazancını yaygın devrelerde hesaplayın: evirici, evirmeyen, toplayıcı, fark, integratör ve türevleyici; çıkış gerilimi ve besleme gerilimi aşıldığında doyum uyarısıyla birlikte.",
  keywords: ["İşlemsel kuvvetlendirici", "op-amp", "Op-amp", "Evirici kuvvetlendirici", "Evirmeyen kuvvetlendirici", "Toplayıcı", "İntegratör", "Türevleyici", "Kazanç"],
  formulas: [
    { label: "Evirici ve evirmeyen", tex: "A_{inv} = -\\frac{R_f}{R_{in}},\\qquad A_{non} = 1 + \\frac{R_f}{R_{in}}" },
    { label: "Toplayıcı, integratör ve türevleyici (sinüs sinyali için)", tex: "V_o = -R_f\\sum\\frac{V_i}{R_i},\\qquad |A_{int}| = \\frac{1}{\\omega RC},\\qquad |A_{diff}| = \\omega RC" }
  ],
  inputs: [
    { id: "cfg", label: "Devre", type: "select", default: "inv", options: CFG },
    { id: "Rf", label: "Geri besleme direnci Rf", unit: "Ω", type: "number", default: "100k", when: { cfg: ["inv", "noninv", "sum", "diff"] } },
    { id: "Rin", label: "Giriş direnci Rin", unit: "Ω", type: "number", default: "10k", when: { cfg: ["inv", "noninv", "diff"] } },
    { id: "Vin", label: "Giriş gerilimi Vin", unit: "V", type: "number", default: "0.5", when: { cfg: ["inv", "noninv", "integ", "deriv"] }, help: "İntegratör ve türevleyiciler için: sinüs sinyalinin genliği." },
    { id: "V2", label: "İkinci giriş gerilimi V2 (V1 = Vin çıkarılır)", unit: "V", type: "number", default: "1", when: { cfg: ["diff"] } },
    { id: "V1d", label: "Birinci giriş gerilimi V1", unit: "V", type: "number", default: "0.5", when: { cfg: ["diff"] } },
    { id: "Rs", label: "Toplayıcının giriş dirençleri", unit: "Ω", type: "text", default: "10k, 20k, 50k", when: { cfg: ["sum"] } },
    { id: "Vs", label: "Toplayıcının giriş gerilimleri", unit: "V", type: "text", default: "1, 0.5, -2", when: { cfg: ["sum"] } },
    { id: "R", label: "R", unit: "Ω", type: "number", default: "10k", when: { cfg: ["integ", "deriv"] } },
    { id: "C", label: "C", unit: "F", type: "number", default: "10n", when: { cfg: ["integ", "deriv"] } },
    { id: "f", label: "Sinyal frekansı", unit: "Hz", type: "number", default: "1k", when: { cfg: ["integ", "deriv"] } },
    { id: "Vsat", label: "Besleme gerilimi ±Vcc", unit: "V", type: "number", default: "15" }
  ],
  example: { values: { cfg: "inv", Rf: "100k", Rin: "10k", Vin: "0.5", Vsat: "15" }, expect: ["A = -10", "Vout = -5 V"], note: "Örnek: kazancı −10 ve girişi 0,5 V olan bir evirici kuvvetlendirici." },
  invalid: { values: { cfg: "inv", Rf: "100k", Rin: "0", Vin: "0.5", Vsat: "15" } },
  related: ["bjt-bias", "passive-filter", "adc", "sensor-divider"]
};

export function solve(input) {
  const cfg = choice(input, "cfg", "Devre", CFG.map((c) => c[0]), "inv");
  const Vsat = num(input, "Vsat", "Besleme gerilimi", { positive: true });
  const steps = ["İdeal bir kuvvetlendirici varsayıyoruz: sonsuz kazanç; giriş uçlarından akım geçmez ve iki gerilim eşittir (sanal kısa devre)."];
  let A = null, Vout, gainText;
  if (cfg === "inv" || cfg === "noninv") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true }), Vin = num(input, "Vin", "Vin");
    A = cfg === "inv" ? -Rf / Rin : 1 + Rf / Rin;
    Vout = A * Vin;
    steps.push({ text: cfg === "inv" ? "Evirici uç sanal toprakta olduğundan giriş akımının tamamı Rf'den geçer:" : "Evirici ucun gerilimi Vin'e eşittir; Rf ve Rin çıkış üzerinde bir gerilim bölücü oluşturur:", tex: cfg === "inv" ? `A = -\\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` : `A = 1 + \\frac{${ntex(Rf)}}{${ntex(Rin)}} = ${ntex(A, 6)}` });
    steps.push({ tex: `V_{out} = A V_{in} = ${ntex(A, 6)} \\times ${ntex(Vin)} = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else if (cfg === "sum") {
    const Rf = num(input, "Rf", "Rf", { positive: true });
    const Rs = numList(input, "Rs", "Giriş dirençleri", { positive: true, max: 10 });
    const Vs = numList(input, "Vs", "Giriş gerilimleri", { max: 10 });
    if (Rs.length !== Vs.length) fail(`Direnç sayısı (${Rs.length}), gerilim sayısına (${Vs.length}) eşit olmalıdır.`, "Vs");
    Vout = -Rf * Rs.reduce((s, r, i) => s + Vs[i] / r, 0);
    steps.push({ text: "Giriş akımları sanal toprakta toplanır ve Rf'den geçer:", tex: `V_{out} = -${ntex(Rf)}\\left(${Rs.map((r, i) => `\\frac{${ntex(Vs[i])}}{${ntex(r)}}`).join(" + ")}\\right) = ${ntex(Vout, 6)}\\ V` });
    gainText = Rs.map((r, i) => `A${i + 1} = ${fmt(-Rf / r, 5)}`).join(", ");
  } else if (cfg === "diff") {
    const Rf = num(input, "Rf", "Rf", { positive: true }), Rin = num(input, "Rin", "Rin", { positive: true });
    const V1 = num(input, "V1d", "V1"), V2 = num(input, "V2", "V2");
    A = Rf / Rin;
    Vout = A * (V2 - V1);
    steps.push({ text: "Eşit dirençlerle (her iki uçta Rf/Rin) yalnızca fark büyütülür:", tex: `V_{out} = \\frac{R_f}{R_{in}}(V_2 - V_1) = ${ntex(A, 6)}(${ntex(V2)} - ${ntex(V1)}) = ${ntex(Vout, 6)}\\ V` });
    gainText = `A = ${fmt(A, 6)}`;
  } else {
    const R = num(input, "R", "R", { positive: true }), C = num(input, "C", "C", { positive: true }), f = num(input, "f", "Frekans", { positive: true }), Vin = num(input, "Vin", "Vin");
    const w = 2 * Math.PI * f, wc = 1 / (R * C);
    A = cfg === "integ" ? 1 / (w * R * C) : w * R * C;
    Vout = A * Vin;
    steps.push(cfg === "integ"
      ? { text: "İntegratör: $v_o = -\\frac{1}{RC}\\int v_i\\,dt$; sinüs sinyali için kazanç şöyle olur:", tex: `|A| = \\frac{1}{\\omega RC} = \\frac{1}{${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)}} = ${ntex(A, 5)},\\ \\text{phase } +90^\\circ` }
      : { text: "Türevleyici: $v_o = -RC\\frac{dv_i}{dt}$; sinüs sinyali için kazanç şöyle olur:", tex: `|A| = \\omega RC = ${ntex(w, 5)} \\times ${ntex(R)} \\times ${ntex(C)} = ${ntex(A, 5)},\\ \\text{phase } -90^\\circ` });
    steps.push(`${eng(wc / (2 * Math.PI), "Hz", 4)} frekansında kazanç 1 olur. ${cfg === "integ" ? "Pratikte, DC doyumunu önlemek için kondansatöre paralel bir direnç eklenir." : "Pratikte, yüksek frekanslı gürültüyü azaltmak için kondansatörle seri bir direnç eklenir."}`);
    gainText = `|A| = ${fmt(A, 5)}`;
  }
  const sat = Math.abs(Vout) > Vsat;
  if (sat) steps.push(`Uyarı: hesaplanan çıkış ${fmt(Vout, 4)} V, ±${fmt(Vsat)} V besleme gerilimini aşıyor; gerçek çıkış yaklaşık ${fmt(Math.sign(Vout) * Vsat, 3)} V'ta doyuma girer.`);
  const results = [];
  if (A !== null) results.push({ label: "Kazanç", value: A, sig: 6, text: gainText }, { label: "Desibel cinsinden kazanç", value: `${fmt(20 * Math.log10(Math.abs(A)), 4)} dB` });
  else results.push({ label: "Girişe göre kazanç", value: gainText });
  results.push({ label: cfg === "integ" || cfg === "deriv" ? "Çıkış genliği" : "Çıkış gerilimi", value: eng(Vout, "V", 4), text: `Vout = ${eng(Vout, "V", 4)}` }, { label: "Durum", value: sat ? "Doyum (çıkış kırpılmış)" : "Lineer aralık içinde" });
  return { results, steps, copy: `${gainText}, Vout = ${eng(Vout, "V", 4)}${sat ? " (saturated)" : ""}` };
}
