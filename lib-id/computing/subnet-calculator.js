import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "Hitung rincian jaringan IPv4 dari alamat dan mask: alamat jaringan, alamat broadcast, host pertama dan terakhir, jumlah host, wildcard mask, dan kelasnya, dengan representasi biner serta pembagian jaringan menjadi subnet.",
  keywords: ["subnet", "subnet", "subnetting", "CIDR", "subnet mask", "subnet mask", "IPv4", "alamat IP", "broadcast", "alamat broadcast", "wildcard", "VLSM"],
  formulas: [
    { label: "Alamat jaringan dan broadcast", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "Jumlah host", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "alamat IP", type: "text", default: "192.168.10.77/26", help: "Tulis alamat dengan prefiksnya, misalnya 10.0.5.9/20, atau alamat saja lalu masukkan mask di kolom berikutnya." },
    { id: "mask", label: "Mask (opsional)", type: "text", default: "", help: "Misalnya 24 atau 255.255.255.0." },
    { id: "subnets", label: "Bagi menjadi sejumlah subnet (opsional)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["Jaringan 192.168.10.64/26", "Broadcast 192.168.10.127", "62 host"], note: "Contoh: alamat 192.168.10.77 dalam jaringan /26." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» bukan alamat IPv4 yang valid. Setiap dari empat bagian harus berada antara 0 dan 255.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("Prefiks harus berada antara 0 dan 32.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`Mask ${s} tidak valid: angka 1 harus berurutan dari kiri (misalnya 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "1 host" : n === 2 ? "2 host" : n <= 10 ? `${n} host` : `${n.toLocaleString("en-US")} host`;
}

export function solve(input) {
  const raw = str(input, "ip", "alamat IP").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("Anda memasukkan prefiks pada alamat sekaligus pada mask; gunakan salah satunya saja.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("Masukkan prefiks bersama alamat (misalnya /24) atau mask di kolomnya.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (multicast)" : "E (eksperimental)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "Privat (RFC 1918)" : o1 === 127 ? "Loopback" : o1 === 169 && o2 === 254 ? "Lokal tautan (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "Carrier-grade NAT (CGNAT)" : o1 >= 224 ? "Multicast atau cadangan" : "Publik";
  const steps = [
    { text: "Prefiks menentukan mask: angka 1 pada p bit pertama dan angka 0 pada sisanya.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "Alamat jaringan = alamat AND mask (kita pertahankan bit jaringan dan nolkan bit host).",
    "Alamat broadcast = alamat jaringan dengan semua bit host diset menjadi satu.",
    { text: "Jumlah alamat dan host:", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("Jaringan /31 digunakan untuk tautan titik-ke-titik (RFC 3021), sehingga kedua alamatnya dapat digunakan.");
  if (p === 32) steps.push("Prefiks /32 mewakili tepat satu host.");
  const results = [
    { label: "Alamat jaringan", value: `${toStr(net)}/${p}`, text: `Jaringan ${toStr(net)}/${p}` },
    { label: "alamat broadcast", value: toStr(bc), text: `Broadcast ${toStr(bc)}` },
    { label: "Host pertama / host terakhir", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "Jumlah host yang dapat digunakan", value: plural(hosts), text: plural(hosts) },
    { label: "subnet mask", value: `${toStr(mask)} (/${p})` },
    { label: "Wildcard mask", value: toStr(wild) },
    { label: "Kelas klasik / jenis", value: `${cls} / ${kind}` },
    { label: "Dalam heksadesimal", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "Representasi biner", head: ["", "desimal", "biner"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p}: jaringan ${toStr(net)}/${p}, broadcast ${toStr(bc)}, host ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "Jumlah subnet", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`Tidak dapat membagi /${p} menjadi ${k} jaringan yang dapat digunakan (prefiks baru /${np} lebih besar dari /30).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `Kita pinjam ${bits} bit dari bagian host untuk mendapatkan minimal ${count} subnet:`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{host per subnet}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `Subnet (${count}${count > 256 ? ", menampilkan 256 pertama" : ""})`, head: ["#", "Jaringan", "Host", "Broadcast"], rows });
    results.push({ label: "Prefiks baru setelah pembagian", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "jaringan" : "jaringan"} × ${plural(size - 2)}` });
    copy += ` | dibagi menjadi /${np}: ${count} ${count <= 10 ? "jaringan" : "jaringan"}`;
  }
  return { results, steps, blocks, copy };
}
