export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: نام غیر متعین ہے (name is not defined)",
    explain: "آپ نام {name} استعمال کر رہے ہیں، لیکن اس دائرے میں اس سے پہلے اس کی تعریف نہیں ہوئی، یا آپ نے اسے تعریف سے مختلف طریقے سے لکھا ہے۔",
    causes: ["متغیر کو کبھی کوئی قدر نہیں دی گئی۔", "نام میں املا کی غلطی۔", "متغیر کو اس کی تعریف سے پہلے یا اس فنکشن سے باہر استعمال کرنا جس میں وہ متعین ہوا تھا۔"],
    fixes: ["استعمال سے پہلے متغیر متعین کریں اور اسے قدر دیں۔", "نام حرف بہ حرف درست لکھیں، کیونکہ Python بڑے اور چھوٹے حروف میں فرق کرتا ہے۔"],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: نحو غلط ہے (invalid syntax)",
    explain: "Python کو ایسی جگہ پر لفظ یا علامت ملی جہاں زبان کے قواعد اجازت نہیں دیتے۔ اصل غلطی اکثر بتائی گئی سطر سے پہلے ہوتی ہے۔",
    causes: ["دو عناصر کے درمیان کوما، بریکٹ یا علامت لکھنا بھول جانا۔", "شرط کے اندر == کی جگہ = استعمال کرنا۔", "محفوظ لفظ کو متغیر کا نام بنانا۔"],
    fixes: ["بتائی گئی سطر اور اس سے پہلے کی سطر میں غائب بریکٹ یا کوما تلاش کریں۔", "مقابلے کے لیے == اور تفویض کے لیے = استعمال کریں۔"],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: ':' متوقع ہے (expected ':')",
    explain: "if یا for یا while یا def جیسے مرکب جملوں کو اپنی سطر کے آخر میں کولن : کی ضرورت ہوتی ہے۔",
    causes: ["شرط یا فنکشن کے نام کے بعد کولن : لکھنا بھول جانا۔"],
    fixes: ["انڈینٹ سے پہلے مرکب جملے کی سطر کے آخر میں : شامل کریں۔"],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: غیر بند اسٹرنگ (unterminated string literal)",
    explain: "آپ نے اقتباسی نشان سے اسٹرنگ شروع کیا لیکن اسی سطر میں بند نہیں کیا۔",
    causes: ["اسٹرنگ کے آخر میں اقتباسی نشان لکھنا بھول جانا۔", "شروع اور آخر کے لیے مختلف نشانات استعمال کرنا۔"],
    fixes: ["اسٹرنگ کو اسی نشان سے بند کریں جس سے شروع کیا تھا۔", "کثیر سطری متن کے لیے \"\"\" \"\"\" استعمال کریں۔"],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: سطر کا اختتام متن پڑھتے وقت (EOL while scanning)",
    explain: "Python سطر کے آخر تک پہنچ گیا جبکہ وہ ابھی تک ایک غیر بند اسٹرنگ پڑھ رہا تھا۔",
    causes: ["متن کے آخر میں اقتباسی نشان غائب ہے۔", "سطر کے آخر میں \\ علامت بند ہونے کو توڑ دیتی ہے۔"],
    fixes: ["مناسب بند کرنے والا اقتباسی نشان شامل کریں۔", "Python کو اپ ڈیٹ کریں، یا کثیر سطری متن کے لیے \"\"\" استعمال کریں۔"],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: فائل کا غیر متوقع اختتام (unexpected EOF)",
    explain: "فائل ختم ہو گئی جبکہ Python ابھی ایک جملہ مکمل ہونے کا انتظار کر رہا تھا، عموماً ایک بریکٹ یا فہرست جو بند نہیں ہوئی۔",
    causes: ["فہرست یا بریکٹ یا جملہ درمیان میں مکمل ہو گیا۔", "فائل کے آخری بریکٹ کو بند کرنا بھول جانا۔"],
    fixes: ["جملہ مکمل کریں اور تمام کھلے بریکٹس بند کریں۔", "فائل کی آخری سطر دیکھیں۔"],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: بریکٹ بند نہیں ہوا (was never closed)",
    explain: "آپ نے بریکٹ {br} کھولا لیکن اسے اس کے مقابل بریکٹ سے بند نہیں کیا۔",
    causes: ["بند کرنے والا بریکٹ لکھنا بھول جانا۔", "کسی غلط جگہ پر بند ہونے والا بریکٹ جو مترجم کو کسی اور بریکٹ کی تلاش میں ڈال دیتا ہے۔"],
    fixes: ["مناسب بند کرنے والا بریکٹ شامل کریں۔", "ایسا ایڈیٹر استعمال کریں جو مماثل بریکٹس کو رنگ دے۔"],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: فالتو بند کرنے والا بریکٹ (unmatched)",
    explain: "بند کرنے والا بریکٹ {br} ملا جس کا اس کے مقابل کھلنے والا بریکٹ موجود نہیں۔",
    causes: ["سطر کے آخر میں فالتو بریکٹ۔", "جملے کی شروعات میں کھلنے والا بریکٹ لکھنا بھول جانا۔"],
    fixes: ["فالتو بریکٹ حذف کریں۔", "یقینی بنائیں کہ ہر کھلنے والے بریکٹ کا بند کرنے والا بریکٹ موجود ہے۔"],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: غیر مجاز علامت (invalid character)",
    explain: "Python کو کوڈ میں ایک ایسی علامت ملی جو قبول نہیں ہوتی، عموماً عربی یا ذہین اقتباسی نشان جیسے “ ” یا کوئی عجیب حرف۔",
    causes: ["دستاویز سے کوڈ کاپی کرنے سے اقتباسی نشانات ذہین نشانات میں بدل جاتے ہیں۔", "لاطینی کی جگہ عربی کوما ، یا عربی نقطہ لکھنا۔"],
    fixes: ["ذہین اقتباسی نشانات کی جگہ عام \" یا ' لگائیں۔", "عربی کوما کی جگہ انگریزی کوما , لگائیں۔"],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: f-string میں غلطی",
    explain: "f-string کی ساخت درست نہیں: {detail}۔",
    causes: ["متن کے اندر { بند نہیں ہوا۔", "f-string کے اندر وہی اقتباسی نشان استعمال کرنا۔"],
    fixes: ["ہر { کو } سے بند کریں۔", "اظہار کے اندر مختلف اقتباسی نشان استعمال کریں، یا اپنے Python ورژن کے مطابق مناسب شکل اختیار کریں۔"],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: مستقل قدر کو تفویض ممکن نہیں (cannot assign to literal)",
    explain: "آپ نے کسی عدد یا اسٹرنگ کے مستقل کو قدر دینے کی کوشش کی، جبکہ تفویض کے لیے متغیر کا نام درکار ہے۔",
    causes: ["عدد یا اسٹرنگ کو غلطی سے تفویض کی جانب رکھ دیا گیا۔", "شرط میں == اور = کا خلط ملط ہونا۔"],
    fixes: ["متغیر کا نام = کی بائیں جانب رکھیں۔", "مقابلے کے وقت == استعمال کریں۔"],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: فنکشن کال کو تفویض ممکن نہیں (cannot assign to function call)",
    explain: "آپ نے تفویض کی بائیں جانب فنکشن کال رکھی ہے، جبکہ وہاں متغیر کا نام ہونا چاہیے۔",
    causes: ["تفویض کی بائیں جانب متغیر کے نام کے بعد () لکھنا۔", "== لکھنا بھول گئے اور شرط میں = لکھ دیا۔"],
    fixes: ["قدر کا حساب لگا کر اسے ایک متغیر میں رکھیں اور تفویض کریں۔", "مقابلے کے لیے == استعمال کریں۔"],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: print میں بریکٹس غائب ہیں (Missing parentheses)",
    explain: "آپ نے print کو Python 2 کے انداز میں بغیر بریکٹس کے لکھا، جبکہ Python 3 میں بریکٹس لازمی ہیں۔",
    causes: ["پرانی Python 2 مثال کاپی کرنا۔", "print کے بریکٹس لکھنا بھول جانا۔"],
    fixes: ["متن یا قدر کو print(...) کے بریکٹس میں رکھیں۔"],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: انڈینٹ شدہ بلاک متوقع ہے (expected an indented block)",
    explain: "پچھلی سطر کولن : پر ختم ہوتی ہے، اس لیے اس کے بعد اندر کی طرف انڈینٹ شدہ کوڈ آنا چاہیے، لیکن وہ انڈینٹ نہیں ہے۔",
    causes: ["if یا for یا def کے نیچے انڈینٹ لگانا بھول جانا۔", "کولن کے بعد بالکل خالی بلاک۔"],
    fixes: ["اگلی سطر کو چار اسپیسز سے انڈینٹ کریں۔", "اگر بلاک خالی ہے تو pass استعمال کریں۔"],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: غیر متوقع انڈینٹ (unexpected indent)",
    explain: "Python کو ایک سطر اندر کی طرف انڈینٹ ملی بغیر کسی وجہ کے، یعنی وہ کسی مرکب جملے کے بعد نہیں آتی۔",
    causes: ["سطر کے آغاز میں فالتو اسپیسز۔", "کسی دوسری جگہ سے مختلف انڈینٹ کے ساتھ کاپی کی گئی سطر۔"],
    fixes: ["سطر کے آغاز کی فالتو اسپیسز ہٹائیں۔", "یقینی بنائیں کہ ایک ہی سطح کی تمام سطریں ایک جیسا انڈینٹ رکھتی ہوں۔"],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: انڈینٹ کسی بیرونی سطح سے مطابقت نہیں رکھتا",
    explain: "اس سطر کا انڈینٹ کسی پچھلی انڈینٹ سطح کے برابر نہیں، اس لیے Python نہیں جانتا کہ یہ کہاں سے تعلق رکھتی ہے۔",
    causes: ["سطروں کے درمیان اسپیسز کی تعداد میں خلط ملط۔", "مختلف انڈینٹ کے ساتھ کوڈ کاپی کرنا۔"],
    fixes: ["کوڈ کی ہر سطح کے لیے اسپیسز کی مستقل تعداد رکھیں (4 اسپیسز)۔", "ایسا ایڈیٹر استعمال کریں جو اسپیسز دکھائے۔"],
    bad: `if x:
        a = 1
    b = 2`,
    good: `if x:
    a = 1
    b = 2`
  },
  {
    lang: "python", id: "py-tab-error",
    pattern: /TabError: inconsistent use of tabs and spaces/,
    title: "TabError: Tab اور اسپیسز کا خلط ملط",
    explain: "آپ نے انڈینٹ کے لیے کبھی Tab کی اور کبھی اسپیسز استعمال کیں، اور Python اس خلط کو قبول نہیں کرتا۔",
    causes: ["کچھ سطریں Tab سے اور کچھ اسپیسز سے شروع ہوتی ہیں۔", "ایڈیٹر کی ترتیبات Tab کو مختلف طریقے سے بدلتی ہیں۔"],
    fixes: ["صرف اسپیسز استعمال کریں (ہر سطح کے لیے 4 اسپیسز)۔", "ایڈیٹر میں Tab کو اسپیسز میں بدلنے کا آپشن فعال کریں۔"],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: نص کو کسی اور قسم کی قدر کے ساتھ جوڑا نہیں جا سکتا (can only concatenate str)",
    explain: "آپ نے + کے ذریعے نص کو {t} قسم کی قدر کے ساتھ جوڑنے کی کوشش کی، جبکہ Python اقسام کو خودکار طور پر تبدیل نہیں کرتا۔",
    causes: ["نص اور عدد کے درمیان + استعمال کرنا۔", "input() سے آنے والی قدر ہمیشہ نص ہوتی ہے۔"],
    fixes: ["عدد کو str() کے ذریعے نص میں بدلیں۔", "یا عدد کو f-string کے اندر رکھیں تو وہ خودکار طور پر نص بن جائے گا۔"],
    bad: `print("عمر: " + 20)`,
    good: `print("عمر: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: دو اقسام کے درمیان غیر معاون عمل (unsupported operand type(s))",
    explain: "آپریٹر {op} دونوں اقسام {a} اور {b} کو ایک ساتھ قبول نہیں کرتا۔",
    causes: ["حسابی عمل میں نص اور عدد۔", "حسابی عمل کے اندر None کی قدر۔"],
    fixes: ["int() یا float() سے نص کو عدد میں بدلیں۔", "حساب سے پہلے یقینی بنائیں کہ متغیرات عددی قدریں رکھتے ہیں۔"],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: NoneType کو انڈیکس نہیں کیا جا سکتا (not subscriptable)",
    explain: "متغیر کی قدر None ہے (یعنی کچھ نہیں)، اور آپ اس کے کسی عنصر تک [] کے ذریعے پہنچنے کی کوشش کر رہے ہیں۔",
    causes: ["فنکشن کچھ واپس نہیں کرتا کیونکہ اس میں return نہیں ہے۔", "متغیر کو قدر نہیں ملی یا وہ ایک ناکام عمل سے آیا۔"],
    fixes: ["یقینی بنائیں کہ فنکشن return کے ذریعے قدر واپس کرتا ہے۔", "انڈیکس کرنے سے پہلے تصدیق کریں کہ قدر None نہیں ہے۔"],
    bad: `def f():
    print(1)
x = f()
print(x[0])`,
    good: `def f():
    return [1]
x = f()
print(x[0])`
  },
  {
    lang: "python", id: "py-attribute-error",
    pattern: /AttributeError: '(?<type>[^']+)' object has no attribute '(?<attr>[^']+)'/,
    title: "AttributeError: خاصیت یا فنکشن موجود نہیں (has no attribute)",
    explain: "{type} قسم کے آبجیکٹ میں خاصیت یا فنکشن {attr} موجود نہیں ہے۔",
    causes: ["فنکشن یا خاصیت کا نام غلط لکھا گیا ہے۔", "کسی اور قسم کا فنکشن استعمال کرنا، جیسے نص پر append۔", "متغیر کی قدر None ہے۔"],
    fixes: ["type() سے آبجیکٹ کی قسم کی تصدیق کریں۔", "اس قسم کے دستیاب فنکشنز جاننے کے لیے اس کی دستاویزات دیکھیں۔"],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: آبجیکٹ فنکشن نہیں ہے (object is not callable)",
    explain: "آپ نے {t} قسم کی قدر کو فنکشن سمجھ کر () لگا کر بلانے کی کوشش کی۔",
    causes: ["قدر رکھنے والے متغیر کے نام کے بعد () لکھنا۔", "کسی داخلی فنکشن کا نام متغیر سے چھپا دینا، جیسے str = 5۔"],
    fixes: ["متغیر کا نام بدلیں تاکہ وہ داخلی فنکشن کے نام پر اثر انداز نہ ہو۔", "یقینی بنائیں کہ آپ واقعی ایک فنکشن بلا رہے ہیں۔"],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: فنکشن کال میں مطلوبہ پیرامیٹرز غائب ہیں (missing required positional argument)",
    explain: "فنکشن {fn} کو {n} اضافی پیرامیٹر چاہیے تھا جو آپ نے کال میں نہیں دیا۔",
    causes: ["فنکشن کو مطلوبہ پیرامیٹر دیے بغیر کال کرنا۔", "فنکشن کی تعریف ایسا پیرامیٹر مانگتی ہے جس کی آپ کو ضرورت نہیں۔"],
    fixes: ["کال کے وقت غائب قدریں دیں۔", "اگر پیرامیٹر اختیاری ہے تو فنکشن کی تعریف میں اس کی ڈیفالٹ قدر دیں۔"],
    bad: `def greet(name):
    print(name)
greet()`,
    good: `def greet(name):
    print(name)
greet("Ali")`
  },
  {
    lang: "python", id: "py-too-many-args",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) takes (?<n>\d+) positional arguments? but (?<m>\d+) (?:were|was) given/,
    title: "TypeError: فنکشن کال میں فالتو پیرامیٹرز (takes positional arguments but given)",
    explain: "فنکشن {fn} صرف {n} پیرامیٹرز قبول کرتا ہے، لیکن آپ نے {m} دیے۔",
    causes: ["تعریف کے پیرامیٹرز کی تعداد سے زیادہ قدریں دینا۔", "فنکشن کی تعریف میں وہ پیرامیٹر موجود نہیں جو آپ دے رہے ہیں۔"],
    fixes: ["کال سے فالتو قدریں ہٹائیں۔", "غائب پیرامیٹر فنکشن کی تعریف میں شامل کریں۔"],
    bad: `def f(a):
    return a
f(1, 2)`,
    good: `def f(a, b):
    return a + b
f(1, 2)`
  },
  {
    lang: "python", id: "py-not-iterable",
    pattern: /TypeError: '(?<t>[^']+)' object is not iterable/,
    title: "TypeError: آبجیکٹ قابلِ تکرار نہیں (object is not iterable)",
    explain: "آپ نے {t} قسم کی قدر پر for لوپ یا ان پیکنگ کے ذریعے گزرنے کی کوشش کی، اور یہ قسم قابلِ تکرار نہیں۔",
    causes: ["لوپ میں عدد کے ساتھ range() استعمال کرنا بھول گئے۔", "فنکشن کچھ واپس نہیں کرتا اس لیے نتیجہ None ہوتا ہے۔"],
    fixes: ["کسی عدد پر تکرار کے لیے range(n) استعمال کریں۔", "تکرار سے پہلے یقینی بنائیں کہ متغیر فہرست، نص یا سیٹ ہے۔"],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: فہرست کا انڈیکس عدد صحیح ہونا چاہیے (list indices)",
    explain: "فہرست کا انڈیکس عدد صحیح ہونا چاہیے، جبکہ آپ نے {t} قسم کی قدر استعمال کی۔",
    causes: ["انڈیکس کو '1' کی طرح نص کے طور پر لکھنا۔", "تقسیم / سے انڈیکس نکالنا، جس سے اعشاری عدد آتا ہے۔"],
    fixes: ["انڈیکس کے لیے بغیر اقتباسی نشان کا عدد صحیح استعمال کریں۔", "انڈیکس نکالتے وقت / کی جگہ // استعمال کریں۔"],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: نص کو عدد صحیح میں تبدیل نہیں کیا جا سکتا (invalid literal for int)",
    explain: "فنکشن int() متن '{v}' کو عدد صحیح میں تبدیل نہ کر سکا۔",
    causes: ["نص میں غیر عددی حروف یا علامات ہیں۔", "نص ایک اعشاری عدد ہے جیسے 3.5۔", "نص خالی ہے۔"],
    fixes: ["اعشاری اعداد کے لیے float() استعمال کریں۔", "تبدیلی سے پہلے ان پٹ جانچیں، یا try اور except استعمال کریں۔"],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: متغیرات سے زیادہ قدریں (too many values to unpack)",
    explain: "ان پیکنگ میں متغیرات کی تعداد صرف {n} ہے، جبکہ فہرست میں اس سے زیادہ قدریں ہیں۔",
    causes: ["متغیرات کے ناموں کی تعداد عناصر کی تعداد سے کم ہے۔", "فہرست توقع سے زیادہ لمبی ہے۔"],
    fixes: ["متغیرات کی تعداد بڑھائیں تاکہ عناصر کی تعداد کے برابر ہو جائے۔", "فالتو عناصر جمع کرنے کے لیے *rest استعمال کریں۔"],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: متغیرات سے کم قدریں (not enough values to unpack)",
    explain: "آپ قدروں کو {n} متغیرات میں ان پیک کرنے کی کوشش کر رہے ہیں، لیکن فہرست میں صرف {g} عنصر ہیں۔",
    causes: ["متغیرات کی تعداد عناصر کی تعداد سے زیادہ ہے۔", "فنکشن توقع سے کم عناصر واپس کرتا ہے۔"],
    fixes: ["متغیرات کی تعداد کم کریں تاکہ عناصر کی تعداد کے برابر ہو جائے۔", "ان پیک کرنے سے پہلے فہرست کی لمبائی جانچیں۔"],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: انڈیکس فہرست کی حد سے باہر ہے (list index out of range)",
    explain: "آپ فہرست میں ایسی جگہ تک پہنچنے کی کوشش کر رہے ہیں جو موجود نہیں۔ یاد رکھیں کہ گنتی 0 سے شروع ہوتی ہے اور لمبائی - 1 پر ختم ہوتی ہے۔",
    causes: ["انڈیکس فہرست کی لمبائی کے برابر یا اس سے زیادہ ہے۔", "لوپ فہرست کے آخری عنصر سے آگے نکل جاتا ہے۔"],
    fixes: ["0 اور len(فہرست) - 1 کے درمیان کا انڈیکس استعمال کریں۔", "لوپ میں انڈیکسنگ کی جگہ for x in list استعمال کریں۔"],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: کلید ڈکشنری میں موجود نہیں",
    explain: "ڈکشنری میں کلید {key} موجود نہیں، اس لیے [] کے ذریعے رسائی ناکام ہوئی۔",
    causes: ["کلید مخزن شدہ کلید سے مختلف طریقے سے لکھی گئی ہے۔", "کلید ابھی تک ڈکشنری میں شامل نہیں کی گئی۔"],
    fixes: ["get() کو ڈیفالٹ قدر کے ساتھ استعمال کریں۔", "رسائی سے پہلے in کے ذریعے کلید کی موجودگی کی تصدیق کریں۔"],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: صفر سے تقسیم",
    explain: "آپ نے صفر سے تقسیم کی کوشش کی، اور یہ ریاضیاتی طور پر غیر متعین عمل ہے۔",
    causes: ["تقسیم کنندہ کی قدر صفر ہے اور اس کی جانچ نہیں کی گئی۔", "خالی فہرست کا اوسط نکالنا۔"],
    fixes: ["تقسیم سے پہلے تصدیق کریں کہ تقسیم کنندہ صفر کے برابر نہیں ہے۔", "خاص صورت حال سنبھالنے کے لیے ایک شرط شامل کریں۔"],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: لائبریری موجود نہیں (No module named)",
    explain: "لائبریری {mod} انسٹال نہیں ہے، یا امپورٹ میں اس کا نام پیکیج کے نام سے مختلف ہے۔",
    causes: ["آپ نے ابھی تک لائبریری انسٹال نہیں کی۔", "آپ Python کو ایسے ماحول سے چلا رہے ہیں جو اس ماحول سے مختلف ہے جہاں لائبریری انسٹال کی گئی تھی۔", "امپورٹ کا نام پیکیج کے نام سے مختلف ہے، جیسے opencv لائبریری کے لیے cv2۔"],
    fixes: ["لائبریری کو pip install نام_لائبریری کمانڈ سے انسٹال کریں۔", "یقینی بنائیں کہ لائبریری اسی Python ورژن میں انسٹال ہے جس سے کوڈ چلا رہے ہیں۔"],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: نام امپورٹ نہیں ہو سکتا (cannot import name)",
    explain: "ماڈیول موجود ہے، لیکن اس کے اندر نام {name} متعین نہیں ہے۔",
    causes: ["فنکشن کا نام غلط املا کے ساتھ لکھا گیا ہے۔", "مقامی فائل کا نام معیاری لائبریری کے نام جیسا ہے، جیسے random.py۔", "فنکشن لائبریری کے کسی دوسرے ورژن میں موجود ہے۔"],
    fixes: ["درست نام کی تصدیق کے لیے لائبریری کی دستاویزات دیکھیں۔", "معیاری لائبریری کے نام سے مطابقت رکھنے والی مقامی فائل کا نام بدلیں۔"],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: فائل موجود نہیں (No such file or directory)",
    explain: "فائل {path} اس مقام پر موجود نہیں جہاں سے پروگرام چل رہا ہے۔",
    causes: ["فائل کا نام یا اس کی توسیع (extension) غلط لکھی گئی ہے۔", "پروگرام چلانے کا فولڈر وہ فولڈر نہیں ہے جس میں فائل موجود ہے۔"],
    fixes: ["فائل کا نام اور توسیع جانچیں۔", "مکمل راستہ استعمال کریں، یا پروگرام چلانے کے فولڈر کی تصدیق کریں۔"],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: بار بار کال کی گہرائی کی حد سے تجاوز (maximum recursion depth)",
    explain: "فنکشن خود کو بغیر رکے کال کرتا ہے، اس لیے کالز کی تعداد اجازت شدہ حد سے بڑھ گئی۔",
    causes: ["بار بار چلنے والے فنکشن میں رکنے کی شرط موجود نہیں۔", "منطق کی غلطی کی وجہ سے رکنے کی شرط کبھی پوری نہیں ہوتی۔"],
    fixes: ["فنکشن کے آغاز میں واضح رکنے کی شرط شامل کریں۔", "حل کو while یا for لوپ میں تبدیل کریں۔"],
    bad: `def f(n):
    return f(n + 1)`,
    good: `def f(n):
    if n >= 5:
        return n
    return f(n + 1)`
  },
  {
    lang: "python", id: "py-unbound-local",
    pattern: /UnboundLocalError: cannot access local variable '(?<name>[^']+)'/,
    title: "UnboundLocalError: مقامی متغیر تفویض سے پہلے (cannot access local variable)",
    explain: "آپ فنکشن کے اندر متغیر {name} استعمال کر رہے ہیں، اس سے پہلے کہ اس فنکشن میں اسے قدر دی گئی ہو۔",
    causes: ["فنکشن کے باہر کے متغیر کو اس کے اندر global کی اجازت کے بغیر تبدیل کرنا۔", "استعمال کے بعد فنکشن کے اندر متغیر کو قدر دینا۔"],
    fixes: ["متغیر کو فنکشن کو پیرامیٹر کے طور پر دیں اور اس کی نئی قدر واپس کریں۔", "یا اگر آپ کو عام متغیر میں تبدیلی چاہیے تو global استعمال کریں۔"],
    bad: `count = 0
def f():
    count += 1
f()`,
    good: `def f(count):
    count += 1
    return count
count = f(0)`
  },
  {
    lang: "python", id: "py-stop-iteration",
    pattern: /StopIteration/,
    title: "StopIteration: عناصر ختم ہو گئے (StopIteration)",
    explain: "iterator اپنے آخر تک پہنچ گیا اور اس کے پاس مزید عناصر نہیں، اور یہ زیادہ تر next() کے ساتھ ہوتا ہے۔",
    causes: ["عناصر کی تعداد سے زیادہ بار next() کال کرنا۔", "ایک iterator کو دوبارہ استعمال کرنا جو پہلے ہی ختم ہو چکا ہے۔"],
    fixes: ["ختم ہونے پر قدر متعین کرنے کے لیے next(it, None) استعمال کریں۔", "next() کو دستی طور پر استعمال کرنے کی بجائے for لوپ استعمال کریں۔"],
    bad: `it = iter([1])
print(next(it))
print(next(it))`,
    good: `it = iter([1])
print(next(it, None))
print(next(it, None))`
  },
  {
    lang: "python", id: "py-unicode-decode",
    pattern: /UnicodeDecodeError: '(?<codec>[^']+)' codec can't decode/,
    title: "UnicodeDecodeError: ڈی کوڈنگ ناکام (can't decode byte)",
    explain: "فائل اس انکوڈنگ {codec} میں نہیں ہے جس میں آپ اسے پڑھنے کی کوشش کر رہے ہیں۔",
    causes: ["فائل UTF-8 انکوڈنگ میں محفوظ ہے، جبکہ Python اسے کسی اور پہلے سے طے شدہ انکوڈنگ میں پڑھ رہا ہے۔", "فائل بائنری ہے جیسے تصویر، متن نہیں۔"],
    fixes: ["فائل کھولتے وقت encoding=\"utf-8\" شامل کریں۔", "اگر فائل بائنری ہے تو اسے \"rb\" موڈ میں کھولیں۔"],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: قدر کی حد سے تجاوز (OverflowError)",
    explain: "قدر اس حد سے بڑی ہے جسے فنکشن سنبھال سکتا ہے: {msg}۔",
    causes: ["exp(1000) جیسا بہت بڑا اسی حساب۔", "بہت بڑے عدد کو اعشاری عدد میں تبدیل کرنا۔"],
    fixes: ["حساب میں قدروں کا حجم کم کریں۔", "بڑے اعداد کی لائبریری استعمال کریں، یا چھوٹی قدریں استعمال کریں۔"],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: متغیر متعین نہیں (is not defined)",
    explain: "آپ {name} استعمال کر رہے ہیں لیکن اس دائرے میں اس کی تعریف نہیں کی، یا اس کا نام تعریف سے مختلف لکھا ہے۔",
    causes: ["تعریف سے پہلے let یا const یا var لکھنا بھول گئے۔", "نام میں املا کی غلطی۔", "متغیر کسی دوسرے فنکشن کے اندر متعین ہے اس لیے یہاں سے نظر نہیں آتا۔", "وہ اسکرپٹ یا لائبریری فائل جو نام متعین کرتی ہے لوڈ نہیں ہوئی۔"],
    fixes: ["استعمال سے پہلے متغیر کو let یا const سے متعین کریں۔", "نام میں حروف کی حالت (بڑے/چھوٹے) کی مطابقت جانچیں، اور یقینی بنائیں کہ مطلوبہ فائل کوڈ سے پہلے لوڈ ہو۔"],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: تشکیل سے پہلے رسائی (before initialization)",
    explain: "آپ نے {name} کو اس سطر سے پہلے استعمال کیا جہاں آپ نے اسے متعین کیا۔ let اور const متغیرات کو var کی طرح کوڈ کے آغاز تک نہیں اٹھایا جاتا۔",
    causes: ["متغیر کو اس کی تعریف کی سطر سے اوپر کی سطر میں استعمال کرنا۔", "فنکشن ایسے متغیر کو کال کرتا ہے جو ابھی تک نہیں بنا۔"],
    fixes: ["تعریف کو پہلے استعمال سے پہلے کی جگہ منتقل کریں۔", "فنکشن کو ان متغیرات کی تشکیل کے بعد استعمال کریں جن پر وہ انحصار کرتا ہے۔"],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: خالی قدر کی خاصیت پڑھنا (Cannot read properties of undefined)",
    explain: "آپ نے {t} قسم کی قدر سے خاصیت '{p}' پڑھنے کی کوشش کی، اور وہ قدر اس لمحے موجود نہیں۔",
    causes: ["متغیر کو ابھی تک قدر نہیں دی گئی۔", "DOM عنصر موجود نہیں، جیسے غلط ID کے ساتھ getElementById۔", "ڈیٹا ابھی تک سرور یا کسی غیر ہم وقت (asynchronous) فنکشن سے نہیں پہنچا۔", "فنکشن کچھ واپس نہیں کرتا اس لیے نتیجہ undefined ہوتا ہے۔"],
    fixes: ["قدر تک رسائی سے پہلے if یا ?. آپریٹر سے جانچیں، جیسے obj?.name۔", "استعمال سے پہلے یقینی بنائیں کہ عنصر صفحے پر موجود ہے۔"],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: خالی قدر پر خاصیت مقرر کرنا (Cannot set properties of undefined)",
    explain: "آپ نے {t} قسم کی قدر پر خاصیت '{p}' لکھنے کی کوشش کی، اور آبجیکٹ ابھی تک نہیں بنا۔",
    causes: ["آبجیکٹ کا متغیر متعین کرنا لیکن اسے {} کی قدر نہ دینا۔", "آبجیکٹ ایسے فنکشن سے آیا جو کچھ واپس نہیں کرتا۔"],
    fixes: ["پہلے {} یا مناسب شکل سے آبجیکٹ بنائیں۔", "آبجیکٹ میں لکھنے سے پہلے تصدیق کریں کہ متغیر ایک آبجیکٹ رکھتا ہے۔"],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: فنکشن نہیں ہے (is not a function)",
    explain: "آپ نے {fn} کو () لگا کر کال کرنے کی کوشش کی، لیکن یہ فنکشن نہیں ہے۔",
    causes: ["فنکشن کا نام غلط املا کے ساتھ لکھا گیا ہے۔", "فنکشن ابھی تک متعین یا امپورٹ نہیں ہوا۔", "لائبریری کوئی اور قسم کی قدر واپس کرتی ہے، جیسے فنکشن کی بجائے export default۔"],
    fixes: ["کال سے پہلے نام کی املا اور فنکشن کی تعریف جانچیں۔", "کال سے پہلے typeof سے قدر کی قسم جانچیں۔"],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: قدر قابلِ تکرار نہیں (is not iterable)",
    explain: "آپ نے {x} پر for...of لوپ یا [...] ان پیک کے ذریعے گزرنے کی کوشش کی، اور یہ قدر قابلِ تکرار نہیں۔",
    causes: ["عام آبجیکٹ {} کو for...of میں استعمال کرنا۔", "فنکشن کوئی ایرے واپس نہیں کرتا اس لیے نتیجہ undefined ہوتا ہے۔"],
    fixes: ["آبجیکٹ کے ساتھ Object.keys یا Object.values یا Object.entries استعمال کریں۔", "تکرار سے پہلے یقینی بنائیں کہ قدر ایرے، متن یا Map ہے۔"],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: مستقل متغیر کو تبدیل کرنا (Assignment to constant variable)",
    explain: "const سے متعین متغیرات کی قدر تعریف کے بعد تبدیل نہیں کی جا سکتی۔",
    causes: ["ایسے متغیر کے لیے const استعمال کرنا جو بعد میں بدلے گا۔", "دوبارہ تفویض کے وقت بھول جانا کہ قدر مستقل ہے۔"],
    fixes: ["اگر آپ قدر بدلیں گے تو let استعمال کریں۔", "مستقل کو تبدیل کرنے کی بجائے نیا متغیر بنائیں۔"],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: غیر متوقع ٹوکن (Unexpected token)",
    explain: "JavaScript کو ایک علامت یا لفظ ملا ایسی جگہ پر جہاں قواعد اجازت نہیں دیتے، اور اکثر اصل وجہ بتائی گئی سطر سے کچھ پہلے ہوتی ہے۔",
    causes: ["زائد یا غائب بریکٹ یا کوما۔", "محفوظ لفظ کو نام کے طور پر استعمال کیا گیا۔", "فنکشن کے اندر کا کوڈ درست طریقے سے بند نہیں ہوا۔"],
    fixes: ["سطر اور اس سے پہلے کی سطر میں بریکٹس اور کوماز جانچیں۔", "ایسا ایڈیٹر استعمال کریں جو غلطیاں دکھائے اور بریکٹس کا ملان کرے۔"],
    bad: `function f() {
  return 1;
}}`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-json-unexpected-token",
    pattern: /SyntaxError: Unexpected token .+ is not valid JSON/,
    title: "SyntaxError: متن درست JSON نہیں ہے (is not valid JSON)",
    explain: "JSON.parse ایسا متن پڑھنے کی کوشش کرتا ہے جو درست JSON شکل میں نہیں، اور اکثر اسے ڈیٹا کی بجائے HTML ملا ہوتا ہے۔",
    causes: ["سرور نے JSON کی بجائے 404 غلطی جیسا HTML صفحہ واپس کیا۔", "JSON فائل میں زائد کوما یا اکہرے اقتباسی نشانات ہیں۔"],
    fixes: ["تجزیے سے پہلے خام متن پرنٹ کریں اور اس کے مواد کی تصدیق کریں۔", "JSON میں کلیدوں کے ناموں اور متن کے لیے دوہرے اقتباسی نشانات استعمال کریں۔"],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: کوڈ کا غیر متوقع اختتام (Unexpected end of input)",
    explain: "فائل یا بلاک ختم ہو گیا اور JavaScript ابھی بریکٹ یا قوسین بند ہونے کا انتظار کر رہا ہے۔",
    causes: ["بغیر بند کیے ہوئے { یا ( بریکٹ۔", "کوڈ کا ایک حصہ کاپی کیا اور اس کا آخر چھوڑ دیا۔"],
    fixes: ["ہر کھولے ہوئے بریکٹ کو بند کریں۔", "ایسا ایڈیٹر استعمال کریں جو کھلے اور بند بریکٹس کا ملان کرے۔"],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: پیرامیٹرز کی فہرست کے بعد ')' غائب ہے",
    explain: "فنکشن کال سیمی کولن یا لائن کے اختتام سے پہلے ) سے بند نہیں ہوئی۔",
    causes: ["کال کے آخر میں بند کرنے والا بریکٹ لکھنا بھول جانا۔", "پیرامیٹرز کے اندر غیر بند اقتباسی نشان۔"],
    fixes: ["سیمی کولن سے پہلے ) شامل کریں۔", "کال کے اندر تمام اقتباسی نشانات بند کرنے کی تصدیق کریں۔"],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: غیر متوقع شناخت کنندہ (Unexpected identifier)",
    explain: "JavaScript کو ایک قدر یا تعبیر کے بعد نام ملا جس کے درمیان سیمی کولن نہیں، اور اکثر اس کی وجہ وہ سطر ہے جس کے آخر میں ; نہیں۔",
    causes: ["پچھلی سطر کے آخر میں ; لکھنا بھول جانا۔", "دو نام ایک دوسرے کے ساتھ بغیر کسی علامت کے لکھنا۔"],
    fixes: ["ہر جملے کے آخر میں ; شامل کریں۔", "ہر تعریف کو الگ سطر میں رکھیں۔"],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: غلط یا غیر متوقع ٹوکن (Invalid or unexpected token)",
    explain: "JavaScript کو کوڈ میں ایک ایسی علامت ملی جو قبول نہیں، عموماً ذہین اقتباسی نشان یا غیر مرئی حرف۔",
    causes: ["دستاویز سے کوڈ کاپی کرنے سے اقتباسی نشانات ذہین نشانات میں بدل جاتے ہیں۔", "اقتباسی نشان درست طریقے سے بند نہیں ہوا۔"],
    fixes: ["ذہین اقتباسی نشانات کی جگہ عام \" یا ' لگائیں۔", "ہر متن کو اسی نشان سے بند کرنا یقینی بنائیں۔"],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: متغیر دو بار متعین ہے (has already been declared)",
    explain: "آپ نے اسی دائرے میں let یا const کے ساتھ {name} کو ایک سے زیادہ بار متعین کیا۔",
    causes: ["تعریف کی سطر نقل کی لیکن پرانی حذف نہیں کی۔", "ایک ہی فائل میں ایک ہی نام کے دو متغیر۔"],
    fixes: ["زائد تعریف حذف کریں یا اس کا نام بدلیں۔", "اگر آپ قدر بدلنا چاہتے ہیں تو let کے بغیر دوبارہ تفویض استعمال کریں۔"],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: await فنکشن async کے باہر ہے",
    explain: "آپ نے await کا لفظ ایسی جگہ استعمال کیا جہاں اس کی اجازت نہیں، یہ صرف async فنکشن کے اندر یا فائل کے آغاز میں ES module میں کام کرتا ہے۔",
    causes: ["فنکشن سے پہلے async لکھنا بھول جانا۔", "عام فنکشن یا ایونٹ کے اندر await استعمال کرنا۔"],
    fixes: ["فنکشن کو async بنائیں۔", "یا وعدے (Promise) پر براہ راست then() استعمال کریں۔"],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: ES module کے باہر import کا استعمال",
    explain: "Node.js فائل کو CommonJS سمجھتا ہے، جبکہ import کی شکل ES modules کی ہے۔",
    causes: ["فائل کو module کی وضاحت کے بغیر Node سے چلایا گیا ہے۔", "جدید مثال کاپی کی بغیر پروجیکٹ کی ترتیبات کیے۔"],
    fixes: ["CommonJS میں import کی بجائے require استعمال کریں۔", "یا package.json فائل میں \"type\": \"module\" شامل کریں۔"],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: کال اسٹیک بھر گیا (Maximum call stack size exceeded)",
    explain: "فنکشن بغیر رکے خود کو کال کرتا ہے، اس لیے اجرا کا اسٹیک بھر گیا۔",
    causes: ["بار بار چلنے والے فنکشن میں رکنے کی شرط موجود نہیں۔", "دو فنکشن ایک دوسرے کو بغیر انت کے کال کرتے ہیں۔"],
    fixes: ["واضح رکنے کی شرط شامل کریں۔", "حل کو while یا for لوپ میں تبدیل کریں۔"],
    bad: `function f(n) {
  return f(n + 1);
}`,
    good: `function f(n) {
  if (n >= 5) return n;
  return f(n + 1);
}`
  },
  {
    lang: "javascript", id: "js-invalid-array-length",
    pattern: /RangeError: Invalid array length/,
    title: "RangeError: ایرے کی غلط لمبائی (Invalid array length)",
    explain: "ایرے کی لمبائی ایک مثبت عدد صحیح ہونی چاہیے جو ایک حد کے اندر ہو۔",
    causes: ["Array کو منفی عدد دینا۔", "ایرے کی لمبائی کے لیے اعشاری یا غیر عددی قدر دینا۔"],
    fixes: ["یقینی بنائیں کہ لمبائی ایک مثبت عدد صحیح ہے۔", "ایرے بنانے سے پہلے قدر کی جانچ کریں۔"],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): بغیر ہینڈل کیا ہوا مسترد شدہ وعدہ",
    explain: "ایک Promise ناکام ہوا، اور آپ نے اس کے ساتھ catch شامل نہیں کیا یا await کے ساتھ try اور catch استعمال نہیں کیا۔",
    causes: ["then بغیر catch کے استعمال کرنا۔", "async فنکشن کو await یا catch کے بغیر کال کرنا۔"],
    fixes: ["then کی زنجیر کے بعد .catch() شامل کریں۔", "await والے کوڈ کو try اور catch میں لپیٹیں۔"],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: درخواست cross-origin پالیسی کی وجہ سے روک دی گئی",
    explain: "براؤزر نے درخواست روک دی کیونکہ سرور نے اس origin سے رسائی کی اجازت نہیں دی، یا صفحہ file:// سے کھولا گیا۔",
    causes: ["سرور Access-Control-Allow-Origin ہیڈر نہیں بھیجتا۔", "صفحہ مقامی سرور کی بجائے براہ راست فائل سے کھولا گیا ہے۔"],
    fixes: ["سرور میں CORS فعال کریں تاکہ مطلوبہ ڈومین کی اجازت ہو۔", "فائل براہ راست کھولنے کی بجائے پروجیکٹ کو مقامی سرور کے ذریعے چلائیں۔"],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: درخواست ناکام ہو گئی (Failed to fetch)",
    explain: "درخواست سرور تک نہیں پہنچی، ممکن ہے نیٹ ورک منقطع ہو، پتہ غلط ہو، سرور بند ہو، یا CORS کی وجہ سے روکی گئی ہو۔",
    causes: ["سرور بند ہے یا پتہ غلط لکھا ہے۔", "انٹرنیٹ کنکشن منقطع ہے۔", "CORS پالیسی درخواست کو روک رہی ہے۔"],
    fixes: ["یقین کرنے کے لیے کہ پتہ کام کرتا ہے، اسے براؤزر میں کھولیں۔", "ڈویلپر ٹولز کا Network ٹیب دیکھیں اور CORS کی تصدیق کریں۔"],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: ماڈیول نہیں ملا (Cannot find module)",
    explain: "Node.js فائل یا پیکیج {mod} تلاش نہیں کر سکا۔",
    causes: ["پیکیج پروجیکٹ میں انسٹال نہیں ہے۔", "نسبتی راستہ غلط ہے۔", "فائل کی توسیع غائب ہے یا فائل موجود نہیں۔"],
    fixes: ["پیکیج کو npm install نام_پیکیج کمانڈ سے انسٹال کریں۔", "نسبتی راستہ اور فائل کا وجود جانچیں۔"],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: پورٹ پہلے سے استعمال میں ہے",
    explain: "جس پورٹ (port) پر آپ سننا چاہتے ہیں وہ کسی اور پروگرام کے قبضے میں ہے، اور عموماً سرور کی ایک اور کاپی چل رہی ہوتی ہے۔",
    causes: ["ایک ہی پورٹ پر سرور دو بار چلانا۔", "کوئی اور پروگرام وہ پورٹ استعمال کر رہا ہے۔"],
    fixes: ["سرور کی دوسری کاپی بند کریں۔", "یا پورٹ نمبر بدلیں۔"],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: فائل یا فولڈر موجود نہیں",
    explain: "Node.js نے ایک ایسی فائل یا فولڈر کھولنے کی کوشش کی جو مخصوص راستے پر موجود نہیں۔",
    causes: ["فائل کا نام غلط ہے یا توسیع غائب ہے۔", "راستہ ایک مختلف چلانے کے فولڈر کے نسبت سے ہے۔"],
    fixes: ["fs.existsSync سے پڑھنے سے پہلے فائل کا وجود جانچیں۔", "موجودہ فائل کے فولڈر پر مبنی راستہ استعمال کریں۔"],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: دائری ساخت کو JSON میں تبدیل نہیں کیا جا سکتا",
    explain: "آبجیکٹ میں دائری حوالہ ہے، یعنی وہ براہ راست یا بالواسطہ خود کی طرف اشارہ کرتا ہے، اور JSON.stringify اسے تبدیل نہیں کر سکتا۔",
    causes: ["آبجیکٹ میں ایک ایسی خاصیت ہے جو خود کی طرف اشارہ کرتی ہے۔", "DOM آبجیکٹ یا کوئی پیچیدہ آبجیکٹ JSON.stringify کو دیا گیا۔"],
    fixes: ["تبدیلی سے پہلے دائری خاصیت ہٹا دیں۔", "ایک سادہ آبجیکٹ میں تبدیل کریں جس میں صرف مطلوبہ ڈیٹا ہو۔"],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: علامت نہیں ملی (cannot find symbol)",
    explain: "کمپائلر کو اس نام کا متغیر، فنکشن یا کلاس نہیں ملی۔ پیغام میں symbol والی سطر دیکھیں تاکہ معلوم ہو سکے کہ مراد کیا تھا۔",
    causes: ["املا کی غلطی والا نام۔", "متغیر کسی اور دائرے میں متعین ہے۔", "ArrayList جیسی کلاس کے لیے import لکھنا بھول گئے۔", "آپ نے متغیر کبھی متعین ہی نہیں کیا۔"],
    fixes: ["symbol والی سطر کے مطابق نام درست کریں۔", "مناسب import شامل کریں، مثلاً import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: تبدیلی قدر کا کچھ حصہ کھو سکتی ہے (possible lossy conversion)",
    explain: "{a} سے {b} میں تبدیلی سے قدر کا کچھ حصہ ضائع ہو سکتا ہے، جیسے اعشاری کسور، اس لیے Java اسے خودکار طور پر رد کرتا ہے۔",
    causes: ["اعشاری عدد کو عدد صحیح متغیر میں تفویض کرنا۔", "دو عدد صحیح کی تقسیم کا نتیجہ کسر رکھتا ہے۔"],
    fixes: ["متغیر کو زیادہ وسیع قسم جیسے double بنائیں۔", "اگر تبدیلی مقصود ہے تو واضح تبدیلی استعمال کریں، جیسے (int)۔"],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: غیر مطابق اقسام (incompatible types)",
    explain: "آپ ایسی قدر تفویض کرنے کی کوشش کر رہے ہیں جو متغیر کی قسم سے مطابقت نہیں رکھتی: {a}۔",
    causes: ["نص کو عددی متغیر میں تفویض کرنا یا اس کا الٹ۔", "فنکشن کی قسم سے مختلف قسم واپس کرنا۔"],
    fixes: ["قدر کی قسم کو متغیر کی قسم کے مطابق بنائیں۔", "اگر تبدیلی منطقی ہے تو قدر کو واضح طور پر تبدیل کریں۔"],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: return بیان غائب ہے (missing return statement)",
    explain: "فنکشن کو عمل درآمد کے ہر ممکنہ راستے میں قدر واپس کرنی چاہیے، جبکہ یہاں ایک راستہ ایسا ہے جو کچھ واپس نہیں کرتا۔",
    causes: ["return صرف if کے اندر ہے، کوئی متبادل راستہ نہیں۔", "فنکشن کے آخر میں return لکھنا بھول جانا۔"],
    fixes: ["فنکشن کے آخر میں ڈیفالٹ قدر کے طور پر return شامل کریں۔", "دوسری حالت کے لیے قدر واپس کرنے والا else شامل کریں۔"],
    bad: `static int f(int x) {
  if (x > 0) return 1;
}`,
    good: `static int f(int x) {
  if (x > 0) return 1;
  return 0;
}`
  },
  {
    lang: "java", id: "java-semicolon-expected",
    pattern: /error: ';' expected/,
    title: "error: سیمی کولن ; متوقع ہے",
    explain: "جملے کے آخر میں سیمی کولن ; لکھنا بھول گئے، اور Java اسے ہمیشہ مانگتا ہے۔",
    causes: ["بیان یا تعریف کے بعد ; لکھنا بھول جانا۔", "سطر نامکمل طریقے سے ختم ہوتی ہے۔"],
    fixes: ["ذکر کردہ سطر یا اس سے پہلے کی سطر کے آخر میں ; شامل کریں۔"],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: فائل کا نام عام کلاس سے مطابقت نہیں رکھتا (is public, should be declared in a file named)",
    explain: "عام کلاس {cls} ایسی فائل میں ہونی چاہیے جس کا نام بالکل {file} ہو۔",
    causes: ["فائل کا نام عام کلاس کے نام سے مختلف رکھنا۔", "ایک ہی فائل میں دو عام کلاسز ہونا۔"],
    fixes: ["فائل کا نام بدلیں تاکہ وہ عام کلاس کے نام سے مطابقت رکھے۔", "یا public حذف کرکے کلاس کو غیر عام بنائیں۔"],
    bad: `public class Hello {
  public static void main(String[] a) {}
}`,
    good: `public class Main {
  public static void main(String[] a) {}
}`
  },
  {
    lang: "java", id: "java-unreachable",
    pattern: /error: unreachable statement/,
    title: "error: ناقابلِ رسائی بیان (unreachable statement)",
    explain: "return یا break یا throw کے بعد ایک سطر ہے جو کبھی عمل میں نہیں آئے گی، اس لیے کمپائلر اسے رد کرتا ہے۔",
    causes: ["return کے فوراً بعد کوڈ لکھنا۔", "while(true) لوپ جس میں اس کے بعد والے کوڈ سے پہلے break نہیں ہے۔"],
    fixes: ["سطر کو return سے پہلے منتقل کریں۔", "وہ کوڈ حذف کریں جو کبھی عمل میں نہیں آتا۔"],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: متغیر شاید شروع نہ کیا گیا ہو (might not have been initialized)",
    explain: "متغیر {v} کو عمل درآمد کے بعض راستوں میں استعمال سے پہلے قدر نہیں مل سکتی۔",
    causes: ["متغیر کو بغیر قدر کے متعین کرنا اور پھر استعمال کرنا۔", "if کے اندر قدر تفویض کرنا بغیر else کے۔"],
    fixes: ["تعریف کے وقت متغیر کو ابتدائی قدر دیں۔", "یقینی بنائیں کہ ہر راستہ متغیر کو قدر تفویض کرے۔"],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: غیر static عنصر static سیاق سے",
    explain: "{m} ایک غیر static عنصر ہے، اور اسے main یا کسی static فنکشن سے آبجیکٹ کے بغیر براہ راست استعمال نہیں کیا جا سکتا۔",
    causes: ["main سے براہ راست عام فنکشن کال کرنا۔", "کلاس کے اندر عام متغیر جسے آپ static فنکشن سے استعمال کرتے ہیں۔"],
    fixes: ["اگر عنصر مشترک ہو تو اسے static بنائیں۔", "یا کلاس کا آبجیکٹ بنائیں اور اس کے ذریعے عنصر کو کال کریں۔"],
    bad: `public class Main {
  static void hi() {}
  void bye() {}
  public static void main(String[] a) { bye(); }
}`,
    good: `public class Main {
  void bye() {}
  public static void main(String[] a) { new Main().bye(); }
}`
  },
  {
    lang: "java", id: "java-npe",
    pattern: /java\.lang\.NullPointerException/,
    title: "NullPointerException: خالی پوائنٹر (null)",
    explain: "آپ ایسے آبجیکٹ کو استعمال کر رہے ہیں جس کی قدر null ہے، یعنی وہ ابھی نہیں بنا یا اسے null دیا گیا۔",
    causes: ["متغیر کو null دیا گیا اور پھر اس کا طریقہ کال کیا گیا۔", "آبجیکٹ new کے ساتھ نہیں بنایا گیا۔", "Map.get نے ایک غیر موجود کلید کے لیے null واپس کیا۔"],
    fixes: ["استعمال سے پہلے آبجیکٹ بنائیں۔", "if (x != null) سے null جانچیں، یا Objects.requireNonNull استعمال کریں۔"],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: انڈیکس ایرے کی حدود سے باہر",
    explain: "آپ انڈیکس {i} تک رسائی کی کوشش کر رہے ہیں جبکہ ایرے کی لمبائی {n} ہے۔ انڈیکس 0 سے شروع ہوتے ہیں اور لمبائی - 1 پر ختم ہوتے ہیں۔",
    causes: ["انڈیکس بالکل لمبائی کے برابر ہے۔", "لوپ آخری عنصر سے آگے نکل جاتا ہے۔"],
    fixes: ["0 اور لمبائی - 1 کے درمیان کا انڈیکس استعمال کریں۔", "اگر انڈیکس کی ضرورت نہ ہو تو for-each لوپ استعمال کریں۔"],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: انڈیکس متن کی حدود سے باہر",
    explain: "متن کا مطلوبہ انڈیکس اس کی حدود سے باہر ہے، یہ charAt یا substring کے ساتھ ہوتا ہے۔",
    causes: ["charAt کو ایسے انڈیکس کے ساتھ استعمال کرنا جو متن کی لمبائی کے برابر ہو۔", "substring کو غلط حدود کے ساتھ استعمال کرنا۔"],
    fixes: ["یقینی بنائیں کہ انڈیکس 0 اور متن کی لمبائی - 1 کے درمیان ہو۔", "تحقق من طول النص قبل الاستخراج."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException: قسمة على صفر",
    explain: "قسمة عدد صحيح على صفر، وهذا غير مسموح في Java للأعداد الصحيحة.",
    causes: ["المقام متغير قيمته صفر.", "خالی فہرست کا اوسط نکالنا۔"],
    fixes: ["تحقق من أن المقام لا يساوي صفراً.", "استخدم double إن كان مناسباً للحساب."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException: نص لا يمثل رقماً صحيحاً",
    explain: "الدالة لم تستطع تحويل النص «{v}» إلى رقم، لأنه يحتوي حروفاً أو فاصلة عشرية.",
    causes: ["نص يحتوي حروفاً أو مسافات.", "عدد عشري يُحوَّل إلى int."],
    fixes: ["استخدم Double.parseDouble للأعداد العشرية.", "تحقق من النص بـ matches أو try و catch."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException: تحويل نوع غير متوافق",
    explain: "حاولت تحويل كائن من النوع {a} إلى {b}، وهو ليس منه.",
    causes: ["تحويل Object إلى نوع لا يطابق الكائن الفعلي.", "عناصر قائمة من أنواع مختلطة."],
    fixes: ["تحقق من النوع بـ instanceof قبل التحويل.", "تأكد أن القيمة من النوع الصحيح عند إضافتها."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException: المدخل لا يطابق النوع المطلوب",
    explain: "الماسح Scanner توقع نوعاً معيناً، مثل رقم صحيح، فوجد نصاً أو عكس ذلك.",
    causes: ["المستخدم أدخل حروفاً حيث يُنتظر رقم.", "الترتيب بين nextInt و nextLine غير صحيح."],
    fixes: ["تحقق قبل القراءة بـ hasNextInt().", "اقرأ السطر كاملاً بـ nextLine ثم حوّله."],
    bad: `Scanner sc = new Scanner(System.in);
int n = sc.nextInt();`,
    good: `Scanner sc = new Scanner(System.in);
if (sc.hasNextInt()) {
  int n = sc.nextInt();
}`
  },
  {
    lang: "java", id: "java-concurrent-modification",
    pattern: /java\.util\.ConcurrentModificationException/,
    title: "ConcurrentModificationException: تعديل قائمة أثناء المرور عليها",
    explain: "عدّلت القائمة أثناء المرور عليها بحلقة for-each، فرفض Java المتابعة.",
    causes: ["حذف عنصر من القائمة داخل for-each.", "إضافة عنصر إلى القائمة داخل الحلقة نفسها."],
    fixes: ["استخدم removeIf لحذف العناصر.", "أو استخدم Iterator مع دالة remove الخاصة به."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError: امتلاء المكدس",
    explain: "استدعاء متكرر بلا توقف، أي دالة تستدعي نفسها دون شرط خروج، فامتلأ مكدس التنفيذ.",
    causes: ["بار بار چلنے والے فنکشن میں رکنے کی شرط موجود نہیں۔", "شرط التوقف لا يتحقق أبداً."],
    fixes: ["فنکشن کے آغاز میں واضح رکنے کی شرط شامل کریں۔", "حوّل الحل إلى حلقة."],
    bad: `static int f(int n) {
  return f(n + 1);
}`,
    good: `static int f(int n) {
  if (n >= 5) return n;
  return f(n + 1);
}`
  },
  {
    lang: "java", id: "java-out-of-memory",
    pattern: /java\.lang\.OutOfMemoryError/,
    title: "OutOfMemoryError: نفاد الذاكرة",
    explain: "البرنامج يطلب ذاكرة أكبر مما هو متاح، وغالباً بسبب حلقة تُنشئ كائنات بلا نهاية أو بيانات ضخمة.",
    causes: ["حلقة تضيف كائنات إلى قائمة دون توقف.", "تحميل ملف ضخم كاملاً في الذاكرة."],
    fixes: ["عالج البيانات على دفعات صغيرة.", "أفرغ القوائم التي لم تعد تحتاجها."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error: استثناء غير معالج (unreported exception)",
    explain: "الدالة ترمي الاستثناء {e} وهو من نوع checked، لذلك يجب أن تعالجه بـ try و catch أو تعلنه في throws.",
    causes: ["استدعاء دالة ترمي استثناء checked دون معالجة.", "رمي استثناء checked داخل دالة لا تعلنه."],
    fixes: ["لف الاستدعاء بـ try و catch.", "أو أضف throws {e} إلى تعريف الدالة."],
    bad: `static void f() {
  throw new Exception("x");
}`,
    good: `static void f() throws Exception {
  throw new Exception("x");
}`
  },
  {
    lang: "java", id: "java-eof-parsing",
    pattern: /error: reached end of file while parsing/,
    title: "error: انتهى الملف قبل اكتمال الكود (reached end of file while parsing)",
    explain: "انتهى الملف وما زال هناك قوس { غير مغلق، لذلك لم يكتمل تعريف الصنف أو الدالة.",
    causes: ["نسيان قوس الإغلاق } في نهاية الدالة أو الصنف.", "قوس زائد أو ناقص في منتصف الكود."],
    fixes: ["أضف قوس الإغلاق الناقص.", "استخدم محرراً يطابق الأقواس لتحديد الخلل."],
    bad: `public class Main {
  public static void main(String[] a) {
}`,
    good: `public class Main {
  public static void main(String[] a) {
  }
}`
  },
  {
    lang: "java", id: "java-already-defined",
    pattern: /error: variable (?<v>\w+) is already defined/,
    title: "error: المتغير معرّف مرتين (is already defined)",
    explain: "عرّفت المتغير {v} أكثر من مرة في النطاق نفسه.",
    causes: ["تعریف کی سطر نقل کی لیکن پرانی حذف نہیں کی۔", "تعريف المتغير مرة داخل الحلقة ومرة خارجها بالاسم نفسه."],
    fixes: ["زائد تعریف حذف کریں یا اس کا نام بدلیں۔", "استخدم إعادة الإسناد بدون نوع المتغير."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error: توقع المترجم رمزاً قبل الكلمة المذكورة (expected before)",
    explain: "توقع المترجم {what} في الموضع المذكور، لكنه وجد شيئاً آخر، وغالباً الخطأ في السطر السابق لمكان الرسالة.",
    causes: ["نسيان الفاصلة المنقوطة ; في نهاية السطر السابق.", "قوس غير مغلق في السطر السابق."],
    fixes: ["أضف ; أو أغلق القوس في السطر السابق.", "تذكر أن المترجم يشير أحياناً إلى السطر التالي للخطأ الحقيقي."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error: الاسم غير معرّف في هذا النطاق (was not declared in this scope)",
    explain: "المتغير أو الدالة {n} غير معرّف في هذا المكان من الكود.",
    causes: ["نام میں املا کی غلطی۔", "المتغير معرّف داخل دالة أخرى.", "نسيت #include للمكتبة التي تعرّف الاسم."],
    fixes: ["عرّف الاسم قبل استخدامه أو مرّره كمعامل.", "أضف #include المناسب في أعلى الملف."],
    bad: `int main() {
  printf("%d", total);
}`,
    good: `#include <stdio.h>
int total = 5;
int main() {
  printf("%d\\n", total);
}`
  },
  {
    lang: "cpp", id: "cpp-undeclared-identifier",
    pattern: /error: use of undeclared identifier '(?<n>\w+)'/,
    title: "error: معرّف غير مُعلن (use of undeclared identifier)",
    explain: "مترجم clang لم يجد تعريف {n} في هذا النطاق.",
    causes: ["نام میں املا کی غلطی۔", "المتغير معرّف في نطاق آخر أو لم يُعرّف أصلاً."],
    fixes: ["صحّح الاسم أو عرّف المتغير قبل استخدامه."],
    bad: `int main() {
  return total;
}`,
    good: `int total = 0;
int main() {
  return total;
}`
  },
  {
    lang: "cpp", id: "cpp-undefined-reference",
    pattern: /undefined reference to [`']+(?<s>[^'`\n]+)/,
    title: "undefined reference: الرابط لم يجد التعريف",
    explain: "أعلنت عن {s} ولم تكتب تعريفه، أو لم تربط الملف الذي يحتوي تعريفه أثناء الترجمة.",
    causes: ["نسيان كتابة جسم الدالة.", "عدم تمرير ملف المصدر الذي يعرّف الدالة للمترجم.", "خطأ في مكتبة مرتبطة أو ترتيب الربط."],
    fixes: ["اكتب تعريف الدالة أو المتغير.", "أضف الملف المصدري أو المكتبة إلى أمر الترجمة."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault: وصول إلى ذاكرة غير مسموحة",
    explain: "البرنامج حاول الوصول إلى ذاكرة لا يملكها، وغالباً مؤشر فارغ أو فهرس خارج المصفوفة أو مؤشر تم تحريره.",
    causes: ["مؤشر لم يُهيَّأ أو قيمته NULL ثم استُخدم.", "فهرس خارج حدود المصفوفة.", "استخدام ذاكرة بعد free."],
    fixes: ["تأكد أن المؤشر يشير إلى ذاكرة صالحة قبل استخدامه.", "شغّل البرنامج بـ gdb أو valgrind لتحديد السطر."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function: استدعاء دالة قبل الإعلان عنها",
    explain: "استدعيت الدالة {f} قبل تعريفها أو الإعلان عنها، فافترض المترجم نوعها بشكل تلقائي.",
    causes: ["الدالة معرّفة في الأسفل بعد استدعائها.", "نسيان #include للملف الذي يعلن عنها."],
    fixes: ["ضع إعلان الدالة (prototype) قبل main.", "أضف #include للملف الصحيح."],
    bad: `int main() {
  hi();
  return 0;
}
void hi() {}`,
    good: `void hi();
int main() {
  hi();
  return 0;
}
void hi() {}`
  },
  {
    lang: "cpp", id: "cpp-primary-expression",
    pattern: /error: expected primary-expression before (?<tok>[^\n]{1,30})/,
    title: "error: توقع المترجم تعبيراً (expected primary-expression)",
    explain: "توقع المترجم قيمة أو متغيراً في هذا الموضع، لكنه وجد رمزاً لا يصلح في هذا المكان.",
    causes: ["علامة = بلا قيمة بعدها.", "قوس أو فاصلة في مكان لا يقبلهما التعبير."],
    fixes: ["أضف القيمة المطلوبة بعد = أو داخل القوسين.", "افحص الفواصل والأقواس قبل المكان المذكور."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error: تحويل نوع غير صالح (invalid conversion)",
    explain: "حاولت تحويل {a} إلى {b} بشكل غير مسموح به في C أو C++.",
    causes: ["إسناد قيمة إلى مؤشر دون عنوان.", "خلط بين نوع القيمة ونوع المؤشر."],
    fixes: ["أسند عنوان متغير إلى المؤشر باستخدام &.", "تأكد من تطابق الأنواع أو حوّلها صراحة."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error: لا توجد دالة مطابقة للاستدعاء (no matching function for call)",
    explain: "الاستدعاء {f} لا يطابق أي تعريف للدالة من حيث عدد المعاملات أو نوعها.",
    causes: ["تمرير عدد معاملات مختلف عن التعريف.", "تمرير نوع لا يتحول إلى النوع المطلوب."],
    fixes: ["طابق المعاملات مع تعريف الدالة.", "راجع توقيع الدالة في التوثيق أو الملف الرأسي."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error: إعادة تعريف (redefinition of)",
    explain: "عرّفت {n} أو أعلنت عنه أكثر من مرة في النطاق نفسه.",
    causes: ["نسخ سطر التعريف دون حذف القديم.", "ملف رأسي مُضمَّن أكثر من مرة دون حراسة."],
    fixes: ["احذف التعريف الزائد.", "أضف حماية الترويسة #ifndef أو #pragma once إلى الملف الرأسي."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error: أنواع متضاربة (conflicting types)",
    explain: "الإعلان الأول عن {n} يختلف في نوع الإرجاع أو المعاملات عن الإعلان أو التعريف اللاحق.",
    causes: ["تغيير نوع الإرجاع بين الإعلان والتعريف.", "اختلاف عدد أو نوع المعاملات بين النسختين."],
    fixes: ["اجعل التوقيع مطابقاً في الإعلان والتعريف.", "حدّث الإعلان ليطابق التعريف."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning: الدالة تنتهي دون return (control reaches end)",
    explain: "الدالة يُفترض أن تُرجع قيمة، لكن بعض المسارات تنتهي دون return، وهذا سلوك غير معرّف.",
    causes: ["return داخل if فقط.", "فنکشن کے آخر میں return لکھنا بھول جانا۔"],
    fixes: ["أضف return في نهاية الدالة.", "تأكد أن كل مسار يُرجع قيمة."],
    bad: `int f(int x) {
  if (x) return 1;
}`,
    good: `int f(int x) {
  if (x) return 1;
  return 0;
}`
  },
  {
    lang: "cpp", id: "cpp-stack-smashing",
    pattern: /stack smashing detected/,
    title: "stack smashing detected: الكتابة خارج حدود المكدس",
    explain: "كتبت خارج حدود مصفوفة على المكدس فأفسدت بيانات محمية، وغالباً بسبب strcpy أو فهرس زائد.",
    causes: ["نسخ نص أطول من المصفوفة باستخدام strcpy.", "حلقة تكتب بعد نهاية المصفوفة."],
    fixes: ["استخدم strncpy مع حجم المصفوفة وتأكد من إنهاء النص بالصفر.", "تحقق من الحدود قبل الكتابة."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning: فهرس خارج حدود المصفوفة (array subscript out of bounds)",
    explain: "الكود يقرأ أو يكتب خارج حدود المصفوفة، وهذا يسبب سلوكاً غير متوقع.",
    causes: ["فهرس يساوي حجم المصفوفة أو أكبر منه.", "حلقة تعدّ حتى الحجم بدل الحجم - 1."],
    fixes: ["استخدم فهارس من 0 إلى الحجم - 1.", "تحقق من الفهرس قبل الوصول إليه."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer أو double free",
    explain: "حررت ذاكرة تم تحريرها سابقاً، أو حررت مؤشراً لم يأتِ من malloc.",
    causes: ["استدعاء free مرتين على المؤشر نفسه.", "تحرير مؤشر يشير إلى متغير محلي أو داخل المصفوفة."],
    fixes: ["ضع المؤشر على NULL بعد free.", "تأكد أن كل ذاكرة تُحرر مرة واحدة فقط ومن المصدر نفسه."],
    bad: `int *p = malloc(4);
free(p);
free(p);`,
    good: `int *p = malloc(4);
free(p);
p = NULL;`
  },
  {
    lang: "cpp", id: "cpp-multiple-definition",
    pattern: /multiple definition of [`']?(?<n>[^'`\n]+)/,
    title: "multiple definition: تعريف مكرر في أكثر من ملف",
    explain: "تعريف {n} موجود في أكثر من ملف مصدر، غالباً لأن ملفاً رأسياً يحتوي تعريفاً وليس إعلاناً فقط.",
    causes: ["كتابة تعريف متغير أو دالة داخل ملف رأسي.", "تضمين الملف الرأسي في أكثر من ملف مصدر."],
    fixes: ["اجعل الملف الرأسي إعلاناً فقط باستخدام extern أو prototype.", "ضع التعريف في ملف مصدر واحد."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error: مطلوب قيمة قابلة للإسناد (lvalue required)",
    explain: "حاولت الإسناد إلى تعبير ليس له مكان في الذاكرة، مثل قيمة ثابتة أو ناتج دالة.",
    causes: ["وضع الرقم في جهة الإسناد اليسرى.", "محاولة زيادة قيمة ناتجة عن دالة."],
    fixes: ["متغیر کا نام = کی بائیں جانب رکھیں۔", "احفظ ناتج الدالة في متغير ثم عدّله."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning: مقارنة عدد موقّع بعدد غير موقّع (signedness)",
    explain: "قارنت عدداً موقّعاً (signed) بعدد غير موقّع (unsigned)، فتتحول القيمة السالبة إلى عدد كبير وتتغير النتيجة.",
    causes: ["استخدام size_t أو unsigned int مع int في الحلقات.", "عدّاد صحيح يُقارن بطول مصفوفة."],
    fixes: ["اجعل النوعين متطابقين في الإشارة.", "استخدم النوع نفسه في المتغيرين."],
    bad: `unsigned int n = 3;
int i = -1;
if (i < n) {}`,
    good: `int n = 3;
int i = -1;
if (i < n) {}`
  },
  {
    lang: "cpp", id: "cpp-format-specifier",
    pattern: /warning: format '%(?<f>[^']{1,10})' expects argument of type '(?<t>[^']{1,60})'/,
    title: "warning: صيغة الطباعة لا تطابق نوع المتغير (format expects argument)",
    explain: "صيغة الطباعة %{f} تتوقع نوعاً {t}، لكن المتغير الممرر من نوع آخر، وهذا قد يطبع قيماً خاطئة.",
    causes: ["استخدام %d لعدد عشري.", "نسيان نوع المتغير عند تغيير الكود."],
    fixes: ["استخدم %f للأعداد العشرية و%d للأعداد الصحيحة.", "تأكد من تطابق كل صيغة مع نوع متغيرها."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning: متغير يُقرأ قبل تهيئته (used uninitialized)",
    explain: "المتغير {v} يُقرأ قبل أن يحصل على قيمة، فتكون قيمته عشوائية.",
    causes: ["تعريف متغير دون قيمة ابتدائية.", "إسناد القيمة في مسار شرطي فقط."],
    fixes: ["تعریف کے وقت متغیر کو ابتدائی قدر دیں۔", "تأكد أن كل المسارات تُسند له قيمة."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error: الملف المُضمَّن غير موجود (No such file or directory)",
    explain: "الملف الذي تطلبه #include، وهو {f}، غير موجود في مسارات البحث.",
    causes: ["اسم الملف مكتوب بخطأ.", "الملف ليس في المجلد نفسه أو في مسارات المترجم.", "ملف المكتبة الرأسي غير مثبت."],
    fixes: ["صحّح اسم الملف في #include.", "استخدم علامات \" \" للملفات المحلية و < > لمكتبات النظام."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing: استثناء لم يُلتقط",
    explain: "رُمي الاستثناء {ex} ولم يُلتقط بأي catch، فأنهى البرنامج. غالباً وصل خارج حدود vector أو string عند استخدام at().",
    causes: ["استخدام at() بفهرس خارج الحدود.", "استثناء مرمي دون try و catch."],
    fixes: ["تحقق من الفهرس قبل استخدام at().", "لف الكود الذي قد يرمي استثناءً بـ try و catch."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103: الاسم غير موجود في السياق الحالي",
    explain: "المتغير أو الدالة {n} غير معرّف في هذا النطاق.",
    causes: ["نام میں املا کی غلطی۔", "المتغير معرّف داخل كتلة أخرى أو دالة أخرى.", "نسيت تعريف المتغير."],
    fixes: ["عرّف المتغير قبل استخدامه.", "تأكد من تطابق حالة الأحرف في الاسم."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002: الفاصلة المنقوطة ; متوقعة",
    explain: "نسيت الفاصلة المنقوطة ; في نهاية الجملة، وC# يحتاجها.",
    causes: ["بیان یا تعریف کے بعد ; لکھنا بھول جانا۔", "سطر نامکمل طریقے سے ختم ہوتی ہے۔"],
    fixes: ["ذکر کردہ سطر یا اس سے پہلے کی سطر کے آخر میں ; شامل کریں۔"],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029: لا يمكن التحويل الضمني بين النوعين",
    explain: "C# لا يحوّل تلقائياً من {a} إلى {b} لأن التحويل قد يفقد بيانات أو لأن النوعين غير متوافقين.",
    causes: ["إسناد نص إلى متغير رقمي.", "اعشاری عدد کو عدد صحیح متغیر میں تفویض کرنا۔"],
    fixes: ["حوّل القيمة صراحة، مثل int.Parse للنص.", "غيّر نوع المتغير ليطابق القيمة."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: لا ترجع الدالة قيمة في كل المسارات",
    explain: "الدالة يجب أن تُرجع قيمة في كل المسارات الممكنة، وهنا يوجد مسار ينتهي دون return.",
    causes: ["return داخل if فقط.", "فنکشن کے آخر میں return لکھنا بھول جانا۔"],
    fixes: ["أضف return في نهاية الدالة.", "دوسری حالت کے لیے قدر واپس کرنے والا else شامل کریں۔"],
    bad: `static int F(int x) {
  if (x > 0) return 1;
}`,
    good: `static int F(int x) {
  if (x > 0) return 1;
  return 0;
}`
  },
  {
    lang: "csharp", id: "cs-0246",
    pattern: /CS0246: The type or namespace name '(?<t>[^'\n]+)' could not be found/,
    title: "CS0246: النوع أو النطاق غير موجود",
    explain: "لم يجد C# النوع أو النطاق {t}، غالباً لأنك لم تكتب using المناسب أو لم تضف المكتبة.",
    causes: ["نسيان using للنطاق مثل System.Collections.Generic.", "خطأ إملائي في اسم النوع."],
    fixes: ["أضف using المناسب في أعلى الملف.", "تحقق من اسم النوع وأضف الحزمة إن كان من مكتبة خارجية."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165: متغير محلي يُستخدم قبل إسناده",
    explain: "المتغير المحلي {v} يُستخدم قبل أن تُسند له قيمة.",
    causes: ["تعريف المتغير دون قيمة ثم قراءته.", "إسناد القيمة داخل if فقط."],
    fixes: ["تعریف کے وقت متغیر کو ابتدائی قدر دیں۔", "تأكد أن كل المسارات تُسند له قيمة."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120: مطلوب كائن للوصول إلى عضو غير static",
    explain: "{m} عضو غير static ويحتاج كائناً لاستخدامه، ولا يمكن الوصول إليه مباشرة من دالة static.",
    causes: ["استخدام عضو عادي داخل دالة static.", "نسيان إنشاء كائن من الصنف."],
    fixes: ["اگر عنصر مشترک ہو تو اسے static بنائیں۔", "أو أنشئ كائناً من الصنف واستخدم العضو من خلاله."],
    bad: `class A {
  int v = 1;
  static void F() { Console.WriteLine(v); }
}`,
    good: `class A {
  int v = 1;
  void F() { Console.WriteLine(v); }
}`
  },
  {
    lang: "csharp", id: "cs-nullref",
    pattern: /System\.NullReferenceException/,
    title: "NullReferenceException: مرجع فارغ (null)",
    explain: "آپ ایسے آبجیکٹ کو استعمال کر رہے ہیں جس کی قدر null ہے، یعنی وہ ابھی نہیں بنا یا اسے null دیا گیا۔",
    causes: ["متغير نصي قيمته null ثم قراءة Length منه.", "آبجیکٹ new کے ساتھ نہیں بنایا گیا۔", "قاموس أعاد null لمفتاح غير موجود."],
    fixes: ["تحقق من null قبل الاستخدام بـ if (x != null) أو بـ ?.", "استعمال سے پہلے آبجیکٹ بنائیں۔"],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException: الفهرس خارج حدود المصفوفة",
    explain: "حاولت الوصول إلى فهرس خارج المصفوفة، والفهارس تبدأ من 0 وتنتهي عند الطول - 1.",
    causes: ["الفهرس يساوي طول المصفوفة.", "لوپ آخری عنصر سے آگے نکل جاتا ہے۔"],
    fixes: ["استخدم فهارس من 0 إلى الطول - 1.", "استخدم foreach إذا لم تكن بحاجة للفهرس."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException: صيغة النص غير صالحة",
    explain: "النص لا يطابق الصيغة المطلوبة للتحويل، مثل int.Parse على نص غير رقمي.",
    causes: ["نص يحتوي حروفاً عند تحويله إلى رقم.", "نص فارغ عند التحويل."],
    fixes: ["استخدم int.TryParse للتحقق قبل التحويل.", "تحقق من المدخل قبل تحويله."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException: تحويل نوع غير صالح",
    explain: "حاولت تحويل كائن من النوع {a} إلى {b}، وهو ليس منه.",
    causes: ["تحويل object إلى نوع لا يطابق القيمة الفعلية.", "عناصر من أنواع مختلفة داخل مجموعة."],
    fixes: ["تحقق من النوع بـ is قبل التحويل.", "استخدم as للتحويل الآمن."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException: قسمة على صفر",
    explain: "قسمة عدد صحيح على صفر، وهذا يرمي استثناءً في C#.",
    causes: ["المقام متغير قيمته صفر.", "حساب متوسط لمجموعة فارغة."],
    fixes: ["تحقق من أن المقام لا يساوي صفراً.", "استخدم double إذا كان الحساب يحتمل الكسور."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
