import { choice, str, fail } from "../core/validate.js";
import { normalizeDigits } from "../core/format.js";

export const meta = {
  description: "Convertissez entre décimal, binaire et hexadécimal avec un nombre de bits donné : complément à deux (two's complement), complément à un, signe et grandeur, avec la plage des valeurs et les étapes d'inversion et d'ajout de 1.",
  keywords: ["Complément à deux", "two's complement", "Binaire", "Hexadécimal", "hex", "binary", "Nombres négatifs", "signed", "unsigned", "Bit"],
  formulas: [
    { label: "Complément à deux d'un nombre négatif", tex: "-x \\;\\to\\; \\overline{x} + 1 = 2^N - x" },
    { label: "Plage sur N bits", tex: "\\text{unsigned}: [0, 2^N - 1],\\qquad \\text{signed}: [-2^{N-1}, 2^{N-1} - 1]" }
  ],
  inputs: [
    { id: "mode", label: "Sens", type: "select", default: "dec", options: [["dec", "Du décimal au binaire"], ["bin", "Du binaire au décimal"], ["hex", "De l'hexadécimal au décimal"]] },
    { id: "x", label: "Valeur", type: "text", default: "-42", help: "Binaire : 0 et 1 uniquement. Hexadécimal : 0–9 et A–F." },
    { id: "N", label: "Nombre de bits N", type: "select", default: "8", options: [["4", "4"], ["8", "8"], ["16", "16"], ["32", "32"], ["64", "64"]] }
  ],
  example: { values: { mode: "dec", x: "-42", N: "8" }, expect: ["11010110", "0xD6"], note: "Exemple : −42 en complément à deux sur 8 bits." },
  invalid: { values: { mode: "dec", x: "300", N: "8" } },
  related: ["number-bases", "logic-gates", "adc"]
};

const group = (s) => s.replace(/(.{4})(?=.)/g, "$1 ");

export function encode(v, N) {
  const mod = 1n << BigInt(N);
  const u = ((v % mod) + mod) % mod;
  return u.toString(2).padStart(N, "0");
}

export function decodeSigned(bits) {
  const N = bits.length;
  const u = BigInt("0b" + bits);
  return bits[0] === "1" ? u - (1n << BigInt(N)) : u;
}

export function solve(input) {
  const mode = choice(input, "mode", "Sens", ["dec", "bin", "hex"], "dec");
  const N = Number(choice(input, "N", "Nombre de bits", ["4", "8", "16", "32", "64"], "8"));
  const raw = normalizeDigits(str(input, "x", "Valeur")).replace(/[\s_]/g, "");
  const min = -(1n << BigInt(N - 1)), maxS = (1n << BigInt(N - 1)) - 1n, maxU = (1n << BigInt(N)) - 1n;
  const steps = [];
  let bits;
  if (mode === "dec") {
    if (!/^[+-]?\d+$/.test(raw)) fail("Saisissez un entier décimal (sans fraction).", "x");
    const v = BigInt(raw);
    if (v < min || v > maxU) fail(`La valeur est hors de la plage de ${N} bits : de ${min} à ${maxU} (ou jusqu'à ${maxS} pour les nombres signés).`, "x");
    bits = encode(v, N);
    if (v >= 0n) {
      steps.push(`Le nombre est positif : on l'écrit directement en binaire et on le complète par des zéros jusqu'à ${N} bits : ${group(bits)}.`);
      if (v > maxS) steps.push(`Attention : la valeur est supérieure à ${maxS}, elle n'est donc valable que sans signe ; lue avec signe, elle vaudrait ${decodeSigned(bits)}.`);
    } else {
      const pos = encode(-v, N);
      const inv = [...pos].map((b) => (b === "1" ? "0" : "1")).join("");
      steps.push(`On écrit la valeur ${-v} en binaire sur ${N} bits : ${group(pos)}.`);
      steps.push(`On inverse tous les bits (complément à un) : ${group(inv)}.`);
      steps.push(`On ajoute 1 pour obtenir le complément à deux : ${group(bits)}.`);
      steps.push({ text: "Vérification :", tex: `2^{${N}} - ${-v} = ${(1n << BigInt(N)) + v}` });
    }
  } else if (mode === "bin") {
    if (!/^[01]+$/.test(raw)) fail("La valeur binaire ne doit contenir que des 0 et des 1.", "x");
    if (raw.length > N) fail(`Le nombre de bits saisis (${raw.length}) est supérieur à ${N}.`, "x");
    bits = raw.padStart(N, "0");
    if (raw.length < N) steps.push(`On complète la valeur par des zéros à gauche jusqu'à ${N} bits : ${group(bits)}.`);
  } else {
    if (!/^(0x)?[0-9a-fA-F]+$/.test(raw)) fail("La valeur hexadécimale ne doit contenir que 0–9 et A–F.", "x");
    const h = raw.replace(/^0x/i, "");
    const u = BigInt("0x" + h);
    if (u > maxU) fail(`La valeur est supérieure à ${N} bits.`, "x");
    bits = u.toString(2).padStart(N, "0");
    steps.push(`Chaque chiffre hexadécimal équivaut à 4 bits : ${group(bits)}.`);
  }
  const u = BigInt("0b" + bits), s = decodeSigned(bits);
  const ones = bits[0] === "1" ? -(BigInt("0b" + [...bits].map((b) => (b === "1" ? "0" : "1")).join(""))) : u;
  const sm = bits[0] === "1" ? -BigInt("0b" + (bits.slice(1) || "0")) : u;
  if (mode !== "dec") {
    steps.push(bits[0] === "1"
      ? `Le bit de poids fort vaut 1, donc le nombre est négatif en complément à deux : valeur = ${u} − 2^${N} = ${s}.`
      : `Le bit de poids fort vaut 0, donc le nombre est positif et sa valeur est ${u} avec ou sans signe.`);
  }
  const hex = "0x" + u.toString(16).toUpperCase().padStart(Math.ceil(N / 4), "0");
  return {
    results: [
      { label: "Binaire (complément à deux)", value: group(bits), text: bits },
      { label: "Hexadécimal", value: hex, text: hex },
      { label: "Décimal signé (two's complement)", value: s.toString() },
      { label: "Décimal non signé", value: u.toString() },
      { label: "Interprétation du complément à un", value: ones === 0n && bits[0] === "1" ? "-0" : ones.toString() },
      { label: "Interprétation signe et grandeur", value: sm === 0n && bits[0] === "1" ? "-0" : sm.toString() },
      { label: `Plage signée sur ${N} bits`, value: `${min} … ${maxS}` }
    ],
    steps, copy: `${bits} = ${hex} = ${s} (signed) = ${u} (unsigned)`
  };
}
