export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: نام تعریف‌نشده (name is not defined)",
    explain: "از نام {name} استفاده کرده‌اید، اما قبل از آن در این محدوده تعریف نشده است، یا آن را با شکلی متفاوت از تعریفش نوشته‌اید.",
    causes: ["به متغیر هرگز مقداری داده نشده است.", "غلط املایی در نام.", "استفاده از متغیر قبل از تعریفش، یا خارج از تابعی که در آن تعریف شده است."],
    fixes: ["متغیر را تعریف کنید و قبل از استفاده به آن مقدار بدهید.", "مطمئن شوید نام دقیقاً یکسان نوشته شده است، زیرا Python بین حروف بزرگ و کوچک فرق می‌گذارد."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: ساختار جمله نامعتبر (invalid syntax)",
    explain: "Python کلمه یا نمادی را در جایی یافته که قواعد زبان اجازه نمی‌دهد. خطای واقعی اغلب قبل از سطر ذکرشده است.",
    causes: ["جا افتادن کاما یا قوس یا نماد بین دو عنصر.", "استفاده از = به جای == داخل شرط.", "نوشتن یک کلمه کلیدی به عنوان نام متغیر."],
    fixes: ["سطر ذکرشده و سطر قبل از آن را برای یافتن قوس یا کاما جا افتاده بررسی کنید.", "از == برای مقایسه و از = برای انتساب استفاده کنید."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: ':' مورد انتظار (expected ':')",
    explain: "جمله مرکب مانند if یا for یا while یا def در انتهای سطرش به دونقطه : نیاز دارد.",
    causes: ["جا افتادن دونقطه : بعد از شرط یا نام تابع."],
    fixes: ["قبل از تورفتگی، در انتهای سطر جمله مرکب دونقطه : اضافه کنید."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: متن بسته‌نشده (unterminated string literal)",
    explain: "متنی را با علامت نقل شروع کرده‌اید و در همان سطر آن را نبسته‌اید.",
    causes: ["فراموش کردن علامت نقل در انتهای متن.", "استفاده از دو علامت متفاوت برای باز و بسته کردن."],
    fixes: ["متن را با همان علامتی ببندید که با آن شروع کرده‌اید.", "برای متن‌های چندسطری از \"\"\" \"\"\" استفاده کنید."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: پایان سطر هنگام خواندن متن (EOL while scanning)",
    explain: "Python به پایان سطر رسیده، در حالی که هنوز در حال خواندن متنی است که بسته نشده است.",
    causes: ["علامت نقل در انتهای متن جا افتاده است.", "علامت \\ در انتهای سطر، بستن متن را می‌شکند."],
    fixes: ["علامت نقل بستن مناسب را اضافه کنید.", "Python را به‌روز کنید، یا برای متن‌های چندسطری از \"\"\" استفاده کنید."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: پایان غیرمنتظره فایل (unexpected EOF)",
    explain: "فایل تمام شده، در حالی که Python منتظر تکمیل یک جمله است، معمولاً قوس یا فهرستی که بسته نشده است.",
    causes: ["فهرست یا قوس یا جمله‌ای که در میانه کار رها شده است.", "فراموش کردن بستن آخرین قوس در فایل."],
    fixes: ["جمله را کامل کنید و همه قوس‌های باز را ببندید.", "آخرین سطر فایل را بررسی کنید."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: قوس بسته نشده (was never closed)",
    explain: "قوس {br} را باز کرده‌اید و آن را با قوس مقابلش نبسته‌اید.",
    causes: ["فراموش کردن قوس بسته.", "قوس بسته در جای نادرستی که باعث می‌شود مترجم دنبال قوس دیگری بگردد."],
    fixes: ["قوس بسته مناسب را اضافه کنید.", "از ویرایشگری استفاده کنید که قوس‌های منطبق را رنگی می‌کند."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: قوس بسته زائد (unmatched)",
    explain: "قوس بسته {br} را دیده‌اید که قوس بازِ مقابلش وجود ندارد.",
    causes: ["قوس اضافی در انتهای سطر.", "فراموش کردن قوس باز در ابتدای جمله."],
    fixes: ["قوس اضافی را حذف کنید.", "مطمئن شوید که هر قوس باز، قوس بسته دارد."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: نویسه غیرمجاز (invalid character)",
    explain: "Python نمادی یافته که در کد پذیرفته نمی‌شود، معمولاً علامت نقل فارسی یا هوشمند مانند “ ” یا نویسه‌ای عجیب.",
    causes: ["کپی کردن کد از یک سند که علامت‌های نقل را به علامت‌های هوشمند تبدیل می‌کند.", "نوشتن ویرگول فارسی ، یا نقطه فارسی به جای نمادهای لاتین."],
    fixes: ["علامت‌های نقل هوشمند را با علامت‌های معمولی \" یا ' جایگزین کنید.", "ویرگول فارسی را با کاما انگلیسی , جایگزین کنید."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: خطا در f-string",
    explain: "نحو رشته f-string نادرست است: {detail}.",
    causes: ["قوس { داخل متن بسته نشده است.", "استفاده از همان علامت نقل داخل f-string."],
    fixes: ["هر قوس { را با قوس } ببندید.", "داخل عبارت از علامت نقل متفاوتی استفاده کنید، یا به قالب مناسب نسخه Python خود توجه کنید."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: انتساب به مقدار ثابت امکان‌پذیر نیست (cannot assign to literal)",
    explain: "سعی کرده‌اید به یک عدد یا متن ثابت مقدار بدهید، در حالی که انتساب به نام متغیر نیاز دارد.",
    causes: ["عدد یا متن را به اشتباه در سمت چپ انتساب قرار داده‌اید.", "خلط بین == و = در شرط."],
    fixes: ["نام متغیر را در سمت چپ = قرار دهید.", "برای مقایسه از == استفاده کنید."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: انتساب به فراخوانی تابع امکان‌پذیر نیست (cannot assign to function call)",
    explain: "فراخوانی تابع را در سمت چپ انتساب قرار داده‌اید، در حالی که سمت چپ باید نام متغیر باشد.",
    causes: ["نوشتن () بعد از نام متغیر در سمت چپ انتساب.", "فراموش کردن ==، و نوشتن = داخل شرط."],
    fixes: ["مقدار را در یک متغیر محاسبه کنید و به آن انتساب دهید.", "برای مقایسه از == استفاده کنید."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: قوس‌های print جا افتاده‌اند (Missing parentheses)",
    explain: "print را به سبک Python 2 و بدون قوس نوشته‌اید، در حالی که Python 3 به قوس نیاز دارد.",
    causes: ["کپی کردن یک مثال قدیمی با قالب Python 2.", "فراموش کردن قوس‌های print."],
    fixes: ["متن یا مقدار را داخل قوس print(...) قرار دهید."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: بلوک تورفته مورد انتظار (expected an indented block)",
    explain: "سطر قبلی با دونقطه : تمام شده، پس باید کدی که به داخل تورفته است بیاید، اما تورفتگی ندارد.",
    causes: ["فراموش کردن تورفتگی زیر if یا for یا def.", "بلوک کاملاً خالی بعد از دونقطه."],
    fixes: ["سطر بعدی را با چهار فاصله تورفته کنید.", "اگر بلوک خالی است از pass استفاده کنید."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: تورفتگی غیرمنتظره (unexpected indent)",
    explain: "Python سطری یافته که بی‌دلیل به داخل تورفته است، یعنی به دنبال یک جمله مرکب نیامده.",
    causes: ["فاصله‌های اضافی در ابتدای سطر.", "سطری که از جای دیگری با تورفتگی متفاوتی کپی شده است."],
    fixes: ["فاصله‌های اضافی ابتدای سطر را حذف کنید.", "مطمئن شوید همه سطرهای یک سطح، تورفتگی یکسانی دارند."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: تورفتگی با هیچ سطح بیرونی تطابق ندارد (unindent does not match)",
    explain: "تورفتگی این سطر با هیچ سطح تورفتگی قبلی برابر نیست، پس Python نمی‌داند به کدام بلوک تعلق دارد.",
    causes: ["مخلوط شدن تعداد فاصله‌ها بین سطرها.", "کپی کردن کد با تورفتگی متفاوت."],
    fixes: ["هر سطح کد را با تعداد ثابتی فاصله (4 فاصله) تنظیم کنید.", "از ویرایشگری استفاده کنید که فاصله‌ها را نشان دهد."],
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
    title: "TabError: خلط بین Tab و فاصله",
    explain: "گاهی کلید Tab و گاهی فاصله را برای تورفتگی به کار برده‌اید، و Python این ترکیب را نمی‌پذیرد.",
    causes: ["بعضی سطرها با Tab و بعضی با فاصله شروع می‌شوند.", "تنظیمات ویرایشگر، Tab را به شکل متفاوتی تبدیل می‌کند."],
    fixes: ["فقط از فاصله استفاده کنید (4 فاصله برای هر سطح).", "در ویرایشگر، تبدیل Tab به فاصله را فعال کنید."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: نمی‌توان متن را با مقداری از نوع دیگر ترکیب کرد (can only concatenate str)",
    explain: "سعی کرده‌اید متن را با مقداری از نوع {t} با + ترکیب کنید، و Python انواع را خودکار تبدیل نمی‌کند.",
    causes: ["استفاده از + بین متن و عدد.", "مقداری از input() آمده که همیشه متن است."],
    fixes: ["عدد را با str() به متن تبدیل کنید.", "یا عدد را داخل f-string قرار دهید تا خودکار به متن تبدیل شود."],
    bad: `print("سن: " + 20)`,
    good: `print("سن: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: عملیات پشتیبانی‌نشده بین دو نوع (unsupported operand type(s))",
    explain: "عملگر {op} دو نوع {a} و {b} را با هم نمی‌پذیرد.",
    causes: ["متن با عدد در یک عملیات حسابی.", "مقدار None داخل یک عملیات حسابی."],
    fixes: ["متن را با int() یا float() به عدد تبدیل کنید.", "مطمئن شوید متغیرها قبل از محاسبه، مقدار عددی دارند."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: امکان اندیس‌گذاری NoneType وجود ندارد (not subscriptable)",
    explain: "متغیر مقدارش None است (یعنی هیچ)، و شما با [] می‌خواهید به عنصری از آن دسترسی پیدا کنید.",
    causes: ["تابعی که چیزی برنمی‌گرداند، زیرا return ندارد.", "متغیری که مقداری نگرفته یا از عملیات ناموفقی آمده است."],
    fixes: ["مطمئن شوید تابع با return مقداری برمی‌گرداند.", "قبل از اندیس‌گذاری بررسی کنید که مقدار None نباشد."],
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
    title: "AttributeError: ویژگی یا تابع وجود ندارد (has no attribute)",
    explain: "شیء از نوع {type} ویژگی یا تابع {attr} را ندارد.",
    causes: ["نام تابع یا ویژگی غلط نوشته شده است.", "استفاده از تابعی که متعلق به نوع دیگری است، مانند append روی متن.", "متغیر مقدارش None است."],
    fixes: ["نوع شیء را با type() بررسی کنید.", "مستندات آن نوع را بخوانید تا توابع موجود در آن را بدانید."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: شیء قابل فراخوانی نیست (object is not callable)",
    explain: "سعی کرده‌اید مقداری از نوع {t} را با گذاشتن () مثل تابع فراخوانی کنید.",
    causes: ["گذاشتن () بعد از نام متغیری که مقدار دارد.", "پنهان کردن نام تابع داخلی با یک متغیر، مثلاً str = 5."],
    fixes: ["متغیر را تغییر نام دهید تا روی نام تابع داخلی سایه نیندازد.", "مطمئن شوید واقعاً تابعی را فراخوانی می‌کنید."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: آرگومان‌های کم در فراخوانی تابع (missing required positional argument)",
    explain: "تابع {fn} به {n} آرگومان اضافی نیاز دارد که هنگام فراخوانی ارسال نکرده‌اید.",
    causes: ["فراخوانی تابع بدون ارسال آرگومان موردنیاز.", "تعریف تابع آرگومانی می‌خواهد که به آن نیاز ندارد."],
    fixes: ["مقادیر کم‌شده را هنگام فراخوانی ارسال کنید.", "اگر آرگومان اختیاری است، در تعریف تابع برایش مقدار پیش‌فرض بدهید."],
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
    title: "TypeError: آرگومان‌های زائد در فراخوانی تابع (takes positional arguments but given)",
    explain: "تابع {fn} فقط {n} آرگومان می‌پذیرد، اما شما {m} تا فرستاده‌اید.",
    causes: ["ارسال مقادیری بیشتر از تعداد پارامترهای تعریف.", "تعریف تابع آرگومانی را که ارسال می‌کنید ندارد."],
    fixes: ["مقادیر زائد را از فراخوانی حذف کنید.", "آرگومان کم‌شده را به تعریف تابع اضافه کنید."],
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
    title: "TypeError: شیء قابل پیمایش نیست (object is not iterable)",
    explain: "سعی کرده‌اید روی مقداری از نوع {t} با حلقه for یا با تفکیک مقادیر پیمایش کنید، و این نوع قابل پیمایش نیست.",
    causes: ["فراموش کردن استفاده از range() با عدد در حلقه.", "تابعی که مقداری برنمی‌گرداند، پس نتیجه None است."],
    fixes: ["برای پیمایش روی یک عدد از range(n) استفاده کنید.", "مطمئن شوید قبل از پیمایش، متغیر فهرست یا متن یا مجموعه است."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: اندیس فهرست باید عدد صحیح باشد (list indices)",
    explain: "اندیس فهرست باید عدد صحیح باشد، در حالی که شما مقداری از نوع {t} استفاده کرده‌اید.",
    causes: ["نوشتن اندیس به صورت متن مانند '1'.", "محاسبه اندیس با / که عدد اعشاری تولید می‌کند."],
    fixes: ["از عدد صحیح بدون علامت نقل استفاده کنید.", "استفاده از // به جای / هنگام محاسبه اندیس."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: تبدیل متن به عدد صحیح ممکن نیست (invalid literal for int)",
    explain: "تابع int() نتوانست متن '{v}' را به عدد صحیح تبدیل کند.",
    causes: ["متن شامل حروف یا نمادهای غیرعددی است.", "متن یک عدد اعشاری مانند 3.5 است.", "متن خالی است."],
    fixes: ["برای اعداد اعشاری از float() استفاده کنید.", "قبل از تبدیل، ورودی را بررسی کنید، یا از try و except استفاده کنید."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: مقادیر بیشتر از متغیرها (too many values to unpack)",
    explain: "تعداد متغیرهای تفکیک فقط {n} است، در حالی که فهرست مقادیر بیشتری دارد.",
    causes: ["تعداد نام‌های متغیر کمتر از تعداد عناصر است.", "فهرست طولانی‌تر از حد انتظار است."],
    fixes: ["تعداد متغیرها را افزایش دهید تا با تعداد عناصر برابر شود.", "از *rest برای جمع‌آوری عناصر اضافی استفاده کنید."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: مقادیر کمتر از متغیرها (not enough values to unpack)",
    explain: "سعی می‌کنید مقادیر را در {n} متغیر تفکیک کنید، اما فهرست فقط {g} عنصر دارد.",
    causes: ["تعداد متغیرها بیشتر از تعداد عناصر است.", "تابعی که عناصر کمتری از حد انتظار برمی‌گرداند."],
    fixes: ["تعداد متغیرها را کاهش دهید تا با تعداد عناصر برابر شود.", "طول فهرست را قبل از تفکیک بررسی کنید."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: اندیس خارج از محدوده فهرست (list index out of range)",
    explain: "به موقعیتی در فهرست دسترسی پیدا می‌کنید که وجود ندارد. به یاد داشته باشید که شمارش از 0 شروع می‌شود و تا طول - 1 ادامه دارد.",
    causes: ["اندیس برابر یا بزرگ‌تر از طول فهرست است.", "حلقه‌ای که از آخرین عنصر فهرست فراتر می‌رود."],
    fixes: ["از اندیسی بین 0 و len(فهرست) - 1 استفاده کنید.", "در حلقه‌ها به جای اندیس‌گذاری از for x in list استفاده کنید."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: کلید در دیکشنری وجود ندارد",
    explain: "دیکشنری کلید {key} را ندارد، پس دسترسی با [] ناموفق بود.",
    causes: ["کلید به شکلی متفاوت از کلید ذخیره‌شده نوشته شده است.", "کلید هنوز به دیکشنری اضافه نشده است."],
    fixes: ["از get() با مقدار پیش‌فرض استفاده کنید.", "قبل از دسترسی، با عبارت in وجود کلید را بررسی کنید."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: تقسیم بر صفر",
    explain: "سعی کرده‌اید بر صفر تقسیم کنید، و این عملیات از نظر ریاضی تعریف نشده است.",
    causes: ["مخرج متغیری است که مقدارش صفر است و بررسی نشده است.", "محاسبه میانگین یک فهرست خالی."],
    fixes: ["قبل از تقسیم بررسی کنید که مخرج صفر نباشد.", "شرطی اضافه کنید که حالت خاص را مدیریت کند."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: کتابخانه یافت نشد (No module named)",
    explain: "کتابخانه {mod} نصب نشده است، یا نامش در import با نام بسته متفاوت است.",
    causes: ["کتابخانه را هنوز نصب نکرده‌اید.", "Python را از محیطی اجرا می‌کنید که با محیطی که کتابخانه در آن نصب شده متفاوت است.", "نام import با نام بسته متفاوت است، مانند cv2 برای کتابخانه opencv."],
    fixes: ["کتابخانه را با دستور pip install نام_کتابخانه نصب کنید.", "مطمئن شوید کتابخانه در همان نسخه Python که کد را با آن اجرا می‌کنید نصب شده است."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: نمی‌توان نام را وارد کرد (cannot import name)",
    explain: "ماژول وجود دارد، اما نام {name} در آن تعریف نشده است.",
    causes: ["نوشتن اشتباه املایی نام تابع.", "فایل محلی با نام یک کتابخانه استاندارد، مانند random.py.", "تابع در نسخه دیگری از کتابخانه وجود دارد."],
    fixes: ["برای مطمئن شدن از نام درست، مستندات کتابخانه را بررسی کنید.", "نام فایل محلی را که با نام کتابخانه استاندارد یکی است تغییر دهید."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: فایل یافت نشد (No such file or directory)",
    explain: "فایل {path} در مسیری که برنامه از آن اجرا می‌شود وجود ندارد.",
    causes: ["نام فایل یا پسوند آن اشتباه نوشته شده است.", "پوشه‌ای که برنامه از آن اجرا می‌شود، پوشه‌ای نیست که فایل در آن است."],
    fixes: ["نام فایل و پسوند را بررسی کنید.", "از مسیر کامل استفاده کنید یا پوشه اجرا را بررسی کنید."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: عمق فراخوانی بازگشتی بیش از حد مجاز است (maximum recursion depth)",
    explain: "تابع خودش را بی‌پایان فراخوانی می‌کند و تعداد فراخوانی‌ها از حد مجاز گذشته است.",
    causes: ["نبودن شرط توقف در تابع بازگشتی.", "شرط توقف به دلیل اشتباه منطقی هرگز برقرار نمی‌شود."],
    fixes: ["یک شرط توقف واضح در ابتدای تابع اضافه کنید.", "راه‌حل را به یک حلقه while یا for تبدیل کنید."],
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
    title: "UnboundLocalError: متغیر محلی قبل از انتساب (cannot access local variable)",
    explain: "متغیر {name} را داخل تابعی به کار می‌برید، پیش از آنکه در همان تابع مقداری به آن داده شود.",
    causes: ["تغییر متغیری از بیرون تابع در داخل آن، بدون اعلام global.", "انتساب مقدار به متغیر داخل تابع پس از استفاده از آن."],
    fixes: ["متغیر را به تابع به عنوان آرگومان بدهید و مقدارش را برگردانید.", "یا اگر به تغییر متغیر سراسری نیاز دارید، از global استفاده کنید."],
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
    title: "StopIteration: عناصر تمام شدند (StopIteration)",
    explain: "تکرارکننده (iterator) به انتها رسیده و دیگر عنصری ندارد؛ معمولاً هنگام استفاده از next() رخ می‌دهد.",
    causes: ["فراخوانی next() بیش از تعداد عناصر.", "استفاده مجدد از تکرارکننده‌ای که قبلاً به پایان رسیده است."],
    fixes: ["از next(it, None) استفاده کنید تا هنگام پایان مقداری تعیین شود.", "به جای next() دستی از حلقه for استفاده کنید."],
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
    title: "UnicodeDecodeError: رمزگشایی ناموفق بود (can't decode byte)",
    explain: "فایل با رمزگذاری {codec} که سعی دارید با آن بخوانید، ذخیره نشده است.",
    causes: ["فایل با رمزگذاری UTF-8 ذخیره شده، در حالی که Python آن را با رمزگذاری پیش‌فرض دیگری می‌خواند.", "فایل باینری مانند یک تصویر است و متن نیست."],
    fixes: ["هنگام باز کردن فایل encoding=\"utf-8\" را اضافه کنید.", "اگر فایل باینری است، آن را با حالت \"rb\" باز کنید."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: از محدوده مقدار بیشتر است (OverflowError)",
    explain: "مقدار از حدی که تابع می‌تواند پردازش کند بزرگ‌تر است: {msg}.",
    causes: ["محاسبه توانی بسیار بزرگ مانند exp(1000).", "تبدیل یک عدد بسیار بزرگ به عدد اعشاری."],
    fixes: ["اندازه مقادیر در محاسبه را کم کنید.", "از کتابخانه اعداد بزرگ یا مقادیر کوچک‌تر استفاده کنید."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: متغیر تعریف نشده است (is not defined)",
    explain: "از {name} استفاده می‌کنید، اما در این محدوده آن را تعریف نکرده‌اید، یا نامش را متفاوت از تعریفش نوشته‌اید.",
    causes: ["قبل از تعریف، کلمه let یا const یا var را فراموش کرده‌اید.", "غلط املایی در نام.", "متغیر داخل تابع دیگری تعریف شده، پس از اینجا دیده نمی‌شود.", "فایل اسکریپت یا کتابخانه‌ای که نام را تعریف می‌کند بارگذاری نشده است."],
    fixes: ["متغیر را قبل از استفاده با let یا const تعریف کنید.", "مطمئن شوید حالت حروف در نام یکسان است و فایل موردنظر قبل از کد بارگذاری شده است."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: دسترسی قبل از مقداردهی اولیه (before initialization)",
    explain: "قبل از خطی که آن را تعریف کرده‌اید از {name} استفاده کرده‌اید. متغیرهای let و const مانند var به بالای کد منتقل نمی‌شوند.",
    causes: ["استفاده از متغیر در سطری که بالاتر از تعریف آن است.", "تابعی که متغیری را فراخوانی می‌کند که هنوز ساخته نشده است."],
    fixes: ["تعریف را به قبل از اولین استفاده از آن منتقل کنید.", "تابع را بعد از مقداردهی اولیه متغیرهایی که به آن‌ها وابسته است به کار ببرید."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: خواندن ویژگی از مقدار تهی (Cannot read properties of undefined)",
    explain: "سعی کرده‌اید ویژگی '{p}' را از مقدار {t} بخوانید، و آن مقدار در آن لحظه وجود ندارد.",
    causes: ["متغیری که هنوز مقداری به آن داده نشده است.", "عنصر DOM وجود ندارد، مانند getElementById با شناسه اشتباه.", "داده‌ها هنوز از سرور یا از تابع ناهمگام نرسیده‌اند.", "تابعی که چیزی برنمی‌گرداند، پس نتیجه undefined است."],
    fixes: ["قبل از دسترسی، مقدار را با if یا با علامت ?. بررسی کنید، مانند obj?.name.", "قبل از استفاده مطمئن شوید عنصر در صفحه وجود دارد."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: تنظیم ویژگی روی مقدار تهی (Cannot set properties of undefined)",
    explain: "سعی کرده‌اید ویژگی '{p}' را روی مقدار {t} بنویسید، در حالی که شیء هنوز ساخته نشده است.",
    causes: ["تعریف متغیر شیء بدون دادن مقدار {}.", "شیئی که از تابعی می‌آید که چیزی برنمی‌گرداند."],
    fixes: ["ابتدا شیء را با {} یا با قالب مناسب بسازید.", "قبل از نوشتن روی متغیر، مطمئن شوید که شیء در آن وجود دارد."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: تابع نیست (is not a function)",
    explain: "سعی کرده‌اید {fn} را با گذاشتن () فراخوانی کنید، اما تابع نیست.",
    causes: ["نام تابع غلط املایی دارد.", "تابع هنوز تعریف یا وارد نشده است.", "کتابخانه مقداری از نوع دیگری برمی‌گرداند، مانند export default به جای یک تابع."],
    fixes: ["قبل از فراخوانی، نام و تعریف تابع را بررسی کنید.", "قبل از فراخوانی، نوع مقدار را با typeof بررسی کنید."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: مقدار قابل پیمایش نیست (is not iterable)",
    explain: "سعی کرده‌اید روی {x} با حلقه for...of یا با تفکیک [...] پیمایش کنید، و این مقدار قابل پیمایش نیست.",
    causes: ["استفاده از شیء معمولی {} در for...of.", "تابعی که آرایه برنمی‌گرداند، پس نتیجه undefined است."],
    fixes: ["با شیء از Object.keys یا Object.values یا Object.entries استفاده کنید.", "قبل از پیمایش مطمئن شوید مقدار آرایه یا متن یا Map است."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: تغییر متغیر ثابت (Assignment to constant variable)",
    explain: "متغیرهایی که با const تعریف شده‌اند، پس از تعریف نمی‌توانند مقدارشان را تغییر دهند.",
    causes: ["استفاده از const برای متغیری که بعداً تغییر می‌کند.", "فراموش کردن اینکه مقدار در انتساب مجدد ثابت است."],
    fixes: ["اگر قرار است مقدار را تغییر دهید از let استفاده کنید.", "به جای تغییر ثابت، یک متغیر جدید بسازید."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: نشانه غیرمنتظره (Unexpected token)",
    explain: "JavaScript نمادی یا کلمه‌ای را در جایی یافته که قواعد اجازه نمی‌دهد، و علت معمولاً کمی قبل از سطر ذکرشده است.",
    causes: ["قوس یا کاما اضافی یا کم.", "یک کلمه رزروشده به عنوان نام استفاده شده است.", "کدی داخل تابع که به درستی بسته نشده است."],
    fixes: ["قوس‌ها و کاماهای سطر و سطر قبلی را بررسی کنید.", "از ویرایشگری استفاده کنید که خطاها را نشان دهد و قوس‌ها را تطبیق دهد."],
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
    title: "SyntaxError: متن JSON معتبر نیست (is not valid JSON)",
    explain: "تابع JSON.parse سعی می‌کند متنی را بخواند که قالب JSON درستی ندارد، و معمولاً به جای داده، HTML به آن رسیده است.",
    causes: ["سرور صفحه HTML مانند صفحه خطای 404 را به جای JSON برگردانده است.", "فایل JSON کاما اضافی یا علامت‌های نقل تکی دارد."],
    fixes: ["متن خام را قبل از تحلیل چاپ کنید و محتوایش را بررسی کنید.", "در JSON برای نام کلیدها و متن‌ها از گیومه دوتایی استفاده کنید."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: پایان غیرمنتظره کد (Unexpected end of input)",
    explain: "فایل یا بلوک تمام شده و JavaScript هنوز منتظر بستن یک قوس یا آکولاد است.",
    causes: ["قوس { یا ( بدون بسته شدن.", "بخشی از کد کپی شده و پایانش نادیده گرفته شده است."],
    fixes: ["هر قوسی را که باز کرده‌اید ببندید.", "از ویرایشگری استفاده کنید که قوس‌های باز و بسته را تطبیق دهد."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: ')' در پایان فهرست پارامترها کم است",
    explain: "فراخوانی تابع با قوس ) بسته نشده، قبل از نقطه‌ویرگول یا پایان سطر.",
    causes: ["فراموش کردن قوس بسته در پایان فراخوانی.", "علامت نقل بسته‌نشده داخل پارامترها."],
    fixes: [") را قبل از نقطه‌ویرگول اضافه کنید.", "مطمئن شوید همه علامت‌های نقل داخل فراخوانی بسته شده‌اند."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: نام غیرمنتظره (Unexpected identifier)",
    explain: "JavaScript بعد از یک مقدار یا عبارت، نامی یافته که با نقطه‌ویرگول از هم جدا نشده‌اند، و معمولاً علتش سطری است که نقطه‌ویرگول ندارد.",
    causes: ["فراموش کردن ; در انتهای سطر قبلی.", "نوشتن دو نام پشت‌سرهم بدون نمادی که بینشان جدایی بیندازد."],
    fixes: ["در انتهای هر دستور ; اضافه کنید.", "هر تعریف را در سطر جداگانه‌ای بنویسید."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: نشانه نامعتبر (Invalid or unexpected token)",
    explain: "JavaScript نمادی یافته که در کد پذیرفته نمی‌شود، معمولاً علامت نقل هوشمند یا نویسه نامرئی.",
    causes: ["کپی کردن کد از یک سند که علامت‌های نقل را به علامت‌های هوشمند تبدیل می‌کند.", "علامت نقل به درستی بسته نشده است."],
    fixes: ["علامت‌های نقل هوشمند را با علامت‌های معمولی \" یا ' جایگزین کنید.", "مطمئن شوید هر متن با همان علامت بسته می‌شود."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: متغیر دوبار تعریف شده (has already been declared)",
    explain: "{name} را بیش از یک بار در همان محدوده با let یا const تعریف کرده‌اید.",
    causes: ["کپی کردن سطر تعریف بدون حذف سطر قدیمی.", "دو متغیر با یک نام در همان فایل."],
    fixes: ["تعریف اضافی را حذف کنید یا نامش را تغییر دهید.", "اگر می‌خواهید مقدار تغییر کند، بدون let از انتساب مجدد استفاده کنید."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: await خارج از تابع async",
    explain: "کلمه await را در جایی به کار برده‌اید که مجاز نیست؛ این کلمه فقط داخل تابع async یا در ماژول ES در بالای فایل کار می‌کند.",
    causes: ["فراموش کردن کلمه async قبل از تابع.", "استفاده از await داخل تابع معمولی یا رویداد معمولی."],
    fixes: ["تابع را async کنید.", "یا مستقیماً از then() روی وعد (Promise) استفاده کنید."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: استفاده از import خارج از ماژول ES",
    explain: "Node.js فایل را CommonJS در نظر می‌گیرد، در حالی که نحو import مربوط به ماژول‌های ES است.",
    causes: ["فایل با Node اجرا می‌شود، بدون آنکه مشخص شود که ماژول است.", "کپی کردن یک مثال جدید بدون تنظیم پیکربندی پروژه."],
    fixes: ["در CommonJS به جای import از require استفاده کنید.", "یا در فایل package.json عبارت \"type\": \"module\" را اضافه کنید."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: پر شدن پشته فراخوانی (Maximum call stack size exceeded)",
    explain: "تابع خودش را بی‌پایان فراخوانی می‌کند و پشته اجرا پر شده است.",
    causes: ["نبودن شرط توقف در تابع بازگشتی.", "دو تابع که هر کدام دیگری را بی‌پایان فراخوانی می‌کنند."],
    fixes: ["یک شرط توقف واضح اضافه کنید.", "راه‌حل را به یک حلقه while یا for تبدیل کنید."],
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
    title: "RangeError: طول آرایه نامعتبر (Invalid array length)",
    explain: "طول آرایه باید عدد صحیح مثبت در یک حد مشخص باشد.",
    causes: ["ارسال عدد منفی به Array.", "ارسال مقدار اعشاری یا غیرعددی به‌عنوان طول آرایه."],
    fixes: ["مطمئن شوید طول عدد صحیح مثبت است.", "قبل از ساخت آرایه مقدار را بررسی کنید."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): وعد ردشده بدون مدیریت",
    explain: "وعد (Promise) ناموفق شده، و برای مدیریت خطا catch اضافه نکرده‌اید یا از try و catch همراه با await استفاده نکرده‌اید.",
    causes: ["استفاده از then بدون catch.", "فراخوانی تابع async بدون await یا catch."],
    fixes: ["بعد از زنجیره then، .catch() اضافه کنید.", "کد await را داخل try و catch قرار دهید."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: درخواست به دلیل سیاست اشتراک‌گذاری بین مبداها مسدود شد",
    explain: "مرورگر درخواست را مسدود کرده، زیرا سرور دسترسی از این مبدا (origin) را مجاز نکرده، یا صفحه از file:// باز شده است.",
    causes: ["سرور هدر Access-Control-Allow-Origin را ارسال نمی‌کند.", "صفحه مستقیماً از فایل باز شده، نه از یک سرور محلی."],
    fixes: ["CORS را در سرور فعال کنید تا دامنه موردنظر مجاز شود.", "پروژه را از طریق یک سرور محلی اجرا کنید، نه با باز کردن مستقیم فایل."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: درخواست ناموفق بود (Failed to fetch)",
    explain: "درخواست به سرور نرسید؛ ممکن است شبکه قطع باشد، آدرس اشتباه باشد، سرور خاموش باشد یا CORS مانع شده باشد.",
    causes: ["سرور خاموش است یا آدرس اشتباه نوشته شده است.", "اتصال اینترنت قطع است.", "سیاست CORS درخواست را مسدود می‌کند."],
    fixes: ["آدرس را در مرورگر باز کنید تا مطمئن شوید کار می‌کند.", "تب Network در ابزارهای توسعه‌دهنده را بررسی کنید و CORS را کنترل کنید."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: ماژول پیدا نشد (Cannot find module)",
    explain: "Node.js فایل یا بسته {mod} را پیدا نمی‌کند.",
    causes: ["بسته در پروژه نصب نشده است.", "مسیر نسبی اشتباه است.", "پسوند فایل ناقص است یا فایل وجود ندارد."],
    fixes: ["بسته را با دستور npm install نام_بسته نصب کنید.", "مسیر نسبی و وجود فایل را بررسی کنید."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: پورت از قبل در حال استفاده است",
    explain: "پورتی (port) که می‌خواهید روی آن گوش دهید توسط برنامه دیگری اشغال شده است و احتمالاً یک نسخه دیگر از سرور در حال اجراست.",
    causes: ["اجرای سرور دوبار روی همان پورت.", "برنامه دیگری از پورت استفاده می‌کند."],
    fixes: ["نسخه دیگر سرور را متوقف کنید.", "یا شماره پورت را تغییر دهید."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: فایل یا پوشه وجود ندارد",
    explain: "Node.js سعی کرد فایل یا پوشه‌ای را در مسیر مشخص‌شده باز کند که وجود ندارد.",
    causes: ["نام فایل اشتباه است یا پسوند آن ناقص است.", "مسیر نسبت به پوشه اجرای دیگری است."],
    fixes: ["قبل از خواندن فایل، وجود آن را با fs.existsSync بررسی کنید.", "از مسیری استفاده کنید که بر اساس پوشه فایل فعلی ساخته شده باشد."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: ساختار دوری قابل تبدیل به JSON نیست",
    explain: "شیء یک ارجاع دوری دارد، یعنی مستقیم یا غیرمستقیم به خودش اشاره می‌کند، و JSON.stringify نمی‌تواند آن را تبدیل کند.",
    causes: ["شیئی که ویژگی‌ای دارد که به خودش اشاره می‌کند.", "شیء DOM یا شیء پیچیده‌ای که به JSON.stringify داده می‌شود."],
    fixes: ["ویژگی دوری را قبل از تبدیل حذف کنید.", "به یک شیء ساده که فقط داده‌های موردنیاز را دارد تبدیل کنید."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: نماد پیدا نشد (cannot find symbol)",
    explain: "کامپایلر متغیر، تابع یا کلاسی با این نام پیدا نکرد. به سطر symbol در پیام نگاه کنید تا نام موردنظر را ببینید.",
    causes: ["نام غلط املایی دارد.", "متغیر در محدوده دیگری تعریف شده است.", "import را برای کلاسی مانند ArrayList فراموش کرده‌اید.", "متغیر را اصلاً تعریف نکرده‌اید."],
    fixes: ["نام را مطابق سطر symbol اصلاح کنید.", "import مناسب را اضافه کنید، مانند import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: تبدیل ممکن است بخشی از مقدار را از دست بدهد (possible lossy conversion)",
    explain: "تبدیل از {a} به {b} ممکن است بخشی از مقدار، مانند کسرهای اعشاری، را از دست بدهد، بنابراین Java آن را خودکار نمی‌پذیرد.",
    causes: ["انتساب عدد اعشاری به متغیر صحیح.", "نتیجه تقسیم دو عدد صحیح، کسر دارد."],
    fixes: ["متغیر را از نوع وسیع‌تری مانند double بسازید.", "اگر تبدیل عمدی است، تبدیل صریح مانند (int) به کار ببرید."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: نوع‌های ناسازگار (incompatible types)",
    explain: "سعی می‌کنید مقداری را انتساب دهید که با نوع متغیر سازگار نیست: {a}.",
    causes: ["انتساب متن به متغیر عددی یا برعکس.", "بازگرداندن نوعی متفاوت از نوع تابع."],
    fixes: ["نوع مقدار را با نوع متغیر یکسان کنید.", "اگر تبدیل منطقی است، مقدار را صریحاً تبدیل کنید."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: عبارت return جاافتاده است (missing return statement)",
    explain: "تابع باید در هر مسیر ممکن اجرا مقداری برگرداند، و اینجا مسیری وجود دارد که چیزی برنمی‌گرداند.",
    causes: ["return فقط داخل if بدون مسیر جایگزین.", "فراموش کردن return در انتهای تابع."],
    fixes: ["در انتهای تابع return به عنوان مقدار پیش‌فرض اضافه کنید.", "یک else اضافه کنید که برای حالت دیگر مقدار برگرداند."],
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
    title: "error: نقطه‌ویرگول ; مورد انتظار است",
    explain: "نقطه‌ویرگول ; را در انتهای دستور فراموش کرده‌اید، و Java همیشه به آن نیاز دارد.",
    causes: ["نبودن ; بعد از یک دستور یا تعریف.", "سطری که به شکل ناکامل تمام شده است."],
    fixes: ["; را در انتهای سطر ذکرشده یا سطر قبل از آن اضافه کنید."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: نام فایل با کلاس عمومی مطابقت ندارد (is public, should be declared in a file named)",
    explain: "کلاس عمومی {cls} باید داخل فایلی باشد که نامش دقیقاً {file} است.",
    causes: ["نامگذاری فایل با نامی غیر از نام کلاس عمومی.", "وجود دو کلاس عمومی در یک فایل."],
    fixes: ["فایل را تغییر نام دهید تا با نام کلاس عمومی یکی شود.", "یا کلاس را با حذف public غیرعمومی کنید."],
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
    title: "error: دستور غیرقابل دسترسی (unreachable statement)",
    explain: "بعد از return یا break یا throw سطری وجود دارد که هرگز اجرا نمی‌شود، پس کامپایلر آن را رد می‌کند.",
    causes: ["نوشتن کد بلافاصله بعد از return.", "حلقه while(true) بدون break قبل از کد بعدی."],
    fixes: ["سطر را قبل از return منتقل کنید.", "کدی را که هرگز اجرا نمی‌شود حذف کنید."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: متغیر ممکن است مقداردهی نشده باشد (might not have been initialized)",
    explain: "متغیر {v} ممکن است در بعضی مسیرهای اجرا قبل از استفاده مقداری نگیرد.",
    causes: ["تعریف متغیر بدون مقدار و سپس استفاده از آن.", "انتساب مقدار داخل if بدون else."],
    fixes: ["به متغیر هنگام تعریف یک مقدار اولیه بدهید.", "مطمئن شوید هر مسیر به متغیر مقدار می‌دهد."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: عضو غیر static از زمینه static (non-static from static context)",
    explain: "{m} عضو غیر static است و نمی‌توان مستقیماً از main یا هر تابع static بدون شیء از آن استفاده کرد.",
    causes: ["فراخوانی تابع معمولی مستقیماً از main.", "متغیر معمولی داخل کلاس که از تابع static استفاده می‌کنید."],
    fixes: ["اگر عضو مشترک است، آن را static کنید.", "یا از کلاس شیء بسازید و عضو را از طریق آن فراخوانی کنید."],
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
    title: "NullPointerException: اشاره‌گر تهی (null)",
    explain: "سعی می‌کنید از شیئی استفاده کنید که مقدارش null است، یعنی هنوز ساخته نشده یا null به آن داده شده است.",
    causes: ["متغیر رشته‌ای که null به آن داده شده و سپس متدش فراخوانی شده است.", "شیئی که با new ساخته نشده است.", "Map.get برای کلید ناموجود مقدار null برگردانده است."],
    fixes: ["شیء را قبل از استفاده بسازید.", "با if (x != null) مقدار null را بررسی کنید یا از Objects.requireNonNull استفاده کنید."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: اندیس خارج از محدوده آرایه",
    explain: "سعی کرده‌اید به اندیس {i} دسترسی پیدا کنید، در حالی که طول آرایه {n} است. اندیس‌ها از 0 شروع می‌شوند و به طول - 1 ختم می‌شوند.",
    causes: ["اندیس دقیقاً برابر طول است.", "حلقه‌ای که از آخرین عنصر فراتر می‌رود."],
    fixes: ["از اندیسی بین 0 و طول - 1 استفاده کنید.", "اگر به اندیس نیاز ندارید، از حلقه for-each استفاده کنید."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: اندیس خارج از محدوده متن",
    explain: "اندیس درخواستی از متن خارج از محدوده آن است، و این با charAt یا substring رخ می‌دهد.",
    causes: ["استفاده از charAt با اندیسی برابر طول متن.", "substring با حدود اشتباه."],
    fixes: ["مطمئن شوید اندیس بین 0 و طول متن - 1 است.", "طول متن را قبل از استخراج بررسی کنید."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException: تقسیم بر صفر",
    explain: "تقسیم عدد صحیح بر صفر، و این در Java برای اعداد صحیح مجاز نیست.",
    causes: ["مخرج متغیری است که مقدارش صفر است.", "محاسبه میانگین یک فهرست خالی."],
    fixes: ["بررسی کنید که مخرج صفر نباشد.", "اگر برای محاسبه مناسب است از double استفاده کنید."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException: متنی که نماینده عدد صحیح نیست",
    explain: "تابع نتوانست متن «{v}» را به عدد تبدیل کند، زیرا حروف یا ویرگول اعشاری دارد.",
    causes: ["متنی که حروف یا فاصله دارد.", "عدد اعشاری که به int تبدیل می‌شود."],
    fixes: ["برای اعداد اعشاری از Double.parseDouble استفاده کنید.", "متن را با matches یا try و catch بررسی کنید."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException: تبدیل نوع ناسازگار",
    explain: "سعی کرده‌اید شیئی از نوع {a} را به {b} تبدیل کنید، در حالی که از آن نوع نیست.",
    causes: ["تبدیل Object به نوعی که با شیء واقعی همخوانی ندارد.", "عناصر فهرستی با نوع‌های مختلط."],
    fixes: ["قبل از تبدیل، نوع را با instanceof بررسی کنید.", "مطمئن شوید هنگام افزودن، مقدار از نوع درست است."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException: ورودی با نوع موردنظر همخوانی ندارد",
    explain: "Scanner نوع خاصی را انتظار داشت، مانند عدد صحیح، اما متن یا برعکس یافت.",
    causes: ["کاربر به جای عدد حروف وارد کرده است.", "ترتیب nextInt و nextLine درست نیست."],
    fixes: ["قبل از خواندن با hasNextInt() بررسی کنید.", "کل سطر را با nextLine بخوانید و سپس تبدیلش کنید."],
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
    title: "ConcurrentModificationException: تغییر فهرست هنگام پیمایش آن",
    explain: "فهرست را هنگام پیمایش با حلقه for-each تغییر دادید، و Java ادامه را نمی‌پذیرد.",
    causes: ["حذف عنصری از فهرست داخل for-each.", "افزودن عنصر به فهرست داخل همان حلقه."],
    fixes: ["برای حذف عناصر از removeIf استفاده کنید.", "یا از Iterator همراه با متد remove آن استفاده کنید."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError: پر شدن پشته",
    explain: "فراخوانی بازگشتی بی‌پایان، یعنی تابعی که خودش را بدون شرط خروج فراخوانی می‌کند، و پشته اجرا پر شده است.",
    causes: ["نبودن شرط توقف در تابع بازگشتی.", "شرط توقف هرگز برقرار نمی‌شود."],
    fixes: ["یک شرط توقف واضح در ابتدای تابع اضافه کنید.", "راه‌حل را به یک حلقه تبدیل کنید."],
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
    title: "OutOfMemoryError: نفاد حافظه",
    explain: "برنامه حافظه‌ای بیشتر از آنچه در دسترس است درخواست می‌کند، و معمولاً به دلیل حلقه‌ای است که بی‌پایان شیء می‌سازد یا داده‌های بسیار حجیم.",
    causes: ["حلقه‌ای که بی‌وقفه شیء به فهرست اضافه می‌کند.", "بارگذاری کامل یک فایل بزرگ در حافظه."],
    fixes: ["داده‌ها را در دسته‌های کوچک پردازش کنید.", "فهرست‌هایی را که دیگر به آن‌ها نیاز ندارید خالی کنید."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error: استثنای مدیریت‌نشده (unreported exception)",
    explain: "تابع استثنای {e} را پرتاب می‌کند که از نوع checked است، بنابراین باید آن را با try و catch مدیریت کنید یا در throws اعلام کنید.",
    causes: ["فراخوانی تابعی که استثنای checked پرتاب می‌کند، بدون مدیریت.", "پرتاب استثنای checked داخل تابعی که آن را اعلام نمی‌کند."],
    fixes: ["فراخوانی را با try و catch بپیچید.", "یا throws {e} را به تعریف تابع اضافه کنید."],
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
    title: "error: فایل پیش از کامل شدن کد تمام شد (reached end of file while parsing)",
    explain: "فایل تمام شده، در حالی که قوس { بسته نشده است، پس تعریف کلاس یا تابع کامل نشده است.",
    causes: ["فراموش کردن قوس بسته } در انتهای تابع یا کلاس.", "قوس اضافی یا کم در میانه کد."],
    fixes: ["قوس بسته کم‌شده را اضافه کنید.", "از ویرایشگری استفاده کنید که قوس‌ها را تطبیق دهد تا خطا را پیدا کنید."],
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
    title: "error: متغیر دوبار تعریف شده (is already defined)",
    explain: "متغیر {v} را بیش از یک بار در همان محدوده تعریف کرده‌اید.",
    causes: ["کپی کردن سطر تعریف بدون حذف سطر قدیمی.", "تعریف متغیر یک بار داخل حلقه و یک بار بیرون آن با همان نام."],
    fixes: ["تعریف اضافی را حذف کنید یا نامش را تغییر دهید.", "انتساب مجدد را بدون نوع متغیر به کار ببرید."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error: مترجم نشانه‌ای را قبل از کلمه ذکرشده انتظار داشت (expected before)",
    explain: "مترجم {what} را در موقعیت ذکرشده انتظار داشت، اما چیز دیگری یافت، و خطا معمولاً در سطر قبل از محل پیام است.",
    causes: ["فراموش کردن نقطه‌ویرگول ; در انتهای سطر قبلی.", "قوس بسته‌نشده در سطر قبلی."],
    fixes: ["; را اضافه کنید یا قوس سطر قبلی را ببندید.", "به یاد داشته باشید که مترجم گاهی به سطر بعد از خطای واقعی اشاره می‌کند."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error: نام در این محدوده تعریف نشده است (was not declared in this scope)",
    explain: "متغیر یا تابع {n} در این قسمت از کد تعریف نشده است.",
    causes: ["غلط املایی در نام.", "متغیر داخل تابع دیگری تعریف شده است.", "فراموش کردن #include برای کتابخانه‌ای که نام را تعریف می‌کند."],
    fixes: ["نام را قبل از استفاده تعریف کنید یا آن را به عنوان پارامتر بفرستید.", "#include مناسب را در بالای فایل اضافه کنید."],
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
    title: "error: شناسه اعلام‌نشده (use of undeclared identifier)",
    explain: "مترجم clang تعریف {n} را در این محدوده پیدا نکرد.",
    causes: ["غلط املایی در نام.", "متغیر در محدوده دیگری تعریف شده یا اصلاً تعریف نشده است."],
    fixes: ["نام را اصلاح کنید یا قبل از استفاده، متغیر را تعریف کنید."],
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
    title: "undefined reference: پیوندزن تعریف را پیدا نکرد",
    explain: "شما {s} را اعلام کرده‌اید، ولی تعریفش را ننوشته‌اید، یا فایلی را که تعریفش در آن است هنگام ترجمه پیوند نزده‌اید.",
    causes: ["فراموش کردن نوشتن بدنه تابع.", "نفرستادن فایل منبعی که تابع را تعریف می‌کند به مترجم.", "خطا در کتابخانه پیوندی یا ترتیب پیوند."],
    fixes: ["تعریف تابع یا متغیر را بنویسید.", "فایل منبع یا کتابخانه را به دستور ترجمه اضافه کنید."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault: دسترسی به حافظه غیرمجاز",
    explain: "برنامه سعی کرده به حافظه‌ای دسترسی پیدا کند که مال آن نیست، معمولاً اشاره‌گر تهی، اندیس خارج از آرایه، یا اشاره‌گری که آزاد شده است.",
    causes: ["اشاره‌گری که مقداردهی نشده یا مقدارش NULL است و سپس استفاده شده است.", "اندیسی خارج از حدود آرایه.", "استفاده از حافظه بعد از free."],
    fixes: ["قبل از استفاده مطمئن شوید اشاره‌گر به حافظه معتبری اشاره می‌کند.", "برنامه را با gdb یا valgrind اجرا کنید تا سطر را پیدا کنید."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function: فراخوانی تابع قبل از اعلام آن",
    explain: "تابع {f} را پیش از تعریف یا اعلام آن فراخوانی کرده‌اید، پس مترجم نوع آن را خودکار حدس زده است.",
    causes: ["تابع در پایین فایل تعریف شده، پس از فراخوانی.", "فراموش کردن #include فایلی که تابع را اعلام می‌کند."],
    fixes: ["اعلان تابع (prototype) را قبل از main قرار دهید.", "#include فایل صحیح را اضافه کنید."],
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
    title: "error: مترجم عبارت را انتظار داشت (expected primary-expression)",
    explain: "مترجم در این موقعیت مقدار یا متغیر انتظار داشت، اما نمادی یافت که در این جا مناسب نیست.",
    causes: ["نشانه = بدون مقداری پس از آن.", "قوس یا کاما در جایی که عبارت آن‌ها را نمی‌پذیرد."],
    fixes: ["مقدار موردنظر را پس از = یا داخل قوس‌ها بنویسید.", "کاماها و قوس‌ها را قبل از مکان ذکرشده بررسی کنید."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error: تبدیل نوع نامعتبر (invalid conversion)",
    explain: "سعی کرده‌اید {a} را به {b} تبدیل کنید، به شکلی که در C یا C++ مجاز نیست.",
    causes: ["انتساب مقداری به اشاره‌گر بدون آدرس.", "خلط بین نوع مقدار و نوع اشاره‌گر."],
    fixes: ["آدرس متغیر را با & به اشاره‌گر انتساب دهید.", "مطمئن شوید نوع‌ها مطابقت دارند یا صریحاً تبدیل کنید."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error: تابع مطابقی برای فراخوانی وجود ندارد (no matching function for call)",
    explain: "فراخوانی {f} از نظر تعداد یا نوع آرگومان‌ها با هیچ تعریفی از تابع مطابقت ندارد.",
    causes: ["ارسال تعداد آرگومانی متفاوت با تعریف.", "ارسال نوعی که به نوع موردنیاز تبدیل نمی‌شود."],
    fixes: ["آرگومان‌ها را با تعریف تابع تطبیق دهید.", "امضای تابع را در مستندات یا فایل سرآیند بررسی کنید."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error: بازتعریف (redefinition of)",
    explain: "{n} را بیش از یک بار در همان محدوده تعریف یا اعلام کرده‌اید.",
    causes: ["کپی کردن سطر تعریف بدون حذف سطر قدیمی.", "فایل سرآیند بدون محافظ بیش از یک بار درج شده است."],
    fixes: ["تعریف اضافی را حذف کنید.", "محافظ سرآیند #ifndef یا #pragma once را به فایل سرآیند اضافه کنید."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error: انواع متناقض (conflicting types)",
    explain: "اعلان اول {n} از نظر نوع بازگشتی یا پارامترها با اعلان یا تعریف بعدی متفاوت است.",
    causes: ["تغییر نوع بازگشتی بین اعلان و تعریف.", "تفاوت تعداد یا نوع پارامترها بین دو نسخه."],
    fixes: ["امضا را در اعلان و تعریف یکسان کنید.", "اعلان را به‌روز کنید تا با تعریف مطابقت داشته باشد."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning: تابع بدون return تمام می‌شود (control reaches end)",
    explain: "از تابع انتظار می‌رود مقداری برگرداند، اما بعضی مسیرها بدون return تمام می‌شوند، و این رفتار تعریف‌نشده است.",
    causes: ["return فقط داخل if.", "فراموش کردن return در انتهای تابع."],
    fixes: ["return را در انتهای تابع اضافه کنید.", "مطمئن شوید هر مسیر مقداری برمی‌گرداند."],
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
    title: "stack smashing detected: نوشتن خارج از حدود پشته",
    explain: "خارج از حدود آرایه‌ای در پشته نوشته‌اید و داده‌های محافظت‌شده را خراب کرده‌اید، معمولاً به دلیل strcpy یا اندیس اضافی.",
    causes: ["کپی متنی که از آرایه بلندتر است با strcpy.", "حلقه‌ای که بعد از پایان آرایه می‌نویسد."],
    fixes: ["از strncpy با اندازه آرایه استفاده کنید و مطمئن شوید متن با صفر تمام شده است.", "قبل از نوشتن، مرزها را بررسی کنید."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning: اندیس خارج از حدود آرایه (array subscript out of bounds)",
    explain: "کد از خارج از حدود آرایه می‌خواند یا می‌نویسد، و این رفتار غیرمنتظره ایجاد می‌کند.",
    causes: ["اندیسی برابر یا بزرگ‌تر از اندازه آرایه.", "حلقه‌ای که تا اندازه می‌شمارد، به جای اندازه - 1."],
    fixes: ["از اندیس‌های 0 تا اندازه - 1 استفاده کنید.", "قبل از دسترسی به اندیس، آن را بررسی کنید."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer یا double free",
    explain: "حافظه‌ای را که قبلاً آزاد شده آزاد کرده‌اید، یا اشاره‌گری را آزاد کرده‌اید که از malloc نیامده است.",
    causes: ["فراخوانی free دوبار روی همان اشاره‌گر.", "آزاد کردن اشاره‌گری که به متغیر محلی یا داخل آرایه اشاره می‌کند."],
    fixes: ["بعد از free اشاره‌گر را روی NULL قرار دهید.", "مطمئن شوید هر حافظه فقط یک بار و از همان منبع آزاد می‌شود."],
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
    title: "multiple definition: تعریف تکراری در بیش از یک فایل",
    explain: "تعریف {n} در بیش از یک فایل منبع وجود دارد، معمولاً به این دلیل که یک فایل سرآیند تعریف دارد، نه فقط اعلان.",
    causes: ["نوشتن تعریف متغیر یا تابع داخل فایل سرآیند.", "درج فایل سرآیند در بیش از یک فایل منبع."],
    fixes: ["فایل سرآیند را فقط اعلان کنید، با استفاده از extern یا prototype.", "تعریف را در یک فایل منبع قرار دهید."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error: مقدار قابل انتساب لازم است (lvalue required)",
    explain: "سعی کرده‌اید به عبارتی انتساب دهید که مکانی در حافظه ندارد، مانند مقدار ثابت یا خروجی تابع.",
    causes: ["قرار دادن عدد در سمت چپ انتساب.", "تلاش برای افزایش مقداری که از تابع می‌آید."],
    fixes: ["نام متغیر را در سمت چپ = قرار دهید.", "خروجی تابع را در یک متغیر ذخیره کنید و سپس آن را تغییر دهید."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning: مقایسه عدد علامت‌دار با بی‌علامت (signedness)",
    explain: "عدد علامت‌دار (signed) را با عدد بی‌علامت (unsigned) مقایسه کرده‌اید، پس مقدار منفی به عدد بزرگی تبدیل می‌شود و نتیجه تغییر می‌کند.",
    causes: ["استفاده از size_t یا unsigned int همراه با int در حلقه‌ها.", "شمارنده صحیح با طول آرایه مقایسه می‌شود."],
    fixes: ["هر دو نوع را از نظر علامت یکسان کنید.", "در هر دو متغیر از نوع یکسان استفاده کنید."],
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
    title: "warning: قالب چاپ با نوع متغیر تطابق ندارد (format expects argument)",
    explain: "قالب چاپ %{f} نوع {t} را انتظار دارد، اما متغیر ارسال‌شده از نوع دیگری است، و این ممکن است مقادیر نادرستی چاپ کند.",
    causes: ["استفاده از %d برای عدد اعشاری.", "فراموش کردن نوع متغیر هنگام تغییر کد."],
    fixes: ["از %f برای اعداد اعشاری و از %d برای اعداد صحیح استفاده کنید.", "مطمئن شوید هر قالب با نوع متغیرش تطابق دارد."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning: متغیر پیش از مقداردهی اولیه خوانده می‌شود (used uninitialized)",
    explain: "متغیر {v} پیش از آنکه مقداری بگیرد خوانده می‌شود، پس مقدارش تصادفی است.",
    causes: ["تعریف متغیر بدون مقدار اولیه.", "انتساب مقدار فقط در یک مسیر شرطی."],
    fixes: ["به متغیر هنگام تعریف یک مقدار اولیه بدهید.", "مطمئن شوید که همه مسیرها به متغیر مقدار می‌دهند."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error: فایل درج‌شده وجود ندارد (No such file or directory)",
    explain: "فایلی که #include درخواست کرده، یعنی {f}، در مسیرهای جستجو وجود ندارد.",
    causes: ["نام فایل اشتباه نوشته شده است.", "فایل در همان پوشه یا در مسیرهای کامپایلر نیست.", "فایل سرآیند کتابخانه نصب نشده است."],
    fixes: ["نام فایل را در #include اصلاح کنید.", "از \" \" برای فایل‌های محلی و از < > برای کتابخانه‌های سیستم استفاده کنید."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing: استثنای گرفته‌نشده",
    explain: "استثنای {ex} پرتاب شد و با هیچ catch گرفته نشد، پس برنامه پایان یافت. احتمالاً هنگام استفاده از at() از حدود vector یا string خارج شده‌اید.",
    causes: ["استفاده از at() با اندیسی خارج از حدود.", "استثنای پرتاب‌شده بدون try و catch."],
    fixes: ["قبل از استفاده از at() اندیس را بررسی کنید.", "کدی را که ممکن است استثنا پرتاب کند با try و catch بپیچید."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103: نام در زمینه فعلی وجود ندارد",
    explain: "متغیر یا تابع {n} در این محدوده تعریف نشده است.",
    causes: ["غلط املایی در نام.", "متغیر داخل بلوک دیگری یا تابع دیگری تعریف شده است.", "تعریف متغیر را فراموش کرده‌اید."],
    fixes: ["متغیر را قبل از استفاده تعریف کنید.", "مطمئن شوید حالت حروف در نام یکسان است."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002: نقطه‌ویرگول ; مورد انتظار است",
    explain: "نقطه‌ویرگول ; را در انتهای دستور فراموش کرده‌اید، و C# به آن نیاز دارد.",
    causes: ["نبودن ; بعد از یک دستور یا تعریف.", "سطری که به شکل ناکامل تمام شده است."],
    fixes: ["; را در انتهای سطر ذکرشده یا سطر قبل از آن اضافه کنید."],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029: تبدیل ضمنی بین دو نوع ممکن نیست",
    explain: "C# به‌طور خودکار از {a} به {b} تبدیل نمی‌کند، زیرا ممکن است داده از دست برود یا دو نوع سازگار نباشند.",
    causes: ["انتساب متن به متغیر عددی.", "انتساب عدد اعشاری به متغیر صحیح."],
    fixes: ["مقدار را صریحاً تبدیل کنید، مانند int.Parse برای متن.", "نوع متغیر را تغییر دهید تا با مقدار تطابق داشته باشد."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: تابع در همه مسیرها مقداری برنمی‌گرداند",
    explain: "تابع باید در همه مسیرهای ممکن مقدار برگرداند، و اینجا مسیری وجود دارد که بدون return تمام می‌شود.",
    causes: ["return فقط داخل if.", "فراموش کردن return در انتهای تابع."],
    fixes: ["return را در انتهای تابع اضافه کنید.", "یک else اضافه کنید که برای حالت دیگر مقدار برگرداند."],
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
    title: "CS0246: نوع یا فضای نام پیدا نشد",
    explain: "C# نوع یا فضای نام {t} را پیدا نکرد، احتمالاً به این دلیل که using مناسب را ننوشته‌اید یا کتابخانه را اضافه نکرده‌اید.",
    causes: ["فراموش کردن using برای فضای نام مانند System.Collections.Generic.", "غلط املایی در نام نوع."],
    fixes: ["using مناسب را در بالای فایل اضافه کنید.", "نام نوع را بررسی کنید و اگر از کتابخانه خارجی است، بسته را اضافه کنید."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165: متغیر محلی پیش از انتساب استفاده شده است",
    explain: "متغیر محلی {v} پیش از آنکه مقداری به آن داده شود استفاده می‌شود.",
    causes: ["تعریف متغیر بدون مقدار و سپس خواندن آن.", "انتساب مقدار فقط داخل if."],
    fixes: ["به متغیر هنگام تعریف یک مقدار اولیه بدهید.", "مطمئن شوید که همه مسیرها به متغیر مقدار می‌دهند."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120: برای دسترسی به عضو غیر static شیء لازم است",
    explain: "{m} عضو غیر static است و به شیء نیاز دارد، و نمی‌توان مستقیماً از تابع static به آن دسترسی داشت.",
    causes: ["استفاده از عضو معمولی داخل تابع static.", "فراموش کردن ساختن شیء از کلاس."],
    fixes: ["اگر عضو مشترک است، آن را static کنید.", "یا از کلاس شیء بسازید و عضو را از طریق آن به کار ببرید."],
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
    title: "NullReferenceException: ارجاع تهی (null)",
    explain: "سعی می‌کنید از شیئی استفاده کنید که مقدارش null است، یعنی هنوز ساخته نشده یا null به آن داده شده است.",
    causes: ["متغیر رشته‌ای که مقدارش null است و سپس Length از آن خوانده شده.", "شیئی که با new ساخته نشده است.", "دیکشنری برای کلید ناموجود null برگردانده است."],
    fixes: ["قبل از استفاده، null را با if (x != null) یا با ?. بررسی کنید.", "شیء را قبل از استفاده بسازید."],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException: اندیس خارج از محدوده آرایه",
    explain: "سعی کرده‌اید به اندیسی خارج از آرایه دسترسی پیدا کنید، و اندیس‌ها از 0 شروع می‌شوند و به طول - 1 ختم می‌شوند.",
    causes: ["اندیس برابر طول آرایه است.", "حلقه‌ای که از آخرین عنصر فراتر می‌رود."],
    fixes: ["از اندیس‌های 0 تا طول - 1 استفاده کنید.", "اگر به اندیس نیاز ندارید از foreach استفاده کنید."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException: قالب متن نامعتبر است",
    explain: "متن با قالب موردنیاز تبدیل مطابقت ندارد، مانند int.Parse روی متن غیرعددی.",
    causes: ["متنی که هنگام تبدیل به عدد حروف دارد.", "متن خالی هنگام تبدیل."],
    fixes: ["برای بررسی پیش از تبدیل از int.TryParse استفاده کنید.", "قبل از تبدیل ورودی را بررسی کنید."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException: تبدیل نوع نامعتبر",
    explain: "سعی کرده‌اید شیئی از نوع {a} را به {b} تبدیل کنید، در حالی که از آن نوع نیست.",
    causes: ["تبدیل object به نوعی که با مقدار واقعی تطابق ندارد.", "عناصر با نوع‌های مختلف داخل یک مجموعه."],
    fixes: ["قبل از تبدیل نوع را با is بررسی کنید.", "برای تبدیل ایمن از as استفاده کنید."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException: تقسیم بر صفر",
    explain: "تقسیم عدد صحیح بر صفر، و این در C# استثنا پرتاب می‌کند.",
    causes: ["مخرج متغیری است که مقدارش صفر است.", "محاسبه میانگین یک مجموعه خالی."],
    fixes: ["بررسی کنید که مخرج صفر نباشد.", "اگر محاسبه ممکن است کسری باشد از double استفاده کنید."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
