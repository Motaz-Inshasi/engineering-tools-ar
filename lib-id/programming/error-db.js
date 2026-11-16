export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: nama tidak terdefinisi (name is not defined)",
    explain: "Anda menggunakan nama {name} yang belum didefinisikan sebelumnya dalam cakupan ini, atau penulisannya berbeda dari definisinya.",
    causes: ["Variabel belum pernah diberi nilai.", "Salah ketik pada nama.", "Variabel digunakan sebelum didefinisikan, atau di luar fungsi tempat ia didefinisikan."],
    fixes: ["Definisikan variabel dan beri nilai sebelum menggunakannya.", "Pastikan nama sama persis huruf demi huruf, karena Python membedakan huruf besar dan kecil."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: sintaks tidak valid (invalid syntax)",
    explain: "Python menemukan kata atau simbol di tempat yang tidak diizinkan oleh aturan bahasa. Kesalahan sebenarnya sering kali berada sebelum baris yang disebutkan.",
    causes: ["Lupa menulis koma, kurung, atau simbol di antara dua elemen.", "Menggunakan = sebagai ganti == di dalam kondisi.", "Menulis kata cadangan sebagai nama variabel."],
    fixes: ["Periksa baris yang disebutkan dan baris sebelumnya, cari kurung atau koma yang kurang.", "Gunakan == untuk perbandingan dan = untuk penugasan."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: diharapkan ':' (expected ':')",
    explain: "Pernyataan majemuk seperti if, for, while, atau def memerlukan titik dua : di akhir barisnya.",
    causes: ["Lupa menulis titik dua : setelah kondisi atau nama fungsi."],
    fixes: ["Tambahkan : di akhir baris pernyataan majemuk sebelum indentasi."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: string tidak tertutup (unterminated string literal)",
    explain: "Anda memulai string dengan tanda kutip dan tidak menutupnya pada baris yang sama.",
    causes: ["Lupa menulis tanda kutip di akhir teks.", "Menggunakan dua jenis tanda kutip yang berbeda untuk pembuka dan penutup."],
    fixes: ["Tutup string dengan tanda yang sama seperti pembukanya.", "Untuk teks multibaris gunakan \"\"\" \"\"\"."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: akhir baris saat membaca string (EOL while scanning)",
    explain: "Python sampai di akhir baris dan masih membaca string yang belum ditutup.",
    causes: ["Tanda kutip hilang di akhir teks.", "Tanda \\ di akhir baris merusak penutupan."],
    fixes: ["Tambahkan tanda kutip penutup yang sesuai.", "Perbarui Python atau gunakan teks multibaris dengan \"\"\"."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: akhir file tidak terduga (unexpected EOF)",
    explain: "File berakhir padahal Python masih menunggu penyelesaian sebuah pernyataan, biasanya kurung atau daftar yang belum ditutup.",
    causes: ["Daftar, kurung, atau pernyataan belum lengkap di tengahnya.", "Lupa menutup kurung terakhir di file."],
    fixes: ["Lengkapi pernyataan dan tutup semua kurung yang masih terbuka.", "Periksa baris terakhir di file."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: kurung tidak ditutup (was never closed)",
    explain: "Anda membuka kurung {br} dan tidak menutupnya dengan kurung pasangannya.",
    causes: ["Lupa menulis kurung tutup.", "Kurung tutup berada di tempat yang salah sehingga penerjemah mencari kurung lain."],
    fixes: ["Tambahkan kurung tutup yang sesuai.", "Gunakan editor yang memberi warna pada kurung yang berpasangan."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: kurung tutup berlebih (unmatched)",
    explain: "Ditemukan kurung tutup {br} tanpa kurung buka yang berpasangan.",
    causes: ["Kurung berlebih di akhir baris.", "Lupa menulis kurung buka di awal pernyataan."],
    fixes: ["Hapus kurung yang berlebih.", "Pastikan setiap kurung buka memiliki penutupnya."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: karakter tidak diizinkan (invalid character)",
    explain: "Python menemukan simbol yang tidak diterima dalam kode, biasanya tanda kutip Arab atau pintar seperti “ ” atau huruf asing.",
    causes: ["Menyalin kode dari dokumen yang mengubah tanda kutip menjadi tanda kutip pintar.", "Menulis koma Arab ، atau titik Arab sebagai ganti yang Latin."],
    fixes: ["Ganti tanda kutip pintar dengan tanda \" atau ' biasa.", "Ganti koma Arab dengan koma Inggris ,."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: kesalahan pada f-string",
    explain: "Sintaks string f-string tidak benar: {detail}.",
    causes: ["Kurung { tidak ditutup di dalam teks.", "Menggunakan tanda kutip yang sama di dalam f-string."],
    fixes: ["Tutup setiap kurung { dengan }.", "Gunakan tanda kutip yang berbeda di dalam ekspresi, atau ikuti sintaks yang sesuai dengan versi Python Anda."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: tidak dapat memberi nilai ke konstanta (cannot assign to literal)",
    explain: "Anda mencoba memberi nilai ke angka atau teks konstan, padahal penugasan memerlukan nama variabel.",
    causes: ["Angka atau teks diletakkan di sisi penugasan secara keliru.", "Tertukar antara == dan = di dalam kondisi."],
    fixes: ["Letakkan nama variabel di sisi kiri dari =.", "Gunakan == saat membandingkan."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: tidak dapat memberi nilai ke pemanggilan fungsi (cannot assign to function call)",
    explain: "Anda meletakkan pemanggilan fungsi di sisi penugasan, padahal sisi kiri harus berupa nama variabel.",
    causes: ["Menulis () setelah nama variabel di sisi penugasan.", "Lupa == lalu menulis = di dalam kondisi."],
    fixes: ["Hitung nilainya di dalam variabel lalu berikan kepadanya.", "Gunakan == untuk perbandingan."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: kurung pada print kurang (Missing parentheses)",
    explain: "Anda menulis print dengan gaya Python 2 tanpa kurung, sedangkan Python 3 memerlukan kurung.",
    causes: ["Menyalin contoh lama dengan sintaks Python 2.", "Lupa kurung pada print."],
    fixes: ["Letakkan teks atau nilai di dalam kurung print(...)."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: diharapkan blok yang menjorok (expected an indented block)",
    explain: "Baris sebelumnya diakhiri titik dua :, sehingga setelahnya harus ada kode yang menjorok ke dalam, tetapi kode itu tidak menjorok.",
    causes: ["Lupa indentasi di bawah if, for, atau def.", "Blok sepenuhnya kosong setelah titik dua."],
    fixes: ["Jorokkan baris berikutnya dengan empat spasi.", "Jika blok kosong, gunakan pass."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: indentasi tidak terduga (unexpected indent)",
    explain: "Python menemukan baris yang menjorok ke dalam tanpa alasan, yaitu tidak mengikuti pernyataan majemuk.",
    causes: ["Spasi berlebih di awal baris.", "Baris disalin dari tempat lain dengan indentasi yang berbeda."],
    fixes: ["Hapus spasi berlebih di awal baris.", "Pastikan semua baris pada level yang sama memiliki indentasi yang sama."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: indentasi tidak cocok dengan level luar mana pun",
    explain: "Indentasi pada baris ini tidak sama dengan level indentasi sebelumnya, sehingga Python tidak tahu baris ini milik blok yang mana.",
    causes: ["Jumlah spasi tercampur antarbaris.", "Menyalin kode dengan indentasi yang berbeda."],
    fixes: ["Buat setiap level kode memiliki jumlah spasi yang tetap (4 spasi).", "Gunakan editor yang menampilkan spasi."],
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
    title: "TabError: campuran Tab dan spasi",
    explain: "Anda kadang menggunakan tombol Tab dan kadang spasi untuk indentasi, dan Python menolak campuran ini.",
    causes: ["Sebagian baris diawali Tab dan sebagian lain dengan spasi.", "Pengaturan editor mengubah Tab dengan cara yang berbeda."],
    fixes: ["Gunakan spasi saja (4 spasi per level).", "Di editor, aktifkan konversi Tab menjadi spasi."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: tidak dapat menggabungkan string dengan nilai bertipe lain (can only concatenate str)",
    explain: "Anda mencoba menggabungkan string dengan nilai bertipe {t} menggunakan +, padahal Python tidak mengubah tipe secara otomatis.",
    causes: ["Menggunakan + antara string dan angka.", "Nilai yang berasal dari input() selalu berupa string."],
    fixes: ["Ubah angka menjadi string dengan str().", "Atau letakkan angka di dalam f-string sehingga otomatis menjadi string."],
    bad: `print("Umur: " + 20)`,
    good: `print("Umur: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: operasi tidak didukung antara dua tipe (unsupported operand type(s))",
    explain: "Operator {op} tidak menerima kedua tipe {a} dan {b} sekaligus.",
    causes: ["String dengan angka dalam operasi hitung.", "Nilai None di dalam operasi hitung."],
    fixes: ["Ubah string menjadi angka dengan int() atau float().", "Pastikan variabel berisi nilai numerik sebelum dihitung."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: tidak dapat mengindeks NoneType (not subscriptable)",
    explain: "Variabel bernilai None (yaitu tidak ada nilai), dan Anda mencoba mengakses elemen darinya dengan kurung [].",
    causes: ["Fungsi tidak mengembalikan apa pun karena tidak memiliki return.", "Variabel tidak mendapat nilai atau berasal dari operasi yang gagal."],
    fixes: ["Pastikan fungsi mengembalikan nilai menggunakan return.", "Periksa bahwa nilai bukan None sebelum mengindeksnya."],
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
    title: "AttributeError: atribut atau fungsi tidak ada (has no attribute)",
    explain: "Objek bertipe {type} tidak memiliki atribut atau fungsi {attr}.",
    causes: ["Nama fungsi atau atribut ditulis salah.", "Menggunakan fungsi milik tipe lain, seperti append pada string.", "Variabel bernilai None."],
    fixes: ["Periksa tipe objek dengan type().", "Lihat dokumentasi tipe tersebut untuk mengetahui fungsi yang tersedia di dalamnya."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: objek bukan fungsi (object is not callable)",
    explain: "Anda mencoba memanggil nilai bertipe {t} seolah-olah fungsi dengan menulis tanda kurung ().",
    causes: ["Menulis () setelah nama variabel yang memiliki nilai.", "Nama fungsi bawaan tertutupi oleh variabel, misalnya str = 5."],
    fixes: ["Ganti nama variabel agar tidak menimpa nama fungsi bawaan.", "Pastikan Anda benar-benar memanggil sebuah fungsi."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: argumen kurang pada pemanggilan fungsi (missing required positional argument)",
    explain: "Fungsi {fn} memerlukan {n} argumen tambahan yang tidak Anda berikan saat pemanggilan.",
    causes: ["Memanggil fungsi tanpa memberikan argumen yang diperlukan.", "Definisi fungsi meminta parameter yang sebenarnya tidak Anda butuhkan."],
    fixes: ["Berikan nilai yang kurang saat pemanggilan.", "Berikan nilai default pada parameter dalam definisi fungsi jika parameter itu opsional."],
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
    title: "TypeError: argumen berlebih pada pemanggilan fungsi (takes positional arguments but given)",
    explain: "Fungsi {fn} hanya menerima {n} argumen, tetapi Anda memberikan {m}.",
    causes: ["Memberikan nilai lebih banyak daripada jumlah parameter pada definisi.", "Definisi fungsi tidak memiliki parameter yang Anda berikan."],
    fixes: ["Hapus nilai berlebih dari pemanggilan.", "Tambahkan parameter yang kurang ke definisi fungsi."],
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
    title: "TypeError: objek tidak dapat diiterasi (object is not iterable)",
    explain: "Anda mencoba mengulang nilai bertipe {t} dengan loop for atau membongkar nilai, padahal tipe ini tidak dapat diiterasi.",
    causes: ["Lupa menggunakan range() dengan angka dalam loop.", "Fungsi tidak mengembalikan nilai sehingga hasilnya None."],
    fixes: ["Gunakan range(n) untuk mengulang berdasarkan angka.", "Pastikan variabel berupa daftar, string, atau himpunan sebelum diulang."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: indeks daftar harus berupa bilangan bulat (list indices)",
    explain: "Indeks daftar harus berupa bilangan bulat, sedangkan Anda memakai nilai bertipe {t}.",
    causes: ["Menulis indeks sebagai string seperti '1'.", "Menghitung indeks dengan pembagian / sehingga menghasilkan bilangan desimal."],
    fixes: ["Gunakan bilangan bulat tanpa tanda kutip.", "Gunakan // sebagai ganti / saat menghitung indeks."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: tidak dapat mengubah teks menjadi bilangan bulat (invalid literal for int)",
    explain: "Fungsi int() tidak dapat mengubah teks '{v}' menjadi bilangan bulat.",
    causes: ["Teks berisi huruf atau simbol yang bukan angka.", "Teks berupa bilangan desimal seperti 3.5.", "Teksnya kosong."],
    fixes: ["Gunakan float() untuk bilangan desimal.", "Periksa masukan sebelum dikonversi, atau gunakan try dan except."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: nilai lebih banyak daripada variabel (too many values to unpack)",
    explain: "Jumlah variabel pada pembongkaran hanya {n}, sedangkan daftar berisi lebih banyak nilai daripada itu.",
    causes: ["Jumlah nama variabel lebih sedikit daripada jumlah elemen.", "Daftar lebih panjang dari yang Anda perkirakan."],
    fixes: ["Tambah jumlah variabel agar sama dengan jumlah elemen.", "Gunakan *rest untuk menampung elemen yang berlebih."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: nilai kurang dari jumlah variabel (not enough values to unpack)",
    explain: "Anda mencoba membongkar nilai ke dalam {n} variabel, tetapi daftar hanya berisi {g} elemen.",
    causes: ["Jumlah variabel lebih besar daripada jumlah elemen.", "Fungsi mengembalikan lebih sedikit elemen daripada yang Anda perkirakan."],
    fixes: ["Kurangi jumlah variabel agar sama dengan jumlah elemen.", "Periksa panjang daftar sebelum membongkarnya."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: indeks di luar rentang daftar (list index out of range)",
    explain: "Anda mencoba mengakses posisi yang tidak ada dalam daftar. Ingat, penomoran dimulai dari 0 dan berakhir pada panjang - 1.",
    causes: ["Indeks sama dengan atau lebih besar dari panjang daftar.", "Loop melampaui elemen terakhir dalam daftar."],
    fixes: ["Gunakan indeks antara 0 dan len(daftar) - 1.", "Dalam loop, gunakan for x in daftar sebagai ganti pengindeksan."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: kunci tidak ada dalam kamus",
    explain: "Kamus tidak memiliki kunci {key}, sehingga pengaksesan dengan kurung [] gagal.",
    causes: ["Kunci ditulis berbeda dari kunci yang tersimpan.", "Kunci belum pernah ditambahkan ke kamus."],
    fixes: ["Gunakan get() dengan nilai default.", "Periksa keberadaan kunci dengan operator in sebelum mengaksesnya."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: pembagian dengan nol",
    explain: "Anda mencoba membagi dengan nol, operasi yang tidak terdefinisi secara matematis.",
    causes: ["Penyebut berupa variabel bernilai nol tanpa diperiksa.", "Menghitung rata-rata dari daftar kosong."],
    fixes: ["Pastikan penyebut tidak sama dengan nol sebelum membagi.", "Tambahkan kondisi yang menangani kasus khusus ini."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: pustaka tidak ditemukan (No module named)",
    explain: "Pustaka {mod} belum terpasang, atau namanya saat diimpor berbeda dari nama paketnya.",
    causes: ["Pustaka belum dipasang.", "Anda menjalankan Python dari lingkungan yang berbeda dengan lingkungan tempat pustaka dipasang.", "Nama impor berbeda dari nama paket, misalnya cv2 untuk pustaka opencv."],
    fixes: ["Pasang pustaka dengan perintah pip install nama_pustaka.", "Pastikan pustaka terpasang pada versi Python yang sama dengan yang Anda gunakan untuk menjalankan kode."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: nama tidak dapat diimpor (cannot import name)",
    explain: "Modul ada, tetapi nama {name} tidak terdefinisi di dalamnya.",
    causes: ["Nama fungsi ditulis dengan salah ketik.", "Ada berkas lokal yang namanya sama dengan pustaka standar, misalnya random.py.", "Fungsi tersedia pada versi pustaka yang lain."],
    fixes: ["Lihat dokumentasi pustaka untuk memastikan nama yang benar.", "Ganti nama berkas lokal yang sama dengan nama pustaka standar."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: berkas tidak ditemukan (No such file or directory)",
    explain: "Berkas {path} tidak ada di jalur tempat program berjalan.",
    causes: ["Nama atau ekstensi berkas ditulis salah.", "Folder tempat menjalankan program bukan folder tempat berkas berada."],
    fixes: ["Periksa nama dan ekstensi berkas.", "Gunakan jalur lengkap atau pastikan folder kerja sudah benar."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: kedalaman pemanggilan rekursif terlampaui (maximum recursion depth)",
    explain: "Fungsi memanggil dirinya sendiri tanpa henti, sehingga jumlah pemanggilan melebihi batas yang diizinkan.",
    causes: ["Tidak ada kondisi berhenti pada fungsi rekursif.", "Kondisi berhenti tidak pernah terpenuhi karena kesalahan logika."],
    fixes: ["Tambahkan kondisi berhenti yang jelas di awal fungsi.", "Ubah solusi menjadi loop while atau for."],
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
    title: "UnboundLocalError: variabel lokal digunakan sebelum diberi nilai (cannot access local variable)",
    explain: "Anda menggunakan variabel {name} di dalam fungsi sebelum diberi nilai di fungsi tersebut.",
    causes: ["Mengubah variabel dari luar fungsi di dalam fungsi tanpa deklarasi global.", "Memberi nilai pada variabel di dalam fungsi setelah variabel itu digunakan."],
    fixes: ["Berikan variabel ke fungsi sebagai argumen dan kembalikan nilainya.", "Atau gunakan global jika Anda memang perlu mengubah variabel global."],
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
    title: "StopIteration: elemen habis (StopIteration)",
    explain: "Iterator telah mencapai akhirnya dan tidak memiliki elemen lagi, biasanya terjadi pada next().",
    causes: ["Memanggil next() lebih banyak daripada jumlah elemen.", "Menggunakan kembali iterator yang sudah habis."],
    fixes: ["Gunakan next(it, None) untuk menentukan nilai saat habis.", "Gunakan loop for sebagai ganti next() secara manual."],
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
    title: "UnicodeDecodeError: dekode gagal (can't decode byte)",
    explain: "Berkas tidak menggunakan pengodean {codec} yang Anda gunakan untuk membacanya.",
    causes: ["Berkas disimpan dengan pengodean UTF-8, sedangkan Python membacanya dengan pengodean default lain.", "Berkas berupa biner seperti gambar, bukan teks."],
    fixes: ["Tambahkan encoding=\"utf-8\" saat membuka berkas.", "Jika berkas berupa biner, bukalah dengan mode \"rb\"."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: nilai melebihi rentang (OverflowError)",
    explain: "Nilai lebih besar dari batas yang dapat diproses fungsi: {msg}.",
    causes: ["Perhitungan eksponen yang sangat besar seperti exp(1000).", "Mengubah bilangan yang sangat besar menjadi bilangan desimal."],
    fixes: ["Kurangi ukuran nilai dalam perhitungan.", "Gunakan pustaka bilangan besar atau nilai yang lebih kecil."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: variabel tidak terdefinisi (is not defined)",
    explain: "Anda menggunakan {name} dan tidak mendefinisikannya dalam cakupan ini, atau penulisan namanya berbeda dari definisinya.",
    causes: ["Lupa menulis let, const, atau var sebelum definisi.", "Salah ketik pada nama.", "Variabel didefinisikan di dalam fungsi lain sehingga tidak terlihat dari sini.", "Berkas skrip atau pustaka yang mendefinisikan nama tersebut belum dimuat."],
    fixes: ["Definisikan variabel dengan let atau const sebelum digunakan.", "Pastikan huruf besar-kecil pada nama sudah sama, dan berkas yang diperlukan sudah dimuat sebelum kode."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: akses sebelum inisialisasi (before initialization)",
    explain: "Anda menggunakan {name} sebelum baris tempat Anda mendefinisikannya. Variabel let dan const tidak diangkat ke atas kode seperti var.",
    causes: ["Variabel digunakan pada baris yang berada di atas definisinya.", "Fungsi memanggil variabel yang belum dibuat."],
    fixes: ["Pindahkan definisi ke sebelum penggunaan pertamanya.", "Gunakan fungsi setelah variabel yang bergantung padanya diinisialisasi."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: membaca properti dari nilai kosong (Cannot read properties of undefined)",
    explain: "Anda mencoba membaca properti '{p}' dari nilai {t}, dan nilai itu belum ada pada saat tersebut.",
    causes: ["Variabel belum diberi nilai.", "Elemen DOM tidak ada, misalnya getElementById dengan ID yang salah.", "Data belum sampai dari server atau dari fungsi asinkron.", "Fungsi tidak mengembalikan apa pun sehingga hasilnya undefined."],
    fixes: ["Periksa nilainya dengan if sebelum mengaksesnya, atau gunakan operator ?. seperti obj?.name.", "Pastikan elemen ada di halaman sebelum menggunakannya."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: menetapkan properti pada nilai kosong (Cannot set properties of undefined)",
    explain: "Anda mencoba menulis properti '{p}' pada nilai {t}, dan objeknya belum dibuat.",
    causes: ["Mendefinisikan variabel objek tanpa memberinya nilai {}.", "Objek berasal dari fungsi yang tidak mengembalikan apa pun."],
    fixes: ["Buat objek terlebih dahulu dengan {} atau bentuk yang sesuai.", "Pastikan variabel berisi objek sebelum menulis padanya."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: bukan fungsi (is not a function)",
    explain: "Anda mencoba memanggil {fn} dengan tanda kurung (), padahal itu bukan fungsi.",
    causes: ["Nama fungsi ditulis dengan salah ketik.", "Fungsi belum didefinisikan atau belum diimpor.", "Pustaka mengembalikan nilai bertipe lain, misalnya export default dan bukan fungsi."],
    fixes: ["Periksa penulisan nama dan definisi fungsi sebelum memanggilnya.", "Periksa tipe nilai dengan typeof sebelum memanggilnya."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: nilai tidak dapat diiterasi (is not iterable)",
    explain: "Anda mencoba mengulang {x} dengan loop for...of atau pembongkaran [...], padahal nilai ini tidak dapat diiterasi.",
    causes: ["Menggunakan objek biasa {} dalam for...of.", "Fungsi tidak mengembalikan larik sehingga hasilnya undefined."],
    fixes: ["Gunakan Object.keys, Object.values, atau Object.entries pada objek tersebut.", "Pastikan nilainya berupa larik, string, atau Map sebelum diiterasi."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: mengubah variabel konstanta (Assignment to constant variable)",
    explain: "Variabel yang didefinisikan dengan const tidak dapat diubah nilainya setelah definisi.",
    causes: ["Menggunakan const untuk variabel yang nilainya akan berubah nanti.", "Lupa bahwa nilainya tetap saat diberi nilai ulang."],
    fixes: ["Gunakan let jika Anda akan mengubah nilainya.", "Buat variabel baru daripada mengubah konstanta."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: token tidak terduga (Unexpected token)",
    explain: "JavaScript menemukan simbol atau kata di tempat yang tidak diizinkan oleh aturan, dan penyebabnya biasanya ada sedikit sebelum baris yang disebutkan.",
    causes: ["Kurung atau koma berlebih atau kurang.", "Kata cadangan digunakan sebagai nama.", "Kode di dalam fungsi tidak ditutup dengan benar."],
    fixes: ["Periksa kurung dan koma pada baris tersebut dan baris sebelumnya.", "Gunakan editor yang menampilkan kesalahan dan mencocokkan kurung."],
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
    title: "SyntaxError: teks bukan JSON yang valid (is not valid JSON)",
    explain: "Fungsi JSON.parse mencoba membaca teks yang tidak berformat JSON yang benar, dan biasanya yang diterimanya adalah HTML, bukan data.",
    causes: ["Server mengembalikan halaman HTML seperti halaman kesalahan 404, bukan JSON.", "Berkas JSON memiliki koma berlebih atau tanda kutip tunggal."],
    fixes: ["Cetak teks mentah sebelum diurai dan pastikan isinya.", "Gunakan tanda kutip ganda untuk nama kunci dan teks dalam JSON."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: akhir kode tidak terduga (Unexpected end of input)",
    explain: "Berkas atau blok berakhir padahal JavaScript masih menunggu penutupan kurung atau kurung kurawal.",
    causes: ["Kurung { atau ( tanpa penutup.", "Menyalin sebagian kode dan lupa bagian akhirnya."],
    fixes: ["Tutup setiap kurung yang Anda buka.", "Gunakan editor yang mencocokkan kurung terbuka dan tertutup."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: kurang ')' setelah daftar argumen",
    explain: "Pemanggilan fungsi tidak ditutup dengan kurung ) sebelum titik koma atau akhir baris.",
    causes: ["Lupa menulis kurung tutup di akhir pemanggilan.", "Tanda kutip tidak tertutup di dalam argumen."],
    fixes: ["Tambahkan ) sebelum titik koma.", "Pastikan semua tanda kutip di dalam pemanggilan sudah tertutup."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: nama tidak terduga (Unexpected identifier)",
    explain: "JavaScript menemukan nama setelah sebuah nilai atau ekspresi tanpa titik koma sebagai pemisah, biasanya karena ada baris yang tidak diakhiri titik koma.",
    causes: ["Lupa ; di akhir baris sebelumnya.", "Menulis dua nama berurutan tanpa simbol pemisah di antaranya."],
    fixes: ["Tambahkan ; di akhir setiap pernyataan.", "Pisahkan setiap deklarasi dalam baris tersendiri."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: token tidak valid (Invalid or unexpected token)",
    explain: "JavaScript menemukan simbol yang tidak diterima dalam kode, biasanya tanda kutip pintar atau karakter tak terlihat.",
    causes: ["Menyalin kode dari dokumen yang mengubah tanda kutip menjadi tanda kutip pintar.", "Tanda kutip tidak tertutup dengan benar."],
    fixes: ["Ganti tanda kutip pintar dengan tanda \" atau ' biasa.", "Pastikan setiap teks ditutup dengan tanda kutip yang sama."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: variabel dideklarasikan dua kali (has already been declared)",
    explain: "Anda mendeklarasikan {name} lebih dari sekali dalam cakupan yang sama dengan let atau const.",
    causes: ["Menyalin baris deklarasi tanpa menghapus yang lama.", "Dua variabel dengan nama yang sama dalam berkas yang sama."],
    fixes: ["Hapus deklarasi yang berlebih atau ganti namanya.", "Gunakan penugasan ulang tanpa let jika Anda ingin mengubah nilainya."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: await di luar fungsi async",
    explain: "Anda menggunakan kata await di tempat yang tidak diizinkan. Kata ini hanya berfungsi di dalam fungsi async atau di dalam modul ES di tingkat atas berkas.",
    causes: ["Lupa menulis kata async sebelum fungsi.", "Menggunakan await di dalam fungsi biasa atau event biasa."],
    fixes: ["Jadikan fungsi sebagai async.", "Atau gunakan then() langsung dengan Promise."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: penggunaan import di luar modul ES",
    explain: "Node.js memperlakukan berkas sebagai CommonJS, sedangkan sintaks import adalah untuk modul ES.",
    causes: ["Berkas dijalankan dengan Node tanpa menyatakan bahwa itu adalah module.", "Menyalin contoh modern tanpa mengatur konfigurasi proyek."],
    fixes: ["Gunakan require sebagai ganti import pada CommonJS.", "Atau tambahkan \"type\": \"module\" di berkas package.json."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: tumpukan pemanggilan penuh (Maximum call stack size exceeded)",
    explain: "Fungsi memanggil dirinya sendiri tanpa henti, sehingga tumpukan eksekusi penuh.",
    causes: ["Tidak ada kondisi berhenti pada fungsi rekursif.", "Dua fungsi saling memanggil satu sama lain tanpa henti."],
    fixes: ["Tambahkan kondisi berhenti yang jelas.", "Ubah solusi menjadi loop while atau for."],
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
    title: "RangeError: panjang larik tidak valid (Invalid array length)",
    explain: "Panjang larik harus berupa bilangan bulat positif dalam batas tertentu.",
    causes: ["Memberikan angka negatif kepada Array.", "Memberikan nilai desimal atau non-numerik sebagai panjang larik."],
    fixes: ["Pastikan panjang berupa bilangan bulat positif.", "Periksa nilai sebelum membuat larik."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): Promise ditolak tanpa penanganan",
    explain: "Promise gagal, dan Anda belum menambahkan catch atau menggunakan try dan catch dengan await untuk menangani kesalahannya.",
    causes: ["Menggunakan then tanpa catch.", "Memanggil fungsi async tanpa await atau catch."],
    fixes: ["Tambahkan .catch() setelah rangkaian then.", "Bungkus kode await dengan try dan catch."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: permintaan diblokir oleh kebijakan berbagi sumber lintas situs",
    explain: "Peramban memblokir permintaan karena server tidak mengizinkan akses dari asal (origin) ini, atau karena halaman dibuka dari file://.",
    causes: ["Server tidak mengirim header Access-Control-Allow-Origin.", "Halaman dibuka langsung dari berkas, bukan melalui server lokal."],
    fixes: ["Aktifkan CORS di server agar mengizinkan domain yang diperlukan.", "Jalankan proyek melalui server lokal, bukan membuka berkas secara langsung."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: permintaan gagal (Failed to fetch)",
    explain: "Permintaan tidak sampai ke server; jaringan mungkin terputus, alamatnya salah, server sedang berhenti, atau diblokir oleh CORS.",
    causes: ["Server berhenti atau alamatnya ditulis salah.", "Koneksi internet terputus.", "Kebijakan CORS memblokir permintaan."],
    fixes: ["Buka alamat di peramban untuk memastikan alamat tersebut berfungsi.", "Periksa tab Network pada alat pengembang, dan pastikan pengaturan CORS sudah benar."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: modul tidak dapat ditemukan (Cannot find module)",
    explain: "Node.js tidak dapat menemukan berkas atau paket {mod}.",
    causes: ["Paket belum dipasang di proyek.", "Jalur relatif salah.", "Ekstensi berkas kurang, atau berkas tidak ada."],
    fixes: ["Pasang paket dengan perintah npm install nama_paket.", "Periksa jalur relatif dan keberadaan berkas."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: port sudah digunakan",
    explain: "Port yang ingin Anda dengarkan sedang dipakai program lain, biasanya ada salinan server lain yang sedang berjalan.",
    causes: ["Menjalankan server dua kali pada port yang sama.", "Program lain menggunakan port tersebut."],
    fixes: ["Hentikan salinan server yang lain.", "Atau ganti nomor port."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: berkas atau folder tidak ditemukan",
    explain: "Node.js mencoba membuka berkas atau folder yang tidak ada di jalur yang ditentukan.",
    causes: ["Nama berkas salah atau ekstensinya kurang.", "Jalur relatif terhadap folder kerja yang berbeda."],
    fixes: ["Periksa keberadaan berkas sebelum membacanya dengan fs.existsSync.", "Gunakan jalur yang dibangun berdasarkan folder berkas saat ini."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: struktur sirkular tidak dapat diubah menjadi JSON",
    explain: "Objek mengandung referensi sirkular, yaitu merujuk ke dirinya sendiri secara langsung atau tidak langsung, dan JSON.stringify tidak dapat mengubahnya.",
    causes: ["Objek memiliki properti yang merujuk ke dirinya sendiri.", "Objek DOM atau objek kompleks diberikan ke JSON.stringify."],
    fixes: ["Hapus properti sirkular sebelum konversi.", "Ubah menjadi objek sederhana yang hanya berisi data yang diperlukan."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: simbol tidak ditemukan (cannot find symbol)",
    explain: "Kompilator tidak menemukan variabel, fungsi, atau kelas dengan nama ini. Lihat baris symbol dalam pesan untuk mengetahui nama yang dimaksud.",
    causes: ["Nama ditulis dengan salah ketik.", "Variabel didefinisikan di cakupan lain.", "Lupa import untuk kelas seperti ArrayList.", "Anda belum mendefinisikan variabel tersebut sama sekali."],
    fixes: ["Perbaiki nama sesuai baris symbol.", "Tambahkan impor yang sesuai, misalnya import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: konversi yang mungkin kehilangan sebagian nilai (possible lossy conversion)",
    explain: "Konversi dari {a} ke {b} dapat menghilangkan sebagian nilai, misalnya bagian desimal, sehingga Java menolaknya secara otomatis.",
    causes: ["Memberikan bilangan desimal ke variabel bilangan bulat.", "Hasil pembagian dua bilangan bulat memiliki pecahan."],
    fixes: ["Jadikan variabel bertipe yang lebih luas, misalnya double.", "Jika konversi memang disengaja, gunakan konversi eksplisit seperti (int)."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: tipe tidak kompatibel (incompatible types)",
    explain: "Anda mencoba memberikan nilai yang tidak sesuai dengan tipe variabel: {a}.",
    causes: ["Memberikan teks ke variabel numerik atau sebaliknya.", "Mengembalikan tipe yang berbeda dari tipe fungsi."],
    fixes: ["Samakan tipe nilai dengan tipe variabel.", "Konversi nilai secara eksplisit jika konversi itu masuk akal."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: pernyataan return kurang (missing return statement)",
    explain: "Fungsi harus mengembalikan nilai di setiap jalur eksekusi yang mungkin, dan di sini ada jalur yang tidak mengembalikan apa pun.",
    causes: ["return hanya ada di dalam if tanpa jalur alternatif.", "Lupa return di akhir fungsi."],
    fixes: ["Tambahkan return di akhir fungsi sebagai nilai default.", "Tambahkan else yang mengembalikan nilai untuk kasus lainnya."],
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
    title: "error: titik koma ; diharapkan",
    explain: "Lupa titik koma ; di akhir pernyataan, padahal Java selalu memerlukannya.",
    causes: ["Lupa ; setelah pernyataan atau deklarasi.", "Baris diakhiri dengan cara yang tidak lengkap."],
    fixes: ["Tambahkan ; di akhir baris yang disebutkan atau baris sebelumnya."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: nama berkas tidak sesuai dengan kelas publik (is public, should be declared in a file named)",
    explain: "Kelas publik {cls} harus berada di dalam berkas yang namanya tepat {file}.",
    causes: ["Berkas diberi nama yang berbeda dari nama kelas publik.", "Dua kelas publik dalam satu berkas."],
    fixes: ["Ganti nama berkas agar sesuai dengan nama kelas publik.", "Atau jadikan kelas tidak publik dengan menghapus public."],
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
    title: "error: pernyataan tidak dapat dicapai (unreachable statement)",
    explain: "Ada baris setelah return, break, atau throw yang tidak akan pernah dijalankan, sehingga ditolak oleh kompilator.",
    causes: ["Menulis kode tepat setelah return.", "Loop while(true) tanpa break sebelum kode berikutnya."],
    fixes: ["Pindahkan baris ke sebelum return.", "Hapus kode yang tidak akan pernah dijalankan."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: variabel mungkin belum diinisialisasi (might not have been initialized)",
    explain: "Variabel {v} mungkin belum mendapat nilai sebelum digunakan pada beberapa jalur eksekusi.",
    causes: ["Mendefinisikan variabel tanpa nilai lalu menggunakannya.", "Memberi nilai di dalam if tanpa else."],
    fixes: ["Berikan nilai awal pada variabel saat definisi.", "Pastikan setiap jalur memberikan nilai kepada variabel."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: anggota non-static dari konteks static",
    explain: "{m} adalah anggota non-static, dan tidak dapat digunakan langsung dari metode main atau metode static mana pun tanpa objek.",
    causes: ["Memanggil metode biasa langsung dari main.", "Variabel biasa dalam kelas yang digunakan dari metode static."],
    fixes: ["Jadikan anggota static jika memang dipakai bersama.", "Atau buat objek dari kelas dan panggil anggota melalui objek tersebut."],
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
    title: "NullPointerException: penunjuk kosong (null)",
    explain: "Anda mencoba menggunakan objek yang bernilai null, yaitu belum dibuat atau diberi nilai null.",
    causes: ["Variabel teks yang diberi null lalu metodenya dipanggil.", "Objek yang tidak dibuat dengan new.", "Map.get mengembalikan null untuk kunci yang tidak ada."],
    fixes: ["Buat objeknya sebelum digunakan.", "Periksa null dengan if (x != null) atau gunakan Objects.requireNonNull."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: indeks di luar batas larik",
    explain: "Anda mencoba mengakses indeks {i} padahal panjang larik adalah {n}. Indeks dimulai dari 0 dan berakhir pada panjang - 1.",
    causes: ["Indeks tepat sama dengan panjang.", "Loop melampaui elemen terakhir."],
    fixes: ["Gunakan indeks antara 0 dan panjang - 1.", "Gunakan loop for-each jika Anda tidak memerlukan indeks."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: indeks di luar batas string",
    explain: "Indeks yang diminta dari string berada di luar batasnya, dan ini terjadi pada charAt atau substring.",
    causes: ["Menggunakan charAt dengan indeks yang sama dengan panjang string.", "substring dengan batas yang salah."],
    fixes: ["Pastikan indeks berada di antara 0 dan panjang string - 1.", "Periksa panjang teks sebelum mengekstraknya."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException: pembagian dengan nol",
    explain: "Pembagian bilangan bulat dengan nol, dan ini tidak diizinkan di Java untuk bilangan bulat.",
    causes: ["Penyebut berupa variabel bernilai nol.", "Menghitung rata-rata dari daftar kosong."],
    fixes: ["Periksa bahwa penyebut tidak sama dengan nol.", "Gunakan double jika sesuai dengan perhitungan."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException: teks bukan merupakan bilangan bulat",
    explain: "Fungsi tidak dapat mengubah teks «{v}» menjadi angka, karena mengandung huruf atau tanda desimal.",
    causes: ["Teks berisi huruf atau spasi.", "Bilangan desimal yang diubah menjadi int."],
    fixes: ["Gunakan Double.parseDouble untuk bilangan desimal.", "Periksa teks dengan matches atau try dan catch."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException: konversi tipe tidak kompatibel",
    explain: "Anda mencoba mengubah objek bertipe {a} menjadi {b}, padahal objek itu bukan bertipe tersebut.",
    causes: ["Konversi Object ke tipe yang tidak sesuai dengan objek sebenarnya.", "Elemen daftar dengan tipe campuran."],
    fixes: ["Periksa tipe dengan instanceof sebelum konversi.", "Pastikan nilai bertipe benar saat menambahkannya."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException: masukan tidak sesuai dengan tipe yang diharapkan",
    explain: "Scanner mengharapkan tipe tertentu, misalnya bilangan bulat, tetapi menemukan teks, atau sebaliknya.",
    causes: ["Pengguna memasukkan huruf padahal yang diharapkan angka.", "Urutan antara nextInt dan nextLine tidak benar."],
    fixes: ["Periksa sebelum membaca dengan hasNextInt().", "Baca satu baris penuh dengan nextLine lalu konversikan."],
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
    title: "ConcurrentModificationException: mengubah daftar saat sedang dilalui",
    explain: "Anda mengubah daftar saat melaluinya dengan loop for-each, sehingga Java menolak melanjutkan.",
    causes: ["Menghapus elemen dari daftar di dalam for-each.", "Menambahkan elemen ke daftar di dalam loop yang sama."],
    fixes: ["Gunakan removeIf untuk menghapus elemen.", "Atau gunakan Iterator dengan metode remove-nya."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError: tumpukan penuh",
    explain: "Pemanggilan berulang tanpa henti, yaitu fungsi yang memanggil dirinya sendiri tanpa kondisi keluar, sehingga tumpukan eksekusi penuh.",
    causes: ["Tidak ada kondisi berhenti pada fungsi rekursif.", "Kondisi berhenti tidak pernah terpenuhi."],
    fixes: ["Tambahkan kondisi berhenti yang jelas di awal fungsi.", "Ubah solusi menjadi loop."],
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
    title: "OutOfMemoryError: memori habis",
    explain: "Program meminta memori lebih besar daripada yang tersedia, biasanya karena loop yang membuat objek tanpa henti atau data yang sangat besar.",
    causes: ["Loop yang menambahkan objek ke daftar tanpa henti.", "Memuat berkas yang sangat besar sepenuhnya ke dalam memori."],
    fixes: ["Proses data dalam potongan-potongan kecil.", "Kosongkan daftar yang tidak lagi dibutuhkan."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error: pengecualian tidak tertangani (unreported exception)",
    explain: "Fungsi melempar pengecualian {e} yang bertipe checked, sehingga Anda harus menanganinya dengan try dan catch atau mendeklarasikannya di throws.",
    causes: ["Memanggil fungsi yang melempar pengecualian checked tanpa penanganan.", "Melempar pengecualian checked di dalam fungsi yang tidak mendeklarasikannya."],
    fixes: ["Bungkus pemanggilan dengan try dan catch.", "Atau tambahkan throws {e} pada definisi fungsi."],
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
    title: "error: file berakhir sebelum kode selesai (reached end of file while parsing)",
    explain: "File berakhir padahal masih ada kurung { yang belum ditutup, sehingga definisi kelas atau fungsi belum lengkap.",
    causes: ["Lupa menutup kurung kurawal } di akhir fungsi atau kelas.", "Kurung berlebih atau kurang di tengah kode."],
    fixes: ["Tambahkan kurung tutup yang kurang.", "Gunakan editor yang mencocokkan kurung untuk menemukan kesalahannya."],
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
    title: "error: variabel sudah didefinisikan (is already defined)",
    explain: "Anda mendefinisikan variabel {v} lebih dari sekali dalam cakupan yang sama.",
    causes: ["Menyalin baris deklarasi tanpa menghapus yang lama.", "Definisi variabel dengan nama yang sama dilakukan sekali di dalam loop dan sekali di luarnya."],
    fixes: ["Hapus deklarasi yang berlebih atau ganti namanya.", "Gunakan penugasan ulang tanpa menyebutkan tipe variabel."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error: kompilator mengharapkan simbol sebelum kata yang disebutkan (expected before)",
    explain: "Kompilator mengharapkan {what} di posisi yang disebutkan, tetapi menemukan hal lain; kesalahannya biasanya ada di baris sebelum lokasi pesan.",
    causes: ["Lupa titik koma ; di akhir baris sebelumnya.", "Kurung yang belum ditutup di baris sebelumnya."],
    fixes: ["Tambahkan ; atau tutup kurung di baris sebelumnya.", "Ingat bahwa kompilator terkadang menunjuk baris setelah kesalahan yang sebenarnya."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error: nama tidak dideklarasikan dalam cakupan ini (was not declared in this scope)",
    explain: "Variabel atau fungsi {n} tidak didefinisikan di bagian kode ini.",
    causes: ["Salah ketik pada nama.", "Variabel didefinisikan di dalam fungsi lain.", "Lupa #include untuk pustaka yang mendefinisikan nama tersebut."],
    fixes: ["Definisikan nama sebelum digunakan atau kirimkan sebagai parameter.", "Tambahkan #include yang sesuai di bagian atas berkas."],
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
    title: "error: pengidentifikasi tidak dideklarasikan (use of undeclared identifier)",
    explain: "Kompilator clang tidak menemukan definisi {n} di cakupan ini.",
    causes: ["Salah ketik pada nama.", "Variabel didefinisikan di cakupan lain atau belum pernah didefinisikan."],
    fixes: ["Perbaiki nama atau definisikan variabel sebelum digunakan."],
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
    title: "undefined reference: linker tidak menemukan definisinya",
    explain: "Anda mendeklarasikan {s} tetapi belum menulis definisinya, atau belum menautkan berkas yang berisi definisinya saat kompilasi.",
    causes: ["Lupa menulis badan fungsi.", "Berkas sumber yang mendefinisikan fungsi tidak diberikan ke kompilator.", "Kesalahan pada pustaka yang ditautkan atau urutan penautan."],
    fixes: ["Tulis definisi fungsi atau variabel.", "Tambahkan berkas sumber atau pustaka ke perintah kompilasi."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault: akses ke memori yang tidak diizinkan",
    explain: "Program mencoba mengakses memori yang bukan miliknya, biasanya pointer kosong, indeks di luar larik, atau pointer yang sudah dibebaskan.",
    causes: ["Pointer belum diinisialisasi atau bernilai NULL lalu digunakan.", "Indeks di luar batas larik.", "Penggunaan memori setelah free."],
    fixes: ["Pastikan pointer menunjuk ke memori yang valid sebelum menggunakannya.", "Jalankan program dengan gdb atau valgrind untuk menemukan barisnya."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function: fungsi dipanggil sebelum dideklarasikan",
    explain: "Anda memanggil fungsi {f} sebelum mendefinisikan atau mendeklarasikannya, sehingga kompilator menebak tipenya secara otomatis.",
    causes: ["Fungsi didefinisikan di bawah setelah pemanggilannya.", "Lupa #include untuk berkas yang mendeklarasikannya."],
    fixes: ["Letakkan deklarasi fungsi (prototype) sebelum main.", "Tambahkan #include untuk berkas yang benar."],
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
    title: "error: kompilator mengharapkan ekspresi (expected primary-expression)",
    explain: "Kompilator mengharapkan nilai atau variabel di posisi ini, tetapi menemukan simbol yang tidak cocok di tempat itu.",
    causes: ["Tanda = tanpa nilai sesudahnya.", "Kurung atau koma di tempat yang tidak diterima oleh ekspresi."],
    fixes: ["Tambahkan nilai yang diperlukan setelah = atau di dalam kurung.", "Periksa koma dan kurung sebelum lokasi yang disebutkan."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error: konversi tipe tidak valid (invalid conversion)",
    explain: "Anda mencoba mengubah {a} menjadi {b} dengan cara yang tidak diizinkan di C atau C++.",
    causes: ["Menetapkan nilai ke pointer tanpa alamat.", "Tipe nilai dan tipe pointer tidak cocok."],
    fixes: ["Berikan alamat variabel ke pointer dengan &.", "Pastikan tipenya cocok atau konversikan secara eksplisit."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error: tidak ada fungsi yang cocok untuk pemanggilan (no matching function for call)",
    explain: "Pemanggilan {f} tidak cocok dengan definisi fungsi mana pun dari sisi jumlah atau tipe parameter.",
    causes: ["Memberikan jumlah parameter yang berbeda dari definisi.", "Memberikan tipe yang tidak dapat dikonversi ke tipe yang dibutuhkan."],
    fixes: ["Cocokkan parameter dengan definisi fungsi.", "Periksa tanda tangan fungsi di dokumentasi atau berkas header."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error: redefinisi (redefinition of)",
    explain: "Anda mendefinisikan atau mendeklarasikan {n} lebih dari sekali dalam cakupan yang sama.",
    causes: ["Menyalin baris definisi tanpa menghapus yang lama.", "Berkas header disertakan lebih dari sekali tanpa penjagaan."],
    fixes: ["Hapus definisi yang berlebih.", "Tambahkan penjaga header #ifndef atau #pragma once pada berkas header."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error: tipe bertentangan (conflicting types)",
    explain: "Deklarasi pertama {n} berbeda dari deklarasi atau definisi berikutnya dalam tipe kembalian atau parameternya.",
    causes: ["Tipe kembalian berubah antara deklarasi dan definisi.", "Jumlah atau tipe parameter berbeda antara kedua versi."],
    fixes: ["Samakan tanda tangan pada deklarasi dan definisi.", "Perbarui deklarasi agar sesuai dengan definisi."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning: fungsi berakhir tanpa return (control reaches end)",
    explain: "Fungsi seharusnya mengembalikan nilai, tetapi beberapa jalur berakhir tanpa return, dan ini adalah perilaku yang tidak terdefinisi.",
    causes: ["return hanya ada di dalam if.", "Lupa return di akhir fungsi."],
    fixes: ["Tambahkan return di akhir fungsi.", "Pastikan setiap jalur mengembalikan nilai."],
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
    title: "stack smashing detected: penulisan di luar batas tumpukan",
    explain: "Anda menulis di luar batas larik di tumpukan sehingga merusak data yang dilindungi, biasanya karena strcpy atau indeks berlebih.",
    causes: ["Menyalin teks yang lebih panjang dari larik menggunakan strcpy.", "Loop menulis setelah akhir larik."],
    fixes: ["Gunakan strncpy dengan ukuran larik dan pastikan teks diakhiri dengan nol.", "Periksa batas sebelum menulis."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning: indeks di luar batas larik (array subscript out of bounds)",
    explain: "Kode membaca atau menulis di luar batas larik, dan ini menyebabkan perilaku yang tidak terduga.",
    causes: ["Indeks sama dengan atau lebih besar dari ukuran larik.", "Loop menghitung sampai ukuran, bukan ukuran - 1."],
    fixes: ["Gunakan indeks dari 0 sampai ukuran - 1.", "Periksa indeks sebelum mengaksesnya."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer atau double free",
    explain: "Anda membebaskan memori yang sudah dibebaskan sebelumnya, atau membebaskan pointer yang tidak berasal dari malloc.",
    causes: ["Memanggil free dua kali pada pointer yang sama.", "Membebaskan pointer yang menunjuk ke variabel lokal atau ke dalam larik."],
    fixes: ["Atur pointer ke NULL setelah free.", "Pastikan setiap memori hanya dibebaskan satu kali dan dari sumber yang sama."],
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
    title: "multiple definition: definisi ganda di lebih dari satu berkas",
    explain: "Definisi {n} ada di lebih dari satu berkas sumber, biasanya karena berkas header berisi definisi, bukan hanya deklarasi.",
    causes: ["Menulis definisi variabel atau fungsi di dalam berkas header.", "Menyertakan berkas header di lebih dari satu berkas sumber."],
    fixes: ["Jadikan berkas header hanya deklarasi dengan extern atau prototype.", "Letakkan definisi di satu berkas sumber."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error: diperlukan nilai yang dapat ditugaskan (lvalue required)",
    explain: "Anda mencoba memberi nilai ke ekspresi yang tidak memiliki lokasi di memori, seperti konstanta atau hasil fungsi.",
    causes: ["Angka diletakkan di sisi kiri penugasan.", "Mencoba menambah nilai hasil dari fungsi."],
    fixes: ["Letakkan nama variabel di sisi kiri dari =.", "Simpan hasil fungsi di variabel lalu ubah variabel tersebut."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning: membandingkan bilangan bertanda dengan bilangan tak bertanda (signedness)",
    explain: "Membandingkan bilangan bertanda (signed) dengan bilangan tak bertanda (unsigned), sehingga nilai negatif berubah menjadi bilangan besar dan hasilnya berubah.",
    causes: ["Gunakan size_t atau unsigned int dengan int dalam loop.", "Penghitung bilangan bulat dibandingkan dengan panjang larik."],
    fixes: ["Samakan kedua tipe dalam hal tanda (signedness).", "Gunakan tipe yang sama pada kedua variabel."],
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
    title: "warning: format cetak tidak sesuai dengan tipe variabel (format expects argument)",
    explain: "Format cetak %{f} mengharapkan tipe {t}, tetapi variabel yang diberikan bertipe lain, dan ini dapat mencetak nilai yang salah.",
    causes: ["Menggunakan %d untuk bilangan desimal.", "Lupa tipe variabel saat mengubah kode."],
    fixes: ["Gunakan %f untuk bilangan desimal dan %d untuk bilangan bulat.", "Pastikan setiap format sesuai dengan tipe variabelnya."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning: variabel dibaca sebelum diinisialisasi (used uninitialized)",
    explain: "Variabel {v} dibaca sebelum mendapat nilai, sehingga nilainya acak.",
    causes: ["Mendefinisikan variabel tanpa nilai awal.", "Memberikan nilai hanya pada jalur bersyarat."],
    fixes: ["Berikan nilai awal pada variabel saat definisi.", "Pastikan semua jalur memberikan nilai kepadanya."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error: berkas yang disertakan tidak ditemukan (No such file or directory)",
    explain: "Berkas yang diminta oleh #include, yaitu {f}, tidak ditemukan di jalur pencarian.",
    causes: ["Nama berkas ditulis dengan salah.", "Berkas tidak berada di folder yang sama atau di jalur kompilator.", "Berkas header pustaka belum terpasang."],
    fixes: ["Perbaiki nama berkas pada #include.", "Gunakan tanda \" \" untuk berkas lokal dan < > untuk pustaka sistem."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing: pengecualian tidak tertangkap",
    explain: "Pengecualian {ex} dilempar dan tidak ditangkap oleh catch mana pun, sehingga program berhenti. Kemungkinan besar terjadi karena akses di luar batas vector atau string saat menggunakan at().",
    causes: ["Menggunakan at() dengan indeks di luar batas.", "Pengecualian dilempar tanpa try dan catch."],
    fixes: ["Periksa indeks sebelum menggunakan at().", "Bungkus kode yang mungkin melempar pengecualian dengan try dan catch."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103: nama tidak ada dalam konteks saat ini",
    explain: "Variabel atau fungsi {n} tidak didefinisikan dalam cakupan ini.",
    causes: ["Salah ketik pada nama.", "Variabel didefinisikan di dalam blok lain atau fungsi lain.", "Lupa mendefinisikan variabel."],
    fixes: ["Definisikan variabel sebelum digunakan.", "Pastikan huruf besar-kecil pada nama sudah sama."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002: titik koma ; diharapkan",
    explain: "Lupa titik koma ; di akhir pernyataan, padahal C# memerlukannya.",
    causes: ["Lupa ; setelah pernyataan atau deklarasi.", "Baris diakhiri dengan cara yang tidak lengkap."],
    fixes: ["Tambahkan ; di akhir baris yang disebutkan atau baris sebelumnya."],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029: konversi implisit antara kedua tipe tidak dapat dilakukan",
    explain: "C# tidak mengonversi secara otomatis dari {a} ke {b} karena konversi itu dapat kehilangan data atau karena kedua tipe tidak kompatibel.",
    causes: ["Memberikan teks ke variabel numerik.", "Memberikan bilangan desimal ke variabel bilangan bulat."],
    fixes: ["Konversi nilai secara eksplisit, misalnya int.Parse untuk teks.", "Ubah tipe variabel agar sesuai dengan nilainya."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: fungsi tidak mengembalikan nilai di semua jalur",
    explain: "Fungsi harus mengembalikan nilai di semua jalur yang mungkin, dan di sini ada jalur yang berakhir tanpa return.",
    causes: ["return hanya ada di dalam if.", "Lupa return di akhir fungsi."],
    fixes: ["Tambahkan return di akhir fungsi.", "Tambahkan else yang mengembalikan nilai untuk kasus lainnya."],
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
    title: "CS0246: tipe atau namespace tidak ditemukan",
    explain: "C# tidak menemukan tipe atau namespace {t}, kemungkinan karena Anda belum menulis using yang sesuai atau belum menambahkan pustaka.",
    causes: ["Lupa using untuk namespace seperti System.Collections.Generic.", "Salah ketik pada nama tipe."],
    fixes: ["Tambahkan using yang sesuai di bagian atas berkas.", "Periksa nama tipe dan tambahkan paket jika berasal dari pustaka eksternal."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165: variabel lokal digunakan sebelum diberi nilai",
    explain: "Variabel lokal {v} digunakan sebelum Anda memberinya nilai.",
    causes: ["Mendefinisikan variabel tanpa nilai lalu membacanya.", "Memberi nilai hanya di dalam if."],
    fixes: ["Berikan nilai awal pada variabel saat definisi.", "Pastikan semua jalur memberikan nilai kepadanya."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120: diperlukan objek untuk mengakses anggota non-static",
    explain: "{m} adalah anggota non-static dan memerlukan objek untuk digunakan, serta tidak dapat diakses langsung dari metode static.",
    causes: ["Menggunakan anggota biasa di dalam metode static.", "Lupa membuat objek dari kelas."],
    fixes: ["Jadikan anggota static jika memang dipakai bersama.", "Atau buat objek dari kelas dan gunakan anggota melalui objek tersebut."],
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
    title: "NullReferenceException: referensi kosong (null)",
    explain: "Anda mencoba menggunakan objek yang bernilai null, yaitu belum dibuat atau diberi nilai null.",
    causes: ["Variabel teks bernilai null lalu membaca Length darinya.", "Objek yang tidak dibuat dengan new.", "Kamus mengembalikan null untuk kunci yang tidak ada."],
    fixes: ["Periksa null sebelum digunakan dengan if (x != null) atau dengan ?.", "Buat objeknya sebelum digunakan."],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException: indeks di luar batas larik",
    explain: "Anda mencoba mengakses indeks di luar larik, padahal indeks dimulai dari 0 dan berakhir pada panjang - 1.",
    causes: ["Indeks sama dengan panjang larik.", "Loop melampaui elemen terakhir."],
    fixes: ["Gunakan indeks dari 0 sampai panjang - 1.", "Gunakan foreach jika Anda tidak memerlukan indeks."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException: format teks tidak valid",
    explain: "Teks tidak sesuai dengan format yang diperlukan untuk konversi, misalnya int.Parse pada teks yang tidak berupa angka.",
    causes: ["Teks berisi huruf saat diubah menjadi angka.", "Teks kosong saat dikonversi."],
    fixes: ["Gunakan int.TryParse untuk memeriksa sebelum konversi.", "Periksa masukan sebelum mengubahnya."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException: konversi tipe tidak valid",
    explain: "Anda mencoba mengubah objek bertipe {a} menjadi {b}, padahal objek itu bukan bertipe tersebut.",
    causes: ["Konversi object ke tipe yang tidak sesuai dengan nilai sebenarnya.", "Elemen dengan tipe berbeda di dalam koleksi."],
    fixes: ["Periksa tipe dengan is sebelum konversi.", "Gunakan as untuk konversi yang aman."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException: pembagian dengan nol",
    explain: "Pembagian bilangan bulat dengan nol, dan ini melempar pengecualian di C#.",
    causes: ["Penyebut berupa variabel bernilai nol.", "Menghitung rata-rata dari koleksi kosong."],
    fixes: ["Periksa bahwa penyebut tidak sama dengan nol.", "Gunakan double jika perhitungan memungkinkan adanya pecahan."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
