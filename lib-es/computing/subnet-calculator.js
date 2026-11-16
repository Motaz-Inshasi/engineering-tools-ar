import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "Calcula los detalles de una red IPv4 a partir de la dirección y la máscara: dirección de red, de broadcast, primer y último host, número de hosts, máscara inversa y clase, con la representación binaria y la división de la red en subredes.",
  keywords: ["subredes", "subnet", "subnetting", "CIDR", "máscara de subred", "subnet mask", "IPv4", "dirección IP", "broadcast", "dirección de broadcast", "wildcard", "VLSM"],
  formulas: [
    { label: "Dirección de red y de broadcast", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "Número de hosts", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "dirección IP", type: "text", default: "192.168.10.77/26", help: "Escribe la dirección con el prefijo, como 10.0.5.9/20, o solo la dirección e introduce la máscara en el campo siguiente." },
    { id: "mask", label: "Máscara (opcional)", type: "text", default: "", help: "Por ejemplo 24 o 255.255.255.0." },
    { id: "subnets", label: "Dividir en un número de subredes (opcional)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["Red 192.168.10.64/26", "Broadcast 192.168.10.127", "62 hosts"], note: "Ejemplo: la dirección 192.168.10.77 en una red /26." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» no es una dirección IPv4 válida. Cada una de las cuatro partes debe estar entre 0 y 255.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("El prefijo debe estar entre 0 y 32.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`La máscara ${s} no es válida: los unos deben ser consecutivos desde la izquierda (por ejemplo 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "1 host" : n === 2 ? "2 hosts" : n <= 10 ? `${n} hosts` : `${n.toLocaleString("en-US")} hosts`;
}

export function solve(input) {
  const raw = str(input, "ip", "dirección IP").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("Has introducido el prefijo tanto en la dirección como en la máscara; usa solo uno de los dos.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("Introduce el prefijo junto con la dirección (por ejemplo /24) o la máscara en su campo.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (multidifusión)" : "E (experimental)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "Privada (RFC 1918)" : o1 === 127 ? "Bucle local (loopback)" : o1 === 169 && o2 === 254 ? "Enlace local (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "NAT de operador (CGNAT)" : o1 >= 224 ? "Multidifusión o reservada" : "Pública";
  const steps = [
    { text: "El prefijo define la máscara: unos en los primeros p bits y ceros en el resto.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "Dirección de red = dirección AND máscara (conservamos los bits de red y ponemos a cero los bits de host).",
    "Dirección de broadcast = dirección de red con todos los bits de host en uno.",
    { text: "Número de direcciones y de hosts:", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("La red /31 se usa en enlaces punto a punto (RFC 3021), por lo que ambas direcciones son utilizables.");
  if (p === 32) steps.push("El prefijo /32 representa exactamente un único host.");
  const results = [
    { label: "Dirección de red", value: `${toStr(net)}/${p}`, text: `Red ${toStr(net)}/${p}` },
    { label: "dirección de broadcast", value: toStr(bc), text: `Broadcast ${toStr(bc)}` },
    { label: "Primer host / último host", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "Número de hosts utilizables", value: plural(hosts), text: plural(hosts) },
    { label: "máscara de subred", value: `${toStr(mask)} (/${p})` },
    { label: "Máscara inversa (wildcard)", value: toStr(wild) },
    { label: "Clase tradicional / tipo", value: `${cls} / ${kind}` },
    { label: "En hexadecimal", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "Representación binaria", head: ["", "Decimal", "Binario"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p}: red ${toStr(net)}/${p}, broadcast ${toStr(bc)}, hosts ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "Número de subredes", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`No se puede dividir /${p} en ${k} subredes utilizables (el nuevo prefijo /${np} es mayor que /30).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `Tomamos prestados ${bits} bits de la parte de host para obtener al menos ${count} subredes:`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{hosts por subred}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `Subredes (${count}${count > 256 ? ", se muestran las primeras 256" : ""})`, head: ["#", "Red", "Hosts", "Broadcast"], rows });
    results.push({ label: "Nuevo prefijo tras la división", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "redes" : "red"} × ${plural(size - 2)}` });
    copy += ` | dividida en /${np}: ${count} ${count <= 10 ? "redes" : "red"}`;
  }
  return { results, steps, blocks, copy };
}
