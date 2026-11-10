import { createHash } from "node:crypto";
import qrcode from "../vendor/qrcode-generator/qrcode.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function isTronAddress(addr) {
  const s = String(addr ?? "");
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(s)) return false;
  let n = 0n;
  for (const c of s) n = n * 58n + BigInt(B58.indexOf(c));
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const bytes = Buffer.from(hex.padStart(50, "0"), "hex");
  if (bytes.length !== 25 || bytes[0] !== 0x41) return false;
  const sum = createHash("sha256").update(createHash("sha256").update(bytes.subarray(0, 21)).digest()).digest().subarray(0, 4);
  return sum.equals(bytes.subarray(21));
}

export function donateUrl(config) {
  const url = String(config?.donate?.url ?? "").trim();
  if (!url) return "";
  let u;
  try { u = new URL(url); } catch { throw new Error(`رابط التبرع غير صالح في site.config.json: ${url}`); }
  if (u.protocol !== "https:") throw new Error("رابط التبرع يجب أن يبدأ بـ https://");
  return u.href;
}

export function donateInfo(config) {
  const d = config?.donate ?? {};
  const usdt = String(d.usdtTrc20 ?? "").trim();
  if (usdt && !isTronAddress(usdt)) throw new Error(`عنوان USDT (TRC20) غير صالح في site.config.json: ${usdt}`);
  const payId = String(d.binancePayId ?? "").trim();
  if (payId && !/^\d{6,12}$/.test(payId)) throw new Error("Binance Pay ID يجب أن يكون أرقاماً فقط (6 إلى 12 رقماً).");
  const url = donateUrl(config);
  const enabled = d.enabled === true && !!(usdt || payId || url);
  return { enabled, usdt, payId, url, label: d.label || "ادعم الموقع", text: d.text || "" };
}

export function donateHtml(config, root = "") {
  const info = donateInfo(config);
  if (!info.enabled) return "";
  return `<a class="donate-top" href="${root}support/"${info.text ? ` title="${esc(info.text)}"` : ""}><span class="heart" aria-hidden="true">♥</span> ${esc(info.label)}</a>`;
}

export function qrMatrix(text) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}

export function qrSvg(text, label) {
  const m = qrMatrix(text);
  const n = m.length, q = 4, size = n + 2 * q;
  let d = "";
  m.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + q} ${r + q}h1v1h-1z`; }));
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label)}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`;
}
