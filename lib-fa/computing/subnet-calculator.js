import { fail, str, isBlank } from "../core/validate.js";
import { numx as num } from "../core/numexpr.js";

export const meta = {
  description: "محاسبه جزئیات یک شبکه IPv4 از آدرس و ماسک: آدرس شبکه، آدرس پخش (broadcast)، اولین و آخرین میزبان، تعداد میزبان‌ها، ماسک معکوس (wildcard) و کلاس، همراه با نمایش دودویی و تقسیم شبکه به زیرشبکه‌ها.",
  keywords: ["زیرشبکه‌ها", "subnet", "subnetting", "CIDR", "ماسک زیرشبکه", "subnet mask", "IPv4", "آدرس IP", "broadcast", "آدرس پخش", "wildcard", "VLSM"],
  formulas: [
    { label: "آدرس شبکه و پخش", tex: "\\text{Network} = IP \\wedge Mask,\\qquad \\text{Broadcast} = Network \\vee \\overline{Mask}" },
    { label: "تعداد میزبان‌ها", tex: "N_{hosts} = 2^{32 - p} - 2" }
  ],
  inputs: [
    { id: "ip", label: "آدرس IP", type: "text", default: "192.168.10.77/26", help: "آدرس را همراه با پیشوند مانند 10.0.5.9/20 وارد کنید، یا فقط آدرس را وارد کنید و ماسک را در فیلد بعدی بنویسید." },
    { id: "mask", label: "ماسک (اختیاری)", type: "text", default: "", help: "مانند 24 یا 255.255.255.0." },
    { id: "subnets", label: "به تعداد زیرشبکه تقسیم کن (اختیاری)", type: "number", default: "" }
  ],
  example: { values: { ip: "192.168.10.77/26", mask: "", subnets: "" }, expect: ["شبکه 192.168.10.64/26", "پخش 192.168.10.127", "62 میزبان"], note: "مثال: آدرس 192.168.10.77 در شبکه /26." },
  invalid: { values: { ip: "192.168.300.1/24", mask: "", subnets: "" } },
  related: ["number-bases", "binary-twos-complement", "data-transfer", "logic-gates"]
};

const toStr = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const toBin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

function parseIp(s, field) {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) fail(`«${s}» آدرس IPv4 معتبر نیست. هر یک از چهار بخش باید بین 0 و 255 باشد.`, field);
  return p.reduce((a, x) => ((a << 8) | Number(x)) >>> 0, 0) >>> 0;
}

const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

function parsePrefix(s, field) {
  if (/^\/?\d{1,2}$/.test(s)) {
    const p = Number(s.replace("/", ""));
    if (p > 32) fail("پیشوند باید بین 0 و 32 باشد.", field);
    return p;
  }
  const m = parseIp(s, field);
  const inv = ~m >>> 0;
  if (((inv + 1) & inv) !== 0) fail(`ماسک ${s} معتبر نیست: یک‌ها باید از چپ پشت سر هم باشند (مانند 255.255.255.0).`, field);
  return 32 - Math.log2(inv + 1);
}

function plural(n) {
  return n === 1 ? "یک میزبان" : n === 2 ? "دو میزبان" : n <= 10 ? `${n} میزبان` : `${n.toLocaleString("en-US")} میزبان`;
}

export function solve(input) {
  const raw = str(input, "ip", "آدرس IP").replace(/\s+/g, "");
  const [ipS, pS] = raw.split("/");
  const ip = parseIp(ipS, "ip");
  let p;
  if (pS !== undefined) {
    if (!isBlank(input.mask)) fail("پیشوند را هم در آدرس و هم در ماسک وارد کرده‌اید؛ فقط یکی از آن‌ها را وارد کنید.", "mask");
    p = parsePrefix(pS, "ip");
  } else {
    if (isBlank(input.mask)) fail("پیشوند را همراه با آدرس (مانند /24) وارد کنید یا ماسک را در فیلد آن بنویسید.", "mask");
    p = parsePrefix(String(input.mask).trim(), "mask");
  }
  const mask = maskOf(p), wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0, bc = (net | wild) >>> 0;
  const total = 2 ** (32 - p);
  const hosts = p >= 31 ? (p === 31 ? 2 : 1) : total - 2;
  const first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
  const o1 = ip >>> 24;
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (چندپخشی)" : "E (آزمایشی)";
  const o2 = (ip >>> 16) & 255;
  const kind = o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168) ? "خصوصی (RFC 1918)" : o1 === 127 ? "حلقه بازگشتی (loopback)" : o1 === 169 && o2 === 254 ? "محلی پیوند (APIPA)" : o1 === 100 && o2 >= 64 && o2 <= 127 ? "NAT سطح ارائه‌دهنده (CGNAT)" : o1 >= 224 ? "چندپخشی یا رزروشده" : "عمومی";
  const steps = [
    { text: "پیشوند ماسک را مشخص می‌کند: یک‌ها در p بیت اول و صفرها در بقیه.", tex: `p = ${p} \\Rightarrow \\text{Mask} = ${toStr(mask)}` },
    "آدرس شبکه = آدرس AND ماسک (بیت‌های شبکه را نگه می‌داریم و بیت‌های میزبان را صفر می‌کنیم).",
    "آدرس پخش = آدرس شبکه با یک کردن همه بیت‌های میزبان.",
    { text: "تعداد آدرس‌ها و میزبان‌ها:", tex: `2^{32-${p}} = ${total}${p < 31 ? `,\\quad ${total} - 2 = ${hosts}` : ""}` }
  ];
  if (p === 31) steps.push("شبکه /31 برای پیوندهای نقطه به نقطه به کار می‌رود (RFC 3021)، پس هر دو آدرس قابل استفاده‌اند.");
  if (p === 32) steps.push("پیشوند /32 دقیقاً یک میزبان مشخص را نشان می‌دهد.");
  const results = [
    { label: "آدرس شبکه", value: `${toStr(net)}/${p}`, text: `شبکه ${toStr(net)}/${p}` },
    { label: "آدرس پخش", value: toStr(bc), text: `پخش ${toStr(bc)}` },
    { label: "اولین میزبان / آخرین میزبان", value: `${toStr(first)} – ${toStr(last)}` },
    { label: "تعداد میزبان‌های قابل استفاده", value: plural(hosts), text: plural(hosts) },
    { label: "ماسک زیرشبکه", value: `${toStr(mask)} (/${p})` },
    { label: "ماسک معکوس (Wildcard)", value: toStr(wild) },
    { label: "کلاس سنتی / نوع", value: `${cls} / ${kind}` },
    { label: "به شانزدهی", value: `0x${ip.toString(16).toUpperCase().padStart(8, "0")}` }
  ];
  const blocks = [{ type: "table", ltr: true, caption: "نمایش دودویی", head: ["", "دهدهی", "دودویی"], rows: [["IP", toStr(ip), toBin(ip)], ["Mask", toStr(mask), toBin(mask)], ["Network", toStr(net), toBin(net)], ["Broadcast", toStr(bc), toBin(bc)]] }];
  let copy = `IP ${toStr(ip)}/${p}: شبکه ${toStr(net)}/${p}، پخش ${toStr(bc)}، میزبان‌ها ${toStr(first)} – ${toStr(last)} (${plural(hosts)})`;
  if (!isBlank(input.subnets)) {
    const k = num(input, "subnets", "تعداد زیرشبکه‌ها", { integer: true, min: 2, max: 65536 });
    const bits = Math.ceil(Math.log2(k)), np = p + bits;
    if (np > 30) fail(`نمی‌توان /${p} را به ${k} شبکه قابل استفاده تقسیم کرد (پیشوند جدید /${np} بزرگ‌تر از /30 است).`, "subnets");
    const count = 2 ** bits, size = 2 ** (32 - np);
    steps.push({ text: `${bits} بیت از بخش میزبان قرض می‌گیریم تا حداقل ${count} زیرشبکه به دست آوریم:`, tex: `2^{${bits}} = ${count} \\ge ${k},\\quad /${p} \\to /${np},\\quad ${size - 2}\\ \\text{میزبان برای هر زیرشبکه}` });
    const rows = [];
    for (let i = 0; i < Math.min(count, 256); i++) {
      const n = (net + i * size) >>> 0, b = (n + size - 1) >>> 0;
      rows.push([String(i + 1), `${toStr(n)}/${np}`, `${toStr(n + 1)} – ${toStr(b - 1)}`, toStr(b)]);
    }
    blocks.push({ type: "table", ltr: true, caption: `زیرشبکه‌ها (${count}${count > 256 ? "، اولین 256 نمایش داده می‌شود" : ""})`, head: ["#", "شبکه", "میزبان‌ها", "پخش"], rows });
    results.push({ label: "پیشوند جدید پس از تقسیم", value: `/${np} (${toStr(maskOf(np))}) — ${count} ${count <= 10 ? "شبکه‌ها" : "شبکه"} × ${plural(size - 2)}` });
    copy += ` | تقسیم به /${np}: ${count} ${count <= 10 ? "شبکه‌ها" : "شبکه"}`;
  }
  return { results, steps, blocks, copy };
}
