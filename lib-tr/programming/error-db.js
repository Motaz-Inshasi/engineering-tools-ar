export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: tanımlı olmayan ad (name is not defined)",
    explain: "{name} adını kullanıyorsunuz ama bu kapsamda daha önce tanımlanmamış ya da tanımından farklı yazılmış.",
    causes: ["Değişkene hiç değer atanmamış.", "Adda yazım hatası var.", "Değişken, tanımlanmadan önce ya da tanımlandığı fonksiyonun dışında kullanılıyor."],
    fixes: ["Değişkeni kullanmadan önce tanımlayın ve bir değer atayın.", "Adın harf harf aynı olduğundan emin olun; Python büyük ve küçük harfleri ayırt eder."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: geçersiz sözdizimi (invalid syntax)",
    explain: "Python, dil kurallarına aykırı bir sözcük ya da simge buldu. Gerçek hata çoğu zaman belirtilen satırdan önce yer alır.",
    causes: ["İki öğe arasındaki virgülü, parantezi ya da simgeyi unutmuşsunuz.", "Koşulda == yerine = kullanılmış.", "Ayrılmış bir sözcük değişken adı olarak yazılmış."],
    fixes: ["Belirtilen satırı ve bir önceki satırı eksik parantez ya da virgül açısından inceleyin.", "Karşılaştırma için == , atama için = kullanın."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: ':' bekleniyordu (expected ':')",
    explain: "if, for, while ya da def gibi bileşik bir ifadenin satırının sonunda iki nokta : olmalıdır.",
    causes: ["Koşuldan ya da fonksiyon adından sonra iki noktayı : unutmuşsunuz."],
    fixes: ["Bileşik ifade satırının sonuna, girintiden önce : ekleyin."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: kapatılmamış metin (unterminated string literal)",
    explain: "Bir metni tırnak işaretiyle başlatmış ama aynı satırda kapatmamışsınız.",
    causes: ["Metnin sonundaki tırnak işaretini unutmuşsunuz.", "Açılış ve kapanış için farklı tırnak işaretleri kullanılmış."],
    fixes: ["Metni açtığınız tırnak işaretiyle kapatın.", "Çok satırlı metinler için \"\"\" \"\"\" kullanın."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: metin okunurken satır sonu (EOL while scanning)",
    explain: "Python, hâlâ kapatılmamış bir metni okurken satırın sonuna ulaştı.",
    causes: ["Metnin sonunda tırnak işareti eksik.", "Satır sonundaki \\ işareti kapanışı bozuyor."],
    fixes: ["Uygun kapanış tırnak işaretini ekleyin.", "Python'u güncelleyin ya da çok satırlı metinler için \"\"\" kullanın."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: beklenmeyen dosya sonu (unexpected EOF)",
    explain: "Dosya bitti ama Python hâlâ bir ifadenin tamamlanmasını bekliyor; genellikle kapatılmamış bir parantez ya da liste var.",
    causes: ["Bir liste, parantez ya da ifade ortasında kalmış.", "Dosyadaki son parantezi kapatmayı unutmuşsunuz."],
    fixes: ["İfadeyi tamamlayın ve açık kalan tüm parantezleri kapatın.", "Dosyadaki son satırı inceleyin."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: parantez kapatılmadı (was never closed)",
    explain: "{br} parantezini açmışsınız ama karşılık gelen kapanış parantezi ile kapatmamışsınız.",
    causes: ["Kapanış parantezini unutmuşsunuz.", "Yanlış yerdeki kapanış parantezi, derleyicinin başka bir parantez aramasına neden oluyor."],
    fixes: ["Uygun kapanış parantezini ekleyin.", "Eşleşen parantezleri renklendiren bir editör kullanın."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: fazla kapanış parantezi (unmatched)",
    explain: "{br} kapanış parantezi buldum ama karşılığında bir açılış parantezi yok.",
    causes: ["Satır sonunda fazla parantez var.", "İfadenin başında açılış parantezini unutmuşsunuz."],
    fixes: ["Fazla parantezi silin.", "Her açılış parantezinin bir kapanışı olduğundan emin olun."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: geçersiz karakter (invalid character)",
    explain: "Python kabul etmeyen bir simge buldu; genellikle “ ” gibi akıllı tırnak işareti ya da yabancı bir karakter.",
    causes: ["Kodu, tırnak işaretlerini akıllı tırnağa çeviren bir belgeden kopyalamışsınız.", "Latin virgül yerine Arapça virgül ، ya da nokta yazmışsınız."],
    fixes: ["Akıllı tırnak işaretlerini normal \" ya da ' ile değiştirin.", "Arapça virgülü İngilizce virgül , ile değiştirin."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: f-string hatası",
    explain: "f-string ifadesinin biçimi geçersiz: {detail}.",
    causes: ["Metin içindeki { parantezi kapatılmamış.", "f-string içinde aynı tırnak işaretini kullanmışsınız."],
    fixes: ["Her { parantezini bir } ile kapatın.", "İfade içinde farklı bir tırnak işareti kullanın ya da Python sürümünüze uygun biçimi seçin."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: sabit değere atama yapılamaz (cannot assign to literal)",
    explain: "Sabit bir sayıya ya da metne atama yapmaya çalıştınız; atama için değişken adı gerekir.",
    causes: ["Sayıyı ya da metni atamanın sol tarafına yanlışlıkla yazmışsınız.", "Koşulda == ile = karıştırılmış."],
    fixes: ["Değişken adını = işaretinin soluna yazın.", "Karşılaştırma yaparken == kullanın."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: fonksiyon çağrısına atama yapılamaz (cannot assign to function call)",
    explain: "Atamanın sol tarafına bir fonksiyon çağrısı yazmışsınız; sol taraf bir değişken adı olmalıdır.",
    causes: ["Atamanın sol tarafındaki değişken adından sonra () yazmışsınız.", "== yerine = yazarak bir koşul içinde atama yapmışsınız."],
    fixes: ["Değeri önce bir değişkende hesaplayın ve ona atayın.", "Karşılaştırma için == kullanın."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: print'te parantez eksik (Missing parentheses)",
    explain: "print'i Python 2 biçiminde parantez olmadan yazmışsınız; Python 3 parantez ister.",
    causes: ["Eski Python 2 örneğini kopyalamışsınız.", "print'te parantezleri unutmuşsunuz."],
    fixes: ["Metni ya da değeri print(...) parantezleri içine yazın."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: girintili blok bekleniyordu (expected an indented block)",
    explain: "Önceki satır : ile bitiyor, bu yüzden altına içeriye girintili kod gelmelidir; ancak girinti yok.",
    causes: ["if, for ya da def'in altında girintiyi unutmuşsunuz.", "İki noktadan sonra blok tamamen boş."],
    fixes: ["Sonraki satırı 4 boşlukla içeriye girintileyin.", "Blok boşsa pass kullanın."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: beklenmeyen girinti (unexpected indent)",
    explain: "Python, bir bileşik ifadeye bağlı olmayan, nedensiz içeriye girintili bir satır buldu.",
    causes: ["Satır başında fazla boşluklar var.", "Başka bir yerden farklı girintiyle kopyalanmış bir satır."],
    fixes: ["Satır başındaki fazla boşlukları silin.", "Aynı seviyedeki tüm satırların girintisinin aynı olduğundan emin olun."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: girinti hiçbir dış seviyeyle eşleşmiyor (unindent does not match any outer indentation level)",
    explain: "Bu satırın girintisi önceki hiçbir girinti seviyesine eşit değil; Python satırın hangi bloğa ait olduğunu bilemez.",
    causes: ["Satırlar arasında boşluk sayısı karışmış.", "Farklı girintili bir kod kopyalanmış."],
    fixes: ["Kodun her seviyesini sabit sayıda boşlukla (4 boşluk) yazın.", "Boşlukları gösteren bir editör kullanın."],
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
    title: "TabError: sekme ve boşluk karışımı (inconsistent use of tabs and spaces)",
    explain: "Girintide bazen Tab, bazen boşluk kullanmışsınız; Python bu karışımı reddeder.",
    causes: ["Bazı satırlar Tab ile, bazıları boşlukla başlıyor.", "Editör ayarları Tab'ı farklı biçimde dönüştürüyor."],
    fixes: ["Yalnızca boşluk kullanın (her seviye için 4 boşluk).", "Editörde Tab'ı boşluğa çevirme özelliğini açın."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: str ile başka türde bir değer birleştirilemez (can only concatenate str)",
    explain: "+ ile bir metni {t} türünde bir değerle birleştirmeye çalıştınız; Python türleri otomatik çevirmez.",
    causes: ["Bir metin ile bir sayı arasında + kullanmak.", "input()'tan gelen değer her zaman metindir."],
    fixes: ["Sayıyı str() ile metne çevirin.", "Ya da sayıyı bir f-string içine koyun; böylece otomatik olarak metne dönüşür."],
    bad: `print("Yaş: " + 20)`,
    good: `print("Yaş: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: iki tür arasında desteklenmeyen işlem (unsupported operand type(s))",
    explain: "{op} işleci {a} ve {b} türlerini birlikte kabul etmez.",
    causes: ["Aritmetik işlemde metin ile sayı.", "Aritmetik işlemde None değeri."],
    fixes: ["Metni int() ya da float() ile sayıya çevirin.", "Hesaplamadan önce değişkenlerin sayısal değer taşıdığından emin olun."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: NoneType dizine eklenemez (not subscriptable)",
    explain: "Değişkenin değeri None (yani hiçbir şey); onun bir öğesine [] ile erişmeye çalışıyorsunuz.",
    causes: ["Fonksiyon return içermediği için hiçbir şey döndürmüyor.", "Bir değişken hiç değer almadı ya da başarısız olan bir işlemden geldi."],
    fixes: ["Fonksiyonun return ile bir değer döndürdüğünden emin olun.", "Dizine eklemeden önce değerin None olmadığını denetleyin."],
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
    title: "AttributeError: özellik ya da fonksiyon yok (has no attribute)",
    explain: "{type} türündeki nesnenin {attr} özelliği ya da fonksiyonu yok.",
    causes: ["Fonksiyon ya da özellik adı yanlış yazılmış.", "Başka bir türe ait fonksiyon kullanmak, örneğin bir metin üzerinde append.", "Değişkenin değeri None."],
    fixes: ["type() ile nesnenin türünü denetleyin.", "Türün hangi fonksiyonları sunduğunu öğrenmek için belgelerine bakın."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: nesne çağrılabilir değil (object is not callable)",
    explain: "{t} türündeki bir değeri, () koyarak fonksiyon gibi çağırmaya çalıştınız.",
    causes: ["Bir değer taşıyan değişken adından sonra () yazmak.", "Yerleşik bir fonksiyon adını değişkenle gizlemek, örneğin str = 5."],
    fixes: ["Değişkeni yeniden adlandırın ki yerleşik fonksiyonun adını gölgelemesin.", "Gerçekten bir fonksiyon çağırdığınızdan emin olun."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: fonksiyon çağrısında eksik parametreler (missing required positional argument)",
    explain: "{fn} fonksiyonu, çağrıda geçirmediğiniz {n} parametreye daha ihtiyaç duyuyor.",
    causes: ["Fonksiyon, gerekli parametre geçirilmeden çağrılmış.", "Fonksiyon tanımı ihtiyaç duymadığınız bir parametre istiyor."],
    fixes: ["Çağrıda eksik değerleri geçirin.", "Parametre isteğe bağlıysa fonksiyon tanımında varsayılan değer verin."],
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
    title: "TypeError: fonksiyon çağrısında fazla parametreler (takes positional arguments but given)",
    explain: "{fn} fonksiyonu yalnızca {n} parametre kabul eder, ancak siz {m} tane geçirdiniz.",
    causes: ["Tanımdaki parametre sayısından fazla değer geçirilmiş.", "Fonksiyon tanımı, geçirdiğiniz parametreyi içermiyor."],
    fixes: ["Çağrıdan fazla değerleri çıkarın.", "Eksik parametreyi fonksiyon tanımına ekleyin."],
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
    title: "TypeError: nesne yinelenebilir değil (object is not iterable)",
    explain: "{t} türündeki bir değer üzerinde for döngüsü ya da değer açma ile geçmeye çalıştınız; bu tür yinelenebilir değildir.",
    causes: ["Döngüde sayı ile range() kullanmayı unuttunuz.", "Değer döndürmeyen bir fonksiyonun sonucu None olur."],
    fixes: ["range(n) kullanarak bir sayı üzerinde döngü kurun.", "Döngüden önce değişkenin liste, metin ya da küme olduğundan emin olun."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: liste indisi tam sayı olmalıdır (list indices)",
    explain: "Liste indisi tam sayı olmalıdır; siz {t} türünde bir değer kullandınız.",
    causes: ["İndisi '1' gibi metin olarak yazmak.", "İndisi / ile hesaplamak; bu da ondalık bir sayı üretir."],
    fixes: ["Tırnak işareti olmadan bir tam sayı kullanın.", "İndisi hesaplarken / yerine // kullanın."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: metin tam sayıya dönüştürülemez (invalid literal for int)",
    explain: "int() fonksiyonu '{v}' metnini tam sayıya çeviremedi.",
    causes: ["Metin rakam olmayan harf ya da simgeler içeriyor.", "Metin 3.5 gibi bir ondalık sayı.", "Metin boş."],
    fixes: ["Ondalık sayılar için float() kullanın.", "Dönüşümden önce girdiyi denetleyin ya da try ve except kullanın."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: değişkenlerden fazla değer (too many values to unpack)",
    explain: "Açma işleminde yalnızca {n} değişken var, oysa liste bundan daha fazla değer içeriyor.",
    causes: ["Değişken adlarının sayısı öğe sayısından az.", "Beklediğinizden daha uzun bir liste."],
    fixes: ["Değişken sayısını öğe sayısına eşitleyin.", "Fazla öğeleri toplamak için *rest kullanın."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: değişkenlere göre değer az (not enough values to unpack)",
    explain: "Değerleri {n} değişkene açmaya çalışıyorsunuz, ancak liste yalnızca {g} öğe içeriyor.",
    causes: ["Değişken sayısı öğe sayısından fazla.", "Beklediğinizden az öğe döndüren bir fonksiyon."],
    fixes: ["Değişken sayısını öğe sayısına eşitleyin.", "Açmadan önce listenin uzunluğunu denetleyin."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: indis liste sınırının dışında (list index out of range)",
    explain: "Listede olmayan bir konuma erişmeye çalışıyorsunuz. Numaralandırmanın 0'dan başladığını ve uzunluk - 1'de bittiğini unutmayın.",
    causes: ["İndis, listenin uzunluğuna eşit ya da daha büyük.", "Döngü son öğeyi aşıyor."],
    fixes: ["0 ile len(liste) - 1 arasında bir indis kullanın.", "Döngülerde indis yerine for x in liste kullanın."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: anahtar sözlükte yok",
    explain: "Sözlükte {key} anahtarı yok, bu yüzden [] ile erişim başarısız oldu.",
    causes: ["Anahtar, kayıtlı anahtardan farklı yazılmış.", "Anahtar henüz sözlüğe eklenmemiş."],
    fixes: ["get() fonksiyonunu varsayılan değerle kullanın.", "Erişmeden önce in ifadesiyle anahtarın varlığını denetleyin."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: sıfıra bölme",
    explain: "Sıfıra bölmeye çalıştınız; bu matematiksel olarak tanımsız bir işlemdir.",
    causes: ["Denetlenmeden değeri sıfır olan bir payda.", "Boş bir liste için ortalama hesaplamak."],
    fixes: ["Bölmeden önce paydanın sıfır olmadığını denetleyin.", "Bu özel durumu ele alan bir koşul ekleyin."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: kütüphane bulunamadı (No module named)",
    explain: "{mod} kütüphanesi kurulu değil ya da içe aktarmadaki adı paket adından farklı.",
    causes: ["Kütüphaneyi henüz kurmadınız.", "Python'u, kütüphanenin kurulu olduğu ortamdan farklı bir ortamda çalıştırıyorsunuz.", "İçe aktarma adı paket adından farklı; örneğin opencv paketi için cv2."],
    fixes: ["Kütüphaneyi pip install kütüphane_adı komutuyla kurun.", "Kütüphanenin, kodu çalıştırdığınız Python sürümüne kurulu olduğundan emin olun."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: ad içe aktarılamıyor (cannot import name)",
    explain: "Modül var ama {name} adı içinde tanımlı değil.",
    causes: ["Fonksiyon adını yanlış yazmışsınız.", "Standart bir kütüphanenin adıyla aynı olan yerel bir dosya, örneğin random.py.", "Fonksiyon kütüphanenin başka bir sürümünde mevcut."],
    fixes: ["Doğru adı görmek için kütüphanenin belgelerine bakın.", "Standart bir kütüphane adıyla eşleşen yerel dosyanın adını değiştirin."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: dosya bulunamadı (No such file or directory)",
    explain: "{path} dosyası programın çalıştığı yolda yok.",
    causes: ["Dosya adı ya da uzantısı yanlış yazılmış.", "Çalışma klasörü, dosyanın bulunduğu klasör değil."],
    fixes: ["Dosya adını ve uzantısını denetleyin.", "Tam yol kullanın ya da çalışma klasörünü denetleyin."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: yinelemeli çağrı derinliği aşıldı (maximum recursion depth)",
    explain: "Fonksiyon durmadan kendini çağırıyor; çağrı sayısı izin verilen sınırı aştı.",
    causes: ["Yinelemeli fonksiyonda durma koşulu yok.", "Mantık hatası yüzünden durma koşulu hiçbir zaman sağlanmıyor."],
    fixes: ["Fonksiyonun başına açık bir durma koşulu ekleyin.", "Çözümü while ya da for döngüsüne çevirin."],
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
    title: "UnboundLocalError: yerel değişkene değer atanmadan erişildi (cannot access local variable)",
    explain: "Fonksiyonun içinde, o fonksiyonda değer atanmadan önce {name} değişkenini kullanıyorsunuz.",
    causes: ["global bildirimi olmadan fonksiyonun içinden dış değişkeni değiştirmek.", "Değişkeni kullandıktan sonra fonksiyonun içinde değer atamak."],
    fixes: ["Değişkeni fonksiyona parametre olarak geçirin ve yeni değerini döndürün.", "Ya da genel değişkeni değiştirmeniz gerekiyorsa global kullanın."],
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
    title: "StopIteration: öğeler bitti (StopIteration)",
    explain: "Yineleyici (iterator) sonuna ulaştı ve artık öğesi yok; genellikle next() ile olur.",
    causes: ["next() öğe sayısından fazla çağrılmış.", "Zaten bitmiş bir yineleyiciyi yeniden kullanmak."],
    fixes: ["Bitişte bir değer belirlemek için next(it, None) kullanın.", "next() ile elle ilerlemek yerine for döngüsü kullanın."],
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
    title: "UnicodeDecodeError: kod çözme başarısız (can't decode byte)",
    explain: "Dosya, okumaya çalıştığınız {codec} kodlamasında değil.",
    causes: ["Dosya UTF-8 kodlamasıyla kaydedilmiş, ancak Python onu başka bir varsayılan kodlamayla okuyor.", "Dosya bir resim gibi ikili bir dosya, metin değil."],
    fixes: ["Dosyayı açarken encoding=\"utf-8\" ekleyin.", "Dosya ikiliyse onu \"rb\" kipiyle açın."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: değer aralığı aşıldı (OverflowError)",
    explain: "Değer, fonksiyonun işleyebileceği sınırdan büyük: {msg}.",
    causes: ["exp(1000) gibi çok büyük bir üslü hesaplama.", "Çok büyük bir sayıyı ondalık sayıya çevirmek."],
    fixes: ["Hesaplamadaki değerlerin büyüklüğünü azaltın.", "Büyük sayılar kütüphanesi kullanın ya da daha küçük değerler kullanın."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: değişken tanımlı değil (is not defined)",
    explain: "{name} adını kullanıyorsunuz ama bu kapsamda tanımlamamışsınız ya da adını tanımdan farklı yazmışsınız.",
    causes: ["Tanımdan önce let, const ya da var sözcüğünü yazmayı unutmuşsunuz.", "Adda yazım hatası var.", "Değişken başka bir fonksiyonun içinde tanımlanmış, bu yüzden buradan görünmez.", "Adı tanımlayan betik ya da kütüphane yüklenmemiş."],
    fixes: ["Değişkeni kullanmadan önce let ya da const ile tanımlayın.", "Adın büyük ve küçük harflerinin eşleştiğinden ve gerekli dosyanın koddan önce yüklendiğinden emin olun."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: başlatılmadan önce erişim (before initialization)",
    explain: "{name} değişkenini tanımladığınız satırdan önce kullandınız. let ve const, var gibi kodun en üstüne taşınmaz.",
    causes: ["Değişkeni tanımlandığı satırdan daha yukarıda kullanmak.", "Henüz oluşturulmamış bir değişkeni çağıran fonksiyon."],
    fixes: ["Tanımı ilk kullanımından önceye taşıyın.", "Fonksiyonu, bağlı olduğu değişkenler başlatıldıktan sonra kullanın."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: tanımsız bir değerin özelliği okunamaz (Cannot read properties of undefined)",
    explain: "{t} türündeki bir değerin '{p}' özelliğini okumaya çalıştınız; değer o anda mevcut değil.",
    causes: ["Henüz değer atanmamış bir değişken.", "DOM öğesi yok; örneğin getElementById ile yanlış kimlik kullanılmış.", "Veri henüz sunucudan ya da eşzamansız bir fonksiyondan gelmedi.", "Bir şey döndürmeyen fonksiyon, sonucu undefined yapar."],
    fixes: ["Erişmeden önce değeri if ile ya da obj?.name gibi ?. işaretiyle denetleyin.", "Kullanmadan önce öğenin sayfada var olduğundan emin olun."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: tanımsız bir değere özellik atanamaz (Cannot set properties of undefined)",
    explain: "{t} türündeki bir değere '{p}' özelliğini yazmaya çalıştınız; nesne henüz oluşturulmamış.",
    causes: ["Bir nesne değişkenini {} değeri vermeden tanımlamak.", "Hiçbir şey döndürmeyen bir fonksiyondan gelen nesne."],
    fixes: ["Önce nesneyi {} ya da uygun biçimle oluşturun.", "Üzerine yazmadan önce değişkenin bir nesne taşıdığından emin olun."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: fonksiyon değil (is not a function)",
    explain: "{fn} değerini () ile çağırmaya çalıştınız, ama bu bir fonksiyon değil.",
    causes: ["Fonksiyon adını yanlış yazmışsınız.", "Fonksiyon henüz tanımlanmamış ya da içe aktarılmamış.", "Kütüphane, fonksiyon yerine başka türde bir değer döndürüyor; örneğin bir fonksiyon yerine export default."],
    fixes: ["Çağırmadan önce adın yazımını ve fonksiyon tanımını denetleyin.", "Çağırmadan önce typeof ile değerin türünü denetleyin."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: değer yinelenebilir değil (is not iterable)",
    explain: "{x} üzerinde for...of ya da [...] açma ile dolaşmaya çalıştınız, ama bu değer yinelenebilir değil.",
    causes: ["Sıradan bir {} nesnesini for...of içinde kullanmak.", "Dizi döndürmeyen bir fonksiyon, sonucu undefined yapar."],
    fixes: ["Nesne ile Object.keys, Object.values ya da Object.entries kullanın.", "Yinelemeden önce değerin dizi, metin ya da Map olduğundan emin olun."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: sabit değişkene atama (Assignment to constant variable)",
    explain: "const ile tanımlanan değişkenlerin değeri tanımdan sonra değiştirilemez.",
    causes: ["Sonradan değişecek bir değişken için const kullanmak.", "Yeniden atama yaparken değerin sabit olduğunu unutmak."],
    fixes: ["Değeri değiştirecekseniz let kullanın.", "Sabiti değiştirmek yerine yeni bir değişken oluşturun."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: beklenmeyen simge (Unexpected token)",
    explain: "JavaScript, kuralların izin vermediği bir konumda bir simge ya da sözcük buldu; sebep çoğunlukla belirtilen satırdan biraz önce.",
    causes: ["Fazla ya da eksik parantez ya da virgül.", "Ayrılmış bir sözcük ad olarak kullanılmış.", "Bir fonksiyon içindeki kod düzgün kapatılmamış."],
    fixes: ["Satırdaki ve bir önceki satırdaki parantez ve virgülleri denetleyin.", "Hataları gösteren ve parantezleri eşleştiren bir editör kullanın."],
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
    title: "SyntaxError: metin geçerli bir JSON değil (is not valid JSON)",
    explain: "JSON.parse, geçerli bir JSON biçiminde olmayan bir metni okumaya çalışıyor; genellikle ona veri yerine HTML gelmiştir.",
    causes: ["Sunucu JSON yerine 404 hata sayfası gibi bir HTML sayfası döndürdü.", "JSON dosyasında fazla virgül ya da tek tırnak işareti var."],
    fixes: ["Ayrıştırmadan önce ham metni yazdırın ve içeriğini denetleyin.", "JSON'da anahtar adları ve metinler için çift tırnak işareti kullanın."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: kod beklenmeyen biçimde bitti (Unexpected end of input)",
    explain: "Dosya ya da blok bitti, ama JavaScript hâlâ bir parantezin ya da kıvrık parantezin kapanmasını bekliyor.",
    causes: ["Kapanmamış { ya da ( parantezi.", "Kodun bir parçasını kopyalayıp sonunu ihmal etmek."],
    fixes: ["Açtığınız her parantezi kapatın.", "Açık ve kapalı parantezleri eşleştiren bir editör kullanın."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: parametre listesinden sonra ')' eksik",
    explain: "Fonksiyon çağrısı, noktalı virgülden ya da satır sonundan önce ) ile kapatılmamış.",
    causes: ["Çağrının sonundaki kapanış parantezini unutmak.", "Parametreler içinde kapatılmamış bir tırnak işareti."],
    fixes: ["Noktalı virgülden önce ) ekleyin.", "Çağrı içindeki tüm tırnak işaretlerinin kapatıldığından emin olun."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: beklenmeyen tanımlayıcı (Unexpected identifier)",
    explain: "JavaScript, bir değer ya da ifadenin ardından noktalı virgül olmadan bir ad buldu; genellikle bir önceki satırda noktalı virgül eksiktir.",
    causes: ["Önceki satırın sonundaki ; işaretini unutmak.", "Ayırıcı olmadan iki ad arka arkaya yazılmış."],
    fixes: ["Her ifadenin sonuna ; ekleyin.", "Her tanımı ayrı bir satıra yazın."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: geçersiz simge (Invalid or unexpected token)",
    explain: "JavaScript kodda kabul etmediği bir simge buldu; genellikle akıllı tırnak işareti ya da görünmez bir karakter.",
    causes: ["Kodu, tırnak işaretlerini akıllı tırnağa çeviren bir belgeden kopyalamışsınız.", "Tırnak işareti doğru kapatılmamış."],
    fixes: ["Akıllı tırnak işaretlerini normal \" ya da ' ile değiştirin.", "Her metni aynı tırnak işaretiyle kapattığınızdan emin olun."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: değişken iki kez tanımlanmış (has already been declared)",
    explain: "Aynı kapsamda let ya da const ile {name} birden fazla kez tanımlanmış.",
    causes: ["Tanım satırını kopyalayıp eskisini silmemek.", "Aynı dosyada aynı adda iki değişken."],
    fixes: ["Fazla tanımı silin ya da adını değiştirin.", "Değeri değiştirmek istiyorsanız let olmadan yeniden atama yapın."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: async olmayan bir fonksiyonun dışında await",
    explain: "await kelimesini izin verilmeyen bir yerde kullandınız; yalnızca bir async fonksiyonunun içinde ya da dosyanın üst düzeyinde bir ES module içinde çalışır.",
    causes: ["Fonksiyondan önce async kelimesini unutmak.", "Normal bir fonksiyonda ya da olay işleyicide await kullanmak."],
    fixes: ["Fonksiyonu async yapın.", "Ya da doğrudan söz (Promise) ile then() kullanın."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: ES modülü dışında import kullanımı",
    explain: "Node.js dosyayı CommonJS olarak ele alıyor, oysa import sözdizimi ES modülleri içindir.",
    causes: ["Dosya, module olduğu belirtilmeden Node ile çalıştırılıyor.", "Proje ayarlarını yapılandırmadan güncel bir örneği kopyalamak."],
    fixes: ["CommonJS'te import yerine require kullanın.", "Ya da package.json dosyasına \"type\": \"module\" ekleyin."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: çağrı yığını taştı (Maximum call stack size exceeded)",
    explain: "Fonksiyon durmadan kendini çağırıyor ve yürütme yığını doldu.",
    causes: ["Yinelemeli fonksiyonda durma koşulu yok.", "Birbirini sonsuza kadar çağıran iki fonksiyon."],
    fixes: ["Açık bir durma koşulu ekleyin.", "Çözümü while ya da for döngüsüne çevirin."],
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
    title: "RangeError: geçersiz dizi uzunluğu (Invalid array length)",
    explain: "Dizinin uzunluğu belirli bir sınır içinde pozitif bir tam sayı olmalıdır.",
    causes: ["Array'e negatif bir sayı geçirmek.", "Dizi uzunluğuna ondalık ya da sayı olmayan bir değer geçirmek."],
    fixes: ["Uzunluğun pozitif bir tam sayı olduğundan emin olun.", "Diziyi oluşturmadan önce değeri denetleyin."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): işlenmemiş reddedilen söz",
    explain: "Bir Promise başarısız oldu ve hatayı ele almak için catch eklemediniz ya da await ile try ve catch kullanmadınız.",
    causes: ["catch olmadan then kullanmak.", "async bir fonksiyonu await ya da catch olmadan çağırmak."],
    fixes: ["then zincirinin sonuna .catch() ekleyin.", "await kodunu try ve catch içine alın."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: istek, kaynaklar arası paylaşım politikası nedeniyle engellendi",
    explain: "Tarayıcı isteği engelledi; çünkü sunucu bu kaynaktan (origin) erişime izin vermedi ya da sayfa file:// ile açıldı.",
    causes: ["Sunucu Access-Control-Allow-Origin başlığını göndermiyor.", "Sayfa yerel sunucu yerine doğrudan dosyadan açılmış."],
    fixes: ["İstenen alana izin verilmesi için sunucuda CORS'u etkinleştirin.", "Dosyayı doğrudan açmak yerine projeyi yerel bir sunucu üzerinden çalıştırın."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: istek başarısız oldu (Failed to fetch)",
    explain: "İstek sunucuya ulaşmadı; ağ kesik, adres yanlış, sunucu durmuş ya da CORS nedeniyle engellenmiş olabilir.",
    causes: ["Sunucu durmuş ya da adres yanlış yazılmış.", "İnternet bağlantısı kesik.", "CORS politikası isteği engelliyor."],
    fixes: ["Adresin çalıştığını doğrulamak için tarayıcıda açın.", "Geliştirici araçlarında Network sekmesini inceleyin ve CORS'u denetleyin."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: modül bulunamadı (Cannot find module)",
    explain: "Node.js {mod} dosyasını ya da paketini bulamıyor.",
    causes: ["Paket projeye kurulmamış.", "Göreli yol yanlış.", "Dosya uzantısı eksik ya da dosya yok."],
    fixes: ["Paketi npm install paket_adı komutuyla kurun.", "Göreli yolu ve dosyanın varlığını denetleyin."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: bağlantı noktası zaten kullanımda",
    explain: "Dinlemeye çalıştığınız bağlantı noktası (port) başka bir program tarafından meşgul; genellikle sunucunun başka bir kopyası çalışıyordur.",
    causes: ["Sunucuyu aynı bağlantı noktasında iki kez çalıştırmak.", "Başka bir program bağlantı noktasını kullanıyor."],
    fixes: ["Sunucunun diğer kopyasını durdurun.", "Ya da bağlantı noktası numarasını değiştirin."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: dosya ya da klasör yok",
    explain: "Node.js belirtilen yolda var olmayan bir dosya ya da klasörü açmaya çalıştı.",
    causes: ["Dosya adı yanlış ya da uzantısı eksik.", "Yol farklı bir çalışma klasörüne göre göreli."],
    fixes: ["Okumadan önce dosyanın varlığını fs.existsSync ile denetleyin.", "Mevcut dosyanın klasörüne dayalı bir yol kullanın."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: döngüsel yapı JSON'a dönüştürülemez",
    explain: "Nesne döngüsel bir referans içeriyor; yani doğrudan ya da dolaylı olarak kendine işaret ediyor ve JSON.stringify bunu dönüştüremez.",
    causes: ["Kendine işaret eden bir özellik içeren nesne.", "JSON.stringify'a geçirilen bir DOM nesnesi ya da karmaşık bir nesne."],
    fixes: ["Dönüştürmeden önce döngüsel özelliği kaldırın.", "Yalnızca gereken verileri içeren basit bir nesneye dönüştürün."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: sembol bulunamadı (cannot find symbol)",
    explain: "Derleyici bu adla bir değişken, fonksiyon ya da sınıf bulamadı. Hangi adın kastedildiğini görmek için mesajdaki symbol satırına bakın.",
    causes: ["Ad yanlış yazılmış.", "Değişken başka bir kapsamda tanımlı.", "ArrayList gibi bir sınıf için import eklemeyi unuttunuz.", "Değişkeni hiç tanımlamadınız."],
    fixes: ["Adı symbol satırına göre düzeltin.", "Uygun içe aktarmayı ekleyin, örneğin import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: dönüşüm değerin bir kısmını kaybettirebilir (possible lossy conversion)",
    explain: "{a} türünden {b} türüne dönüşüm, ondalık kısım gibi bir parçayı kaybettirebilir; bu yüzden Java bunu otomatik olarak reddeder.",
    causes: ["Ondalık bir sayıyı tam sayı bir değişkene atamak.", "İki tam sayının bölümü kesirli bir sonuç verir."],
    fixes: ["Değişkeni double gibi daha geniş bir türde tanımlayın.", "Dönüşüm bilerek yapılıyorsa (int) gibi açık bir dönüşüm kullanın."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: uyumsuz türler (incompatible types)",
    explain: "Değişkenin türüyle uyuşmayan bir değer atamaya çalışıyorsunuz: {a}.",
    causes: ["Sayısal bir değişkene metin atamak ya da tersi.", "Fonksiyonun türünden farklı bir tür döndürmek."],
    fixes: ["Değerin türünü değişkenin türüyle eşleştirin.", "Dönüşüm mantıklıysa değeri açıkça dönüştürün."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: return ifadesi eksik (missing return statement)",
    explain: "Fonksiyon, çalışabilecek her yolda bir değer döndürmelidir; burada değer döndürmeyen bir yol var.",
    causes: ["Yalnızca bir if içinde return var, alternatif bir yol yok.", "Fonksiyonun sonuna return yazmayı unutmak."],
    fixes: ["Fonksiyonun sonuna varsayılan bir değer döndüren return ekleyin.", "Diğer durum için değer döndüren bir else ekleyin."],
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
    title: "error: noktalı virgül ; bekleniyordu",
    explain: "Bir cümlenin sonundaki noktalı virgülü ; unutmuşsunuz; Java bunu her zaman ister.",
    causes: ["Bir komuttan ya da tanımdan sonra ; unutmak.", "Eksik biçimde biten bir satır."],
    fixes: ["Belirtilen satırın ya da bir öncekinin sonuna ; ekleyin."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: dosya adı genel sınıfla eşleşmiyor (is public, should be declared in a file named)",
    explain: "Genel {cls} sınıfı tam olarak {file} adlı bir dosyanın içinde olmalıdır.",
    causes: ["Dosyayı genel sınıfın adından farklı bir adla kaydetmek.", "Aynı dosyada iki genel sınıf bulunması."],
    fixes: ["Dosyanın adını genel sınıfın adıyla eşleşecek şekilde değiştirin.", "Ya da public kelimesini silerek sınıfı genel olmaktan çıkarın."],
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
    title: "error: ulaşılamayan ifade (unreachable statement)",
    explain: "return, break ya da throw'dan sonra bir satır var; bu satır asla çalışmayacağı için derleyici reddediyor.",
    causes: ["return'ün hemen ardına kod yazmak.", "Sonrasında gelen kodun önünde break olmayan bir while(true) döngüsü."],
    fixes: ["Satırı return'den önceye taşıyın.", "Hiç çalışmayacak kodu silin."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: değişken başlatılmamış olabilir (might not have been initialized)",
    explain: "{v} değişkeni, bazı çalışma yollarında kullanılmadan önce değer almamış olabilir.",
    causes: ["Değişkeni değer vermeden tanımlayıp sonra kullanmak.", "if içinde değer atamak, else olmadan."],
    fixes: ["Değişkene tanımlandığı anda bir başlangıç değeri verin.", "Her yolun değişkene bir değer atadığından emin olun."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: static olmayan üye, static bir bağlamdan erişilemez",
    explain: "{m} static olmayan bir üye; main ya da herhangi bir static fonksiyondan nesne olmadan doğrudan kullanılamaz.",
    causes: ["main içinden doğrudan normal bir fonksiyonu çağırmak.", "static bir fonksiyondan kullanılan, sınıf içindeki normal bir değişken."],
    fixes: ["Ortak kullanılacaksa üyeyi static yapın.", "Ya da sınıftan bir nesne oluşturup üyeyi onun üzerinden çağırın."],
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
    title: "NullPointerException: boş gösterici (null)",
    explain: "Değeri null olan bir nesneyi kullanmaya çalışıyorsunuz; yani henüz oluşturulmamış ya da null atanmış.",
    causes: ["null atanmış bir metin değişkeninin metodunu çağırmak.", "new ile oluşturulmamış bir nesne.", "Map.get, var olmayan bir anahtar için null döndürdü."],
    fixes: ["Nesneyi kullanmadan önce oluşturun.", "null kontrolünü if (x != null) ile yapın ya da Objects.requireNonNull kullanın."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: indis dizi sınırlarının dışında",
    explain: "{n} uzunluğundaki bir dizinin {i} indisine erişmeye çalıştınız. İndisler 0'dan başlar ve uzunluk - 1'de biter.",
    causes: ["İndis tam olarak uzunluğa eşit.", "Döngü son öğeyi aşıyor."],
    fixes: ["0 ile uzunluk - 1 arasında bir indis kullanın.", "İndise ihtiyacınız yoksa for-each döngüsü kullanın."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: indis metin sınırlarının dışında",
    explain: "Metinden istenen indis sınırların dışında; bu, charAt ya da substring ile olur.",
    causes: ["charAt'i metin uzunluğuna eşit bir indisle kullanmak.", "substring'i yanlış sınırlarla kullanmak."],
    fixes: ["İndisin 0 ile metin uzunluğu - 1 arasında olduğundan emin olun.", "Ayırmadan önce metnin uzunluğunu denetleyin."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException: sıfıra bölme",
    explain: "Tam sayıyı sıfıra bölmek; Java'da tam sayılar için bu izin verilmez.",
    causes: ["Değeri sıfır olan bir payda.", "Boş bir liste için ortalama hesaplamak."],
    fixes: ["Paydanın sıfır olmadığını denetleyin.", "Hesaplama için uygunsa double kullanın."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException: metin bir tam sayıyı temsil etmiyor",
    explain: "Fonksiyon «{v}» metnini sayıya çeviremedi; çünkü metin harf ya da ondalık ayırıcı içeriyor.",
    causes: ["Harf ya da boşluk içeren bir metin.", "Ondalık bir sayının int'e dönüştürülmesi."],
    fixes: ["Ondalık sayılar için Double.parseDouble kullanın.", "Metni matches ya da try ve catch ile denetleyin."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException: uyumsuz tür dönüşümü",
    explain: "{a} türünden bir nesneyi {b} türüne dönüştürmeye çalıştınız; nesne o türden değil.",
    causes: ["Object'i, gerçek nesneye uymayan bir türe dönüştürmek.", "Karışık türlerden oluşan liste öğeleri."],
    fixes: ["Dönüştürmeden önce instanceof ile türü denetleyin.", "Eklerken değerin doğru türde olduğundan emin olun."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException: girdi istenen türle eşleşmiyor",
    explain: "Scanner belirli bir tür bekledi, örneğin tam sayı, ama metin ya da tersi geldi.",
    causes: ["Kullanıcı sayı beklenen yere harf girdi.", "nextInt ile nextLine arasındaki sıra yanlış."],
    fixes: ["Okumadan önce hasNextInt() ile denetleyin.", "Satırın tamamını nextLine ile okuyun, sonra dönüştürün."],
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
    title: "ConcurrentModificationException: liste üzerinde dolaşılırken değiştirildi",
    explain: "Listeyi for-each döngüsüyle dolaşırken değiştirdiniz; Java devam etmeyi reddediyor.",
    causes: ["for-each içinde listeden öğe silmek.", "Döngünün içinde listeye öğe eklemek."],
    fixes: ["Öğeleri silmek için removeIf kullanın.", "Ya da Iterator ile onun remove metodunu kullanın."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError: yığın taştı",
    explain: "Durmadan yinelemeli çağrı; yani çıkış koşulu olmadan kendini çağıran bir fonksiyon, bu yüzden yürütme yığını doldu.",
    causes: ["Yinelemeli fonksiyonda durma koşulu yok.", "Durma koşulu hiçbir zaman sağlanmıyor."],
    fixes: ["Fonksiyonun başına açık bir durma koşulu ekleyin.", "Çözümü döngüye çevirin."],
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
    title: "OutOfMemoryError: bellek tükendi",
    explain: "Program, mevcut olandan daha fazla bellek istiyor; genellikle sonsuz nesne üreten bir döngü ya da çok büyük veri nedeniyle.",
    causes: ["Durmadan listeye nesne ekleyen bir döngü.", "Çok büyük bir dosyayı tamamen belleğe yüklemek."],
    fixes: ["Veriyi küçük parçalar halinde işleyin.", "Artık ihtiyaç duymadığınız listeleri boşaltın."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error: işlenmemiş istisna (unreported exception)",
    explain: "Fonksiyon {e} istisnasını fırlatıyor; bu checked türünde olduğu için try ve catch ile ele almalı ya da throws ile bildirmelisiniz.",
    causes: ["checked istisna fırlatan bir fonksiyonu ele almadan çağırmak.", "Bildirmediğiniz bir fonksiyonun içinde checked istisna fırlatmak."],
    fixes: ["Çağrıyı try ve catch ile sarın.", "Ya da fonksiyon tanımına throws {e} ekleyin."],
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
    title: "error: kod tamamlanmadan dosya sona erdi (reached end of file while parsing)",
    explain: "Dosya bitti ama kapanmamış bir { parantezi var; bu yüzden sınıf ya da fonksiyon tanımı tamamlanmadı.",
    causes: ["Fonksiyonun ya da sınıfın sonundaki } kapanış parantezini unutmak.", "Kodun ortasında fazla ya da eksik parantez."],
    fixes: ["Eksik kapanış parantezini ekleyin.", "Hatayı bulmak için parantezleri eşleştiren bir editör kullanın."],
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
    title: "error: değişken iki kez tanımlanmış (is already defined)",
    explain: "{v} değişkenini aynı kapsamda birden fazla kez tanımladınız.",
    causes: ["Tanım satırını kopyalayıp eskisini silmemek.", "Aynı adla bir değişkeni hem döngü içinde hem dışında tanımlamak."],
    fixes: ["Fazla tanımı silin ya da adını değiştirin.", "Değişkenin türü olmadan yeniden atama kullanın."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error: belirtilen sözcükten önce bir simge bekleniyordu (expected before)",
    explain: "Derleyici belirtilen konumda {what} bekledi, ama başka bir şey buldu; hata çoğunlukla mesajın konumundan önceki satırdadır.",
    causes: ["Önceki satırın sonundaki ; işaretini unutmak.", "Önceki satırda kapatılmamış parantez."],
    fixes: ["Önceki satıra ; ekleyin ya da parantezi kapatın.", "Derleyicinin, gerçek hatadan sonraki satırı işaret edebileceğini unutmayın."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error: ad bu kapsamda tanımlı değil (was not declared in this scope)",
    explain: "{n} değişkeni ya da fonksiyonu kodun bu yerinde tanımlı değil.",
    causes: ["Adda yazım hatası var.", "Değişken başka bir fonksiyonun içinde tanımlı.", "Adı tanımlayan kütüphane için #include yazmayı unuttunuz."],
    fixes: ["Adı kullanmadan önce tanımlayın ya da parametre olarak geçirin.", "Dosyanın başına uygun #include ekleyin."],
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
    title: "error: tanımlanmamış tanımlayıcı kullanımı (use of undeclared identifier)",
    explain: "clang derleyicisi bu kapsamda {n} tanımını bulamadı.",
    causes: ["Adda yazım hatası var.", "Değişken başka bir kapsamda ya da hiç tanımlanmamış."],
    fixes: ["Adı düzeltin ya da kullanmadan önce değişkeni tanımlayın."],
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
    title: "undefined reference: bağlayıcı tanımı bulamadı",
    explain: "{s} öğesini bildirdiniz ama tanımını yazmadınız ya da derleme sırasında tanımını içeren dosyayı bağlamadınız.",
    causes: ["Fonksiyonun gövdesini yazmayı unutmak.", "Fonksiyonu tanımlayan kaynak dosyayı derleyiciye vermemek.", "Bağlanan bir kütüphanede ya da bağlama sırasında hata."],
    fixes: ["Fonksiyonun ya da değişkenin tanımını yazın.", "Kaynak dosyayı ya da kütüphaneyi derleme komutuna ekleyin."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault: izin verilmeyen belleğe erişim",
    explain: "Program, sahip olmadığı belleğe erişmeye çalıştı; genellikle boş gösterici, dizi dışı indis ya da serbest bırakılmış gösterici.",
    causes: ["Başlatılmamış ya da NULL değeri olan bir göstericinin kullanılması.", "Dizi sınırlarının dışında indis.", "free sonrası belleği kullanmak."],
    fixes: ["Kullanmadan önce göstericinin geçerli bir belleğe işaret ettiğinden emin olun.", "Satırı bulmak için programı gdb ya da valgrind ile çalıştırın."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function: fonksiyon bildirilmeden çağrıldı",
    explain: "{f} fonksiyonu tanımlanmadan ya da bildirilmeden çağrıldı; bu yüzden derleyici türünü otomatik varsaydı.",
    causes: ["Fonksiyon çağrıldıktan sonra aşağıda tanımlanmış.", "Fonksiyonu bildiren dosya için #include yazmayı unutmak."],
    fixes: ["Fonksiyon bildirimini (prototype) main'den önce koyun.", "Doğru dosya için #include ekleyin."],
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
    title: "error: ifade bekleniyordu (expected primary-expression)",
    explain: "Derleyici bu konumda bir değer ya da değişken bekledi, ama burada uygun olmayan bir simge buldu.",
    causes: ["Sonrasında değer olmayan = işareti.", "İfadenin kabul etmediği yerde parantez ya da virgül."],
    fixes: ["= işaretinden sonra ya da parantezlerin içine gerekli değeri yazın.", "Belirtilen konumdan önceki virgülleri ve parantezleri denetleyin."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error: geçersiz dönüşüm (invalid conversion)",
    explain: "{a} türünü {b} türüne C ya da C++'ta izin verilmeyen bir biçimde dönüştürmeye çalıştınız.",
    causes: ["Adres vermeden bir göstericiye değer atamak.", "Değer türü ile gösterici türünü karıştırmak."],
    fixes: ["Değişkenin adresini & ile göstericiye atayın.", "Türlerin eşleştiğinden emin olun ya da açıkça dönüştürün."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error: çağrıya uyan fonksiyon yok (no matching function for call)",
    explain: "{f} çağrısı, parametre sayısı ya da türü bakımından hiçbir fonksiyon tanımına uymuyor.",
    causes: ["Tanımdan farklı sayıda parametre geçirmek.", "Beklenen türe dönüşmeyen bir tür geçirmek."],
    fixes: ["Parametreleri fonksiyon tanımıyla eşleştirin.", "Fonksiyon imzasını belgelerde ya da başlık dosyasında denetleyin."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error: yeniden tanımlama (redefinition of)",
    explain: "{n} öğesini aynı kapsamda birden fazla kez tanımladınız ya da bildirdiniz.",
    causes: ["Tanım satırını kopyalayıp eskisini silmemek.", "Başlık dosyası koruma olmadan birden fazla kez eklenmiş."],
    fixes: ["Fazla tanımı silin.", "Başlık dosyasına #ifndef ya da #pragma once koruması ekleyin."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error: çakışan türler (conflicting types)",
    explain: "{n} için ilk bildirim, sonraki bildirim ya da tanımdan dönüş türü ya da parametreleri bakımından farklı.",
    causes: ["Bildirim ile tanım arasında dönüş türünü değiştirmek.", "İki sürüm arasında parametre sayısı ya da türünün farklı olması."],
    fixes: ["İmzayı bildirimde ve tanımda eşleşecek şekilde yazın.", "Bildirimi tanımla eşleşecek şekilde güncelleyin."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning: fonksiyon return olmadan bitiyor (control reaches end)",
    explain: "Fonksiyonun bir değer döndürmesi bekleniyor, ancak bazı yollar return olmadan bitiyor; bu tanımsız bir davranıştır.",
    causes: ["return yalnızca bir if içinde.", "Fonksiyonun sonuna return yazmayı unutmak."],
    fixes: ["Fonksiyonun sonuna return ekleyin.", "Her yolun bir değer döndürdüğünden emin olun."],
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
    title: "stack smashing detected: yığın sınırlarının dışına yazma",
    explain: "Yığındaki bir dizinin sınırlarının dışına yazdınız; bu korumalı verileri bozdu; genellikle strcpy ya da fazla indisten.",
    causes: ["strcpy ile dizinin boyutundan uzun bir metni kopyalamak.", "Dizinin sonundan sonra yazan bir döngü."],
    fixes: ["strncpy'yi dizinin boyutuyla kullanın ve metnin sıfırla sonlandığından emin olun.", "Yazmadan önce sınırları denetleyin."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning: dizi indisi sınırların dışında (array subscript out of bounds)",
    explain: "Kod, dizinin sınırlarının dışında okuma ya da yazma yapıyor; bu beklenmeyen davranışa yol açar.",
    causes: ["Dizi boyutuna eşit ya da daha büyük bir indis.", "Döngü, boyut - 1 yerine boyuta kadar sayıyor."],
    fixes: ["0 ile boyut - 1 arasında indisler kullanın.", "Erişmeden önce indisi denetleyin."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer ya da double free",
    explain: "Daha önce serbest bırakılmış bir belleği serbest bıraktınız ya da malloc'tan gelmeyen bir göstericiyi serbest bıraktınız.",
    causes: ["Aynı göstericiye free'yi iki kez çağırmak.", "Yerel bir değişkene ya da dizi içine işaret eden göstericiyi serbest bırakmak."],
    fixes: ["free'den sonra göstericiyi NULL yapın.", "Her belleğin yalnızca bir kez ve aynı kaynaktan serbest bırakıldığından emin olun."],
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
    title: "multiple definition: birden fazla dosyada tekrar tanım",
    explain: "{n} tanımı birden fazla kaynak dosyasında var; genellikle bir başlık dosyasında yalnızca bildirim değil de tanım bulunduğu için.",
    causes: ["Başlık dosyasının içine değişken ya da fonksiyon tanımı yazmak.", "Başlık dosyasını birden fazla kaynak dosyasına eklemek."],
    fixes: ["Başlık dosyasını extern ya da prototip ile yalnızca bildirim yapın.", "Tanımı tek bir kaynak dosyada yazın."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error: atanabilir değer gerekli (lvalue required)",
    explain: "Bellekte yeri olmayan bir ifadeye atama yapmaya çalıştınız, örneğin sabit bir değer ya da fonksiyonun sonucu.",
    causes: ["Sayıyı atamanın sol tarafına yazmak.", "Bir fonksiyonun sonucunu artırmaya çalışmak."],
    fixes: ["Değişken adını = işaretinin soluna yazın.", "Fonksiyonun sonucunu bir değişkende saklayın, sonra değiştirin."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning: işaretli sayı ile işaretsiz sayı karşılaştırması (signedness)",
    explain: "İşaretli (signed) bir sayı ile işaretsiz (unsigned) bir sayıyı karşılaştırdınız; negatif değer büyük bir sayıya dönüşür ve sonuç değişir.",
    causes: ["Döngülerde size_t ya da unsigned int ile int kullanmak.", "Bir dizi uzunluğuyla karşılaştırılan tam sayı sayacı."],
    fixes: ["İki türün işaret bakımından eşleşmesini sağlayın.", "İki değişkende aynı türü kullanın."],
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
    title: "warning: yazdırma biçimi değişken türüyle eşleşmiyor (format expects argument)",
    explain: "%{f} yazdırma biçimi {t} türünü bekliyor, ama geçirilen değişken başka türde; bu yanlış değerler yazdırabilir.",
    causes: ["Ondalık sayı için %d kullanmak.", "Kodu değiştirirken değişkenin türünü unutmak."],
    fixes: ["Ondalık sayılar için %f, tam sayılar için %d kullanın.", "Her biçimin değişkeninin türüyle eşleştiğinden emin olun."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning: başlatılmadan okunan değişken (used uninitialized)",
    explain: "{v} değişkeni değer almadan okunuyor; bu yüzden değeri rastgele olur.",
    causes: ["Başlangıç değeri olmadan değişken tanımlamak.", "Değeri yalnızca koşullu bir yolda atamak."],
    fixes: ["Değişkene tanımlandığı anda bir başlangıç değeri verin.", "Her yolun değişkene bir değer atadığından emin olun."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error: eklenen dosya bulunamadı (No such file or directory)",
    explain: "#include ile istenen {f} dosyası arama yolunda yok.",
    causes: ["Dosya adı yanlış yazılmış.", "Dosya aynı klasörde değil ya da derleyicinin arama yolunda değil.", "Kütüphanenin başlık dosyası kurulu değil."],
    fixes: ["#include içindeki dosya adını düzeltin.", "Yerel dosyalar için \" \", sistem kütüphaneleri için < > kullanın."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing: yakalanmamış istisna",
    explain: "{ex} istisnası fırlatıldı ve hiçbir catch ile yakalanmadı; program sonlandı. Genellikle at() kullanılırken vector ya da string sınırlarının dışına çıkılmıştır.",
    causes: ["at() ile sınırların dışında bir indis kullanmak.", "try ve catch olmadan fırlatılan istisna."],
    fixes: ["at() kullanmadan önce indisi denetleyin.", "İstisna fırlatabilecek kodu try ve catch ile sarın."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103: ad mevcut bağlamda yok",
    explain: "{n} değişkeni ya da fonksiyonu bu kapsamda tanımlı değil.",
    causes: ["Adda yazım hatası var.", "Değişken başka bir blok ya da fonksiyonun içinde tanımlı.", "Değişken tanımını unutmak."],
    fixes: ["Değişkeni kullanmadan önce tanımlayın.", "Adın büyük ve küçük harf eşleşmesini denetleyin."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002: noktalı virgül ; bekleniyordu",
    explain: "C# için gerekli olan, cümlenin sonundaki noktalı virgülü ; unutmuşsunuz.",
    causes: ["Bir komuttan ya da tanımdan sonra ; unutmak.", "Eksik biçimde biten bir satır."],
    fixes: ["Belirtilen satırın ya da bir öncekinin sonuna ; ekleyin."],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029: iki tür arasında örtük dönüşüm yapılamaz",
    explain: "C#, {a} türünden {b} türüne otomatik dönüştürmez; çünkü dönüşüm veri kaybettirebilir ya da türler uyumsuzdur.",
    causes: ["Sayısal bir değişkene metin atamak.", "Ondalık bir sayıyı tam sayı bir değişkene atamak."],
    fixes: ["Değeri açıkça dönüştürün, örneğin metin için int.Parse.", "Değişkenin türünü değere uyacak şekilde değiştirin."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: fonksiyon tüm yollarda değer döndürmüyor",
    explain: "Fonksiyon olası tüm yollarda değer döndürmelidir; burada return olmadan biten bir yol var.",
    causes: ["return yalnızca bir if içinde.", "Fonksiyonun sonuna return yazmayı unutmak."],
    fixes: ["Fonksiyonun sonuna return ekleyin.", "Diğer durum için değer döndüren bir else ekleyin."],
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
    title: "CS0246: tür ya da ad alanı bulunamadı",
    explain: "C# {t} tür ya da ad alanını bulamadı; genellikle uygun using yazmadığınız ya da kütüphaneyi eklemediğiniz için.",
    causes: ["System.Collections.Generic gibi bir ad alanı için using yazmayı unutmak.", "Tür adında yazım hatası."],
    fixes: ["Dosyanın başına uygun using ekleyin.", "Tür adını denetleyin ve dış kütüphaneden geliyorsa paketi ekleyin."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165: yerel değişken atanmadan kullanıldı",
    explain: "{v} yerel değişkeni, kendisine değer atanmadan kullanılıyor.",
    causes: ["Değişkeni değer vermeden tanımlayıp okumak.", "Değer yalnızca if içinde atanmış."],
    fixes: ["Değişkene tanımlandığı anda bir başlangıç değeri verin.", "Her yolun değişkene bir değer atadığından emin olun."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120: static olmayan üyeye erişmek için nesne gerekli",
    explain: "{m} static olmayan bir üye; kullanmak için nesneye ihtiyaç var ve static bir fonksiyondan doğrudan erişilemez.",
    causes: ["static bir fonksiyon içinde normal bir üyeyi kullanmak.", "Sınıftan bir nesne oluşturmayı unutmak."],
    fixes: ["Ortak kullanılacaksa üyeyi static yapın.", "Ya da sınıftan bir nesne oluşturup üyeyi onun üzerinden kullanın."],
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
    title: "NullReferenceException: boş referans (null)",
    explain: "Değeri null olan bir nesneyi kullanmaya çalışıyorsunuz; yani henüz oluşturulmamış ya da null atanmış.",
    causes: ["Değeri null olan bir metin değişkeninden Length okumak.", "new ile oluşturulmamış bir nesne.", "Sözlük var olmayan bir anahtar için null döndürdü."],
    fixes: ["Kullanmadan önce null'ı if (x != null) ya da ?. ile denetleyin.", "Nesneyi kullanmadan önce oluşturun."],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException: indis dizi sınırlarının dışında",
    explain: "Dizinin dışındaki bir indise erişmeye çalıştınız; indisler 0'dan başlar ve uzunluk - 1'de biter.",
    causes: ["İndis dizinin uzunluğuna eşit.", "Döngü son öğeyi aşıyor."],
    fixes: ["0 ile uzunluk - 1 arasında indisler kullanın.", "İndise ihtiyacınız yoksa foreach kullanın."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException: metnin biçimi geçersiz",
    explain: "Metin, dönüşüm için gereken biçimle eşleşmiyor; örneğin sayısal olmayan bir metinde int.Parse.",
    causes: ["Sayıya çevrilen metinde harf var.", "Dönüşüm sırasında boş metin."],
    fixes: ["Dönüşümden önce denetlemek için int.TryParse kullanın.", "Dönüştürmeden önce girdiyi denetleyin."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException: geçersiz tür dönüşümü",
    explain: "{a} türünden bir nesneyi {b} türüne dönüştürmeye çalıştınız; nesne o türden değil.",
    causes: ["Object'i, gerçek değere uymayan bir türe dönüştürmek.", "Bir koleksiyonda farklı türde öğeler."],
    fixes: ["Dönüştürmeden önce is ile türü denetleyin.", "Güvenli dönüşüm için as kullanın."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException: sıfıra bölme",
    explain: "Tam sayıyı sıfıra bölmek; bu C#'ta istisna fırlatır.",
    causes: ["Değeri sıfır olan bir payda.", "Boş bir koleksiyonun ortalamasını hesaplamak."],
    fixes: ["Paydanın sıfır olmadığını denetleyin.", "Hesaplama kesirli sonuç verebilecekse double kullanın."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
