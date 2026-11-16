import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "Calculez les détails d'un réseau IPv4 à partir de l'adresse et du masque : adresse du réseau, adresse de diffusion, première et dernière adresse d'hôte, nombre d'hôtes, masque inverse et classe, avec la représentation binaire et la division en sous-réseaux.",
  keywords: ["sous-réseaux", "subnet", "subnetting", "CIDR", "masque de sous-réseau", "subnet mask", "IPv4", "adresse IP", "broadcast", "adresse de diffusion", "wildcard", "VLSM"],
  formulas: [
    { label: "Adresse du réseau et de diffusion", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "Nombre d'hôtes", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "adresse IP", type: "text", default: "192.168.10.77/26", help: "Saisissez l'adresse avec son préfixe, par exemple 10.0.5.9/20, ou l'adresse seule puis le masque dans le champ suivant." },
    { id: "mask", label: "Masque (facultatif)", type: "text", default: "", help: "Par exemple 24 ou 255.255.255.0." },
    { id: "subnets", label: "Diviser en nombre de sous-réseaux (facultatif)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["Réseau 192.168.10.64/26", "Diffusion 192.168.10.127", "62 hôtes"], note: "Exemple : l'adresse 192.168.10.77 dans le réseau /26." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» n'est pas une adresse IPv4 valide. Chaque partie doit être comprise entre 0 et 255.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("Le préfixe doit être compris entre 0 et 32.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`Le masque ${s} n'est pas valide : les bits à 1 doivent être consécutifs depuis la gauche (par exemple 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "un seul hôte" : n === 2 ? "deux hôtes" : n <= 10 ? `${n} hôtes` : `${n.toLocaleString("en-US")} hôtes`;
}

export function solve(input) {
  const raw = str(input, "ip", "adresse IP").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("Vous avez saisi le préfixe dans l'adresse et dans le masque ; gardez-en un seul.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("Saisissez le préfixe avec l'adresse (par exemple /24) ou le masque dans son champ.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (multidiffusion)" : "E (expérimentale)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "privée (RFC 1918)" : o1 === 127 ? "boucle locale (loopback)" : o1 === 169 && o2 === 254 ? "lien local (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "partagée pour les fournisseurs d'accès (CGNAT)" : o1 >= 224 ? "réservée ou de multidiffusion" : "publique";
  const steps = [
    { text: "Le préfixe définit le masque : des 1 pour les p premiers bits et des 0 pour le reste.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "Adresse du réseau = adresse ET masque (on garde les bits du réseau et on met à zéro les bits de l'hôte).",
    "Adresse de diffusion = adresse du réseau avec tous les bits de l'hôte mis à 1.",
    { text: "Nombre d'adresses et d'hôtes :", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("Le réseau /31 est utilisé pour les liaisons point à point (RFC 3021), donc les deux adresses sont utilisables.");
  if (p === 32) steps.push("Le préfixe /32 représente un seul hôte précis.");
  const results = [
    { label: "Adresse du réseau", value: `${toStr(net)}/${p}`, text: `Réseau ${toStr(net)}/${p}` },
    { label: "adresse de diffusion", value: toStr(bc), text: `Diffusion ${toStr(bc)}` },
    { label: "Premier hôte / dernier hôte", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "Nombre d'hôtes utilisables", value: plural(hosts), text: plural(hosts) },
    { label: "masque de sous-réseau", value: `${toStr(mask)} (/${p})` },
    { label: "Masque inverse (Wildcard)", value: toStr(wild) },
    { label: "Classe traditionnelle / type", value: `${cls} / ${kind}` },
    { label: "En hexadécimal", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "Représentation binaire", head: ["", "Décimal", "Binaire"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p} : réseau ${toStr(net)}/${p}, diffusion ${toStr(bc)}, hôtes ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "Nombre de sous-réseaux", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`Impossible de diviser /${p} en ${k} réseaux utilisables (le nouveau préfixe /${np} dépasse /30).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `On emprunte ${bits} bits à la partie hôte pour obtenir au moins ${count} sous-réseaux :`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{hôtes par sous-réseau}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `Sous-réseaux (${count}${count > 256 ? ", 256 premiers affichés" : ""})`, head: ["#", "Réseau", "Hôtes", "Diffusion"], rows });
    results.push({ label: "Nouveau préfixe après division", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "réseaux" : "réseau"} × ${plural(size - 2)}` });
    copy += ` | Division en /${np}: ${count} ${count <= 10 ? "réseaux" : "réseau"}`;
  }
  return { results, steps, blocks, copy };
}
