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

if (document.getElementById("home-search")) {
  import("./search.js").then((m) => m.initSearch());
}
