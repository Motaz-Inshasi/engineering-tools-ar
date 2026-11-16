import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { donateHtml, donateInfo, qrSvg, verificationMeta, isolateLtr, emailHtml } from "./site-parts.mjs";
import { catIcon, GROUPS, groupOf, TOOL_SVG } from "./icons.mjs";
import { LANGS, RTL } from "./i18n.mjs";
import { existsSync as fileExists } from "node:fs";
const TOOL_EMOJI = fileExists(new URL("./tool-emoji.mjs", import.meta.url)) ? (await import("./tool-emoji.mjs")).TOOL_EMOJI : {};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const katex = require(join(ROOT, "vendor/katex/katex.min.js"));
const config = JSON.parse(readFileSync(join(ROOT, "site.config.json"), "utf8"));

const CHECK = process.argv.includes("--check");
const siteUrl = (config.siteUrl || "").replace(/\/+$/, "");
const changed = [];
const missingUi = new Map();

const NATIVE = { ar: "العربية", en: "English", fr: "Français", es: "Español", tr: "Türkçe", id: "Bahasa Indonesia", ur: "اردو", fa: "فارسی" };
const LOCALE = { ar: "ar_AR", en: "en_US", fr: "fr_FR", es: "es_ES", tr: "tr_TR", id: "id_ID", ur: "ur_PK", fa: "fa_IR" };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tex = (t, display = true) => katex.renderToString(t, { displayMode: display, throwOnError: true, output: "htmlAndMathml", strict: false });

function write(rel, content) {
  const p = join(ROOT, rel);
  const old = existsSync(p) ? readFileSync(p, "utf8") : null;
  if (old === content) return;
  changed.push(rel);
  if (CHECK) return;
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}

const readJson = (rel, def) => (existsSync(join(ROOT, rel)) ? JSON.parse(readFileSync(join(ROOT, rel), "utf8")) : def);
const released = readJson("i18n/released.json", {});
const activeLangs = ["ar", ...LANGS.filter((l) => (released[l] || []).length)];
const uiDicts = Object.fromEntries(LANGS.map((l) => [l, readJson(`i18n/${l}/ui.json`, {})]));

async function loadSite(lang) {
  const regFile = lang === "ar" ? "assets/js/registry.js" : `assets/js/registry.${lang}.js`;
  const { categories, tools } = await import(pathToFileURL(join(ROOT, regFile)).href);
  const libDir = lang === "ar" ? "lib" : `lib-${lang}`;
  const allowed = lang === "ar" ? null : new Set(released[lang] || []);
  const metas = new Map();
  for (const t of tools) {
    if (allowed && !allowed.has(t.category)) { metas.set(t.slug, null); continue; }
    const p = join(ROOT, libDir, t.category, `${t.slug}.js`);
    if (!existsSync(p) || readFileSync(p, "utf8").trim() === "") { metas.set(t.slug, null); continue; }
    const mod = await import(pathToFileURL(p).href);
    metas.set(t.slug, mod.meta || null);
  }
  return { categories, tools, metas, libDir };
}

const sites = {};
for (const lang of activeLangs) sites[lang] = await loadSite(lang);
const pagesOf = (lang) => {
  const s = sites[lang];
  const live = s.tools.filter((t) => s.metas.get(t.slug));
  const cats = s.categories.filter((c) => lang === "ar" || live.some((t) => t.category === c.slug));
  return new Set(["", ...cats.map((c) => `category/${c.slug}/`), ...live.map((t) => `tools/${t.slug}/`), ...(donateInfo(config).enabled ? ["support/"] : []), ...(config.author ? ["about/"] : [])]);
};
const pageSets = Object.fromEntries(activeLangs.map((l) => [l, pagesOf(l)]));
const prefixOf = (l) => (l === "ar" ? "" : `${l}/`);

function makeT(lang) {
  const dict = lang === "ar" ? null : uiDicts[lang];
  const T = (s, ...args) => {
    let out = s;
    if (dict) {
      if (typeof dict[s] === "string" && dict[s]) out = dict[s];
      else { if (!missingUi.has(lang)) missingUi.set(lang, new Set()); missingUi.get(lang).add(s); }
    }
    return args.length ? out.replace(/\{(\d+)\}/g, (m, i) => (args[Number(i)] !== undefined ? String(args[Number(i)]) : m)) : out;
  };
  const rules = lang === "ar" ? null : new Intl.PluralRules(lang);
  T.count = (key, arWord, n) => {
    if (lang === "ar") return arWord(n);
    const forms = dict && dict[`@${key}`];
    if (!forms) { if (!missingUi.has(lang)) missingUi.set(lang, new Set()); missingUi.get(lang).add(`@${key}`); return arWord(n); }
    return (forms[rules.select(n)] || forms.other).replace("{0}", n);
  };
  return T;
}

function buildLang(lang) {
  const { categories, tools, metas, libDir } = sites[lang];
  const T = makeT(lang);
  const TH = (s, ...html) => esc(T(s)).replace(/\{(\d+)\}/g, (m, i) => html[Number(i)] ?? m);
  const rtl = RTL.has(lang);
  const P = prefixOf(lang);
  const UP = lang === "ar" ? "" : "../";
  const SITE = T(config.siteName);
  const tagline = T(config.tagline);
  const sep = rtl ? "، " : ", ";
  const author = config.author ? { ...config.author, name: T(config.author.name), role: T(config.author.role || ""), bio: T(config.author.bio || "") } : null;
  const donateCfg = { ...config, donate: { ...(config.donate || {}), label: T(config.donate?.label || "ادعم الموقع"), text: config.donate?.text ? T(config.donate.text) : "" } };
  const donate = donateInfo(donateCfg);
  const live = tools.filter((t) => metas.get(t.slug));
  const catTitle = Object.fromEntries(categories.map((c) => [c.slug, c.title]));
  const visibleCats = categories.filter((c) => lang === "ar" || live.some((t) => t.category === c.slug));

  const inline = (text) => String(text).split(/(\$[^$]+\$)/g).map((p) => (p.length > 1 && p.startsWith("$") && p.endsWith("$") ? tex(p.slice(1, -1), false) : rtl ? isolateLtr(p) : esc(p))).join("");
  const absUrl = (path) => (siteUrl ? `${siteUrl}/${path}` : null);

  function alternates(path) {
    const links = activeLangs.filter((l) => pageSets[l].has(path)).map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(absUrl(prefixOf(l) + path) || prefixOf(l) + path)}">`);
    if (links.length < 2) return "";
    return links.join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${esc(absUrl(path) || path)}">\n`;
  }

  function langMenu(path, A) {
    const others = activeLangs.filter((l) => l !== lang);
    if (!others.length) return "";
    const items = activeLangs.map((l) => {
      const target = pageSets[l].has(path) ? path : "";
      return `<li><a href="${A}${prefixOf(l)}${target}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ""}>${esc(NATIVE[l])}</a></li>`;
    }).join("");
    return `<details class="lang-menu"><summary aria-label="${esc(T("اللغة"))}">🌐 <span>${esc(NATIVE[lang])}</span></summary><ul>${items}</ul></details>`;
  }

  function head({ title, description, path, root, jsonld, noindex }) {
    const A = root + UP;
    const url = absUrl(P + path);
    const canonical = url || "./";
    return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}${path === "" && lang === "ar" ? verificationMeta(config) : ""}<link rel="canonical" href="${esc(canonical)}">
${noindex ? "" : alternates(path)}<meta property="og:type" content="website">
<meta property="og:locale" content="${LOCALE[lang]}">
<meta property="og:site_name" content="${esc(SITE)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${url ? `<meta property="og:url" content="${esc(url)}">\n` : ""}<meta name="theme-color" content="#0b5cad">
<link rel="icon" href="${A}assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${A}vendor/katex/katex.min.css">
<link rel="stylesheet" href="${A}assets/css/main.css">
<script>try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}</script>
<script defer src="${A}vendor/katex/katex.min.js"></script>
<script type="module" src="${A}assets/js/app.js"></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>\n` : ""}</head>`;
  }

  function header(root, activeCat, path) {
    const A = root + UP;
    const nav = GROUPS.flatMap((g) => g.cats).map((slug) => visibleCats.find((c) => c.slug === slug)).filter(Boolean).map((c) => `<li><a class="g-${groupOf(c.slug)}" href="${root}category/${c.slug}/"${c.slug === activeCat ? ' aria-current="page"' : ""}>${catIcon(c.slug)}<span>${esc(c.title)}</span></a></li>`).join("");
    return `<a class="skip" href="#main">${esc(T("تخطَّ إلى المحتوى"))}</a>
<header class="site-header"><div class="wrap">
<a class="brand" href="${root}"><span class="logo" aria-hidden="true">∑</span><span class="brand-name">${esc(SITE)}</span></a>
<form class="search-mini" action="${root}" method="get" role="search"><label class="sr-only" for="site-q">${esc(T("ابحث عن أداة"))}</label><input id="site-q" name="q" type="search" placeholder="${esc(T("ابحث في {0} أداة…", live.length))}" autocomplete="off"></form>
${author ? `<a class="about-top" href="${root}about/">${esc(T("تواصل معي"))}</a>` : ""}${donateHtml(donateCfg, root)}${langMenu(path, A)}<button class="icon-btn theme-toggle" type="button" aria-label="${esc(T("تبديل الوضع الداكن"))}">☾</button>
</div></header>
<nav class="cats" aria-label="${esc(T("التصنيفات"))}"><ul>${nav}</ul></nav>`;
  }

  function footer(root) {
    return `<footer class="site-footer"><div class="wrap">
<p><strong>${esc(T("تنبيه:"))}</strong> ${esc(T("النتائج للاستخدام التعليمي فقط. تحقّق من النتائج الحرجة قبل الاعتماد عليها في التصميم أو التنفيذ."))}</p>
<p>${esc(T("{0} موقع مجاني بلا حسابات ولا ملفات تعريف ارتباط ولا تتبع.", SITE))} <a href="${root}">${esc(T("كل الأدوات"))}</a>${author ? ` · <a href="${root}about/">${esc(T("عن الموقع والتواصل"))}</a>` : ""}</p>
${author ? `<p>${esc(T("صُمّم وطُوّر بواسطة"))} <a href="${root}about/">${esc(author.name)}</a>${author.email ? ` · ${emailHtml(author.email)}` : ""}</p>` : ""}
<p>© 2026 ${esc(SITE)}. ${esc(T("جميع الحقوق محفوظة."))}</p>
</div></footer>`;
  }

  function adSlot(name) {
    if (!config.ads || !config.ads.enabled) return "";
    return `<div class="ad-slot" data-slot="${esc(name)}" aria-hidden="true"></div>`;
  }

  function crumbs(items) {
    return `<nav class="crumbs" aria-label="${esc(T("مسار التنقل"))}"><ol>${items.map((it, i) => (i === items.length - 1 ? `<li aria-current="page">${esc(it.title)}</li>` : `<li><a href="${it.href}">${esc(it.title)}</a></li>`)).join("")}</ol></nav>`;
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
      inLanguage: lang,
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
    }];
    const u = absUrl(`${P}tools/${t.slug}/`);
    if (u) {
      data[0].url = u;
      data.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE, item: absUrl(P) },
          { "@type": "ListItem", position: 2, name: catTitle[t.category], item: absUrl(`${P}category/${t.category}/`) },
          { "@type": "ListItem", position: 3, name: t.title, item: u }
        ]
      });
    }
    return data;
  }

  function toolPic(t, cls = "pic") {
    const e = TOOL_SVG[t.slug] || TOOL_EMOJI[t.slug];
    return e ? `<span class="${cls}" aria-hidden="true">${e}</span>` : `<span class="${cls}" aria-hidden="true">${catIcon(t.category)}</span>`;
  }

  function toolPage(t, meta) {
    const root = "../../";
    const path = `tools/${t.slug}/`;
    const formulas = (meta.formulas || []).map((f) => `<div class="formula">${f.label ? `<div class="formula-label">${inline(f.label)}</div>` : ""}${tex(f.tex)}</div>`).join("\n");
    const fields = meta.inputs.map(fieldHtml).join("\n");
    const rel = relatedFor(t, meta);
    const exampleNote = meta.example?.note ? `<p class="example-note">${inline(meta.example.note)}</p>` : "";
    return `${head({ title: `${t.title} | ${SITE}`, description: meta.description, path, root, jsonld: jsonldTool(t, meta) })}
<body data-tool="${t.slug}" data-category="${t.category}"${lang === "ar" ? "" : ` data-lib="${libDir}"`}>
${header(root, t.category, path)}
<main id="main"><div class="wrap">
${crumbs([{ title: SITE, href: root }, { title: catTitle[t.category], href: `${root}category/${t.category}/` }, { title: t.title }])}
<div class="page-head g-${groupOf(t.category)}"><a class="badge-ic" href="${root}category/${t.category}/" aria-label="${esc(catTitle[t.category])}" title="${esc(catTitle[t.category])}">${toolPic(t, "pic-lg")}</a><div><h1>${esc(t.title)}</h1>
<p class="lead clamp">${inline(meta.intro || meta.description)}</p></div></div>
${adSlot("header")}
${formulas ? `<details class="card formulas"><summary><h2 id="h-formulas">📘 ${esc(T("القانون المستخدم"))}</h2><span class="sum-hint">${esc(T("اضغط للعرض"))}</span></summary>
${formulas}
</details>` : ""}
<section class="card" aria-labelledby="h-inputs"><h2 id="h-inputs">✏️ ${esc(T("المدخلات"))}</h2>
<form id="tool-form" class="tool-form" novalidate>
${fields}
${exampleNote}
<div class="actions"><button class="btn primary" type="submit">${esc(meta.submitLabel || T("احسب"))}</button><button class="btn" type="button" id="example-btn">${esc(T("مثال محلول"))}</button><button class="btn" type="reset">${esc(T("مسح"))}</button><span class="live-hint" id="live-hint" hidden>⚡ ${esc(T("يتحدّث الناتج تلقائياً عند تعديل المدخلات"))}</span></div>
</form>
${meta.inputHelp ? `<p class="help">${inline(meta.inputHelp)}</p>` : ""}
</section>
<section id="output" class="card" aria-live="polite" tabindex="-1" hidden>
<div id="out-error" class="error" role="alert" hidden></div>
<div id="out-success" hidden>
<div class="out-head"><h2>✅ ${esc(T("النتيجة"))}</h2><div class="out-actions"><button class="btn" type="button" id="copy-btn">📋 ${esc(T("نسخ"))}</button><button class="btn" type="button" id="share-btn">🔗 ${esc(T("مشاركة"))}</button><button class="btn" type="button" id="print-btn">🖨️ ${esc(T("طباعة"))}</button> <span id="copy-status" class="copied" role="status"></span></div></div>
<dl id="out-results" class="results"></dl>
<div id="out-blocks"></div>
<div id="steps-wrap"><h2>🪜 ${esc(T("الحل خطوة بخطوة"))}</h2><ol id="out-steps" class="steps"></ol></div>
</div>
</section>
<noscript><p class="note warn">${esc(T("هذه الأداة تحتاج تفعيل JavaScript لإجراء الحسابات."))}</p></noscript>
${adSlot("inContent")}
${meta.notes ? `<section class="card" aria-labelledby="h-notes"><h2 id="h-notes">${esc(T("ملاحظات"))}</h2>${meta.notes.map((n) => `<p>${inline(n)}</p>`).join("")}</section>` : ""}
${rel.length ? `<section class="related" aria-labelledby="h-related"><h2 id="h-related">🔗 ${esc(T("أدوات ذات صلة"))}</h2><ul class="chips">${rel.map((r) => `<li><a href="${root}tools/${r.slug}/">${toolPic(r, "pic-sm")}${esc(r.title)}</a></li>`).join("")}</ul></section>` : ""}
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

  const countOf = (slug) => live.filter((t) => t.category === slug).length;
  const toolsWord = (n) => T.count("tools", (k) => (k === 1 ? "أداة واحدة" : k === 2 ? "أداتان" : k <= 10 ? `${k} أدوات` : `${k} أداة`), n);

  function catTiles(root) {
    return GROUPS.map((g) => {
      const cats = g.cats.map((slug) => visibleCats.find((c) => c.slug === slug)).filter((c) => c && countOf(c.slug));
      if (!cats.length) return "";
      return `<section class="group g-${g.id}" aria-labelledby="grp-${g.id}"><h3 id="grp-${g.id}">${esc(T(g.title))}</h3><ul class="cat-tiles">${cats.map((c) => `<li><a href="${root}category/${c.slug}/"><span class="tile-ic">${catIcon(c.slug)}</span><span class="tile-t">${esc(c.title)}</span><span class="tile-n">${toolsWord(countOf(c.slug))}</span></a></li>`).join("")}</ul></section>`;
    }).filter(Boolean).join("\n");
  }

  function homePage() {
    const root = "";
    const order = GROUPS.flatMap((g) => g.cats).map((s) => visibleCats.find((c) => c.slug === s)).filter(Boolean);
    const sections = order.map((c) => {
      const list = live.filter((t) => t.category === c.slug);
      if (!list.length) return "";
      return `<section class="cat-section g-${groupOf(c.slug)}" aria-labelledby="cat-${c.slug}"><h2 id="cat-${c.slug}"><a href="category/${c.slug}/">${catIcon(c.slug, "ic h-ic")}${esc(c.title)}</a></h2><ul class="tool-grid">${list.map((t) => toolCard(t, root)).join("")}</ul></section>`;
    }).join("\n");
    const description = T("{0} أداة مجانية بالعربية لطلاب الهندسة والعلوم والجامعة: رياضيات ودوائر وإلكترونيات، فيزياء وكيمياء وأحياء، إحصاء، طب وصيدلة، اقتصاد، حاسوب وشبكات، عمارة وبيئة، مع الحل خطوة بخطوة.", live.length);
    const jsonld = { "@context": "https://schema.org", "@type": "WebSite", name: SITE, description, inLanguage: lang };
    if (siteUrl) jsonld.url = absUrl(P);
    let h = head({ title: `${SITE} | ${tagline} — ${T("أدوات مجانية للطلاب")}`, description, path: "", root: "", jsonld });
    if (lang === "ar") h = h.replace(/href="(?:\.\.\/\.\.\/)?(vendor|assets)/g, 'href="$1');
    return `${h}
<body>
${header("", null, "")}
<main id="main"><div class="wrap">
<div class="hero">
<h1 class="brand-h1"><span class="logo-lg" aria-hidden="true">∑</span>${esc(SITE)}</h1>
<p class="tagline">${esc(tagline || "")}</p>
<p class="lead">${esc(T("{0} أداة مجانية بالعربية، مع الشرح.", live.length))}</p>
<form id="home-search-form" class="search-big" role="search"><label class="sr-only" for="home-search">${esc(T("ابحث في كل الأدوات"))}</label><input id="home-search" type="search" placeholder="🔍 ${esc(T("ماذا تريد أن تحسب؟"))}" autocomplete="off"></form>
<p id="search-count" class="search-count" role="status"></p>
<ul class="perks" aria-label="${esc(T("مزايا الموقع"))}"><li>✅ ${esc(T("مجاني"))}</li><li>🔒 ${esc(T("بلا تسجيل"))}</li><li>🪜 ${esc(T("حل خطوة بخطوة"))}</li><li>📱 ${esc(T("يعمل على الجوال"))}</li></ul>
</div>
<section id="recent" class="recent" aria-labelledby="h-recent" hidden><h2 id="h-recent">🕘 ${esc(T("استخدمتها مؤخراً"))}</h2><ul class="chips"></ul></section>
<section id="browse" class="browse" aria-labelledby="h-browse"><h2 id="h-browse" class="sr-only">${esc(T("الأقسام"))}</h2>
${catTiles(root)}
</section>
${adSlot("header")}
<div id="all-tools" hidden>
<h2 class="all-title" id="h-all">${esc(T("نتائج البحث"))}</h2>
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
    const path = `category/${c.slug}/`;
    const list = live.filter((t) => t.category === c.slug);
    const description = `${c.title}: ${c.description}`;
    const jsonld = { "@context": "https://schema.org", "@type": "CollectionPage", name: c.title, description, inLanguage: lang };
    if (siteUrl) jsonld.url = absUrl(P + path);
    const others = visibleCats.filter((o) => o.slug !== c.slug).map((o) => `<li><a class="g-${groupOf(o.slug)}" href="${root}category/${o.slug}/">${catIcon(o.slug, "ic chip-ic")}${esc(o.title)}</a></li>`).join("");
    return `${head({ title: `${c.title} | ${SITE}`, description, path, root, jsonld })}
<body>
${header(root, c.slug, path)}
<main id="main"><div class="wrap">
${crumbs([{ title: SITE, href: root }, { title: c.title }])}
<div class="page-head g-${groupOf(c.slug)}"><span class="badge-ic">${catIcon(c.slug)}</span><div><h1>${esc(c.title)}</h1><p class="lead">${esc(c.description)} <span class="count-pill">${toolsWord(list.length)}</span></p></div></div>
${list.length ? `<ul class="tool-grid">${list.map((t) => toolCard(t, root)).join("")}</ul>` : `<p class="note">${esc(T("الأدوات في هذا التصنيف قيد الإعداد."))}</p>`}
${others ? `<section class="related" aria-labelledby="h-other"><h2 id="h-other">🧭 ${esc(T("أقسام أخرى"))}</h2><ul class="chips">${others}</ul></section>` : ""}
</div></main>
${footer(root)}
</body>
</html>
`;
  }

  function pendingPage(t) {
    const root = "../../";
    const path = `tools/${t.slug}/`;
    return `${head({ title: `${t.title} | ${SITE}`, description: `${t.title}: ${T("أداة قيد الإعداد.")}`, path, root, noindex: true })}
<body>
${header(root, t.category, path)}
<main id="main"><div class="wrap"><h1>${esc(t.title)}</h1><p class="note">${esc(T("هذه الأداة قيد الإعداد."))}</p></div></main>
${footer(root)}
</body>
</html>
`;
  }

  function supportPage() {
    const root = "../";
    const path = "support/";
    const sections = [];
    if (donate.usdt) {
      sections.push(`<section class="card" aria-labelledby="h-usdt">
<h2 id="h-usdt">${esc(T("التبرع بعملة USDT"))}</h2>
<p class="net-badge">${esc(T("الشبكة:"))} <strong dir="ltr">TRON (TRC20)</strong> ${esc(T("فقط"))}</p>
<div class="pay-grid">
<figure class="qr-box">${qrSvg(donate.usdt, T("رمز QR لعنوان محفظة USDT على شبكة TRC20"))}<figcaption>${esc(T("امسح الرمز من تطبيق محفظتك"))}</figcaption></figure>
<div class="addr-box">
<label for="usdt-address">${esc(T("عنوان المحفظة"))}</label>
<input id="usdt-address" class="addr" type="text" dir="ltr" readonly value="${esc(donate.usdt)}">
<div class="actions"><button class="btn primary" type="button" data-copy="usdt-address">${esc(T("نسخ العنوان"))}</button><span class="copied" role="status" data-copy-status="usdt-address"></span></div>
</div>
</div>
<p class="note warn"><strong>${esc(T("مهم:"))}</strong> ${TH("أرسل عملة {0} على شبكة {1} فقط. الإرسال بعملة أخرى أو على شبكة أخرى (مثل BEP20 أو ERC20) قد يؤدي إلى ضياع المبلغ نهائياً.", "<strong>USDT</strong>", '<strong dir="ltr">TRON (TRC20)</strong>')}</p>
<h3>${esc(T("كيف أتبرع من Binance؟"))}</h3>
<ol class="steps">
<li>${TH("افتح {0} ثم {1} (سحب) واختر {2}.", "<strong>Wallets</strong>", "<strong>Withdraw</strong>", "<strong>USDT</strong>")}</li>
<li>${esc(T("الصق العنوان أعلاه أو امسح رمز QR."))}</li>
<li>${TH("اختر الشبكة {0}.", '<strong dir="ltr">TRX – Tron (TRC20)</strong>')}</li>
<li>${esc(T("أدخل المبلغ وتحقق من العنوان ثم أكّد."))}</li>
</ol>
<p class="help">${esc(T("الخطوات مشابهة في أي محفظة أو منصة أخرى: المهم العملة USDT والشبكة TRC20."))}</p>
</section>`);
    }
    if (donate.payId) {
      sections.push(`<section class="card" aria-labelledby="h-pay">
<h2 id="h-pay">Binance Pay</h2>
<p>${esc(T("إن كان لديك حساب Binance يمكنك التحويل مجاناً وفوراً عبر Binance Pay إلى المعرّف:"))}</p>
<div class="addr-box"><label for="pay-id">Binance Pay ID</label><input id="pay-id" class="addr" type="text" dir="ltr" readonly value="${esc(donate.payId)}">
<div class="actions"><button class="btn" type="button" data-copy="pay-id">${esc(T("نسخ المعرّف"))}</button><span class="copied" role="status" data-copy-status="pay-id"></span></div></div>
</section>`);
    }
    if (donate.url) {
      sections.push(`<section class="card" aria-labelledby="h-link"><h2 id="h-link">${esc(T("طريقة أخرى"))}</h2><p><a class="btn" href="${esc(donate.url)}" target="_blank" rel="noopener noreferrer">${esc(T("صفحة التبرع"))}<span class="sr-only"> ${esc(T("(يفتح في نافذة جديدة)"))}</span></a></p></section>`);
    }
    const description = T("ادعم {0}: موقع أدوات علمية وهندسية مجاني بالعربية. يمكنك التبرع بعملة USDT على شبكة TRC20.", SITE);
    const support = T("ادعم الموقع");
    return `${head({ title: `${support} | ${SITE}`, description, path, root, jsonld: { "@context": "https://schema.org", "@type": "WebPage", name: support, description, inLanguage: lang } })}
<body>
${header(root, null, path)}
<main id="main"><div class="wrap">
${crumbs([{ title: SITE, href: root }, { title: support }])}
<h1>${esc(T("ادعم {0}", SITE))}</h1>
<p class="lead">${esc(donate.text)}</p>
${sections.join("\n")}
<section class="card" aria-labelledby="h-notes"><h2 id="h-notes">${esc(T("ملاحظات"))}</h2>
<p>${esc(T("شكراً لك! كل تبرع، مهما كان صغيراً، يساعد على إبقاء الموقع مجانياً وإضافة أدوات جديدة."))}</p>
<p class="help">${esc(T("التحويلات بالعملات الرقمية لا يمكن استرجاعها، وتظهر علناً على سلسلة الكتل. تأكد من العنوان والشبكة قبل الإرسال."))}</p>
</section>
</div></main>
${footer(root)}
</body>
</html>
`;
  }

  function aboutPage() {
    const root = "../";
    const path = "about/";
    const a = author;
    const repo = a.github ? `${a.github.replace(/\/+$/, "")}/engineering-tools-ar` : "";
    const description = T("{0}: موقع أدوات علمية وهندسية مجاني بالعربية من تطوير {1}. تعرّف على الموقع وتواصل معي.", SITE, a.name);
    const jsonld = { "@context": "https://schema.org", "@type": "AboutPage", name: T("عن {0}", SITE), inLanguage: lang, about: { "@type": "Person", name: a.nameEn || a.name, alternateName: config.author.name, jobTitle: a.role, ...(a.github ? { sameAs: [a.github] } : {}) } };
    const initial = [...a.name.trim()][0];
    const groups = GROUPS.map((g) => {
      const cats = g.cats.map((s) => visibleCats.find((c) => c.slug === s)).filter((c) => c && countOf(c.slug));
      return cats.length ? `<li class="g-${g.id}"><b>${esc(T(g.title))}</b>: ${cats.map((c) => esc(c.title)).join(sep)}.</li>` : "";
    }).join("");
    const aboutTitle = T("عن الموقع والتواصل");
    return `${head({ title: `${aboutTitle} | ${SITE}`, description, path, root, jsonld })}
<body>
${header(root, null, path)}
<main id="main"><div class="wrap">
${crumbs([{ title: SITE, href: root }, { title: aboutTitle }])}
<section class="profile card">
<div class="avatar" aria-hidden="true">${esc(initial)}</div>
<div class="profile-body">
<h1>${esc(a.name)}${a.nameEn && a.nameEn !== a.name ? ` <small dir="ltr">${esc(a.nameEn)}</small>` : ""}</h1>
<p class="role">${esc(a.role || "")}</p>
<p>${esc(a.bio || "")}</p>
<div class="contact-row">
${a.email ? `<a class="btn primary contact-btn email-btn" href="#" data-u="${esc([...a.email.split("@")[0]].reverse().join(""))}" data-d="${esc([...a.email.split("@")[1]].reverse().join(""))}">✉ ${esc(T("راسلني عبر البريد"))}</a>` : ""}
${a.github ? `<a class="btn contact-btn" href="${esc(a.github)}" rel="noopener" target="_blank">GitHub</a>` : ""}
</div>
${a.email ? `<p class="email-line">${esc(T("البريد:"))} ${emailHtml(a.email)}</p>` : ""}
<p class="help">${esc(T("يسعدني تواصلك للاقتراحات، أو الإبلاغ عن خطأ في أداة، أو اقتراح أداة جديدة، أو للتعاون في مشاريع البرمجة والأدوات التعليمية."))}</p>
</div>
</section>
<section class="card" aria-labelledby="h-site"><h2 id="h-site">${esc(T("عن {0}", SITE))}</h2>
<ul class="stats"><li><b>${live.length}</b> ${esc(T("أداة"))}</li><li><b>${visibleCats.filter((c) => countOf(c.slug)).length}</b> ${esc(T("قسماً"))}</li><li><b>100%</b> ${esc(T("مجاني"))}</li><li><b>0</b> ${esc(T("تتبع"))}</li></ul>
<p>${esc(T("موقع عربي مجاني يجمع أدوات حساب لطلاب الهندسة والعلوم وكل التخصصات الجامعية. كل أداة تعرض القانون المستخدم، والحل المفصّل خطوة بخطوة، ومثالاً محلولاً، ويمكن نسخ نتيجتها أو مشاركة رابطها."))}</p>
<ul class="group-list">${groups}</ul>
</section>
<section class="card" aria-labelledby="h-how"><h2 id="h-how">${esc(T("كيف بُني الموقع"))}</h2>
<ul class="features">
<li><b>${esc(T("يعمل بالكامل في متصفحك:"))}</b> ${esc(T("كل الحسابات تجري على جهازك، فلا تُرسل مدخلاتك إلى أي خادم."))}</li>
<li><b>${esc(T("بلا حسابات ولا تتبع:"))}</b> ${esc(T("لا ملفات تعريف ارتباط، ولا أدوات تحليل، ولا إعلانات مزعجة."))}</li>
<li><b>${esc(T("دقة مختبرة آلياً:"))}</b> ${esc(T("لكل أداة اختبارات تتحقق من نتائجها بقيم مرجعية معروفة، واختبارات متصفح تتحقق من عمل كل صفحة على الحاسوب والجوال."))}</li>
<li><b>${esc(T("تقنيات مفتوحة:"))}</b> ${esc(T("HTML و CSS و JavaScript دون أطر ثقيلة، و KaTeX لعرض المعادلات"))}${repo ? `${esc(T("، والشيفرة المصدرية متاحة على"))} <a href="${esc(repo)}" rel="noopener" target="_blank">GitHub</a>` : ""}.</li>
</ul>
</section>
${donate.enabled ? `<p class="center"><a class="donate-top" href="${root}support/"><span class="heart" aria-hidden="true">♥</span> ${esc(donate.label || T("ادعم الموقع"))}</a></p>` : ""}
</div></main>
${footer(root)}
</body>
</html>
`;
  }

  write(`${P}index.html`, homePage());
  for (const c of categories) {
    if (lang !== "ar" && !visibleCats.includes(c)) continue;
    write(`${P}category/${c.slug}/index.html`, categoryPage(c));
  }
  for (const t of tools) {
    const m = metas.get(t.slug);
    if (lang !== "ar" && !m) continue;
    write(`${P}tools/${t.slug}/index.html`, m ? toolPage(t, m) : pendingPage(t));
  }
  if (author) write(`${P}about/index.html`, aboutPage());
  if (donate.enabled) write(`${P}support/index.html`, supportPage());
  else if (existsSync(join(ROOT, P, "support", "index.html"))) {
    changed.push(`${P}support/index.html (removed)`);
    if (!CHECK) rmSync(join(ROOT, P, "support"), { recursive: true, force: true });
  }
  return { live, SITE };
}

function notFoundPage(SITE) {
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
  const loc = (p) => (siteUrl ? `${siteUrl}/${p}` : p || "./");
  const paths = activeLangs.flatMap((l) => [...pageSets[l]].map((p) => prefixOf(l) + p));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(loc(p))}</loc></url>`).join("\n")}
</urlset>
`;
}

function robots() {
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ""}`;
}

function clientStrings() {
  const keys = ["حدث خطأ غير متوقع أثناء الحساب. تحقّق من المدخلات وحاول مجدداً.", "تم نسخ رابط الحل بمدخلاتك", "تعذر النسخ، انسخ الرابط من شريط العنوان", "تم النسخ", "تعذر النسخ، حدّد النص يدوياً", "التبديل إلى الوضع الفاتح", "التبديل إلى الوضع الداكن", "رسم بياني", "{0} أداة مطابقة", "لا توجد أداة مطابقة، جرّب كلمة أخرى", "حدّد النص وانسخه يدوياً"];
  const table = {};
  for (const l of activeLangs.filter((x) => x !== "ar")) {
    const T = makeT(l);
    table[l] = Object.fromEntries(keys.map((k) => [k, T(k)]));
  }
  return `export const STRINGS = ${JSON.stringify(table)};\nexport function t(s, ...args) {\n  const d = STRINGS[document.documentElement.lang] || {};\n  const out = d[s] || s;\n  return out.replace(/\\{(\\d+)\\}/g, (m, i) => (args[i] !== undefined ? String(args[i]) : m));\n}\n`;
}

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b5cad"/><path d="M14 44 L26 20 L38 44 M20 34 H32 M42 20 V44 M42 20 H52 M42 32 H50" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
`;

let arInfo = null;
for (const lang of activeLangs) {
  const info = buildLang(lang);
  if (lang === "ar") arInfo = info;
}
for (const lang of LANGS.filter((l) => !activeLangs.includes(l))) {
  if (existsSync(join(ROOT, lang, "index.html"))) {
    changed.push(`${lang}/ (removed)`);
    if (!CHECK) rmSync(join(ROOT, lang), { recursive: true, force: true });
  }
}
write("404.html", notFoundPage(arInfo.SITE));
write("sitemap.xml", sitemap());
write("robots.txt", robots());
write("assets/icon.svg", ICON);
write("assets/js/strings.js", clientStrings());

const missingReport = [...missingUi].filter(([l]) => activeLangs.includes(l)).map(([l, s]) => `${l}: ${s.size}`);
if (missingReport.length) console.warn(`نصوص واجهة بلا ترجمة: ${missingReport.join("، ")}`);
if (process.argv.includes("--missing-ui")) {
  const out = {};
  for (const [l, s] of missingUi) out[l] = [...s];
  writeFileSync(join(ROOT, "i18n", "missing-ui.json"), JSON.stringify(out, null, 1) + "\n");
}

if (CHECK) {
  if (changed.length) {
    console.error(`الصفحات غير محدّثة (${changed.length}): ${changed.slice(0, 10).join(", ")}`);
    process.exit(1);
  }
  console.log("كل الصفحات محدّثة.");
} else {
  console.log(`تم توليد الصفحات: ${changed.length} ملف تغيّر، ${arInfo.live.length} أداة عربية، واللغات المفعّلة: ${activeLangs.join(", ")}.`);
}
