export function normalizeArabic(s) {
  return String(s)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function matches(haystack, query) {
  const h = normalizeArabic(haystack);
  const words = normalizeArabic(query).split(" ").filter(Boolean);
  return words.every((w) => h.includes(w) || (w.startsWith("ال") && w.length > 3 && h.includes(w.slice(2))));
}
