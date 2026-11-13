import { test } from "node:test";
import { assert, throwsInput, checkExample } from "../helpers.js";
import * as mod from "../../../lib/student/citation-generator.js";

test("المثال المحلول ورسالة الخطأ", () => checkExample(mod));

const base = { type: "book", authors: "", title: "", year: "2020", publisher: "", city: "", edition: "", journal: "", volume: "", issue: "", pages: "", site: "", url: "", accessed: "" };
const cite = (over) => mod.solve({ ...base, ...over }).results.map((r) => r.value);

test("كتاب بمؤلف واحد في الأنماط الثلاثة", () => {
  const [apa, ieee, mla] = cite({ authors: "Smith, John", title: "Engineering Basics", year: "2020", publisher: "Pearson" });
  assert.equal(apa, "Smith, J. (2020). Engineering Basics. Pearson.");
  assert.equal(ieee, "J. Smith, Engineering Basics. Pearson, 2020.");
  assert.equal(mla, "Smith, John. Engineering Basics. Pearson, 2020.");
});

test("كتاب بطبعة ومدينة ومؤلف بشرطة في اسمه", () => {
  const [apa, ieee, mla] = cite({ authors: "Lee, Mary-Anne", title: "Circuits", edition: "3", city: "London", publisher: "Wiley", year: "2018" });
  assert.equal(apa, "Lee, M.-A. (2018). Circuits (3rd ed.). Wiley.");
  assert.equal(ieee, "M.-A. Lee, Circuits, 3rd ed. London: Wiley, 2018.");
  assert.equal(mla, "Lee, Mary-Anne. Circuits. 3rd ed., Wiley, 2018.");
});

test("ثلاثة مؤلفين: APA بـ & وIEEE بـ and وMLA بـ et al.", () => {
  const authors = "Adams, Carl\nBrown, Eve\nChen, Li";
  const [apa, ieee, mla] = cite({ authors, title: "Networks", publisher: "Springer", year: "2015" });
  assert.equal(apa, "Adams, C., Brown, E., & Chen, L. (2015). Networks. Springer.");
  assert.equal(ieee, "C. Adams, E. Brown, and L. Chen, Networks. Springer, 2015.");
  assert.equal(mla, "Adams, Carl, et al. Networks. Springer, 2015.");
});

test("مقالة في دورية بمؤلفين", () => {
  const [apa, ieee, mla] = cite({ type: "journal", authors: "Smith, John Paul\nDoe, Ann", title: "Clean Data Methods", journal: "Data Science Review", volume: "12", issue: "3", pages: "45-67", year: "2019" });
  assert.equal(apa, "Smith, J. P., & Doe, A. (2019). Clean Data Methods. Data Science Review, 12(3), 45-67.");
  assert.equal(ieee, "J. P. Smith and A. Doe, \"Clean Data Methods,\" Data Science Review, vol. 12, no. 3, pp. 45-67, 2019.");
  assert.equal(mla, "Smith, John Paul, and Ann Doe. \"Clean Data Methods.\" Data Science Review, vol. 12, no. 3, 2019, pp. 45-67.");
});

test("موقع إلكتروني بلا مؤلف مع تاريخ الوصول", () => {
  const [apa, ieee, mla] = cite({ type: "website", title: "Intro to APIs", site: "Example Site", url: "https://example.com/api", year: "2021", accessed: "2024-03-05" });
  assert.equal(apa, "Intro to APIs (2021). Example Site. https://example.com/api");
  assert.equal(ieee, "\"Intro to APIs,\" Example Site, 2021. [Online]. Available: https://example.com/api (accessed Mar. 5, 2024).");
  assert.equal(mla, "\"Intro to APIs.\" Example Site, 2021, https://example.com/api. Accessed 5 Mar. 2024.");
});

test("رفض الحقول الناقصة أو المتعارضة", () => {
  const ok = { authors: "Smith, John", title: "Engineering Basics", publisher: "Pearson" };
  throwsInput(() => mod.solve({ ...base, ...ok, title: "" }), "title");
  throwsInput(() => mod.solve({ ...base, ...ok, publisher: "" }), "publisher");
  throwsInput(() => mod.solve({ ...base, ...ok, type: "website", url: "" }), "url");
  throwsInput(() => mod.solve({ ...base, ...ok, type: "journal", journal: "" }), "journal");
  throwsInput(() => mod.solve({ ...base, ...ok, year: "abc" }), "year");
  throwsInput(() => mod.solve({ ...base, ...ok, authors: ", John" }), "authors");
  throwsInput(() => mod.solve({ ...base, ...ok, type: "website", url: "https://x.y", accessed: "2024-02-30" }), "accessed");
  const many = Array.from({ length: 21 }, (_, i) => `Name${i}, A`).join("\n");
  throwsInput(() => mod.solve({ ...base, ...ok, authors: many }), "authors");
});
