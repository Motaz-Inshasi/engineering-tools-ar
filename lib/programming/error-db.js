export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: اسم غير معرّف (name is not defined)",
    explain: "تستخدم الاسم {name} ولم يُعرَّف قبل ذلك في هذا النطاق، أو كتبته بشكل مختلف عن تعريفه.",
    causes: ["المتغير لم يُسند له قيمة أبداً.", "خطأ إملائي في الاسم.", "استخدام المتغير قبل تعريفه أو خارج الدالة التي عُرّف فيها."],
    fixes: ["عرّف المتغير وأسند له قيمة قبل استخدامه.", "تأكد من تطابق الاسم حرفاً بحرف لأن Python يفرّق بين الأحرف الكبيرة والصغيرة."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: بناء جملة غير صالح (invalid syntax)",
    explain: "وجد Python كلمة أو رمزاً في مكان لا تسمح به قواعد اللغة. الخطأ الحقيقي غالباً قبل السطر المذكور.",
    causes: ["نسيان فاصلة أو قوس أو رمز بين عنصرين.", "استخدام = بدلاً من == داخل الشرط.", "كتابة كلمة محجوزة كاسم لمتغير."],
    fixes: ["افحص السطر المذكور والذي قبله بحثاً عن قوس أو فاصلة ناقصة.", "استخدم == للمقارنة و = للإسناد."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: متوقع ':' (expected ':')",
    explain: "جملة مركبة مثل if أو for أو while أو def تحتاج نقطتين : في نهاية سطرها.",
    causes: ["نسيان النقطتين : بعد الشرط أو اسم الدالة."],
    fixes: ["أضف : في نهاية سطر الجملة المركبة قبل الإزاحة."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: نص غير مغلق (unterminated string literal)",
    explain: "بدأت نصاً بعلامة تنصيص ولم تغلقه في نفس السطر.",
    causes: ["نسيان علامة التنصيص في نهاية النص.", "استخدام علامتين مختلفتين للفتح والإغلاق."],
    fixes: ["أغلق النص بالعلامة نفسها التي فتحته بها.", "للنصوص متعددة الأسطر استخدم \"\"\" \"\"\"."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: نهاية السطر أثناء قراءة نص (EOL while scanning)",
    explain: "وصل Python إلى نهاية السطر وهو ما زال يقرأ نصاً لم يُغلق بعد.",
    causes: ["علامة تنصيص مفقودة في آخر النص.", "علامة \\ في آخر السطر تكسر الإغلاق."],
    fixes: ["أضف علامة التنصيص الإغلاقية المناسبة.", "حدّث Python أو استخدم النصوص متعددة الأسطر بـ \"\"\"."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: نهاية غير متوقعة للملف (unexpected EOF)",
    explain: "انتهى الملف وما زال Python ينتظر إكمال جملة، غالباً قوس أو قائمة لم تُغلق.",
    causes: ["قائمة أو قوس أو جملة مكتملة في منتصفها.", "نسيان إغلاق القوس الأخير في الملف."],
    fixes: ["أكمل الجملة وأغلق كل الأقواس المفتوحة.", "افحص آخر سطر في الملف."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: القوس لم يُغلق (was never closed)",
    explain: "فتحت القوس {br} ولم تغلقه بالقوس المقابل له.",
    causes: ["نسيان قوس الإغلاق.", "قوس مغلق في مكان خاطئ يجعل المترجم يبحث عن غيره."],
    fixes: ["أضف قوس الإغلاق المناسب.", "استخدم محرراً يلوّن الأقواس المتطابقة."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: قوس إغلاق زائد (unmatched)",
    explain: "وجدت القوس الإغلاقي {br} دون قوس فتح مقابل له.",
    causes: ["قوس زائد في آخر السطر.", "نسيان قوس الفتح في بداية الجملة."],
    fixes: ["احذف القوس الزائد.", "تأكد من أن كل قوس فتح له إغلاق."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: رمز غير مسموح (invalid character)",
    explain: "وجد Python رمزاً لا يُقبل في الكود، وغالباً علامة تنصيص عربية أو ذكية مثل “ ” أو حرفاً غريباً.",
    causes: ["نسخ الكود من مستند يحوّل علامات التنصيص إلى علامات ذكية.", "كتابة فاصلة عربية ، أو نقطة عربية بدلاً من اللاتينية."],
    fixes: ["استبدل علامات التنصيص الذكية بعلامات \" أو ' العادية.", "استبدل الفاصلة العربية بفاصلة إنجليزية ,."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: خطأ في f-string",
    explain: "صياغة السلسلة f-string غير صحيحة: {detail}.",
    causes: ["قوس { غير مغلق داخل النص.", "استخدام علامة التنصيص نفسها داخل f-string."],
    fixes: ["أغلق كل قوس { بقوس }.", "استخدم علامة تنصيص مختلفة داخل التعبير، أو اعتمد على الصيغة المناسبة لإصدار Python لديك."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: لا يمكن الإسناد إلى قيمة ثابتة (cannot assign to literal)",
    explain: "حاولت إسناد قيمة إلى رقم أو نص ثابت، والإسناد يحتاج اسم متغير.",
    causes: ["وضع الرقم أو النص في جهة الإسناد بالخطأ.", "الخلط بين == و = في الشرط."],
    fixes: ["ضع اسم المتغير في الجهة اليسرى من =.", "استخدم == عند المقارنة."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: لا يمكن الإسناد إلى استدعاء دالة (cannot assign to function call)",
    explain: "وضعت استدعاء دالة في جهة الإسناد، بينما يجب أن تكون الجهة اليسرى اسم متغير.",
    causes: ["كتابة () بعد اسم متغير في جهة الإسناد.", "نسيان ==، فكتبت = داخل شرط."],
    fixes: ["احسب القيمة في متغير وأسندها له.", "استخدم == للمقارنة."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: تنقص الأقواس في print (Missing parentheses)",
    explain: "كتبت print بأسلوب Python 2 دون أقواس، وPython 3 يتطلب الأقواس.",
    causes: ["نسخ مثال قديم بصيغة Python 2.", "نسيان الأقواس في print."],
    fixes: ["ضع النص أو القيمة بين أقواس print(...)."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: متوقع كتلة مُزاحة (expected an indented block)",
    explain: "السطر السابق ينتهي بنقطتين : لذلك يجب أن يأتي بعده كود مُزاح للداخل، لكنه غير مزاح.",
    causes: ["نسيان الإزاحة تحت if أو for أو def.", "كتلة فارغة تماماً بعد النقطتين."],
    fixes: ["ازِح السطر التالي بأربع مسافات.", "إن كانت الكتلة فارغة فاستخدم pass."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: إزاحة غير متوقعة (unexpected indent)",
    explain: "وجد Python سطراً مُزاحاً للداخل دون سبب، أي لا يتبع جملة مركبة.",
    causes: ["مسافات زائدة في بداية السطر.", "سطر تم نسخه من مكان آخر بإزاحة مختلفة."],
    fixes: ["أزل المسافات الزائدة في بداية السطر.", "تأكد من أن كل الأسطر في المستوى نفسه لها الإزاحة نفسها."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: الإزاحة لا تطابق أي مستوى خارجي",
    explain: "الإزاحة في هذا السطر لا تساوي أي مستوى إزاحة سابق، فلا يعرف Python إلى أين ينتمي.",
    causes: ["خلط عدد المسافات بين الأسطر.", "نسخ كود بإزاحة مختلفة."],
    fixes: ["اجعل كل مستوى من الكود بعدد ثابت من المسافات (4 مسافات).", "استخدم محرراً يعرض المسافات."],
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
    title: "TabError: خلط بين الجدولة والمسافات",
    explain: "استخدمت أحياناً مفتاح Tab وأحياناً المسافات للإزاحة، وPython يرفض هذا الخلط.",
    causes: ["بعض الأسطر تبدأ بـ Tab وبعضها بمسافات.", "إعدادات المحرر تحوّل Tab بطريقة مختلفة."],
    fixes: ["استخدم المسافات فقط (4 مسافات لكل مستوى).", "في المحرر فعّل تحويل Tab إلى مسافات."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: لا يمكن دمج نص مع قيمة من نوع آخر (can only concatenate str)",
    explain: "حاولت دمج نص مع قيمة من نوع {t} باستخدام +، وPython لا يحوّل الأنواع تلقائياً.",
    causes: ["استخدام + بين نص ورقم.", "قيمة قادمة من input() وهي دائماً نص."],
    fixes: ["حوّل الرقم إلى نص باستخدام str().", "أو ضع الرقم داخل f-string فيتحول إلى نص تلقائياً."],
    bad: `print("العمر: " + 20)`,
    good: `print("العمر: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: عملية غير مدعومة بين نوعين (unsupported operand type(s))",
    explain: "العامل {op} لا يقبل النوعين {a} و{b} معاً.",
    causes: ["نص مع رقم في عملية حسابية.", "قيمة None داخل عملية حسابية."],
    fixes: ["حوّل النص إلى رقم باستخدام int() أو float().", "تأكد أن المتغيرات تحمل قيماً رقمية قبل الحساب."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: لا يمكن فهرسة NoneType (not subscriptable)",
    explain: "المتغير قيمته None (أي لا شيء)، وأنت تحاول الوصول إلى عنصر منه بالقوس [].",
    causes: ["دالة لا تُرجع شيئاً لأنها لا تحتوي return.", "متغير لم يحصل على قيمة أو جاء من عملية فشلت."],
    fixes: ["تأكد أن الدالة تُرجع قيمة باستخدام return.", "تحقق من أن القيمة ليست None قبل فهرستها."],
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
    title: "AttributeError: الخاصية أو الدالة غير موجودة (has no attribute)",
    explain: "الكائن من نوع {type} لا يحتوي الخاصية أو الدالة {attr}.",
    causes: ["اسم الدالة أو الخاصية مكتوب بخطأ.", "استخدام دالة تخص نوعاً آخر، مثل append على نص.", "المتغير قيمته None."],
    fixes: ["تحقق من نوع الكائن باستخدام type().", "راجع توثيق النوع لمعرفة الدوال المتاحة فيه."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: الكائن ليس دالة (object is not callable)",
    explain: "حاولت استدعاء قيمة من نوع {t} كأنها دالة بوضع القوسين ().",
    causes: ["وضع () بعد اسم متغيّر يحمل قيمة.", "إخفاء اسم دالة مدمجة بمتغير، مثل str = 5."],
    fixes: ["أعد تسمية المتغير حتى لا يطغى على اسم الدالة المدمجة.", "تأكد أنك تستدعي دالة فعلاً."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: معاملات ناقصة في استدعاء الدالة (missing required positional argument)",
    explain: "الدالة {fn} تحتاج {n} معامل إضافي لم تمرّره عند الاستدعاء.",
    causes: ["استدعاء الدالة دون تمرير المعامل المطلوب.", "تعريف الدالة يطلب معاملاً لا تحتاجه."],
    fixes: ["مرّر القيم الناقصة عند الاستدعاء.", "أعطِ المعامل قيمة افتراضية في تعريف الدالة إن كان اختيارياً."],
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
    title: "TypeError: معاملات زائدة في استدعاء الدالة (takes positional arguments but given)",
    explain: "الدالة {fn} تقبل {n} معاملاً فقط، لكنك مررت {m}.",
    causes: ["تمرير قيم أكثر من عدد معاملات التعريف.", "تعريف الدالة لا يحتوي المعامل الذي تمرره."],
    fixes: ["أزل القيم الزائدة من الاستدعاء.", "أضف المعامل الناقص إلى تعريف الدالة."],
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
    title: "TypeError: الكائن غير قابل للتكرار (object is not iterable)",
    explain: "حاولت المرور على قيمة من نوع {t} بحلقة for أو بفك القيم، وهذا النوع ليس قابلاً للتكرار.",
    causes: ["نسيت استخدام range() مع الرقم في الحلقة.", "دالة لا تُرجع قيماً فتكون النتيجة None."],
    fixes: ["استخدم range(n) للتكرار على عدد.", "تأكد أن المتغير قائمة أو نص أو مجموعة قبل التكرار."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: فهرس القائمة يجب أن يكون عدداً صحيحاً (list indices)",
    explain: "فهرس القائمة يجب أن يكون عدداً صحيحاً، وأنت استخدمت قيمة من نوع {t}.",
    causes: ["كتابة الفهرس كنص مثل '1'.", "حساب الفهرس بالقسمة / فينتج عدداً عشرياً."],
    fixes: ["استخدم عدداً صحيحاً بدون علامات تنصيص.", "استخدم // بدلاً من / عند حساب الفهرس."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: لا يمكن تحويل النص إلى عدد صحيح (invalid literal for int)",
    explain: "الدالة int() لم تستطع تحويل النص '{v}' إلى عدد صحيح.",
    causes: ["النص يحتوي حروفاً أو رموزاً غير رقمية.", "النص عدد عشري مثل 3.5.", "النص فارغ."],
    fixes: ["استخدم float() للأعداد العشرية.", "تحقق من المدخل قبل التحويل، أو استخدم try و except."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: قيم أكثر من المتغيرات (too many values to unpack)",
    explain: "عدد المتغيرات في الفك {n} فقط، بينما تحتوي القائمة على قيم أكثر منه.",
    causes: ["عدد أسماء المتغيرات أقل من عدد العناصر.", "قائمة أطول مما توقعت."],
    fixes: ["زد عدد المتغيرات ليطابق عدد العناصر.", "استخدم *rest لجمع العناصر الزائدة."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: قيم أقل من المتغيرات (not enough values to unpack)",
    explain: "تحاول فك القيم في {n} متغيرات، لكن القائمة تحتوي {g} عنصراً فقط.",
    causes: ["عدد المتغيرات أكبر من عدد العناصر.", "دالة ترجع عناصر أقل مما توقعت."],
    fixes: ["قلّل عدد المتغيرات ليطابق عدد العناصر.", "تحقق من طول القائمة قبل الفك."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: الفهرس خارج نطاق القائمة (list index out of range)",
    explain: "تحاول الوصول إلى موضع غير موجود في القائمة. تذكر أن الترقيم يبدأ من 0 وينتهي عند الطول - 1.",
    causes: ["الفهرس يساوي طول القائمة أو أكبر منه.", "حلقة تتجاوز آخر عنصر في القائمة."],
    fixes: ["استخدم فهرساً بين 0 و len(القائمة) - 1.", "في الحلقات استخدم for x in list بدلاً من الفهرسة."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: المفتاح غير موجود في القاموس",
    explain: "القاموس لا يحتوي المفتاح {key}، لذلك فشل الوصول إليه بالقوس [].",
    causes: ["المفتاح مكتوب بشكل مختلف عن المفتاح المخزن.", "المفتاح لم يُضَف إلى القاموس بعد."],
    fixes: ["استخدم get() مع قيمة افتراضية.", "تحقق من وجود المفتاح بالعبارة in قبل الوصول إليه."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: قسمة على صفر",
    explain: "حاولت القسمة على صفر، وهذه عملية غير معرّفة رياضياً.",
    causes: ["المقام متغير قيمته صفر دون التحقق.", "حساب متوسط لقائمة فارغة."],
    fixes: ["تحقق من أن المقام لا يساوي صفراً قبل القسمة.", "أضف شرطاً يتعامل مع الحالة الخاصة."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: المكتبة غير موجودة (No module named)",
    explain: "المكتبة {mod} غير مثبتة، أو اسمها في الاستيراد يختلف عن اسم الحزمة.",
    causes: ["لم تثبّت المكتبة بعد.", "تشغّل Python من بيئة مختلفة عن البيئة التي ثُبّتت فيها المكتبة.", "اسم الاستيراد يختلف عن اسم الحزمة، مثل cv2 لمكتبة opencv."],
    fixes: ["ثبّت المكتبة بالأمر pip install اسم_المكتبة.", "تأكد أن المكتبة مثبتة في النسخة نفسها من Python التي تشغّل بها الكود."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: لا يمكن استيراد الاسم (cannot import name)",
    explain: "الوحدة موجودة، لكن الاسم {name} غير معرّف داخلها.",
    causes: ["كتابة اسم الدالة بخطأ إملائي.", "ملف محلي يحمل اسم مكتبة معيارية، مثل random.py.", "الدالة موجودة في إصدار آخر من المكتبة."],
    fixes: ["راجع توثيق المكتبة للتأكد من الاسم الصحيح.", "غيّر اسم الملف المحلي الذي يطابق اسم مكتبة معيارية."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: الملف غير موجود (No such file or directory)",
    explain: "الملف {path} غير موجود في المسار الذي يعمل منه البرنامج.",
    causes: ["اسم الملف أو امتداده مكتوب بخطأ.", "مجلد التشغيل ليس المجلد الذي فيه الملف."],
    fixes: ["تحقق من اسم الملف والامتداد.", "استخدم مساراً كاملاً أو تأكد من مجلد التشغيل."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: تجاوز عمق الاستدعاء المتكرر (maximum recursion depth)",
    explain: "الدالة تستدعي نفسها بلا توقف، فتجاوز عدد الاستدعاءات الحد المسموح.",
    causes: ["غياب شرط التوقف في الدالة المتكررة.", "شرط التوقف لا يتحقق أبداً بسبب خطأ في المنطق."],
    fixes: ["أضف شرط توقف واضحاً في أول الدالة.", "حوّل الحل إلى حلقة while أو for."],
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
    title: "UnboundLocalError: متغير محلي قبل إسناده (cannot access local variable)",
    explain: "تستخدم المتغير {name} داخل دالة قبل أن تُسند له قيمة في تلك الدالة.",
    causes: ["تعديل متغير من خارج الدالة داخلها دون تصريح global.", "إسناد قيمة للمتغير داخل الدالة بعد استخدامه."],
    fixes: ["مرّر المتغير للدالة كمعامل وأعد قيمته.", "أو استخدم global إن كنت تحتاج تعديل المتغير العام."],
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
    title: "StopIteration: انتهت العناصر (StopIteration)",
    explain: "المكرر iterator وصل إلى نهايته ولم يعد عنده عناصر، وغالباً يحدث مع next().",
    causes: ["استدعاء next() أكثر من عدد العناصر.", "إعادة استخدام مكرر انتهى بالفعل."],
    fixes: ["استخدم next(it, None) لتحديد قيمة عند الانتهاء.", "استخدم حلقة for بدلاً من next() يدوياً."],
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
    title: "UnicodeDecodeError: فشل فك الترميز (can't decode byte)",
    explain: "الملف ليس بالترميز {codec} الذي تحاول قراءته به.",
    causes: ["الملف محفوظ بترميز UTF-8 بينما Python يقرؤه بترميز افتراضي آخر.", "الملف ثنائي مثل صورة وليس نصاً."],
    fixes: ["أضف encoding=\"utf-8\" عند فتح الملف.", "إن كان الملف ثنائياً فافتحه بالوضع \"rb\"."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: تجاوز نطاق القيمة (OverflowError)",
    explain: "القيمة أكبر من الحد الذي تستطيع الدالة معالجته: {msg}.",
    causes: ["حساب أسّي كبير جداً مثل exp(1000).", "تحويل عدد ضخم جداً إلى عدد عشري."],
    fixes: ["قلّل حجم القيم في الحساب.", "استخدم مكتبة أرقام كبيرة أو قيماً أصغر."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: المتغير غير معرّف (is not defined)",
    explain: "تستخدم {name} ولم تعرّفه في هذا النطاق، أو كتبت اسمه بشكل مختلف عن تعريفه.",
    causes: ["نسيت الكلمة let أو const أو var قبل التعريف.", "خطأ إملائي في الاسم.", "المتغير معرّف داخل دالة أخرى فلا يُرى من هنا.", "ملف السكربت أو المكتبة التي تعرّف الاسم لم تُحمَّل."],
    fixes: ["عرّف المتغير قبل استخدامه بـ let أو const.", "تأكد من تطابق حالة الأحرف في الاسم، وأن الملف المطلوب مُحمَّل قبل الكود."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: الوصول قبل التهيئة (before initialization)",
    explain: "استخدمت {name} قبل السطر الذي عرّفته فيه. المتغيرات let و const لا تُرفع إلى أعلى الكود كما تفعل var.",
    causes: ["استخدام المتغير في سطر أعلى من تعريفه.", "دالة تستدعي متغيراً لم يُنشأ بعد."],
    fixes: ["انقل التعريف إلى قبل أول استخدام له.", "استخدم الدالة بعد تهيئة المتغيرات التي تعتمد عليها."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: قراءة خاصية من قيمة فارغة (Cannot read properties of undefined)",
    explain: "حاولت قراءة الخاصية '{p}' من قيمة {t}، والقيمة غير موجودة في تلك اللحظة.",
    causes: ["متغير لم يُسند له قيمة بعد.", "عنصر DOM غير موجود، مثل getElementById بمعرّف خاطئ.", "بيانات لم تصل بعد من الخادم أو من دالة غير متزامنة.", "دالة لا تُرجع شيئاً فتكون النتيجة undefined."],
    fixes: ["تحقق من القيمة قبل الوصول إليها بـ if أو باستخدام علامة ?. مثل obj?.name.", "تأكد أن العنصر موجود في الصفحة قبل استخدامه."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: تعيين خاصية على قيمة فارغة (Cannot set properties of undefined)",
    explain: "حاولت كتابة الخاصية '{p}' على قيمة {t}، والكائن لم يُنشأ بعد.",
    causes: ["تعريف متغير كائن دون إعطائه قيمة {}.", "كائن جاء من دالة لا تُرجع شيئاً."],
    fixes: ["أنشئ الكائن أولاً بـ {} أو بالصيغة المناسبة.", "تأكد من أن المتغير يحمل كائناً قبل الكتابة عليه."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: ليست دالة (is not a function)",
    explain: "حاولت استدعاء {fn} بوضع القوسين ()، لكنه ليس دالة.",
    causes: ["اسم الدالة مكتوب بخطأ إملائي.", "الدالة لم تُعرَّف بعد أو لم تُستورد.", "المكتبة تُرجع قيمة من نوع آخر، مثل export default بدلاً من دالة."],
    fixes: ["تحقق من كتابة الاسم ومن تعريف الدالة قبل استدعائها.", "افحص نوع القيمة بـ typeof قبل الاستدعاء."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: القيمة غير قابلة للتكرار (is not iterable)",
    explain: "حاولت المرور على {x} بحلقة for...of أو بالفك [...]، وهذه القيمة ليست قابلة للتكرار.",
    causes: ["استخدام كائن عادي {} في for...of.", "دالة لا تُرجع مصفوفة فتكون النتيجة undefined."],
    fixes: ["استخدم Object.keys أو Object.values أو Object.entries مع الكائن.", "تأكد أن القيمة مصفوفة أو نص أو Map قبل التكرار."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: تغيير متغير ثابت (Assignment to constant variable)",
    explain: "المتغيرات المعرّفة بـ const لا يمكن تغيير قيمتها بعد التعريف.",
    causes: ["استخدام const لمتغير سيتغير لاحقاً.", "نسيان أن القيمة ثابتة عند إعادة الإسناد."],
    fixes: ["استخدم let إذا كنت ستغيّر القيمة.", "أنشئ متغيراً جديداً بدلاً من تعديل الثابت."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: رمز غير متوقع (Unexpected token)",
    explain: "وجد JavaScript رمزاً أو كلمة في موضع لا تسمح به القواعد، وغالباً السبب قبل السطر المذكور بقليل.",
    causes: ["قوس أو فاصلة زائدة أو ناقصة.", "كلمة محجوزة استُخدمت كاسم.", "كود داخل دالة لم تُغلق بشكل صحيح."],
    fixes: ["افحص الأقواس والفواصل في السطر والذي قبله.", "استخدم محرراً يعرض الأخطاء ويطابق الأقواس."],
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
    title: "SyntaxError: نص ليس JSON صالحاً (is not valid JSON)",
    explain: "الدالة JSON.parse تحاول قراءة نص ليس بصيغة JSON صحيحة، وغالباً وصلها HTML بدلاً من البيانات.",
    causes: ["الخادم أرجع صفحة HTML مثل صفحة خطأ 404 بدلاً من JSON.", "ملف JSON فيه فاصلة زائدة أو علامات تنصيص مفردة."],
    fixes: ["اطبع النص الخام قبل التحليل وتأكد من محتواه.", "استخدم علامات تنصيص مزدوجة لأسماء المفاتيح والنصوص في JSON."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: نهاية غير متوقعة للكود (Unexpected end of input)",
    explain: "انتهى الملف أو الكتلة وما زال JavaScript ينتظر إغلاق قوس أو قوس معقوف.",
    causes: ["قوس { أو ( بلا إغلاق.", "نسخ جزء من الكود وإهمال نهايته."],
    fixes: ["أغلق كل قوس فتحته.", "استخدم محرراً يطابق الأقواس المفتوحة والمغلقة."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: ينقص ')' بعد قائمة المعاملات",
    explain: "استدعاء الدالة لم يُغلق بقوس ) قبل الفاصلة المنقوطة أو نهاية السطر.",
    causes: ["نسيان قوس الإغلاق في نهاية الاستدعاء.", "علامة تنصيص غير مغلقة داخل المعاملات."],
    fixes: ["أضف ) قبل الفاصلة المنقوطة.", "تأكد من إغلاق كل علامات التنصيص داخل الاستدعاء."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: اسم غير متوقع (Unexpected identifier)",
    explain: "وجد JavaScript اسماً بعد قيمة أو تعبير دون فاصلة منقوطة تفصل بينهما، وغالباً بسبب سطر ناقص الفاصلة المنقوطة.",
    causes: ["نسيان ; في نهاية السطر السابق.", "كتابة اسمين متتاليين دون رمز يفصل بينهما."],
    fixes: ["أضف ; في نهاية كل جملة.", "افصل كل تعريف في سطر مستقل."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: رمز غير صالح (Invalid or unexpected token)",
    explain: "وجد JavaScript رمزاً لا يُقبل في الكود، وغالباً علامة تنصيص ذكية أو حرف غير مرئي.",
    causes: ["نسخ الكود من مستند يحوّل علامات التنصيص إلى علامات ذكية.", "علامة تنصيص لم تُغلق بشكل صحيح."],
    fixes: ["استبدل علامات التنصيص الذكية بعلامات \" أو ' العادية.", "تأكد من إغلاق كل نص بالعلامة نفسها."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: المتغير معرّف مرتين (has already been declared)",
    explain: "عرّفت {name} أكثر من مرة في النطاق نفسه باستخدام let أو const.",
    causes: ["نسخ سطر تعريف دون حذف القديم.", "متغيران بالاسم نفسه في الملف نفسه."],
    fixes: ["احذف التعريف الزائد أو غيّر اسمه.", "استخدم إعادة الإسناد بدون let إذا كنت تريد تغيير القيمة."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: await خارج دالة async",
    explain: "استخدمت الكلمة await في مكان لا يسمح بها، وهي تعمل فقط داخل دالة async أو في وحدة ES module في أعلى الملف.",
    causes: ["نسيان كلمة async قبل الدالة.", "استخدام await داخل دالة عادية أو حدث عادي."],
    fixes: ["اجعل الدالة async.", "أو استخدم then() مع الوعد مباشرة."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: استخدام import خارج وحدة ES",
    explain: "Node.js يعامل الملف على أنه CommonJS، بينما تستخدم صيغة import الخاصة بوحدات ES.",
    causes: ["الملف يُشغَّل بـ Node دون تحديد أنه module.", "نسخ مثال حديث دون ضبط إعدادات المشروع."],
    fixes: ["استخدم require بدلاً من import في CommonJS.", "أو أضف \"type\": \"module\" في ملف package.json."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: امتلاء مكدس الاستدعاء (Maximum call stack size exceeded)",
    explain: "الدالة تستدعي نفسها بلا توقف، فامتلأ مكدس التنفيذ.",
    causes: ["غياب شرط التوقف في الدالة المتكررة.", "دالتان تستدعي كل منهما الأخرى بلا نهاية."],
    fixes: ["أضف شرط توقف واضحاً.", "حوّل الحل إلى حلقة while أو for."],
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
    title: "RangeError: طول مصفوفة غير صالح (Invalid array length)",
    explain: "طول المصفوفة يجب أن يكون عدداً صحيحاً موجباً ضمن حد معين.",
    causes: ["تمرير عدد سالب إلى Array.", "تمرير قيمة عشرية أو غير رقمية لطول المصفوفة."],
    fixes: ["تأكد أن الطول عدد صحيح موجب.", "تحقق من القيمة قبل إنشاء المصفوفة."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): وعد مرفوض دون معالجة",
    explain: "وعد Promise فشل، ولم تضف له catch أو تستخدم try و catch مع await لمعالجة الخطأ.",
    causes: ["استخدام then دون catch.", "استدعاء دالة async دون await أو catch."],
    fixes: ["أضف .catch() بعد سلسلة then.", "لف كود await داخل try و catch."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: الطلب مُنِع بسبب سياسة المشاركة بين المواقع",
    explain: "المتصفح منع الطلب لأن الخادم لم يسمح بالوصول من هذا الأصل (origin)، أو لأن الصفحة فُتحت من file://.",
    causes: ["الخادم لا يرسل ترويسة Access-Control-Allow-Origin.", "الصفحة مفتوحة مباشرة من الملف بدل خادم محلي."],
    fixes: ["فعّل CORS في الخادم ليسمح بالنطاق المطلوب.", "شغّل المشروع عبر خادم محلي بدلاً من فتح الملف مباشرة."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: فشل الطلب (Failed to fetch)",
    explain: "لم يصل الطلب إلى الخادم، فقد تكون الشبكة مقطوعة أو العنوان خاطئاً أو الخادم متوقفاً أو المنع بسبب CORS.",
    causes: ["الخادم متوقف أو العنوان مكتوب بخطأ.", "الاتصال بالإنترنت مقطوع.", "سياسة CORS تمنع الطلب."],
    fixes: ["افتح العنوان في المتصفح للتأكد أنه يعمل.", "افحص تبويب Network في أدوات المطور وتأكد من CORS."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: لا يمكن العثور على الوحدة (Cannot find module)",
    explain: "Node.js لا يجد الملف أو الحزمة {mod}.",
    causes: ["الحزمة غير مثبتة في المشروع.", "المسار النسبي خاطئ.", "امتداد الملف ناقص أو الملف غير موجود."],
    fixes: ["ثبّت الحزمة بالأمر npm install اسم_الحزمة.", "تحقق من المسار النسبي ومن وجود الملف."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: المنفذ مستخدم بالفعل",
    explain: "المنفذ (port) الذي تحاول الاستماع عليه مشغول ببرنامج آخر، وغالباً توجد نسخة أخرى من الخادم تعمل.",
    causes: ["تشغيل الخادم مرتين بالمنفذ نفسه.", "برنامج آخر يستخدم المنفذ."],
    fixes: ["أوقف النسخة الأخرى من الخادم.", "أو غيّر رقم المنفذ."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: الملف أو المجلد غير موجود",
    explain: "Node.js حاول فتح ملف أو مجلد غير موجود في المسار المحدد.",
    causes: ["اسم الملف خطأ أو امتداده ناقص.", "المسار نسبي إلى مجلد تشغيل مختلف."],
    fixes: ["تحقق من وجود الملف قبل قراءته بـ fs.existsSync.", "استخدم مساراً مبنياً على مجلد الملف الحالي."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: بنية دائرية لا يمكن تحويلها إلى JSON",
    explain: "الكائن يحتوي إشارة دائرية، أي يشير إلى نفسه بشكل مباشر أو غير مباشر، و JSON.stringify لا يستطيع تحويله.",
    causes: ["كائن يحتوي خاصية تشير إلى نفسه.", "كائن DOM أو كائن معقد يُمرَّر إلى JSON.stringify."],
    fixes: ["أزل الخاصية الدائرية قبل التحويل.", "حوّل إلى كائن بسيط يحتوي البيانات المطلوبة فقط."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: الرمز غير موجود (cannot find symbol)",
    explain: "لم يجد المترجم متغيراً أو دالة أو صنفاً بهذا الاسم. انظر إلى السطر symbol في الرسالة لمعرفة الاسم المقصود.",
    causes: ["اسم مكتوب بخطأ إملائي.", "المتغير معرّف في نطاق آخر.", "نسيت import لصنف مثل ArrayList.", "لم تُعرّف المتغير أصلاً."],
    fixes: ["صحّح الاسم حسب السطر symbol.", "أضف الاستيراد المناسب، مثل import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: تحويل قد يفقد جزءاً من القيمة (possible lossy conversion)",
    explain: "التحويل من {a} إلى {b} قد يفقد جزءاً من القيمة، مثل الكسور العشرية، لذلك يرفضه Java تلقائياً.",
    causes: ["إسناد عدد عشري إلى متغير صحيح.", "نتيجة قسمة عددين صحيحين لها كسر."],
    fixes: ["اجعل المتغير من النوع الأوسع مثل double.", "إذا كان التحويل مقصوداً فاستخدم تحويلاً صريحاً مثل (int)."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: أنواع غير متوافقة (incompatible types)",
    explain: "تحاول إسناد قيمة لا تتوافق مع نوع المتغير: {a}.",
    causes: ["إسناد نص إلى متغير رقمي أو العكس.", "إرجاع نوع مختلف عن نوع الدالة."],
    fixes: ["اجعل نوع القيمة مطابقاً لنوع المتغير.", "حوّل القيمة صراحة إذا كان التحويل منطقياً."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: تنقص عبارة return (missing return statement)",
    explain: "الدالة يجب أن تُرجع قيمة في كل مسار ممكن من التنفيذ، وهنا يوجد مسار لا يُرجع شيئاً.",
    causes: ["return داخل if فقط دون مسار بديل.", "نسيان return في نهاية الدالة."],
    fixes: ["أضف return في نهاية الدالة كقيمة افتراضية.", "أضف else يُرجع قيمة للحالة الأخرى."],
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
    title: "error: الفاصلة المنقوطة ; متوقعة",
    explain: "نسيت الفاصلة المنقوطة ; في نهاية الجملة، وJava تحتاجها دائماً.",
    causes: ["نسيان ; بعد تعليمة أو تعريف.", "سطر ينتهي بشكل غير مكتمل."],
    fixes: ["أضف ; في نهاية السطر المذكور أو السابق له."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: اسم الملف لا يطابق الصنف العام (is public, should be declared in a file named)",
    explain: "الصنف العام {cls} يجب أن يكون داخل ملف اسمه {file} بالضبط.",
    causes: ["تسمية الملف بغير اسم الصنف العام.", "وجود صنفين عامين في ملف واحد."],
    fixes: ["أعد تسمية الملف ليطابق اسم الصنف العام.", "أو اجعل الصنف غير عام بحذف public."],
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
    title: "error: عبارة لا يمكن الوصول إليها (unreachable statement)",
    explain: "يوجد سطر بعد return أو break أو throw، ولن يُنفَّذ أبداً فيرفضه المترجم.",
    causes: ["كتابة كود بعد return مباشرة.", "حلقة while(true) بلا break قبل الكود اللاحق."],
    fixes: ["انقل السطر إلى قبل return.", "احذف الكود الذي لا يُنفذ أبداً."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: متغير قد لا يُهيَّأ (might not have been initialized)",
    explain: "المتغير {v} قد لا يحصل على قيمة قبل استخدامه في بعض مسارات التنفيذ.",
    causes: ["تعريف المتغير دون قيمة ثم استخدامه.", "إسناد القيمة داخل if دون else."],
    fixes: ["أعطِ المتغير قيمة ابتدائية عند التعريف.", "تأكد أن كل مسار يُسند قيمة للمتغير."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: عضو غير static من سياق static",
    explain: "{m} عضو غير static، ولا يمكن استخدامه مباشرة من دالة main أو أي دالة static دون كائن.",
    causes: ["استدعاء دالة عادية من main مباشرة.", "متغير عادي داخل صنف تستخدمه من دالة static."],
    fixes: ["اجعل العضو static إذا كان مشتركاً.", "أو أنشئ كائناً من الصنف واستدعِ العضو من خلاله."],
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
    title: "NullPointerException: مؤشر فارغ (null)",
    explain: "تحاول استخدام كائن قيمته null، أي لم يُنشأ بعد أو أُسند له null.",
    causes: ["متغير نصي مُسند له null ثم استُدعيت دالته.", "كائن لم يُنشأ بـ new.", "Map.get أعاد null لمفتاح غير موجود."],
    fixes: ["أنشئ الكائن قبل استخدامه.", "تحقق من null بـ if (x != null) أو استخدم Objects.requireNonNull."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: الفهرس خارج حدود المصفوفة",
    explain: "حاولت الوصول إلى الفهرس {i} بينما طول المصفوفة {n}. الفهارس تبدأ من 0 وتنتهي عند الطول - 1.",
    causes: ["الفهرس يساوي الطول تماماً.", "حلقة تتجاوز آخر عنصر."],
    fixes: ["استخدم فهرساً بين 0 و الطول - 1.", "استخدم حلقة for-each إذا لم تحتج الفهرس."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: الفهرس خارج حدود النص",
    explain: "الفهرس المطلوب من النص خارج حدوده، وهذا يحدث مع charAt أو substring.",
    causes: ["استخدام charAt بفهرس يساوي طول النص.", "substring بحدود خاطئة."],
    fixes: ["تأكد أن الفهرس بين 0 و طول النص - 1.", "تحقق من طول النص قبل الاستخراج."],
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
    causes: ["المقام متغير قيمته صفر.", "حساب متوسط لقائمة فارغة."],
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
    causes: ["غياب شرط التوقف في الدالة المتكررة.", "شرط التوقف لا يتحقق أبداً."],
    fixes: ["أضف شرط توقف واضحاً في أول الدالة.", "حوّل الحل إلى حلقة."],
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
    causes: ["نسخ سطر تعريف دون حذف القديم.", "تعريف المتغير مرة داخل الحلقة ومرة خارجها بالاسم نفسه."],
    fixes: ["احذف التعريف الزائد أو غيّر اسمه.", "استخدم إعادة الإسناد بدون نوع المتغير."],
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
    causes: ["خطأ إملائي في الاسم.", "المتغير معرّف داخل دالة أخرى.", "نسيت #include للمكتبة التي تعرّف الاسم."],
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
    causes: ["خطأ إملائي في الاسم.", "المتغير معرّف في نطاق آخر أو لم يُعرّف أصلاً."],
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
    causes: ["return داخل if فقط.", "نسيان return في نهاية الدالة."],
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
    fixes: ["ضع اسم المتغير في الجهة اليسرى من =.", "احفظ ناتج الدالة في متغير ثم عدّله."],
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
    fixes: ["أعطِ المتغير قيمة ابتدائية عند التعريف.", "تأكد أن كل المسارات تُسند له قيمة."],
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
    causes: ["خطأ إملائي في الاسم.", "المتغير معرّف داخل كتلة أخرى أو دالة أخرى.", "نسيت تعريف المتغير."],
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
    causes: ["نسيان ; بعد تعليمة أو تعريف.", "سطر ينتهي بشكل غير مكتمل."],
    fixes: ["أضف ; في نهاية السطر المذكور أو السابق له."],
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
    causes: ["إسناد نص إلى متغير رقمي.", "إسناد عدد عشري إلى متغير صحيح."],
    fixes: ["حوّل القيمة صراحة، مثل int.Parse للنص.", "غيّر نوع المتغير ليطابق القيمة."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: لا ترجع الدالة قيمة في كل المسارات",
    explain: "الدالة يجب أن تُرجع قيمة في كل المسارات الممكنة، وهنا يوجد مسار ينتهي دون return.",
    causes: ["return داخل if فقط.", "نسيان return في نهاية الدالة."],
    fixes: ["أضف return في نهاية الدالة.", "أضف else يُرجع قيمة للحالة الأخرى."],
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
    fixes: ["أعطِ المتغير قيمة ابتدائية عند التعريف.", "تأكد أن كل المسارات تُسند له قيمة."],
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
    fixes: ["اجعل العضو static إذا كان مشتركاً.", "أو أنشئ كائناً من الصنف واستخدم العضو من خلاله."],
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
    explain: "تحاول استخدام كائن قيمته null، أي لم يُنشأ بعد أو أُسند له null.",
    causes: ["متغير نصي قيمته null ثم قراءة Length منه.", "كائن لم يُنشأ بـ new.", "قاموس أعاد null لمفتاح غير موجود."],
    fixes: ["تحقق من null قبل الاستخدام بـ if (x != null) أو بـ ?.", "أنشئ الكائن قبل استخدامه."],
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
    causes: ["الفهرس يساوي طول المصفوفة.", "حلقة تتجاوز آخر عنصر."],
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
