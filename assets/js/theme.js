function current() {
  const t = document.documentElement.dataset.theme;
  if (t === "dark" || t === "light") return t;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function label(btn) {
  const dark = current() === "dark";
  btn.setAttribute("aria-label", dark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن");
  btn.setAttribute("aria-pressed", dark ? "true" : "false");
  btn.textContent = dark ? "☀" : "☾";
}

export function initTheme() {
  const btn = document.querySelector(".theme-toggle");
  if (!btn) return;
  label(btn);
  btn.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    label(btn);
  });
}
