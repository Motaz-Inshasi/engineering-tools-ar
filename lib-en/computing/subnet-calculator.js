import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "Calculate the details of an IPv4 network from the address and mask: the network address, the broadcast address, the first and last host, the number of hosts, the wildcard mask and the class, with the binary representation and division of the network into subnets.",
  keywords: ["subnets", "subnet", "subnetting", "CIDR", "subnet mask", "subnet mask", "IPv4", "IP address", "broadcast", "broadcast address", "wildcard", "VLSM"],
  formulas: [
    { label: "Network and broadcast address", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "Number of hosts", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "IP address", type: "text", default: "192.168.10.77/26", help: "Enter the address with the prefix such as 10.0.5.9/20, or the address alone and enter the mask in the next field." },
    { id: "mask", label: "Mask (optional)", type: "text", default: "", help: "Such as 24 or 255.255.255.0." },
    { id: "subnets", label: "Divide into a number of subnets (optional)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["Network 192.168.10.64/26", "Broadcast 192.168.10.127", "62 hosts"], note: "Example: the address 192.168.10.77 in a /26 network." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» is not a valid IPv4 address. Each of the four parts must be between 0 and 255.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("The prefix must be between 0 and 32.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`The mask ${s} is not valid: the ones must be consecutive from the left (such as 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "1 host" : n === 2 ? "2 hosts" : n <= 10 ? `${n} hosts` : `${n.toLocaleString("en-US")} hosts`;
}

export function solve(input) {
  const raw = str(input, "ip", "IP address").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("You entered the prefix in both the address and the mask; use only one of them.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("Enter the prefix with the address (such as /24) or the mask in its field.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (multicast)" : "E (experimental)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "Private (RFC 1918)" : o1 === 127 ? "Loopback" : o1 === 169 && o2 === 254 ? "Link-local (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "Carrier-grade NAT (CGNAT)" : o1 >= 224 ? "Multicast or reserved" : "Public";
  const steps = [
    { text: "The prefix defines the mask: ones in the first p bits and zeros in the rest.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "Network address = address AND mask (we keep the network bits and set the host bits to zero).",
    "Broadcast address = network address with all host bits set to one.",
    { text: "Number of addresses and hosts:", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("The /31 network is used for point-to-point links (RFC 3021), so both addresses are usable.");
  if (p === 32) steps.push("The /32 prefix represents exactly one single host.");
  const results = [
    { label: "Network address", value: `${toStr(net)}/${p}`, text: `Network ${toStr(net)}/${p}` },
    { label: "broadcast address", value: toStr(bc), text: `Broadcast ${toStr(bc)}` },
    { label: "First host / last host", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "Number of usable hosts", value: plural(hosts), text: plural(hosts) },
    { label: "subnet mask", value: `${toStr(mask)} (/${p})` },
    { label: "Wildcard mask", value: toStr(wild) },
    { label: "Classful class / type", value: `${cls} / ${kind}` },
    { label: "In hexadecimal", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "Binary representation", head: ["", "Decimal", "Binary"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p}: network ${toStr(net)}/${p}, broadcast ${toStr(bc)}, hosts ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "Number of subnets", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`Cannot divide /${p} into ${k} usable subnets (the new prefix /${np} is greater than /30).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `We borrow ${bits} bits from the host part to get at least ${count} subnets:`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{hosts per subnet}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `Subnets (${count}${count > 256 ? ", first 256 shown" : ""})`, head: ["#", "Network", "Hosts", "Broadcast"], rows });
    results.push({ label: "New prefix after division", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "networks" : "network"} × ${plural(size - 2)}` });
    copy += ` | divided into /${np}: ${count} ${count <= 10 ? "networks" : "network"}`;
  }
  return { results, steps, blocks, copy };
}
