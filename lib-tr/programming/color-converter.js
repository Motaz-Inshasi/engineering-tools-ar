import { fail, str } from "../core/validate.js";
import { tex as ntex } from "../core/format.js";

const NAMES = {
  red: "#ff0000", green: "#008000", blue: "#0000ff", white: "#ffffff", black: "#000000",
  gray: "#808080", grey: "#808080", orange: "#ffa500", yellow: "#ffff00", purple: "#800080",
  pink: "#ffc0cb", brown: "#a52a2a", cyan: "#00ffff", magenta: "#ff00ff", navy: "#000080",
  teal: "#008080", olive: "#808000", maroon: "#800000", lime: "#00ff00", silver: "#c0c0c0",
  gold: "#ffd700", dodgerblue: "#1e90ff"
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const NUM_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))(%?)$/;
const CHANNELS = ["Kırmızı kanal R", "Yeşil kanal G", "Mavi kanal B"];
const T = (x) => ntex(x, 4);
const pct = (x) => Math.round(x * 100);
const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, "0");
const pass = (x, t) => (x >= t ? "Geçer" : "Geçmez");

export const meta = {
  description: "HEX, RGB, HSL veya CSS adıyla verilen her rengi diğer biçimlere ile HSV ve CMYK'ya çevirir; beyaz ve siyahla WCAG kontrast oranını hesaplar ve normal metin için AA ile AAA ölçütlerini karşılayıp karşılamadığını belirler.",
  keywords: ["renk dönüştürme", "HEX", "RGB", "HSL", "HSV", "CMYK", "color converter", "contrast", "WCAG", "kontrast", "renk", "rgb", "hsl"],
  formulas: [
    { label: "RGB'den HSL'ye dönüşüm", tex: "H = 60^\\circ \\times \\left(\\frac{G'-B'}{\\Delta} \\bmod 6\\right),\\qquad L = \\frac{C_{max}+C_{min}}{2}" },
    { label: "Göreli parlaklık", tex: "Y = 0.2126\\,R_{lin} + 0.7152\\,G_{lin} + 0.0722\\,B_{lin}" },
    { label: "Kontrast oranı", tex: "CR = \\frac{L_1 + 0.05}{L_2 + 0.05}" }
  ],
  inputs: [
    { id: "color", label: "Renk", type: "text", default: "#1E90FF", help: "Örnekler: #1E90FF, #fff, #1E90FF80, rgb(30, 144, 255), hsl(210, 100%, 56%) veya dodgerblue." }
  ],
  example: { values: { color: "#1E90FF" }, expect: ["#1E90FF", "rgb(30, 144, 255)", "hsl(210, 100%, 56%)"], note: "Örnek: DodgerBlue mavi rengi." },
  invalid: { values: { color: "#12345" } },
  related: ["hash-generator", "number-bases", "text-encoding"]
};

function numberPart(p, label) {
  const m = p.match(NUM_RE);
  if (!m) fail(`${label} değeri geçersiz.`, "color");
  return { v: Number(m[1]), isPct: m[2] === "%" };
}

function channel(p, label) {
  const { v, isPct } = numberPart(p, label);
  const value = isPct ? (v * 255) / 100 : v;
  if (value < 0 || value > 255) fail(`${label} 0 ile 255 arasında olmalıdır.`, "color");
  return Math.round(value);
}

function fraction(p, label) {
  const { v } = numberPart(p, label);
  if (v < 0 || v > 100) fail(`${label} %0 ile %100 arasında olmalıdır.`, "color");
  return v / 100;
}

function alphaValue(p) {
  const { v, isPct } = numberPart(p, "Saydamlık");
  const value = isPct ? v / 100 : v;
  if (value < 0 || value > 1) fail("Saydamlık 0 ile 1 arasında ya da %0 ile %100 arasında olmalıdır.", "color");
  return value;
}

function args(body, name) {
  const parts = body.split(",");
  if (parts.length < 3 || parts.length > 4) fail(`${name}() biçimi üç değer gerektirir; dördüncü bir saydamlık değeri eklenebilir.`, "color");
  return parts;
}

function fromHex(digits) {
  const full = digits.length === 3 ? [...digits].map((ch) => ch + ch).join("") : digits;
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const alpha = full.length === 8 ? parseInt(full.slice(6), 16) / 255 : undefined;
  const steps = [];
  if (digits.length === 3) steps.push({ text: "Her rakamı iki haneye genişleterek biçimi tam altılı hale getirin", tex: `\\mathrm{${digits}} \\to \\mathrm{${full}}` });
  [0, 2, 4].forEach((start, i) => {
    const pair = full.slice(start, start + 2);
    steps.push({ text: CHANNELS[i], tex: `\\mathrm{${pair}}_{16} = ${parseInt(pair[0], 16)} \\times 16 + ${parseInt(pair[1], 16)} = ${rgb[i]}` });
  });
  if (alpha !== undefined) {
    const byte = Math.round(alpha * 255);
    steps.push({ text: "Saydamlık kanalı", tex: `\\mathrm{${full.slice(6)}}_{16} = ${byte},\\quad \\alpha = \\frac{${byte}}{255} = ${T(alpha)}` });
  }
  return { rgb, alpha, steps };
}

function fromName(name) {
  const hex = NAMES[name];
  const base = fromHex(hex.slice(1));
  base.steps.unshift(`${name} adı CSS renklerinde ${hex.toUpperCase()} rengine karşılık gelir`);
  return base;
}

function fromRgb(body) {
  const parts = args(body, "rgb");
  const rgb = parts.slice(0, 3).map((p, i) => channel(p, CHANNELS[i]));
  const alpha = parts.length === 4 ? alphaValue(parts[3]) : undefined;
  return {
    rgb,
    alpha,
    steps: [{ text: "Değerler doğrudan rgb biçiminde verilmiş", tex: `R = ${rgb[0]},\\quad G = ${rgb[1]},\\quad B = ${rgb[2]}` }]
  };
}

function hslToRgb(h, s, l) {
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const X = C * (1 - Math.abs((hp % 2) - 1));
  const m = l - C / 2;
  const sector = Math.floor(hp);
  const [r1, g1, b1] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][sector];
  const rgb = [r1 + m, g1 + m, b1 + m].map((v) => Math.min(255, Math.max(0, Math.round(v * 255))));
  const steps = [
    { text: "C = (1 - |2L - 1|) × S hesaplanır", tex: `C = (1 - |2 \\times ${T(l)} - 1|) \\times ${T(s)} = ${T(C)}` },
    { text: "X = C × (1 - |(H/60) mod 2 - 1|) hesaplanır", tex: `X = ${T(C)} \\times (1 - |${T(hp)} \\bmod 2 - 1|) = ${T(X)}` },
    { text: "m = L - C/2 hesaplanır", tex: `m = ${T(l)} - \\frac{${T(C)}}{2} = ${T(m)}` },
    { text: "H'ye göre sektörü seçip m değerini kanallara ekleriz", tex: `(R'+m,\\ G'+m,\\ B'+m) = (${T(r1 + m)},\\ ${T(g1 + m)},\\ ${T(b1 + m)})` },
    { text: "Değerleri 0 - 255 ölçeğine çevirip yuvarlarız", tex: `R = ${rgb[0]},\\quad G = ${rgb[1]},\\quad B = ${rgb[2]}` }
  ];
  return { rgb, steps };
}

function fromHsl(body) {
  const parts = args(body, "hsl");
  const h = ((numberPart(parts[0], "Derece H").v % 360) + 360) % 360;
  const s = fraction(parts[1], "Doygunluk S");
  const l = fraction(parts[2], "Parlaklık L");
  const alpha = parts.length === 4 ? alphaValue(parts[3]) : undefined;
  const conv = hslToRgb(h, s, l);
  return { rgb: conv.rgb, alpha, steps: conv.steps };
}

function parseColor(raw) {
  const s = raw.replace(/\s+/g, "").toLowerCase();
  if (HEX_RE.test(s)) return { kind: "hex", ...fromHex(s.slice(1)) };
  if (Object.prototype.hasOwnProperty.call(NAMES, s)) return { kind: "name", ...fromName(s) };
  const rgbBody = s.match(/^rgba?\((.*)\)$/);
  if (rgbBody) return { kind: "rgb", ...fromRgb(rgbBody[1]) };
  const hslBody = s.match(/^hsla?\((.*)\)$/);
  if (hslBody) return { kind: "hsl", ...fromHsl(hslBody[1]) };
  return fail("Renk biçimi tanınmadı. #RGB, #RRGGBB, #RRGGBBAA, rgb(...), hsl(...) veya red gibi bir ad kullanın.", "color");
}

function derive(rgb) {
  const [R, G, B] = rgb;
  const r = R / 255, g = G / 255, b = B / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const L = (max + min) / 2;
  const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
  let H = 0;
  if (d !== 0) {
    if (max === r) {
      let t = (g - b) / d;
      if (t < 0) t += 6;
      H = 60 * t;
    } else if (max === g) {
      H = 60 * ((b - r) / d + 2);
    } else {
      H = 60 * ((r - g) / d + 4);
    }
  }
  const V = max;
  const Sv = max === 0 ? 0 : d / max;
  const K = 1 - max;
  const cmy = (x) => (K === 1 ? 0 : (1 - x - K) / (1 - K));
  return { r, g, b, max, min, d, L, S, H, V, Sv, K, C: cmy(r), M: cmy(g), Y: cmy(b) };
}

function lin(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrastInfo(rgb) {
  const [lr, lg, lb] = rgb.map(lin);
  const Y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  return { lr, lg, lb, Y, cw: 1.05 / (Y + 0.05), cb: (Y + 0.05) / 0.05 };
}

function hueSteps(info) {
  const { r, g, b, max, d, H } = info;
  if (d === 0) return [{ text: "Kanallar arasında fark yok, bu yüzden derece H = 0", tex: "H = 0" }];
  if (max === r) {
    return [{ text: "En büyük kanal R'dir", tex: `H = 60 \\times \\left(\\frac{G'-B'}{\\Delta} \\bmod 6\\right) = 60 \\times ${T(H / 60)} = ${T(H)}` }];
  }
  if (max === g) {
    return [{ text: "En büyük kanal G'dir", tex: `H = 60 \\times \\left(\\frac{B'-R'}{\\Delta} + 2\\right) = 60 \\times (${T(H / 60 - 2)} + 2) = ${T(H)}` }];
  }
  return [{ text: "En büyük kanal B'dir", tex: `H = 60 \\times \\left(\\frac{R'-G'}{\\Delta} + 4\\right) = 60 \\times (${T(H / 60 - 4)} + 4) = ${T(H)}` }];
}

function derivedSteps(rgb, info) {
  const [R, G, B] = rgb;
  const { r, g, b, max, min, d, L, S, Sv, K, C, M, Y, H } = info;
  const steps = [
    { text: "R', G', B' değerlerini her kanalı 255'e bölerek hesaplarız", tex: `R' = \\frac{${R}}{255} = ${T(r)},\\quad G' = \\frac{${G}}{255} = ${T(g)},\\quad B' = \\frac{${B}}{255} = ${T(b)}` },
    { text: "En büyük ve en küçük kanalı ile aralarındaki fark Δ'yı belirleriz", tex: `C_{max} = ${T(max)},\\quad C_{min} = ${T(min)},\\quad \\Delta = ${T(d)}` },
    { text: "Parlaklık L = (C_max + C_min) / 2", tex: `L = \\frac{${T(max)} + ${T(min)}}{2} = ${T(L)} \\approx ${pct(L)}\\%` }
  ];
  steps.push(d === 0
    ? { text: "Kanallar arasında fark yok, bu yüzden doygunluk S = 0", tex: "S = 0" }
    : { text: "Doygunluk S = Δ / (1 - |2L - 1|)", tex: `S = \\frac{${T(d)}}{1 - |2 \\times ${T(L)} - 1|} = \\frac{${T(d)}}{${T(1 - Math.abs(2 * L - 1))}} = ${T(S)} \\approx ${pct(S)}\\%` });
  steps.push(...hueSteps(info));
  steps.push({ text: "Derece H'yi en yakın tam sayıya yuvarlarız", tex: `H \\approx ${Math.round(H) % 360}` });
  steps.push(max === 0
    ? { text: "Değer V = C_max; siyah renk için HSV'de doygunluk sıfırdır", tex: "V = 0,\\quad S_v = 0" }
    : { text: "Değer V = C_max, HSV'de doygunluk = Δ / C_max", tex: `V = ${pct(max)}\\%,\\quad S_v = \\frac{${T(d)}}{${T(max)}} = ${pct(Sv)}\\%` });
  steps.push(K === 1
    ? { text: "Renk siyah: K = %100 ve C = M = Y = 0", tex: "K = 1" }
    : { text: "Önce K, sonra C, M ve Y hesaplanır", tex: `K = 1 - C_{max} = ${T(K)},\\quad C = \\frac{1 - R' - K}{1 - K} = ${T(C)},\\quad M = \\frac{1 - G' - K}{1 - K} = ${T(M)},\\quad Y = \\frac{1 - B' - K}{1 - K} = ${T(Y)}` });
  return steps;
}

function contrastSteps(ci) {
  return [
    { text: "Her kanalı doğrusal değere çeviririz: c ≤ 0.03928 ise c/12.92, değilse ((c + 0.055) / 1.055)^2.4", tex: `R_{lin} = ${T(ci.lr)},\\quad G_{lin} = ${T(ci.lg)},\\quad B_{lin} = ${T(ci.lb)}` },
    { text: "Göreli parlaklık Y = 0.2126 R + 0.7152 G + 0.0722 B", tex: `Y = 0.2126 \\times ${T(ci.lr)} + 0.7152 \\times ${T(ci.lg)} + 0.0722 \\times ${T(ci.lb)} = ${T(ci.Y)}` },
    { text: "Beyazla kontrast = (1 + 0.05) / (Y + 0.05)", tex: `\\frac{1.05}{${T(ci.Y)} + 0.05} = ${T(ci.cw)}` },
    { text: "Siyahla kontrast = (Y + 0.05) / (0 + 0.05)", tex: `\\frac{${T(ci.Y)} + 0.05}{0.05} = ${T(ci.cb)}` },
    "Normal metin AA ölçütünü 4.5 ve üzeri, AAA ölçütünü 7 ve üzeri kontrastta karşılar"
  ];
}

export function solve(input) {
  const raw = str(input, "color", "Renk");
  if (raw.length > 200000) fail("Metin 200000 karakterden uzun.", "color");
  const c = parseColor(raw);
  const [R, G, B] = c.rgb;
  const info = derive(c.rgb);
  const ci = contrastInfo(c.rgb);
  const hH = Math.round(info.H) % 360;
  const hex = `#${hex2(R)}${hex2(G)}${hex2(B)}`;
  const hasAlpha = c.alpha !== undefined;
  const a = hasAlpha ? Math.round(c.alpha * 100) / 100 : null;
  const hexOut = hasAlpha ? `${hex}${hex2(Math.round(c.alpha * 255))}` : hex;
  const extra = hasAlpha ? [a] : [];
  const rgbStr = `${hasAlpha ? "rgba" : "rgb"}(${[R, G, B, ...extra].join(", ")})`;
  const hslStr = `${hasAlpha ? "hsla" : "hsl"}(${[hH, `${pct(info.S)}%`, `${pct(info.L)}%`, ...extra].join(", ")})`;
  const hsvStr = `hsv(${[hH, `${pct(info.Sv)}%`, `${pct(info.V)}%`].join(", ")})`;
  const cmykStr = `cmyk(${[info.C, info.M, info.Y, info.K].map((v) => `${pct(v)}%`).join(", ")})`;
  const cwText = ci.cw.toFixed(2);
  const cbText = ci.cb.toFixed(2);
  const steps = [...c.steps, ...derivedSteps(c.rgb, info), ...contrastSteps(ci)];
  const results = [
    { label: "HEX", value: hexOut, text: `HEX: ${hexOut}` },
    { label: "RGB", value: rgbStr, text: `RGB: ${rgbStr}` },
    { label: "HSL", value: hslStr, text: `HSL: ${hslStr}` },
    { label: "HSV", value: hsvStr },
    { label: "CMYK", value: cmykStr },
    { label: "Beyazla kontrast", value: `${cwText} : 1` },
    { label: "Siyahla kontrast", value: `${cbText} : 1` }
  ];
  const blocks = [
    { type: "html", html: `<span class="swatch" style="background:${hex}"></span>` },
    {
      type: "table",
      caption: "Kopyalanabilir biçimler",
      head: ["Biçim", "Değer"],
      rows: [["CSS hex", hexOut], ["CSS rgb()", rgbStr], ["CSS hsl()", hslStr]],
      ltr: true
    },
    {
      type: "table",
      caption: "Metnin arka planla kontrast oranı",
      head: ["Arka plan", "Kontrast oranı", "AA normal metin (4.5)", "AAA normal metin (7)"],
      rows: [
        ["Beyaz", `${cwText} : 1`, pass(ci.cw, 4.5), pass(ci.cw, 7)],
        ["Siyah", `${cbText} : 1`, pass(ci.cb, 4.5), pass(ci.cb, 7)]
      ],
      ltr: true
    },
    { type: "note", text: "HSL, HSV ve CMYK değerleri tam sayıya yuvarlanır; bu yüzden ters dönüşümde kanallarda küçük farklar çıkabilir." }
  ];
  if (hasAlpha) blocks.push({ type: "note", text: "Saydamlık kontrast oranına dahil edilmez; oran renk saydammış gibi hesaplanır." });
  return {
    results,
    blocks,
    steps,
    copy: `HEX: ${hexOut} | RGB: ${rgbStr} | HSL: ${hslStr}`
  };
}
