export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: nombre no definido (name is not defined)",
    explain: "Usas el nombre {name} y no fue definido antes en este ámbito, o lo escribiste distinto a como se definió.",
    causes: ["La variable nunca recibió un valor.", "Error ortográfico en el nombre.", "Uso de la variable antes de definirla o fuera de la función donde se definió."],
    fixes: ["Define la variable y asígnale un valor antes de usarla.", "Verifica que el nombre coincida letra por letra, porque Python distingue entre mayúsculas y minúsculas."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: sintaxis no válida (invalid syntax)",
    explain: "Python encontró una palabra o un símbolo en un lugar que las reglas del lenguaje no permiten. El error real suele estar antes de la línea indicada.",
    causes: ["Olvidar una coma, un paréntesis o un símbolo entre dos elementos.", "Usar = en lugar de == dentro de una condición.", "Usar una palabra reservada como nombre de variable."],
    fixes: ["Revisa la línea indicada y la anterior buscando un paréntesis o una coma que falte.", "Usa == para comparar y = para asignar."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: se esperaba ':' (expected ':')",
    explain: "Una sentencia compuesta como if, for, while o def necesita dos puntos : al final de su línea.",
    causes: ["Olvidar los dos puntos : después de la condición o del nombre de la función."],
    fixes: ["Agrega : al final de la línea de la sentencia compuesta, antes de la sangría."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: cadena de texto sin cerrar (unterminated string literal)",
    explain: "Abriste un texto con comillas y no lo cerraste en la misma línea.",
    causes: ["Olvidar las comillas al final del texto.", "Usar dos tipos de comillas distintos para abrir y cerrar."],
    fixes: ["Cierra el texto con el mismo tipo de comillas con el que lo abriste.", "Para textos de varias líneas usa \"\"\" \"\"\"."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: fin de línea mientras se lee una cadena (EOL while scanning)",
    explain: "Python llegó al final de la línea mientras seguía leyendo un texto que aún no está cerrado.",
    causes: ["Falta la comilla de cierre al final del texto.", "Un carácter \\ al final de la línea rompe el cierre."],
    fixes: ["Agrega la comilla de cierre adecuada.", "Actualiza Python o usa textos de varias líneas con \"\"\"."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: fin inesperado del archivo (unexpected EOF)",
    explain: "El archivo terminó mientras Python esperaba que se completara una instrucción, normalmente un paréntesis o una lista sin cerrar.",
    causes: ["Una lista, un paréntesis o una instrucción quedó incompleta a mitad.", "Olvidar cerrar el último paréntesis del archivo."],
    fixes: ["Completa la instrucción y cierra todos los paréntesis abiertos.", "Revisa la última línea del archivo."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: el paréntesis nunca se cerró (was never closed)",
    explain: "Abriste el paréntesis {br} y no lo cerraste con su paréntesis correspondiente.",
    causes: ["Olvidar el paréntesis de cierre.", "Un paréntesis de cierre en un lugar incorrecto hace que el intérprete busque otro."],
    fixes: ["Agrega el paréntesis de cierre correspondiente.", "Usa un editor que coloree los paréntesis que coinciden."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: paréntesis de cierre sobrante (unmatched)",
    explain: "Encontré el paréntesis de cierre {br} sin un paréntesis de apertura correspondiente.",
    causes: ["Paréntesis sobrante al final de la línea.", "Olvidar el paréntesis de apertura al inicio de la instrucción."],
    fixes: ["Elimina el paréntesis sobrante.", "Verifica que cada paréntesis de apertura tenga su cierre."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: carácter no permitido (invalid character)",
    explain: "Python encontró un símbolo que no se acepta en el código, normalmente unas comillas árabes o tipográficas como “ ” o un carácter extraño.",
    causes: ["Copiar el código desde un documento que convierte las comillas en comillas tipográficas.", "Escribir una coma árabe ، o un punto árabe en lugar de los latinos."],
    fixes: ["Reemplaza las comillas tipográficas por comillas \" o ' normales.", "Reemplaza la coma árabe por una coma latina ,."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: error en f-string",
    explain: "La cadena f-string no es válida: {detail}.",
    causes: ["Llave { sin cerrar dentro del texto.", "Usar las mismas comillas dentro de un f-string."],
    fixes: ["Cierra cada llave { con }.", "Usa comillas distintas dentro de la expresión, o usa la sintaxis adecuada para tu versión de Python."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: no se puede asignar a un valor fijo (cannot assign to literal)",
    explain: "Intentaste asignar un valor a un número o texto fijo, y la asignación necesita un nombre de variable.",
    causes: ["Colocaste el número o el texto del lado izquierdo de la asignación por error.", "Confundir == con = en una condición."],
    fixes: ["Pon el nombre de la variable a la izquierda de =.", "Usa == al comparar."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: no se puede asignar a una llamada a función (cannot assign to function call)",
    explain: "Pusiste una llamada a función del lado izquierdo de la asignación, cuando allí debe ir un nombre de variable.",
    causes: ["Escribir () después de un nombre de variable en el lado izquierdo de la asignación.", "Olvidar == y escribir = dentro de una condición."],
    fixes: ["Calcula el valor en una variable y asígnalo.", "Usa == para comparar."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: faltan paréntesis en print (Missing parentheses)",
    explain: "Escribiste print al estilo de Python 2 sin paréntesis, y Python 3 los requiere.",
    causes: ["Copiar un ejemplo antiguo en sintaxis de Python 2.", "Olvidar los paréntesis en print."],
    fixes: ["Coloca el texto o el valor entre paréntesis print(...)."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: se esperaba un bloque con sangría (expected an indented block)",
    explain: "La línea anterior termina en dos puntos :, por eso debe seguirle código con sangría, pero no la tiene.",
    causes: ["Olvidar la sangría debajo de if, for o def.", "Bloque completamente vacío después de los dos puntos."],
    fixes: ["Sangra la línea siguiente con cuatro espacios.", "Si el bloque está vacío, usa pass."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: sangría inesperada (unexpected indent)",
    explain: "Python encontró una línea con sangría sin motivo, es decir, que no sigue a una sentencia compuesta.",
    causes: ["Espacios sobrantes al inicio de la línea.", "Una línea copiada de otro lugar con una sangría distinta."],
    fixes: ["Elimina los espacios sobrantes al inicio de la línea.", "Verifica que todas las líneas del mismo nivel tengan la misma sangría."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: la sangría no coincide con ningún nivel externo",
    explain: "La sangría de esta línea no es igual a ningún nivel de sangría anterior, así que Python no sabe a qué bloque pertenece.",
    causes: ["Mezclar la cantidad de espacios entre las líneas.", "Copiar código con una sangría distinta."],
    fixes: ["Haz que cada nivel de código tenga una cantidad fija de espacios (4 espacios).", "Usa un editor que muestre los espacios."],
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
    title: "TabError: mezcla de tabulaciones y espacios",
    explain: "Usaste a veces la tecla Tab y a veces espacios para la sangría, y Python rechaza esta mezcla.",
    causes: ["Algunas líneas empiezan con Tab y otras con espacios.", "La configuración del editor convierte Tab de otra forma."],
    fixes: ["Usa solo espacios (4 espacios por nivel).", "En el editor activa la conversión de Tab a espacios."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: no se puede concatenar texto con un valor de otro tipo (can only concatenate str)",
    explain: "Intentaste unir un texto con un valor de tipo {t} usando +, y Python no convierte los tipos automáticamente.",
    causes: ["Usar + entre un texto y un número.", "Un valor que llega desde input() siempre es un texto."],
    fixes: ["Convierte el número a texto con str().", "O coloca el número dentro de un f-string para que se convierta en texto automáticamente."],
    bad: `print("Edad: " + 20)`,
    good: `print("Edad: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: operación no compatible entre dos tipos (unsupported operand type(s))",
    explain: "El operador {op} no admite los tipos {a} y {b} juntos.",
    causes: ["Texto con número en una operación aritmética.", "Valor None dentro de una operación aritmética."],
    fixes: ["Convierte el texto a número con int() o float().", "Verifica que las variables tengan valores numéricos antes de calcular."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: no se puede indexar NoneType (not subscriptable)",
    explain: "La variable vale None (es decir, nada), y estás intentando acceder a un elemento con los corchetes [].",
    causes: ["Una función no devuelve nada porque no contiene return.", "Una variable no recibió un valor o provino de una operación que falló."],
    fixes: ["Verifica que la función devuelva un valor con return.", "Comprueba que el valor no sea None antes de indexarlo."],
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
    title: "AttributeError: el atributo o método no existe (has no attribute)",
    explain: "El objeto de tipo {type} no tiene el atributo o método {attr}.",
    causes: ["El nombre del método o atributo está mal escrito.", "Usar un método de otro tipo, como append en un texto.", "La variable vale None."],
    fixes: ["Verifica el tipo del objeto con type().", "Consulta la documentación del tipo para saber qué funciones tiene."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: el objeto no es una función (object is not callable)",
    explain: "Intentaste llamar a un valor de tipo {t} como si fuera una función escribiendo los paréntesis ().",
    causes: ["Escribir () después del nombre de una variable que contiene un valor.", "Ocultar el nombre de una función integrada con una variable, como str = 5."],
    fixes: ["Cambia el nombre de la variable para que no tape el nombre de la función integrada.", "Asegúrate de estar llamando a una función."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: faltan argumentos en la llamada a la función (missing required positional argument)",
    explain: "La función {fn} necesita {n} argumento más que no pasaste en la llamada.",
    causes: ["Llamar a la función sin pasar el argumento obligatorio.", "La definición de la función pide un parámetro que no necesitas."],
    fixes: ["Pasa los valores que faltan en la llamada.", "Da un valor por defecto al parámetro en la definición de la función si es opcional."],
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
    title: "TypeError: argumentos sobrantes en la llamada a la función (takes positional arguments but given)",
    explain: "La función {fn} acepta solo {n} argumento(s), pero pasaste {m}.",
    causes: ["Pasar más valores que parámetros tiene la definición.", "La definición de la función no tiene el parámetro que estás pasando."],
    fixes: ["Quita los valores sobrantes de la llamada.", "Agrega el parámetro que falta en la definición de la función."],
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
    title: "TypeError: el objeto no es iterable (object is not iterable)",
    explain: "Intentaste recorrer un valor de tipo {t} con un bucle for o con desestructuración, y este tipo no es iterable.",
    causes: ["Olvidaste usar range() con el número en el bucle.", "Una función que no devuelve valores, por lo que el resultado es None."],
    fixes: ["Usa range(n) para repetir sobre un número.", "Verifica que la variable sea una lista, un texto o una colección antes de recorrerla."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: el índice de la lista debe ser un entero (list indices)",
    explain: "El índice de la lista debe ser un entero, y usaste un valor de tipo {t}.",
    causes: ["Escribir el índice como texto, por ejemplo '1'.", "Calcular el índice con / y obtener un número decimal."],
    fixes: ["Usa un entero sin comillas.", "Usa // en lugar de / al calcular el índice."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: no se puede convertir el texto a entero (invalid literal for int)",
    explain: "La función int() no pudo convertir el texto '{v}' a un entero.",
    causes: ["El texto contiene letras o símbolos no numéricos.", "El texto es un decimal como 3.5.", "El texto está vacío."],
    fixes: ["Usa float() para los números decimales.", "Verifica la entrada antes de convertirla, o usa try y except."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: más valores que variables (too many values to unpack)",
    explain: "La desestructuración tiene solo {n} variables, pero la lista contiene más valores que eso.",
    causes: ["La cantidad de nombres de variables es menor que la cantidad de elementos.", "Una lista más larga de lo que esperabas."],
    fixes: ["Aumenta la cantidad de variables para que coincida con la cantidad de elementos.", "Usa *rest para agrupar los elementos sobrantes."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: menos valores que variables (not enough values to unpack)",
    explain: "Intentas desestructurar en {n} variables, pero la lista tiene solo {g} elementos.",
    causes: ["La cantidad de variables es mayor que la cantidad de elementos.", "Una función devuelve menos elementos de los que esperabas."],
    fixes: ["Reduce la cantidad de variables para que coincida con la cantidad de elementos.", "Verifica la longitud de la lista antes de desestructurar."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: el índice está fuera del rango de la lista (list index out of range)",
    explain: "Intentas acceder a una posición que no existe en la lista. Recuerda que la numeración empieza en 0 y termina en la longitud - 1.",
    causes: ["El índice es igual a la longitud de la lista o mayor.", "Un bucle que pasa del último elemento de la lista."],
    fixes: ["Usa un índice entre 0 y len(lista) - 1.", "En los bucles usa for x in lista en lugar de indexar."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: la clave no existe en el diccionario",
    explain: "El diccionario no contiene la clave {key}, por eso falló el acceso con los corchetes [].",
    causes: ["La clave está escrita de forma distinta a la clave guardada.", "La clave todavía no se agregó al diccionario."],
    fixes: ["Usa get() con un valor por defecto.", "Verifica que la clave exista con in antes de acceder a ella."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: división entre cero",
    explain: "Intentaste dividir entre cero, una operación no definida matemáticamente.",
    causes: ["El divisor es una variable cuyo valor es cero sin comprobarlo.", "Calcular el promedio de una lista vacía."],
    fixes: ["Verifica que el divisor no sea cero antes de dividir.", "Agrega una condición que maneje el caso especial."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: módulo no encontrado (No module named)",
    explain: "El módulo {mod} no está instalado, o su nombre en la importación es distinto al nombre del paquete.",
    causes: ["No instalaste el módulo todavía.", "Ejecutas Python desde un entorno distinto al que se instaló el módulo.", "El nombre de importación es distinto al del paquete, por ejemplo cv2 para el paquete opencv."],
    fixes: ["Instala el módulo con el comando pip install nombre_del_modulo.", "Verifica que el módulo esté instalado en la misma versión de Python con la que ejecutas el código."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: no se puede importar el nombre (cannot import name)",
    explain: "El módulo existe, pero el nombre {name} no está definido en él.",
    causes: ["Error ortográfico en el nombre de la función.", "Un archivo local tiene el mismo nombre que un módulo estándar, como random.py.", "La función existe en otra versión del módulo."],
    fixes: ["Consulta la documentación del módulo para confirmar el nombre correcto.", "Cambia el nombre del archivo local que coincide con un módulo estándar."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: el archivo no existe (No such file or directory)",
    explain: "El archivo {path} no existe en la ruta desde la que se ejecuta el programa.",
    causes: ["El nombre o la extensión del archivo está mal escrito.", "La carpeta de ejecución no es la carpeta donde está el archivo."],
    fixes: ["Verifica el nombre y la extensión del archivo.", "Usa una ruta completa o verifica la carpeta de ejecución."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: se superó la profundidad máxima de recursión (maximum recursion depth)",
    explain: "La función se llama a sí misma sin parar, y la cantidad de llamadas superó el límite permitido.",
    causes: ["Falta la condición de parada en la función recursiva.", "La condición de parada nunca se cumple por un error de lógica."],
    fixes: ["Agrega una condición de parada clara al inicio de la función.", "Convierte la solución en un bucle while o for."],
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
    title: "UnboundLocalError: variable local usada antes de asignarle valor (cannot access local variable)",
    explain: "Usas la variable {name} dentro de una función antes de asignarle un valor en esa función.",
    causes: ["Modificar una variable externa dentro de la función sin declararla global.", "Asignar un valor a la variable dentro de la función después de haberla usado."],
    fixes: ["Pasa la variable a la función como parámetro y devuelve su nuevo valor.", "O usa global si necesitas modificar la variable global."],
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
    title: "StopIteration: no quedan elementos (StopIteration)",
    explain: "El iterador llegó a su fin y ya no tiene elementos, algo que suele ocurrir con next().",
    causes: ["Llamaste a next() más veces que la cantidad de elementos.", "Reutilizar un iterador que ya terminó."],
    fixes: ["Usa next(it, None) para definir un valor al terminar.", "Usa un bucle for en lugar de llamar a next() manualmente."],
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
    title: "UnicodeDecodeError: fallo al decodificar (can't decode byte)",
    explain: "El archivo no está en la codificación {codec} con la que intentas leerlo.",
    causes: ["El archivo está guardado en UTF-8, pero Python lo lee con otra codificación predeterminada.", "El archivo es binario, como una imagen, y no es texto."],
    fixes: ["Agrega encoding=\"utf-8\" al abrir el archivo.", "Si el archivo es binario, ábrelo en modo \"rb\"."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: desbordamiento del rango del valor (OverflowError)",
    explain: "El valor es mayor que el límite que la función puede procesar: {msg}.",
    causes: ["Cálculo exponencial demasiado grande, como exp(1000).", "Convertir un número enorme a decimal."],
    fixes: ["Reduce el tamaño de los valores en el cálculo.", "Usa una biblioteca de números grandes o valores más pequeños."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: la variable no está definida (is not defined)",
    explain: "Usas {name} y no la definiste en este ámbito, o escribiste su nombre distinto a su definición.",
    causes: ["Olvidaste la palabra let, const o var antes de la definición.", "Error ortográfico en el nombre.", "La variable está definida dentro de otra función, por eso no se ve desde aquí.", "El archivo de script o la biblioteca que define el nombre no se cargó."],
    fixes: ["Define la variable antes de usarla con let o const.", "Verifica que coincida la mayúscula y minúscula del nombre, y que el archivo requerido se cargue antes del código."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: acceso antes de la inicialización (before initialization)",
    explain: "Usaste {name} antes de la línea donde la definiste. Las variables let y const no se elevan al inicio del código como lo hace var.",
    causes: ["Uso de la variable en una línea anterior a su definición.", "Una función llama a una variable que todavía no fue creada."],
    fixes: ["Mueve la definición a antes del primer uso.", "Usa la función después de inicializar las variables de las que depende."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: lectura de una propiedad de un valor vacío (Cannot read properties of undefined)",
    explain: "Intentaste leer la propiedad '{p}' de un valor de tipo {t}, y el valor no existe en ese momento.",
    causes: ["Variable a la que todavía no se le asignó un valor.", "Elemento del DOM que no existe, como getElementById con un identificador incorrecto.", "Datos que todavía no llegaron del servidor o de una función asíncrona.", "Función que no devuelve nada, por lo que el resultado es undefined."],
    fixes: ["Verifica el valor antes de acceder a él con if o con el operador ?. como obj?.name.", "Verifica que el elemento exista en la página antes de usarlo."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: asignación de una propiedad en un valor vacío (Cannot set properties of undefined)",
    explain: "Intentaste escribir la propiedad '{p}' en un valor de tipo {t}, y el objeto todavía no fue creado.",
    causes: ["Definir una variable de objeto sin asignarle un valor {}.", "Objeto que proviene de una función que no devuelve nada."],
    fixes: ["Crea el objeto primero con {} o con la sintaxis adecuada.", "Verifica que la variable contenga un objeto antes de escribir en él."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: no es una función (is not a function)",
    explain: "Intentaste llamar a {fn} con paréntesis (), pero no es una función.",
    causes: ["El nombre de la función está mal escrito.", "La función no se definió todavía o no se importó.", "La biblioteca devuelve un valor de otro tipo, como export default en lugar de una función."],
    fixes: ["Verifica que el nombre esté bien escrito y que la función esté definida antes de llamarla.", "Revisa el tipo del valor con typeof antes de llamarlo."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: el valor no es iterable (is not iterable)",
    explain: "Intentaste recorrer {x} con un bucle for...of o con desestructuración [...], y este valor no es iterable.",
    causes: ["Usar un objeto normal {} en for...of.", "Función que no devuelve un arreglo, por lo que el resultado es undefined."],
    fixes: ["Usa Object.keys, Object.values u Object.entries con el objeto.", "Verifica que el valor sea un arreglo, un texto o un Map antes de recorrerlo."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: asignación a una constante (Assignment to constant variable)",
    explain: "Las variables definidas con const no pueden cambiar su valor después de definirse.",
    causes: ["Usar const para una variable que cambiará después.", "Olvidar que el valor es constante al volver a asignarlo."],
    fixes: ["Usa let si vas a cambiar el valor.", "Crea una variable nueva en lugar de modificar la constante."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: token inesperado (Unexpected token)",
    explain: "JavaScript encontró un símbolo o una palabra en una posición que las reglas no permiten, y generalmente la causa está unas líneas antes.",
    causes: ["Paréntesis o coma sobrantes o faltantes.", "Palabra reservada usada como nombre.", "Código dentro de una función que no se cerró correctamente."],
    fixes: ["Revisa los paréntesis y las comas de la línea indicada y de la anterior.", "Usa un editor que muestre los errores y empareje los paréntesis."],
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
    title: "SyntaxError: el texto no es JSON válido (is not valid JSON)",
    explain: "La función JSON.parse intenta leer un texto que no tiene un formato JSON correcto, y generalmente recibió HTML en lugar de datos.",
    causes: ["El servidor devolvió una página HTML, como una página de error 404, en lugar de JSON.", "Archivo JSON con una coma sobrante o con comillas simples."],
    fixes: ["Imprime el texto sin procesar antes de analizarlo y verifica su contenido.", "Usa comillas dobles para los nombres de las claves y los textos en JSON."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: fin inesperado del código (Unexpected end of input)",
    explain: "El archivo o el bloque terminó mientras JavaScript esperaba cerrar un paréntesis o una llave.",
    causes: ["Llave { o paréntesis ( sin cerrar.", "Copiar una parte del código y olvidar su final."],
    fixes: ["Cierra cada paréntesis o llave que abriste.", "Usa un editor que empareje los paréntesis y las llaves abiertas y cerradas."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: falta ')' después de la lista de parámetros",
    explain: "La llamada a la función no se cerró con ) antes del punto y coma o del final de la línea.",
    causes: ["Olvidar el paréntesis de cierre al final de la llamada.", "Comilla sin cerrar dentro de los argumentos."],
    fixes: ["Agrega ) antes del punto y coma.", "Verifica que todas las comillas dentro de la llamada estén cerradas."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: identificador inesperado (Unexpected identifier)",
    explain: "JavaScript encontró un nombre después de un valor o expresión sin punto y coma que los separe, generalmente por una línea sin punto y coma al final.",
    causes: ["Olvidar ; al final de la línea anterior.", "Escribir dos nombres seguidos sin un símbolo que los separe."],
    fixes: ["Agrega ; al final de cada instrucción.", "Separa cada declaración en una línea independiente."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: token no válido (Invalid or unexpected token)",
    explain: "JavaScript encontró un símbolo que no se acepta en el código, generalmente una comilla tipográfica o un carácter invisible.",
    causes: ["Copiar el código desde un documento que convierte las comillas en comillas tipográficas.", "Comilla que no se cerró correctamente."],
    fixes: ["Reemplaza las comillas tipográficas por comillas \" o ' normales.", "Verifica que cada texto se cierre con la misma comilla."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: la variable ya fue declarada (has already been declared)",
    explain: "Declaraste {name} más de una vez en el mismo ámbito con let o const.",
    causes: ["Copiar una línea de declaración sin borrar la anterior.", "Dos variables con el mismo nombre en el mismo archivo."],
    fixes: ["Elimina la declaración sobrante o cambia su nombre.", "Usa reasignación sin let si quieres cambiar el valor."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: await fuera de una función async",
    explain: "Usaste la palabra await en un lugar no permitido; solo funciona dentro de una función async o en un módulo ES en el nivel superior del archivo.",
    causes: ["Olvidar la palabra async antes de la función.", "Usar await dentro de una función normal o de un evento normal."],
    fixes: ["Convierte la función en async.", "O usa then() directamente con la promesa."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: uso de import fuera de un módulo ES",
    explain: "Node.js trata el archivo como CommonJS, mientras que la sintaxis import es de los módulos ES.",
    causes: ["El archivo se ejecuta con Node sin indicar que es un módulo.", "Copiar un ejemplo moderno sin configurar el proyecto."],
    fixes: ["Usa require en lugar de import en CommonJS.", "O agrega \"type\": \"module\" en el archivo package.json."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: desbordamiento de la pila de llamadas (Maximum call stack size exceeded)",
    explain: "La función se llama a sí misma sin parar, y la pila de ejecución se llenó.",
    causes: ["Falta la condición de parada en la función recursiva.", "Dos funciones que se llaman entre sí sin fin."],
    fixes: ["Agrega una condición de parada clara.", "Convierte la solución en un bucle while o for."],
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
    title: "RangeError: longitud de arreglo no válida (Invalid array length)",
    explain: "La longitud del arreglo debe ser un entero positivo dentro de cierto límite.",
    causes: ["Pasar un número negativo a Array.", "Pasar un valor decimal o no numérico como longitud del arreglo."],
    fixes: ["Asegúrate de que la longitud sea un entero positivo.", "Verifica el valor antes de crear el arreglo."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): promesa rechazada sin manejar",
    explain: "Una promesa Promise falló, y no le agregaste catch ni usaste try y catch con await para manejar el error.",
    causes: ["Usar then sin catch.", "Llamar a una función async sin await ni catch."],
    fixes: ["Agrega .catch() después de la cadena de then.", "Envuelve el código await en try y catch."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: la solicitud fue bloqueada por la política de intercambio de recursos entre orígenes",
    explain: "El navegador bloqueó la solicitud porque el servidor no permitió el acceso desde este origen, o porque la página se abrió desde file://.",
    causes: ["El servidor no envía el encabezado Access-Control-Allow-Origin.", "La página se abre directamente desde el archivo en lugar de un servidor local."],
    fixes: ["Activa CORS en el servidor para permitir el dominio necesario.", "Ejecuta el proyecto mediante un servidor local en lugar de abrir el archivo directamente."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: falló la solicitud (Failed to fetch)",
    explain: "La solicitud no llegó al servidor. Puede que la red esté caída, la dirección sea incorrecta, el servidor esté detenido o el bloqueo sea por CORS.",
    causes: ["El servidor está detenido o la dirección está mal escrita.", "La conexión a Internet está caída.", "La política CORS bloquea la solicitud."],
    fixes: ["Abre la dirección en el navegador para confirmar que funciona.", "Revisa la pestaña Network en las herramientas de desarrollo y verifica CORS."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: no se puede encontrar el módulo (Cannot find module)",
    explain: "Node.js no encuentra el archivo o el paquete {mod}.",
    causes: ["El paquete no está instalado en el proyecto.", "La ruta relativa es incorrecta.", "La extensión del archivo falta o el archivo no existe."],
    fixes: ["Instala el paquete con el comando npm install nombre_del_paquete.", "Verifica la ruta relativa y que el archivo exista."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: el puerto ya está en uso",
    explain: "El puerto que intentas usar está ocupado por otro programa, y generalmente hay otra copia del servidor en ejecución.",
    causes: ["Ejecutar el servidor dos veces con el mismo puerto.", "Otro programa está usando el puerto."],
    fixes: ["Detén la otra copia del servidor.", "O cambia el número del puerto."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: el archivo o la carpeta no existe",
    explain: "Node.js intentó abrir un archivo o una carpeta que no existe en la ruta indicada.",
    causes: ["El nombre del archivo está mal escrito o le falta la extensión.", "La ruta es relativa a una carpeta de ejecución diferente."],
    fixes: ["Verifica que el archivo exista antes de leerlo con fs.existsSync.", "Usa una ruta basada en la carpeta del archivo actual."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: estructura circular que no puede convertirse a JSON",
    explain: "El objeto contiene una referencia circular, es decir, apunta a sí mismo directa o indirectamente, y JSON.stringify no puede convertirlo.",
    causes: ["Objeto que tiene una propiedad que apunta a sí mismo.", "Objeto del DOM o un objeto complejo que se pasa a JSON.stringify."],
    fixes: ["Elimina la propiedad circular antes de convertir.", "Convierte a un objeto simple que contenga solo los datos necesarios."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: símbolo no encontrado (cannot find symbol)",
    explain: "El compilador no encontró una variable, función o clase con este nombre. Mira la línea symbol del mensaje para saber el nombre buscado.",
    causes: ["Nombre escrito con error ortográfico.", "La variable está definida en otro ámbito.", "Olvidaste el import de una clase como ArrayList.", "No declaraste la variable."],
    fixes: ["Corrige el nombre según la línea symbol.", "Agrega la importación adecuada, como import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: conversión que puede perder parte del valor (possible lossy conversion)",
    explain: "La conversión de {a} a {b} puede perder parte del valor, como las partes decimales, por eso Java la rechaza automáticamente.",
    causes: ["Asignar un decimal a una variable entera.", "El resultado de dividir dos enteros tiene una parte decimal."],
    fixes: ["Usa un tipo más amplio, como double, para la variable.", "Si la conversión es intencionada, usa una conversión explícita como (int)."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: tipos incompatibles (incompatible types)",
    explain: "Intentas asignar un valor que no es compatible con el tipo de la variable: {a}.",
    causes: ["Asignar un texto a una variable numérica, o al revés.", "Devolver un tipo distinto al tipo de la función."],
    fixes: ["Haz que el tipo del valor coincida con el tipo de la variable.", "Convierte el valor explícitamente si la conversión tiene sentido."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: falta la instrucción return (missing return statement)",
    explain: "La función debe devolver un valor en cada camino posible de ejecución, y aquí hay un camino que no devuelve nada.",
    causes: ["return solo dentro de if, sin un camino alternativo.", "Olvidar return al final de la función."],
    fixes: ["Agrega return al final de la función como valor predeterminado.", "Agrega else que devuelva un valor para el otro caso."],
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
    title: "error: se esperaba el punto y coma ;",
    explain: "Olvidaste el punto y coma ; al final de la instrucción, y Java siempre lo necesita.",
    causes: ["Falta ; después de una instrucción o declaración.", "Línea que termina de forma incompleta."],
    fixes: ["Agrega ; al final de la línea indicada o de la anterior."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: el nombre del archivo no coincide con la clase pública (is public, should be declared in a file named)",
    explain: "La clase pública {cls} debe estar en un archivo que se llame exactamente {file}.",
    causes: ["El archivo tiene un nombre distinto al de la clase pública.", "Hay dos clases públicas en el mismo archivo."],
    fixes: ["Cambia el nombre del archivo para que coincida con el nombre de la clase pública.", "O haz que la clase no sea pública eliminando public."],
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
    title: "error: instrucción inalcanzable (unreachable statement)",
    explain: "Hay una línea después de return, break o throw que nunca se ejecutará, por lo que el compilador la rechaza.",
    causes: ["Escribir código justo después de return.", "Bucle while(true) sin break antes del código siguiente."],
    fixes: ["Mueve la línea a antes del return.", "Elimina el código que nunca se ejecuta."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: variable que podría no estar inicializada (might not have been initialized)",
    explain: "La variable {v} podría no recibir un valor antes de usarse en algunos caminos de ejecución.",
    causes: ["Definir la variable sin valor y luego usarla.", "Asignar el valor dentro de if sin else."],
    fixes: ["Dale a la variable un valor inicial al definirla.", "Verifica que cada camino asigne un valor a la variable."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: miembro no estático desde un contexto estático",
    explain: "{m} es un miembro no estático, y no se puede usar directamente desde main ni desde ninguna función static sin un objeto.",
    causes: ["Llamar a un método normal directamente desde main.", "Usar una variable normal dentro de una clase desde una función static."],
    fixes: ["Haz que el miembro sea static si es compartido.", "O crea un objeto de la clase y llama al miembro a través de él."],
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
    title: "NullPointerException: puntero nulo (null)",
    explain: "Intentas usar un objeto cuyo valor es null, es decir, que no fue creado o se le asignó null.",
    causes: ["Variable de texto a la que se asignó null y luego se llamó a uno de sus métodos.", "Objeto que no se creó con new.", "Map.get devolvió null para una clave que no existe."],
    fixes: ["Crea el objeto antes de usarlo.", "Verifica null con if (x != null) o usa Objects.requireNonNull."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: el índice está fuera de los límites del arreglo",
    explain: "Intentaste acceder al índice {i} cuando la longitud del arreglo es {n}. Los índices empiezan en 0 y terminan en la longitud - 1.",
    causes: ["El índice es exactamente igual a la longitud.", "Un bucle que se pasa del último elemento."],
    fixes: ["Usa un índice entre 0 y longitud - 1.", "Usa un bucle for-each si no necesitas el índice."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: el índice está fuera de los límites del texto",
    explain: "El índice pedido del texto está fuera de sus límites, lo que ocurre con charAt o substring.",
    causes: ["Usar charAt con un índice igual a la longitud del texto.", "substring con límites incorrectos."],
    fixes: ["Asegúrate de que el índice esté entre 0 y longitud del texto - 1.", "Verifica la longitud del texto antes de extraer una parte."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException: división entre cero",
    explain: "División de un entero entre cero, lo que no está permitido en Java para enteros.",
    causes: ["El divisor es una variable cuyo valor es cero.", "Calcular el promedio de una lista vacía."],
    fixes: ["Verifica que el divisor no sea cero.", "Usa double si es adecuado para el cálculo."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException: el texto no representa un entero",
    explain: "La función no pudo convertir el texto «{v}» a un número, porque contiene letras o un punto decimal.",
    causes: ["Texto que contiene letras o espacios.", "Número decimal que se convierte a int."],
    fixes: ["Usa Double.parseDouble para los números decimales.", "Verifica el texto con matches o con try y catch."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException: conversión de tipo incompatible",
    explain: "Intentaste convertir un objeto de tipo {a} a {b}, y no lo es.",
    causes: ["Convertir un Object a un tipo que no coincide con el objeto real.", "Elementos de una lista de tipos mezclados."],
    fixes: ["Verifica el tipo con instanceof antes de convertirlo.", "Asegúrate de que el valor sea del tipo correcto al agregarlo."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException: la entrada no coincide con el tipo esperado",
    explain: "El Scanner esperaba un tipo específico, como un entero, pero encontró un texto, o al revés.",
    causes: ["El usuario escribió letras donde se esperaba un número.", "El orden entre nextInt y nextLine no es correcto."],
    fixes: ["Verifica antes de leer con hasNextInt().", "Lee la línea completa con nextLine y luego conviértela."],
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
    title: "ConcurrentModificationException: modificación de una lista mientras se recorre",
    explain: "Modificaste la lista mientras la recorrías con un bucle for-each, y Java no permite continuar.",
    causes: ["Eliminar un elemento de la lista dentro de for-each.", "Agregar un elemento a la lista dentro del mismo bucle."],
    fixes: ["Usa removeIf para eliminar los elementos.", "O usa un Iterator con su método remove."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError: desbordamiento de la pila",
    explain: "Llamada recursiva sin fin: una función se llama a sí misma sin condición de salida, y la pila de ejecución se llenó.",
    causes: ["Falta la condición de parada en la función recursiva.", "La condición de parada nunca se cumple."],
    fixes: ["Agrega una condición de parada clara al inicio de la función.", "Convierte la solución en un bucle."],
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
    title: "OutOfMemoryError: memoria agotada",
    explain: "El programa pide más memoria de la disponible, generalmente por un bucle que crea objetos sin fin o por datos muy grandes.",
    causes: ["Bucle que agrega objetos a una lista sin detenerse.", "Cargar un archivo enorme completo en memoria."],
    fixes: ["Procesa los datos en lotes pequeños.", "Libera las listas que ya no necesitas."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error: excepción no manejada (unreported exception)",
    explain: "La función lanza la excepción {e}, que es de tipo checked, por lo que debes manejarla con try y catch o declararla en throws.",
    causes: ["Llamar a una función que lanza una excepción checked sin manejarla.", "Lanzar una excepción checked dentro de una función que no la declara."],
    fixes: ["Envuelve la llamada con try y catch.", "O agrega throws {e} a la definición de la función."],
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
    title: "error: el archivo terminó antes de completar el código (reached end of file while parsing)",
    explain: "El archivo terminó y todavía hay una llave { sin cerrar, por lo que la definición de la clase o de la función no se completó.",
    causes: ["Olvidar la llave de cierre } al final de la función o de la clase.", "Llave o paréntesis sobrante o faltante en medio del código."],
    fixes: ["Agrega la llave de cierre que falta.", "Usa un editor que empareje los paréntesis para localizar el error."],
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
    title: "error: la variable ya está definida (is already defined)",
    explain: "Declaraste la variable {v} más de una vez en el mismo ámbito.",
    causes: ["Copiar una línea de declaración sin borrar la anterior.", "Declarar la variable una vez dentro del bucle y otra vez fuera con el mismo nombre."],
    fixes: ["Elimina la declaración sobrante o cambia su nombre.", "Usa reasignación sin el tipo de la variable."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error: el compilador esperaba un símbolo antes de la palabra indicada (expected before)",
    explain: "El compilador esperaba {what} en la posición indicada, pero encontró otra cosa; generalmente el error está en la línea anterior al lugar del mensaje.",
    causes: ["Olvidar el punto y coma ; al final de la línea anterior.", "Paréntesis sin cerrar en la línea anterior."],
    fixes: ["Agrega ; o cierra el paréntesis en la línea anterior.", "Recuerda que el compilador a veces señala la línea siguiente al error real."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error: el nombre no está declarado en este ámbito (was not declared in this scope)",
    explain: "La variable o función {n} no está declarada en este punto del código.",
    causes: ["Error ortográfico en el nombre.", "La variable está definida dentro de otra función.", "Olvidaste #include de la biblioteca que define el nombre."],
    fixes: ["Declara el nombre antes de usarlo o pásalo como parámetro.", "Agrega el #include adecuado al inicio del archivo."],
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
    title: "error: identificador no declarado (use of undeclared identifier)",
    explain: "El compilador clang no encontró la definición de {n} en este ámbito.",
    causes: ["Error ortográfico en el nombre.", "La variable está definida en otro ámbito o nunca se definió."],
    fixes: ["Corrige el nombre o define la variable antes de usarla."],
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
    title: "undefined reference: el enlazador no encontró la definición",
    explain: "Declaraste {s} pero no escribiste su definición, o no enlazaste el archivo que la contiene durante la compilación.",
    causes: ["Olvidar escribir el cuerpo de la función.", "No pasar al compilador el archivo fuente que define la función.", "Error en una biblioteca enlazada o en el orden del enlace."],
    fixes: ["Escribe la definición de la función o de la variable.", "Agrega el archivo fuente o la biblioteca al comando de compilación."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault: acceso a memoria no permitido",
    explain: "El programa intentó acceder a memoria que no le pertenece, generalmente un puntero nulo, un índice fuera del arreglo o un puntero ya liberado.",
    causes: ["Un puntero no fue inicializado o su valor es NULL y luego se usó.", "Índice fuera de los límites del arreglo.", "Uso de memoria después de free."],
    fixes: ["Verifica que el puntero apunte a memoria válida antes de usarlo.", "Ejecuta el programa con gdb o valgrind para localizar la línea."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function: llamada a una función antes de declararla",
    explain: "Llamaste a la función {f} antes de definirla o declararla, así que el compilador asumió su tipo automáticamente.",
    causes: ["La función está definida al final, después de llamarla.", "Olvidar #include del archivo que la declara."],
    fixes: ["Coloca el prototipo de la función antes de main.", "Agrega el #include correcto."],
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
    title: "error: se esperaba una expresión (expected primary-expression)",
    explain: "El compilador esperaba un valor o una variable en esta posición, pero encontró un símbolo que no sirve aquí.",
    causes: ["Un signo = sin un valor después.", "Un paréntesis o una coma en un lugar que la expresión no admite."],
    fixes: ["Agrega el valor que falta después de = o dentro de los paréntesis.", "Revisa las comas y los paréntesis antes de la posición indicada."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error: conversión de tipo no válida (invalid conversion)",
    explain: "Intentaste convertir {a} a {b} de una forma no permitida en C o C++.",
    causes: ["Asignar un valor a un puntero sin dirección.", "Confusión entre el tipo del valor y el tipo del puntero."],
    fixes: ["Asigna la dirección de una variable al puntero usando &.", "Verifica que los tipos coincidan o conviértelos explícitamente."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error: no hay una función que coincida con la llamada (no matching function for call)",
    explain: "La llamada {f} no coincide con ninguna definición de la función por cantidad de parámetros o por tipo.",
    causes: ["Pasar una cantidad de argumentos distinta a la definición.", "Pasar un tipo que no se convierte al tipo requerido."],
    fixes: ["Haz que los argumentos coincidan con la definición de la función.", "Consulta la firma de la función en la documentación o en el archivo de cabecera."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error: redefinición (redefinition of)",
    explain: "Definiste o declaraste {n} más de una vez en el mismo ámbito.",
    causes: ["Copiar la línea de definición sin borrar la anterior.", "Archivo de cabecera incluido más de una vez sin protección."],
    fixes: ["Elimina la definición repetida.", "Agrega protección de cabecera #ifndef o #pragma once al archivo de cabecera."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error: tipos en conflicto (conflicting types)",
    explain: "La primera declaración de {n} difiere en el tipo de retorno o en los parámetros de la declaración o definición posterior.",
    causes: ["Cambio del tipo de retorno entre la declaración y la definición.", "Diferencia en la cantidad o el tipo de los parámetros entre ambas versiones."],
    fixes: ["Haz que la firma coincida en la declaración y en la definición.", "Actualiza la declaración para que coincida con la definición."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning: la función termina sin return (control reaches end)",
    explain: "Se espera que la función devuelva un valor, pero algunos caminos terminan sin return, lo que es un comportamiento indefinido.",
    causes: ["return solo dentro de if.", "Olvidar return al final de la función."],
    fixes: ["Agrega return al final de la función.", "Verifica que cada camino devuelva un valor."],
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
    title: "stack smashing detected: escritura fuera de los límites de la pila",
    explain: "Escribiste fuera de los límites de un arreglo en la pila y dañaste datos protegidos, generalmente por strcpy o por un índice excedido.",
    causes: ["Copiar con strcpy un texto más largo que el arreglo.", "Bucle que escribe después del final del arreglo."],
    fixes: ["Usa strncpy con el tamaño del arreglo y asegúrate de terminar el texto con cero.", "Verifica los límites antes de escribir."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning: índice fuera de los límites del arreglo (array subscript out of bounds)",
    explain: "El código lee o escribe fuera de los límites del arreglo, lo que causa un comportamiento inesperado.",
    causes: ["Índice igual al tamaño del arreglo o mayor.", "Bucle que cuenta hasta el tamaño en lugar de tamaño - 1."],
    fixes: ["Usa índices de 0 a tamaño - 1.", "Verifica el índice antes de acceder a él."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer o double free",
    explain: "Liberaste memoria que ya había sido liberada, o liberaste un puntero que no vino de malloc.",
    causes: ["Llamar a free dos veces sobre el mismo puntero.", "Liberar un puntero que apunta a una variable local o dentro de un arreglo."],
    fixes: ["Asigna NULL al puntero después de free.", "Asegúrate de que cada memoria se libere una sola vez y desde el mismo origen."],
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
    title: "multiple definition: definición duplicada en más de un archivo",
    explain: "La definición de {n} aparece en más de un archivo fuente, generalmente porque un archivo de cabecera contiene una definición y no solo una declaración.",
    causes: ["Escribir la definición de una variable o función dentro de un archivo de cabecera.", "Incluir el archivo de cabecera en más de un archivo fuente."],
    fixes: ["Haz que el archivo de cabecera sea solo declaración usando extern o prototipos.", "Coloca la definición en un único archivo fuente."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error: se requiere un valor asignable (lvalue required)",
    explain: "Intentaste asignar a una expresión que no tiene dirección en memoria, como un valor fijo o el resultado de una función.",
    causes: ["Colocar el número del lado izquierdo de la asignación.", "Intentar incrementar el valor devuelto por una función."],
    fixes: ["Pon el nombre de la variable a la izquierda de =.", "Guarda el resultado de la función en una variable y modifícala."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning: comparación de un número con signo con uno sin signo (signedness)",
    explain: "Comparaste un número con signo (signed) con uno sin signo (unsigned), así que el valor negativo se convierte en un número grande y el resultado cambia.",
    causes: ["Usar size_t o unsigned int con int en los bucles.", "Un contador entero que se compara con la longitud de un arreglo."],
    fixes: ["Haz que ambos tipos tengan el mismo signo.", "Usa el mismo tipo en ambas variables."],
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
    title: "warning: el formato de impresión no coincide con el tipo de la variable (format expects argument)",
    explain: "El formato de impresión %{f} espera un tipo {t}, pero la variable pasada es de otro tipo, y esto puede imprimir valores incorrectos.",
    causes: ["Usar %d para un número decimal.", "Olvidar el tipo de la variable al cambiar el código."],
    fixes: ["Usa %f para los decimales y %d para los enteros.", "Verifica que cada formato coincida con el tipo de su variable."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning: variable leída antes de inicializarse (used uninitialized)",
    explain: "La variable {v} se lee antes de recibir un valor, por lo que su valor es aleatorio.",
    causes: ["Definir una variable sin valor inicial.", "Asignar el valor solo en una rama condicional."],
    fixes: ["Dale a la variable un valor inicial al definirla.", "Verifica que todas las ramas le asignen un valor."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error: el archivo incluido no existe (No such file or directory)",
    explain: "El archivo que pide #include, que es {f}, no existe en las rutas de búsqueda.",
    causes: ["El nombre del archivo está mal escrito.", "El archivo no está en la misma carpeta ni en las rutas del compilador.", "El archivo de cabecera de la biblioteca no está instalado."],
    fixes: ["Corrige el nombre del archivo en #include.", "Usa comillas \" \" para archivos locales y < > para las bibliotecas del sistema."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing: excepción no capturada",
    explain: "Se lanzó la excepción {ex} y ningún catch la capturó, así que el programa terminó. Generalmente ocurre al salir de los límites de un vector o string al usar at().",
    causes: ["Usar at() con un índice fuera de los límites.", "Excepción lanzada sin try y catch."],
    fixes: ["Verifica el índice antes de usar at().", "Envuelve el código que puede lanzar una excepción con try y catch."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103: el nombre no existe en el contexto actual",
    explain: "La variable o función {n} no está definida en este ámbito.",
    causes: ["Error ortográfico en el nombre.", "La variable está definida dentro de otro bloque o de otra función.", "Olvidaste declarar la variable."],
    fixes: ["Define la variable antes de usarla.", "Verifica que coincidan las mayúsculas y minúsculas del nombre."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002: se esperaba el punto y coma ;",
    explain: "Olvidaste el punto y coma ; al final de la instrucción, y C# lo necesita.",
    causes: ["Falta ; después de una instrucción o declaración.", "Línea que termina de forma incompleta."],
    fixes: ["Agrega ; al final de la línea indicada o de la anterior."],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029: no se puede hacer la conversión implícita entre los tipos",
    explain: "C# no convierte automáticamente de {a} a {b}, porque la conversión puede perder datos o porque los tipos no son compatibles.",
    causes: ["Asignar un texto a una variable numérica.", "Asignar un decimal a una variable entera."],
    fixes: ["Convierte el valor explícitamente, por ejemplo con int.Parse para un texto.", "Cambia el tipo de la variable para que coincida con el valor."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: la función no devuelve un valor en todos los caminos",
    explain: "La función debe devolver un valor en todos los caminos posibles, y aquí hay un camino que termina sin return.",
    causes: ["return solo dentro de if.", "Olvidar return al final de la función."],
    fixes: ["Agrega return al final de la función.", "Agrega else que devuelva un valor para el otro caso."],
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
    title: "CS0246: el tipo o el espacio de nombres no existe",
    explain: "C# no encuentra el tipo o el espacio de nombres {t}, generalmente porque no escribiste el using adecuado o no agregaste la biblioteca.",
    causes: ["Olvidar using para el espacio de nombres, como System.Collections.Generic.", "Error ortográfico en el nombre del tipo."],
    fixes: ["Agrega el using adecuado al inicio del archivo.", "Verifica el nombre del tipo y agrega el paquete si proviene de una biblioteca externa."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165: variable local usada antes de asignarle valor",
    explain: "La variable local {v} se usa antes de que le asignes un valor.",
    causes: ["Definir la variable sin valor y luego leerla.", "Asignar el valor solo dentro de if."],
    fixes: ["Dale a la variable un valor inicial al definirla.", "Verifica que todas las ramas le asignen un valor."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120: se requiere un objeto para acceder a un miembro no estático",
    explain: "{m} es un miembro no estático que necesita un objeto para usarse, y no se puede acceder a él directamente desde una función static.",
    causes: ["Usar un miembro normal dentro de una función static.", "Olvidar crear un objeto de la clase."],
    fixes: ["Haz que el miembro sea static si es compartido.", "O crea un objeto de la clase y usa el miembro a través de él."],
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
    title: "NullReferenceException: referencia nula (null)",
    explain: "Intentas usar un objeto cuyo valor es null, es decir, que no fue creado o se le asignó null.",
    causes: ["Variable de texto con valor null y luego lectura de su Length.", "Objeto que no se creó con new.", "Un diccionario devolvió null para una clave que no existe."],
    fixes: ["Verifica null antes de usarlo con if (x != null) o con ?.", "Crea el objeto antes de usarlo."],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException: el índice está fuera del rango del arreglo",
    explain: "Intentaste acceder a un índice fuera del arreglo, y los índices empiezan en 0 y terminan en la longitud - 1.",
    causes: ["El índice es igual a la longitud del arreglo.", "Un bucle que se pasa del último elemento."],
    fixes: ["Usa índices de 0 a longitud - 1.", "Usa foreach si no necesitas el índice."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException: formato de texto no válido",
    explain: "El texto no cumple el formato requerido para la conversión, como int.Parse con un texto no numérico.",
    causes: ["Texto con letras al convertirlo a número.", "Texto vacío durante la conversión."],
    fixes: ["Usa int.TryParse para verificar antes de convertir.", "Verifica la entrada antes de convertirla."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException: conversión de tipo no válida",
    explain: "Intentaste convertir un objeto de tipo {a} a {b}, y no lo es.",
    causes: ["Conversión de object a un tipo que no coincide con el valor real.", "Elementos de distintos tipos dentro de una colección."],
    fixes: ["Verifica el tipo con is antes de convertirlo.", "Usa as para una conversión segura."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException: división entre cero",
    explain: "División de un entero entre cero, lo que lanza una excepción en C#.",
    causes: ["El divisor es una variable cuyo valor es cero.", "Calcular el promedio de una colección vacía."],
    fixes: ["Verifica que el divisor no sea cero.", "Usa double si el cálculo puede tener decimales."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
