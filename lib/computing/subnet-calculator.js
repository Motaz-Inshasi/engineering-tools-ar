import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "احسب تفاصيل شبكة IPv4 من العنوان والقناع: عنوان الشبكة والبث وأول وآخر مضيف وعدد المضيفين والقناع العكسي والفئة، مع التمثيل الثنائي وتقسيم الشبكة إلى شبكات فرعية.",
  keywords: ["الشبكات الفرعية", "subnet", "subnetting", "CIDR", "قناع الشبكة", "subnet mask", "IPv4", "عنوان IP", "broadcast", "عنوان البث", "wildcard", "VLSM"],
  formulas: [
    { label: "عنوان الشبكة والبث", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "عدد المضيفين", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "عنوان IP", type: "text", default: "192.168.10.77/26", help: "اكتب العنوان مع البادئة مثل 10.0.5.9/20، أو العنوان وحده وأدخل القناع في الحقل التالي." },
    { id: "mask", label: "القناع (اختياري)", type: "text", default: "", help: "مثل 24 أو 255.255.255.0." },
    { id: "subnets", label: "قسّم إلى عدد شبكات فرعية (اختياري)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["الشبكة 192.168.10.64/26", "البث 192.168.10.127", "62 مضيفاً"], note: "مثال: العنوان 192.168.10.77 في شبكة /26." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» ليس عنوان IPv4 صحيحاً. كل جزء من أربعة بين 0 و 255.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("البادئة يجب أن تكون بين 0 و 32.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`القناع ${s} غير صالح: يجب أن تكون الآحاد متتالية من اليسار (مثل 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "مضيف واحد" : n === 2 ? "مضيفان" : n <= 10 ? `${n} مضيفين` : `${n.toLocaleString("en-US")} مضيفاً`;
}

export function solve(input) {
  const raw = str(input, "ip", "عنوان IP").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("أدخلت البادئة في العنوان والقناع معاً؛ اكتفِ بأحدهما.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("أدخل البادئة مع العنوان (مثل /24) أو القناع في حقله.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (بث متعدد)" : "E (تجريبية)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "خاص (RFC 1918)" : o1 === 127 ? "حلقة رجوع (loopback)" : o1 === 169 && o2 === 254 ? "محلي للرابط (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "مشترك لمزودي الخدمة (CGNAT)" : o1 >= 224 ? "خاص بالبث المتعدد أو محجوز" : "عام";
  const steps = [
    { text: "البادئة تحدد القناع: آحاد في أول p بت وأصفار في الباقي.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "عنوان الشبكة = العنوان AND القناع (نُبقي بتات الشبكة ونصفّر بتات المضيف).",
    "عنوان البث = عنوان الشبكة مع جعل كل بتات المضيف آحاداً.",
    { text: "عدد العناوين والمضيفين:", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("الشبكة /31 تُستخدم لوصلات نقطة إلى نقطة (RFC 3021)، فالعنوانان كلاهما قابلان للاستخدام.");
  if (p === 32) steps.push("البادئة /32 تمثل مضيفاً واحداً بعينه.");
  const results = [
    { label: "عنوان الشبكة", value: `${toStr(net)}/${p}`, text: `الشبكة ${toStr(net)}/${p}` },
    { label: "عنوان البث", value: toStr(bc), text: `البث ${toStr(bc)}` },
    { label: "أول مضيف / آخر مضيف", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "عدد المضيفين القابلين للاستخدام", value: plural(hosts), text: plural(hosts) },
    { label: "قناع الشبكة", value: `${toStr(mask)} (/${p})` },
    { label: "القناع العكسي (Wildcard)", value: toStr(wild) },
    { label: "الفئة التقليدية / النوع", value: `${cls} / ${kind}` },
    { label: "بالست عشري", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "التمثيل الثنائي", head: ["", "عشري", "ثنائي"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p}: الشبكة ${toStr(net)}/${p}، البث ${toStr(bc)}، المضيفون ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "عدد الشبكات الفرعية", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`لا يمكن تقسيم /${p} إلى ${k} شبكات قابلة للاستخدام (البادئة الجديدة /${np} أكبر من /30).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `نستعير ${bits} بت من جزء المضيف لنحصل على ${count} شبكة فرعية على الأقل:`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{مضيفاً لكل شبكة}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `الشبكات الفرعية (${count}${count > 256 ? "، يُعرض أول 256" : ""})`, head: ["#", "الشبكة", "المضيفون", "البث"], rows });
    results.push({ label: "البادئة الجديدة بعد التقسيم", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "شبكات" : "شبكة"} × ${plural(size - 2)}` });
    copy += ` | تقسيم إلى /${np}: ${count} ${count <= 10 ? "شبكات" : "شبكة"}`;
  }
  return { results, steps, blocks, copy };
}
