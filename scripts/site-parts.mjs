const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function donateUrl(config) {
  const url = String(config?.donate?.url ?? "").trim();
  if (!url) return "";
  let u;
  try { u = new URL(url); } catch { throw new Error(`رابط التبرع غير صالح في site.config.json: ${url}`); }
  if (u.protocol !== "https:") throw new Error("رابط التبرع يجب أن يبدأ بـ https://");
  return u.href;
}

export function donateHtml(config) {
  const url = donateUrl(config);
  if (!url) return "";
  const label = config.donate.label || "ادعم الموقع";
  const text = config.donate.text || "";
  return `<a class="donate-top" href="${esc(url)}" target="_blank" rel="noopener noreferrer"${text ? ` title="${esc(text)}"` : ""}><span class="heart" aria-hidden="true">♥</span> ${esc(label)}<span class="sr-only"> (يفتح في نافذة جديدة)</span></a>`;
}
