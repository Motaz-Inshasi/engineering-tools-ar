import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "IPv4 ağının ayrıntılarını adresten ve maskeden hesaplayın: ağ ve yayın adresi, ilk ve son konak, konak sayısı, ters maske ve sınıf; ikilik gösterim ve ağın alt ağlara bölünmesiyle birlikte.",
  keywords: ["alt ağlar", "subnet", "subnetting", "CIDR", "ağ maskesi", "subnet mask", "IPv4", "IP adresi", "broadcast", "yayın adresi", "wildcard", "VLSM"],
  formulas: [
    { label: "Ağ ve yayın adresi", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "Konak sayısı", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "IP adresi", type: "text", default: "192.168.10.77/26", help: "Adresi öneki ile birlikte yazın, örn. 10.0.5.9/20; ya da yalnızca adresi yazıp maskeyi aşağıdaki alana girin." },
    { id: "mask", label: "Maske (isteğe bağlı)", type: "text", default: "", help: "Örn. 24 veya 255.255.255.0." },
    { id: "subnets", label: "Alt ağ sayısına böl (isteğe bağlı)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["Ağ 192.168.10.64/26", "Yayın 192.168.10.127", "62 konak"], note: "Örnek: /26 ağında 192.168.10.77 adresi." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» geçerli bir IPv4 adresi değil. Dört parçanın her biri 0 ile 255 arasında olmalıdır.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("Önek 0 ile 32 arasında olmalıdır.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`${s} maskesi geçersiz: birler soldan başlayarak ardışık olmalıdır (örn. 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "tek konak" : n === 2 ? "iki konak" : n <= 10 ? `${n} konak` : `${n.toLocaleString("en-US")} konak`;
}

export function solve(input) {
  const raw = str(input, "ip", "IP adresi").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("Öneki hem adreste hem maskede girdiniz; yalnızca birini kullanın.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("Öneki adresle birlikte (örn. /24) ya da maskeyi kendi alanında girin.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (çok noktaya yayın)" : "E (deneysel)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "Özel (RFC 1918)" : o1 === 127 ? "Geri döngü (loopback)" : o1 === 169 && o2 === 254 ? "Bağlantı yerel (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "Servis sağlayıcı paylaşımlı (CGNAT)" : o1 >= 224 ? "Çok noktaya yayın veya ayrılmış" : "Genel";
  const steps = [
    { text: "Önek maskeyi belirler: ilk p bit birler, kalanı sıfırlar.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "Ağ adresi = adres AND maske (ağ bitlerini korur, konak bitlerini sıfırlar).",
    "Yayın adresi = ağ adresi, konak bitlerinin tümü birlerle yapılır.",
    { text: "Adres ve konak sayısı:", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("/31 ağı nokta-nokta bağlantılar için kullanılır (RFC 3021); iki adres de kullanılabilir.");
  if (p === 32) steps.push("/32 önek tek bir konağı temsil eder.");
  const results = [
    { label: "Ağ adresi", value: `${toStr(net)}/${p}`, text: `Ağ ${toStr(net)}/${p}` },
    { label: "yayın adresi", value: toStr(bc), text: `Yayın ${toStr(bc)}` },
    { label: "İlk konak / son konak", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "Kullanılabilir konak sayısı", value: plural(hosts), text: plural(hosts) },
    { label: "ağ maskesi", value: `${toStr(mask)} (/${p})` },
    { label: "Ters maske (Wildcard)", value: toStr(wild) },
    { label: "Klasik sınıf / tür", value: `${cls} / ${kind}` },
    { label: "Onaltılık", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "İkilik gösterim", head: ["", "Onlu", "İkilik"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p}: ağ ${toStr(net)}/${p}, yayın ${toStr(bc)}, konaklar ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "Alt ağ sayısı", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`/${p} ağı ${k} kullanılabilir ağa bölünemez (yeni önek /${np}, /30'dan büyük).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `Konak kısmından ${bits} bit ödünç alarak en az ${count} alt ağ elde ederiz:`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{konak her ağ için}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `Alt ağlar (${count}${count > 256 ? ", ilk 256 gösterilir" : ""})`, head: ["#", "Ağ", "Konaklar", "Yayın"], rows });
    results.push({ label: "Bölme sonrası yeni önek", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "ağ" : "ağ"} × ${plural(size - 2)}` });
    copy += ` | /${np} önekine bölme: ${count} ${count <= 10 ? "ağ" : "ağ"}`;
  }
  return { results, steps, blocks, copy };
}
