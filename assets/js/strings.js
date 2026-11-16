export const STRINGS = {"en":{"حدث خطأ غير متوقع أثناء الحساب. تحقّق من المدخلات وحاول مجدداً.":"An unexpected error occurred during the calculation. Check the inputs and try again.","تم نسخ رابط الحل بمدخلاتك":"The solution link with your inputs has been copied","تعذر النسخ، انسخ الرابط من شريط العنوان":"Copying failed. Copy the link from the address bar","تم النسخ":"Copied","تعذر النسخ، حدّد النص يدوياً":"Copying failed. Select the text manually","التبديل إلى الوضع الفاتح":"Switch to light mode","التبديل إلى الوضع الداكن":"Switch to dark mode","رسم بياني":"Graph","{0} أداة مطابقة":"{0} matching tools","لا توجد أداة مطابقة، جرّب كلمة أخرى":"No matching tool found. Try another word","حدّد النص وانسخه يدوياً":"Select the text and copy it manually"}};
export function t(s, ...args) {
  const d = STRINGS[document.documentElement.lang] || {};
  const out = d[s] || s;
  return out.replace(/\{(\d+)\}/g, (m, i) => (args[i] !== undefined ? String(args[i]) : m));
}
