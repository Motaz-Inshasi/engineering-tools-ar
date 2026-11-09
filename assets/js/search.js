import { normalizeArabic, matches } from "../../lib/core/text.js";

export { normalizeArabic, matches };

export function initSearch() {
  const input = document.getElementById("home-search");
  const count = document.getElementById("search-count");
  const items = [...document.querySelectorAll("[data-search]")];
  const sections = [...document.querySelectorAll(".cat-section")];
  function run() {
    const q = input.value;
    let shown = 0;
    for (const li of items) {
      const ok = !q.trim() || matches(li.dataset.search, q);
      li.hidden = !ok;
      if (ok) shown++;
    }
    for (const s of sections) s.hidden = !s.querySelector("[data-search]:not([hidden])");
    count.textContent = q.trim() ? (shown ? `${shown} أداة مطابقة` : "لا توجد أداة مطابقة، جرّب كلمة أخرى") : "";
    try {
      const url = new URL(location.href);
      if (q.trim()) url.searchParams.set("q", q); else url.searchParams.delete("q");
      history.replaceState(null, "", url);
    } catch {}
  }
  const params = new URLSearchParams(location.search);
  if (params.get("q")) input.value = params.get("q");
  input.addEventListener("input", run);
  document.getElementById("home-search-form")?.addEventListener("submit", (e) => { e.preventDefault(); run(); });
  run();
}
