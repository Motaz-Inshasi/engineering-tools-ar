import { initTheme } from "./theme.js";

initTheme();

if (document.body.dataset.tool) {
  import("./ui.js").then((m) => m.initTool());
}

for (const btn of document.querySelectorAll("[data-copy]")) {
  btn.addEventListener("click", async () => {
    const id = btn.dataset.copy;
    const field = document.getElementById(id);
    const status = document.querySelector(`[data-copy-status="${id}"]`);
    let ok = false;
    try {
      await navigator.clipboard.writeText(field.value);
      ok = true;
    } catch {
      field.focus();
      field.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
    }
    if (status) status.textContent = ok ? "تم النسخ" : "حدّد النص وانسخه يدوياً";
  });
}

const rev = (s) => [...(s || "")].reverse().join("");
for (const a of document.querySelectorAll("[data-u][data-d]")) {
  const mail = `${rev(a.dataset.u)}@${rev(a.dataset.d)}`;
  a.href = `mailto:${mail}`;
  const t = a.querySelector(".email-text");
  if (t) t.textContent = mail;
}

const recentEl = document.getElementById("recent");
if (recentEl) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem("recentTools") || "[]"); } catch { list = []; }
  list = Array.isArray(list) ? list.filter((x) => x && /^[a-z0-9-]+$/.test(x.slug) && typeof x.title === "string").slice(0, 8) : [];
  if (list.length) {
    const ul = recentEl.querySelector("ul");
    for (const x of list) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `tools/${x.slug}/`;
      a.textContent = x.title;
      li.appendChild(a);
      ul.appendChild(li);
    }
    recentEl.hidden = false;
  }
}

if (document.getElementById("home-search")) {
  import("./search.js").then((m) => m.initSearch());
}
