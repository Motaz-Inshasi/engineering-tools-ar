import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { donateHtml, donateInfo, qrSvg, verificationMeta, isolateLtr, emailHtml } from "./site-parts.mjs";
import { catIcon, GROUPS, groupOf, TOOL_SVG } from "./icons.mjs";
import { existsSync as fileExists } from "node:fs";
const TOOL_EMOJI = fileExists(new URL("./tool-emoji.mjs", import.meta.url)) ? (await import("./tool-emoji.mjs")).TOOL_EMOJI : {};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const katex = require(join(ROOT, "vendor/katex/katex.min.js"));
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));
const { categories, tools } = await import(pathToFileURL(join(ROOT, "assets/js/registry.js")).href);

const CHECK = process.argv.includes("--check");
const SITE = config.siteName;
const siteUrl = (config.siteUrl || "").replace(/\/+$/, "");
const changed = [];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tex = (t, display = true) => katex.renderToString(t, { displayMode: display, throwOnError: true, output: "htmlAndMathml", strict: false });

function inline(text) {
  return String(text).split(/(\$[^$]+\$)/g).map((p) => (p.length > 1 && p.startsWith("$") && p.endsWith("$") ? tex(p.slice(1, -1), false) : isolateLtr(p))).join("");
}

function write(rel, content) {
  const p = join(ROOT, rel);
  const old = existsSync(p) ? readFileSync(p, "utf8") : null;
  if (old === content) return;
  changed.push(rel);
  if (CHECK) return;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}

async function loadMeta(t) {
  const p = join(ROOT, "lib", t.category, `${t.slug}.js`);
  if (!existsSync(p) || readFileSync(p, "utf8").trim() === "") return null;
  const mod = await import(pathToFileURL(p).href);
  return mod.meta || null;
}

const metas = new Map();
for (const t of tools) metas.set(t.slug, await loadMeta(t));
const live = tools.filter((t) => metas.get(t.slug));
const catTitle = Object.fromEntries(categories.map((c) => [c.slug, c.title]));

function absUrl(path) {
  return siteUrl ? `${siteUrl}/${path}` : null;
}

function head({ title, description, path, root, jsonld, noindex }) {
  const url = absUrl(path);
  const canonical = url || (path === "" ? "./" : "./");
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}${path === "" ? verificationMeta(config) : ""}<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ar_AR">
<meta property="og:site_name" content="${esc(SITE)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${url ? `<meta property="og:url" content="${esc(url)}">\n` : ""}<meta name="theme-color" content="#0b5cad">
<link rel="icon" href="${root}assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}vendor/katex/katex.min.css">
<link rel="stylesheet" href="${root}assets/css/main.css">
<script>try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<script defer src="${root}vendor/katex/katex.min.js"></script>
<script type="module" src="${root}assets/js/app.js"></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>\n` : ""}</head>`;
}

const author = config.author || null;

function header(root, activeCat) {
  const nav = GROUPS.flatMap((g) => g.cats).map((slug) => categories.find((c) => c.slug === slug)).filter(Boolean).map((c) => `<li><a class="g-${groupOf(c.slug)}" href="${root}category/${c.slug}/"${c.slug === activeCat ? ' aria-current="page"' : ""}>${catIcon(c.slug)}<span>${esc(c.title)}</span></a></li>`).join("");
  return `<a class="skip" href="#main">تخطَّ إلى المحتوى</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="${root}"><span class="logo" aria-hidden="true">∑</span><span class="brand-name">${esc(SITE)}</span></a>
<form class="search-mini" action="${root}" method="get" role="search"><label class="sr-only" for="site-q">ابحث عن أداة</label><input id="site-q" name="q" type="search" placeholder="ابحث في ${live.length} أداة…" autocomplete="off"></form>
${author ? `<a class="about-top" href="${root}about/">تواصل معي</a>` : ""}${donateHtml(config, root)}<button class="icon-btn theme-toggle" type="button" aria-label="تبديل الوضع الداكن">☾</button>
</div></header>
<nav class="cats" aria-label="التصنيفات"><ul>${nav}</ul></nav>`;
}

function footer(root) {
  return `<footer class="site-footer"><div class="wrap">
<p><strong>تنبيه:</strong> النتائج للاستخدام التعليمي فقط. تحقّق من النتائج الحرجة قبل الاعتماد عليها في التصميم أو التنفيذ.</p>
<p>${esc(SITE)} موقع مجاني بلا حسابات ولا ملفات تعريف ارتباط ولا تتبع. <a href="${root}">كل الأدوات</a>${author ? ` · <a href="${root}about/">عن الموقع والتواصل</a>` : ""}</p>
${author ? `<p>صُمّم وطُوّر بواسطة <a href="${root}about/">${esc(author.name)}</a>${author.email ? ` · ${emailHtml(author.email)}` : ""}</p>` : ""}
</div></footer>`;
}

function adSlot(name) {
  if (!config.ads || !config.ads.enabled) return "";
  return `<div class="ad-slot" data-slot="${esc(name)}" aria-hidden="true"></div>`;
}

function crumbs(root, items) {
  return `<nav class="crumbs" aria-label="مسار التنقل"><ol>${items.map((it, i) => (i === items.length - 1 ? `<li aria-current="page">${esc(it.title)}</li>` : `<li><a href="${it.href}">${esc(it.title)}</a></li>`)).join("")}</ol></nav>`;
}

function fieldHtml(inp) {
  const id = `in-${inp.id}`;
  const type = inp.type || "number";
  const unit = inp.unit ? ` <span class="unit">(${esc(inp.unit)})</span>` : "";
  const help = inp.help ? `<small class="help" id="help-${inp.id}">${inline(inp.help)}</small>` : "";
  const desc = inp.help ? ` aria-describedby="help-${inp.id}"` : "";
  const when = inp.when ? ` data-when='${esc(JSON.stringify(inp.when))}'` : "";
  const wide = inp.wide || type === "textarea" || type === "expr" ? " wide" : "";
  const def = inp.default ?? "";
  let control;
  if (type === "select") {
    control = `<select id="${id}" name="${inp.id}"${desc}>${inp.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(def) ? " selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  } else if (type === "textarea") {
    control = `<textarea id="${id}" name="${inp.id}" dir="ltr" rows="${inp.rows || 4}" spellcheck="false"${inp.placeholder ? ` placeholder="${esc(inp.placeholder)}"` : ""}${desc}>${esc(def)}</textarea>`;
  } else if (type === "checkbox") {
    return `<div class="field check${wide}"${when}><input id="${id}" name="${inp.id}" type="checkbox"${def ? " checked" : ""}${desc}><label for="${id}">${esc(inp.label)}</label>${help}</div>`;
  } else {
    const dir = type === "text" ? "auto" : "ltr";
    control = `<input id="${id}" name="${inp.id}" type="text" dir="${dir}" autocomplete="off" spellcheck="false"${type === "number" ? ' inputmode="text"' : ""}${inp.placeholder ? ` placeholder="${esc(inp.placeholder)}"` : ""} value="${esc(def)}"${desc}>`;
  }
  return `<div class="field${wide}"${when}><label for="${id}">${esc(inp.label)}${unit}</label>${control}${help}</div>`;
}

function relatedFor(t, meta) {
  const list = (meta.related || []).filter((s) => metas.get(s) && s !== t.slug);
  for (const o of live) {
    if (list.length >= 5) break;
    if (o.category === t.category && o.slug !== t.slug && !list.includes(o.slug)) list.push(o.slug);
  }
  return list.map((s) => tools.find((x) => x.slug === s));
}

function jsonldTool(t, meta) {
  const data = [{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.title,
    description: meta.description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    inLanguage: "ar",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
  }];
  const u = absUrl(`tools/${t.slug}/`);
  if (u) {
    data[0].url = u;
    data.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE, item: absUrl("") },
        { "@type": "ListItem", position: 2, name: catTitle[t.category], item: absUrl(`category/${t.category}/`) },
        { "@type": "ListItem", position: 3, name: t.title, item: u }
      ]
    });
  }
  return data;
}

function toolPage(t, meta) {
  const root = "../../";
  const formulas = (meta.formulas || []).map((f) => `<div class="formula">${f.label ? `<div class="formula-label">${inline(f.label)}</div>` : ""}${tex(f.tex)}</div>`).join("\n");
  const fields = meta.inputs.map(fieldHtml).join("\n");
  const rel = relatedFor(t, meta);
  const exampleNote = meta.example?.note ? `<p class="example-note">${inline(meta.example.note)}</p>` : "";
  return `${head({ title: `${t.title} | ${SITE}`, description: meta.description, path: `tools/${t.slug}/`, root, jsonld: jsonldTool(t, meta) })}
<body data-tool="${t.slug}" data-category="${t.category}">
${header(root, t.category)}
<main id="main"><div class="wrap">
${crumbs(root, [{ title: SITE, href: root }, { title: catTitle[t.category], href: `${root}category/${t.category}/` }, { title: t.title }])}
<div class="page-head g-${groupOf(t.category)}"><a class="badge-ic" href="${root}category/${t.category}/" aria-label="${esc(catTitle[t.category])}" title="${esc(catTitle[t.category])}">${toolPic(t, "pic-lg")}</a><div><h1>${esc(t.title)}</h1>
<p class="lead clamp">${inline(meta.intro || meta.description)}</p></div></div>
${adSlot("header")}
${formulas ? `<details class="card formulas"><summary><h2 id="h-formulas">📘 القانون المستخدم</h2><span class="sum-hint">اضغط للعرض</span></summary>
${formulas}
</details>` : ""}
<section class="card" aria-labelledby="h-inputs"><h2 id="h-inputs">✏️ المدخلات</h2>
<form id="tool-form" class="tool-form" novalidate>
${fields}
${exampleNote}
<div class="actions"><button class="btn primary" type="submit">${esc(meta.submitLabel || "احسب")}</button><button class="btn" type="button" id="example-btn">مثال محلول</button><button class="btn" type="reset">مسح</button><span class="live-hint" id="live-hint" hidden>⚡ يتحدّث الناتج تلقائياً عند تعديل المدخلات</span></div>
</form>
${meta.inputHelp ? `<p class="help">${inline(meta.inputHelp)}</p>` : ""}
</section>
<section id="output" class="card" aria-live="polite" tabindex="-1" hidden>
<div id="out-error" class="error" role="alert" hidden></div>
<div id="out-success" hidden>
<div class="out-head"><h2>✅ النتيجة</h2><div class="out-actions"><button class="btn" type="button" id="copy-btn">📋 نسخ</button><button class="btn" type="button" id="share-btn">🔗 مشاركة</button><button class="btn" type="button" id="print-btn">🖨️ طباعة</button> <span id="copy-status" class="copied" role="status"></span></div></div>
<dl id="out-results" class="results"></dl>
<div id="out-blocks"></div>
<div id="steps-wrap"><h2>🪜 الحل خطوة بخطوة</h2><ol id="out-steps" class="steps"></ol></div>
</div>
</section>
<noscript><p class="note warn">هذه الأداة تحتاج تفعيل JavaScript لإجراء الحسابات.</p></noscript>
${adSlot("inContent")}
${meta.notes ? `<section class="card" aria-labelledby="h-notes"><h2 id="h-notes">ملاحظات</h2>${meta.notes.map((n) => `<p>${inline(n)}</p>`).join("")}</section>` : ""}
${rel.length ? `<section class="related" aria-labelledby="h-related"><h2 id="h-related">🔗 أدوات ذات صلة</h2><ul class="chips">${rel.map((r) => `<li><a href="${root}tools/${r.slug}/">${toolPic(r, "pic-sm")}${esc(r.title)}</a></li>`).join("")}</ul></section>` : ""}
${adSlot("footer")}
</div></main>
${footer(root)}
</body>
</html>
`;
}

function toolCard(t, root) {
  const m = metas.get(t.slug);
  const search = [t.title, m.description, ...(m.keywords || []), catTitle[t.category], t.slug.replace(/-/g, " ")].join(" ");
  return `<li data-search="${esc(search)}"><a class="g-${groupOf(t.category)}" href="${root}tools/${t.slug}/" title="${esc(m.description)}">${toolPic(t)}<strong>${esc(t.title)}</strong></a></li>`;
}

function toolPic(t, cls = "pic") {
  const e = TOOL_SVG[t.slug] || TOOL_EMOJI[t.slug];
  return e ? `<span class="${cls}" aria-hidden="true">${e}</span>` : `<span class="${cls}" aria-hidden="true">${catIcon(t.category)}</span>`;
}

const countOf = (slug) => live.filter((t) => t.category === slug).length;
const toolsWord = (n) => (n === 1 ? "أداة واحدة" : n === 2 ? "أداتان" : n <= 10 ? `${n} أدوات` : `${n} أداة`);

function catTiles(root) {
  return GROUPS.map((g) => `<section class="group g-${g.id}" aria-labelledby="grp-${g.id}"><h3 id="grp-${g.id}">${esc(g.title)}</h3><ul class="cat-tiles">${g.cats.map((slug) => categories.find((c) => c.slug === slug)).filter((c) => c && countOf(c.slug)).map((c) => `<li><a href="${root}category/${c.slug}/"><span class="tile-ic">${catIcon(c.slug)}</span><span class="tile-t">${esc(c.title)}</span><span class="tile-n">${toolsWord(countOf(c.slug))}</span></a></li>`).join("")}</ul></section>`).join("\n");
}

function homePage() {
  const root = "";
  const order = GROUPS.flatMap((g) => g.cats).map((s) => categories.find((c) => c.slug === s)).filter(Boolean);
  const sections = order.map((c) => {
    const list = live.filter((t) => t.category === c.slug);
    if (!list.length) return "";
    return `<section class="cat-section g-${groupOf(c.slug)}" aria-labelledby="cat-${c.slug}"><h2 id="cat-${c.slug}"><a href="category/${c.slug}/">${catIcon(c.slug, "ic h-ic")}${esc(c.title)}</a></h2><ul class="tool-grid">${list.map((t) => toolCard(t, root)).join("")}</ul></section>`;
  }).join("\n");
  const description = `${live.length} أداة مجانية بالعربية لطلاب الهندسة والعلوم والجامعة: رياضيات ودوائر وإلكترونيات، فيزياء وكيمياء وأحياء، إحصاء، طب وصيدلة، اقتصاد، حاسوب وشبكات، عمارة وبيئة، مع الحل خطوة بخطوة.`;
  const jsonld = { "@context": "https://schema.org", "@type": "WebSite", name: SITE, description, inLanguage: "ar" };
  if (siteUrl) jsonld.url = absUrl("");
  return `${head({ title: `${SITE} | ${config.tagline} — أدوات مجانية للطلاب`, description, path: "", root: "", jsonld }).replace(/href="(?:\.\.\/\.\.\/)?(vendor|assets)/g, 'href="$1')}
<body>
${header("", null)}
<main id="main"><div class="wrap">
<div class="hero">
<h1 class="brand-h1"><span class="logo-lg" aria-hidden="true">∑</span>${esc(SITE)}</h1>
<p class="tagline">${esc(config.tagline || "")}</p>
<p class="lead">${live.length} أداة مجانية بالعربية، مع الشرح.</p>
<form id="home-search-form" class="search-big" role="search"><label class="sr-only" for="home-search">ابحث في كل الأدوات</label><input id="home-search" type="search" placeholder="🔍 ماذا تريد أن تحسب؟" autocomplete="off"></form>
<p id="search-count" class="search-count" role="status"></p>
<ul class="perks" aria-label="مزايا الموقع"><li>✅ مجاني</li><li>🔒 بلا تسجيل</li><li>🪜 حل خطوة بخطوة</li><li>📱 يعمل على الجوال</li></ul>
</div>
<section id="recent" class="recent" aria-labelledby="h-recent" hidden><h2 id="h-recent">🕘 استخدمتها مؤخراً</h2><ul class="chips"></ul></section>
<section id="browse" class="browse" aria-labelledby="h-browse"><h2 id="h-browse" class="sr-only">الأقسام</h2>
${catTiles(root)}
</section>
${adSlot("header")}
<div id="all-tools" hidden>
<h2 class="all-title" id="h-all">نتائج البحث</h2>
${sections}
</div>
</div></main>
${footer("")}
</body>
</html>
`;
}

function categoryPage(c) {
  const root = "../../";
  const list = live.filter((t) => t.category === c.slug);
  const description = `${c.title}: ${c.description}`;
  const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: c.title, description, inLanguage: "ar" };
  if (siteUrl) jsonld.url = absUrl(`category/${c.slug}/`);
  const others = categories.filter((o) => o.slug !== c.slug).map((o) => `<li><a class="g-${groupOf(o.slug)}" href="${root}category/${o.slug}/">${catIcon(o.slug, "ic chip-ic")}${esc(o.title)}</a></li>`).join("");
  return `${head({ title: `${c.title} | ${SITE}`, description, path: `category/${c.slug}/`, root, jsonld })}
<body>
${header(root, c.slug)}
<main id="main"><div class="wrap">
${crumbs(root, [{ title: SITE, href: root }, { title: c.title }])}
<div class="page-head g-${groupOf(c.slug)}"><span class="badge-ic">${catIcon(c.slug)}</span><div><h1>${esc(c.title)}</h1><p class="lead">${esc(c.description)} <span class="count-pill">${toolsWord(list.length)}</span></p></div></div>
${list.length ? `<ul class="tool-grid">${list.map((t) => toolCard(t, root)).join("")}</ul>` : `<p class="note">الأدوات في هذا التصنيف قيد الإعداد.</p>`}
<section class="related" aria-labelledby="h-other"><h2 id="h-other">🧭 أقسام أخرى</h2><ul class="chips">${others}</ul></section>
</div></main>
${footer(root)}
</body>
</html>
`;
}

function pendingPage(t) {
  const root = "../../";
  return `${head({ title: `${t.title} | ${SITE}`, description: `${t.title}: أداة قيد الإعداد.`, path: `tools/${t.slug}/`, root, noindex: true })}
<body>
${header(root, t.category)}
<main id="main"><div class="wrap"><h1>${esc(t.title)}</h1><p class="note">هذه الأداة قيد الإعداد.</p></div></main>
${footer(root)}
</body>
</html>
`;
}

const donate = donateInfo(config);

function supportPage() {
  const root = "../";
  const sections = [];
  if (donate.usdt) {
    sections.push(`<section class="card" aria-labelledby="h-usdt">
<h2 id="h-usdt">التبرع بعملة USDT</h2>
<p class="net-badge">الشبكة: <strong dir="ltr">TRON (TRC20)</strong> فقط</p>
<div class="pay-grid">
<figure class="qr-box">${qrSvg(donate.usdt, "رمز QR لعنوان محفظة USDT على شبكة TRC20")}<figcaption>امسح الرمز من تطبيق محفظتك</figcaption></figure>
<div class="addr-box">
<label for="usdt-address">عنوان المحفظة</label>
<input id="usdt-address" class="addr" type="text" dir="ltr" readonly value="${esc(donate.usdt)}">
<div class="actions"><button class="btn primary" type="button" data-copy="usdt-address">نسخ العنوان</button><span class="copied" role="status" data-copy-status="usdt-address"></span></div>
</div>
</div>
<p class="note warn"><strong>مهم:</strong> أرسل عملة <strong>USDT</strong> على شبكة <strong dir="ltr">TRON (TRC20)</strong> فقط. الإرسال بعملة أخرى أو على شبكة أخرى (مثل BEP20 أو ERC20) قد يؤدي إلى ضياع المبلغ نهائياً.</p>
<h3>كيف أتبرع من Binance؟</h3>
<ol class="steps">
<li>افتح <strong>Wallets</strong> ثم <strong>Withdraw</strong> (سحب) واختر <strong>USDT</strong>.</li>
<li>الصق العنوان أعلاه أو امسح رمز QR.</li>
<li>اختر الشبكة <strong dir="ltr">TRX – Tron (TRC20)</strong>.</li>
<li>أدخل المبلغ وتحقق من العنوان ثم أكّد.</li>
</ol>
<p class="help">الخطوات مشابهة في أي محفظة أو منصة أخرى: المهم العملة USDT والشبكة TRC20.</p>
</section>`);
  }
  if (donate.payId) {
    sections.push(`<section class="card" aria-labelledby="h-pay">
<h2 id="h-pay">Binance Pay</h2>
<p>إن كان لديك حساب Binance يمكنك التحويل مجاناً وفوراً عبر Binance Pay إلى المعرّف:</p>
<div class="addr-box"><label for="pay-id">Binance Pay ID</label><input id="pay-id" class="addr" type="text" dir="ltr" readonly value="${esc(donate.payId)}">
<div class="actions"><button class="btn" type="button" data-copy="pay-id">نسخ المعرّف</button><span class="copied" role="status" data-copy-status="pay-id"></span></div></div>
</section>`);
  }
  if (donate.url) {
    sections.push(`<section class="card" aria-labelledby="h-link"><h2 id="h-link">طريقة أخرى</h2><p><a class="btn" href="${esc(donate.url)}" target="_blank" rel="noopener noreferrer">صفحة التبرع<span class="sr-only"> (يفتح في نافذة جديدة)</span></a></p></section>`);
  }
  const description = `ادعم ${SITE}: موقع أدوات علمية وهندسية مجاني بالعربية. يمكنك التبرع بعملة USDT على شبكة TRC20.`;
  return `${head({ title: `ادعم الموقع | ${SITE}`, description, path: "support/", root, jsonld: { "@context": "https://schema.org", "@type": "WebPage", name: "ادعم الموقع", description, inLanguage: "ar" } })}
<body>
${header(root, null)}
<main id="main"><div class="wrap">
${crumbs(root, [{ title: SITE, href: root }, { title: "ادعم الموقع" }])}
<h1>ادعم ${esc(SITE)}</h1>
<p class="lead">${esc(donate.text)}</p>
${sections.join("\n")}
<section class="card" aria-labelledby="h-notes"><h2 id="h-notes">ملاحظات</h2>
<p>شكراً لك! كل تبرع، مهما كان صغيراً، يساعد على إبقاء الموقع مجانياً وإضافة أدوات جديدة.</p>
<p class="help">التحويلات بالعملات الرقمية لا يمكن استرجاعها، وتظهر علناً على سلسلة الكتل. تأكد من العنوان والشبكة قبل الإرسال.</p>
</section>
</div></main>
${footer(root)}
</body>
</html>
`;
}

function aboutPage() {
  const root = "../";
  const a = author;
  const repo = a.github ? `${a.github.replace(/\/+$/, "")}/engineering-tools-ar` : "";
  const description = `${SITE}: موقع أدوات علمية وهندسية مجاني بالعربية من تطوير ${a.name}. تعرّف على الموقع وتواصل معي.`;
  const jsonld = { "@context": "https://schema.org", "@type": "AboutPage", name: `عن ${SITE}`, inLanguage: "ar", about: { "@type": "Person", name: a.nameEn || a.name, alternateName: a.name, jobTitle: a.role, ...(a.github ? { sameAs: [a.github] } : {}) } };
  const initial = [...a.name.trim()][0];
  const groups = GROUPS.map((g) => `<li class="g-${g.id}"><b>${esc(g.title)}</b>: ${g.cats.map((s) => categories.find((c) => c.slug === s)).filter((c) => c && countOf(c.slug)).map((c) => esc(c.title)).join("، ")}.</li>`).join("");
  return `${head({ title: `عن الموقع والتواصل | ${SITE}`, description, path: "about/", root, jsonld })}
<body>
${header(root, null)}
<main id="main"><div class="wrap">
${crumbs(root, [{ title: SITE, href: root }, { title: "عن الموقع والتواصل" }])}
<section class="profile card">
<div class="avatar" aria-hidden="true">${esc(initial)}</div>
<div class="profile-body">
<h1>${esc(a.name)}${a.nameEn ? ` <small dir="ltr">${esc(a.nameEn)}</small>` : ""}</h1>
<p class="role">${esc(a.role || "")}</p>
<p>${esc(a.bio || "")}</p>
<div class="contact-row">
${a.email ? `<a class="btn primary contact-btn email-btn" href="#" data-u="${esc([...a.email.split("@")[0]].reverse().join(""))}" data-d="${esc([...a.email.split("@")[1]].reverse().join(""))}">✉ راسلني عبر البريد</a>` : ""}
${a.github ? `<a class="btn contact-btn" href="${esc(a.github)}" rel="noopener" target="_blank">GitHub</a>` : ""}
</div>
${a.email ? `<p class="email-line">البريد: ${emailHtml(a.email)}</p>` : ""}
<p class="help">يسعدني تواصلك للاقتراحات، أو الإبلاغ عن خطأ في أداة، أو اقتراح أداة جديدة، أو للتعاون في مشاريع البرمجة والأدوات التعليمية.</p>
</div>
</section>
<section class="card" aria-labelledby="h-site"><h2 id="h-site">عن ${esc(SITE)}</h2>
<ul class="stats"><li><b>${live.length}</b> أداة</li><li><b>${categories.filter((c) => countOf(c.slug)).length}</b> قسماً</li><li><b>100%</b> مجاني</li><li><b>0</b> تتبع</li></ul>
<p>موقع عربي مجاني يجمع أدوات حساب لطلاب الهندسة والعلوم وكل التخصصات الجامعية. كل أداة تعرض القانون المستخدم، والحل المفصّل خطوة بخطوة، ومثالاً محلولاً، ويمكن نسخ نتيجتها أو مشاركة رابطها.</p>
<ul class="group-list">${groups}</ul>
</section>
<section class="card" aria-labelledby="h-how"><h2 id="h-how">كيف بُني الموقع</h2>
<ul class="features">
<li><b>يعمل بالكامل في متصفحك:</b> كل الحسابات تجري على جهازك، فلا تُرسل مدخلاتك إلى أي خادم.</li>
<li><b>بلا حسابات ولا تتبع:</b> لا ملفات تعريف ارتباط، ولا أدوات تحليل، ولا إعلانات مزعجة.</li>
<li><b>دقة مختبرة آلياً:</b> لكل أداة اختبارات تتحقق من نتائجها بقيم مرجعية معروفة، واختبارات متصفح تتحقق من عمل كل صفحة على الحاسوب والجوال.</li>
<li><b>تقنيات مفتوحة:</b> HTML و CSS و JavaScript دون أطر ثقيلة، و KaTeX لعرض المعادلات${repo ? `، والشيفرة المصدرية متاحة على <a href="${esc(repo)}" rel="noopener" target="_blank">GitHub</a>` : ""}.</li>
</ul>
</section>
${donate.enabled ? `<p class="center"><a class="donate-top" href="${root}support/"><span class="heart" aria-hidden="true">♥</span> ${esc(donate.label || "ادعم الموقع")}</a></p>` : ""}
</div></main>
${footer(root)}
</body>
</html>
`;
}

function notFoundPage() {
  const base = config.basePath ? JSON.stringify(config.basePath) : "null";
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>الصفحة غير موجودة | ${esc(SITE)}</title>
<meta name="description" content="الصفحة المطلوبة غير موجودة في ${esc(SITE)}.">
<meta name="robots" content="noindex">
<link rel="icon" href="data:,">
<style>
:root{--bg:#f7f8fa;--text:#1a1f29;--muted:#545e6e;--accent:#0b5cad;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f1318;--text:#e7ebf0;--muted:#a5afbd;--accent:#6cb2f5;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0f1318;--text:#e7ebf0;--muted:#a5afbd;--accent:#6cb2f5;color-scheme:dark}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,"Segoe UI",Tahoma,sans-serif;line-height:1.7}
main{max-width:640px;margin:0 auto;padding:48px 16px}
a{color:var(--accent);font-weight:600}
p{color:var(--muted)}
</style>
</head>
<body>
<main>
<h1>الصفحة غير موجودة</h1>
<p>ربما تغيّر الرابط أو كُتب بشكل غير صحيح.</p>
<p><a id="home-link" href="./">العودة إلى كل الأدوات في ${esc(SITE)}</a></p>
</main>
<script>
(function(){var b=${base};if(!b){var s=location.pathname.split("/").filter(Boolean);b=/\\.github\\.io$/.test(location.hostname)&&s.length>1?"/"+s[0]+"/":"/";}document.getElementById("home-link").setAttribute("href",b);try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}})();
</script>
</body>
</html>
`;
}

function sitemap() {
  const paths = ["", ...categories.map((c) => `category/${c.slug}/`), ...live.map((t) => `tools/${t.slug}/`), ...(donate.enabled ? ["support/"] : []), ...(author ? ["about/"] : [])];
  const loc = (p) => (siteUrl ? `${siteUrl}/${p}` : p || "./");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(loc(p))}</loc></url>`).join("\n")}
</urlset>
`;
}

function robots() {
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ""}`;
}

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b5cad"/><path d="M14 44 L26 20 L38 44 M20 34 H32 M42 20 V44 M42 20 H52 M42 32 H50" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;

write("index.html", homePage());
for (const c of categories) write(`category/${c.slug}/index.html`, categoryPage(c));
for (const t of tools) {
  const m = metas.get(t.slug);
  write(`tools/${t.slug}/index.html`, m ? toolPage(t, m) : pendingPage(t));
}
write("404.html", notFoundPage());
if (author) write("about/index.html", aboutPage());
if (donate.enabled) write("support/index.html", supportPage());
else if (existsSync(join(ROOT, "support", "index.html"))) {
  changed.push("support/index.html (removed)");
  if (!CHECK) rmSync(join(ROOT, "support"), { recursive: true, force: true });
}
write("sitemap.xml", sitemap());
write("robots.txt", robots());
write("assets/icon.svg", ICON);

if (CHECK) {
  if (changed.length) {
    console.error(`الصفحات غير محدّثة (${changed.length}): ${changed.slice(0, 10).join(", ")}`);
    process.exit(1);
  }
  console.log("كل الصفحات محدّثة.");
} else {
  console.log(`تم توليد الصفحات: ${changed.length} ملف تغيّر، ${live.length} أداة جاهزة من ${tools.length}.`);
}
