export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError : nom non défini (name is not defined)",
    explain: "Vous utilisez le nom {name}, mais il n'a pas été défini auparavant dans ce contexte, ou vous l'avez écrit différemment de sa définition.",
    causes: ["La variable n'a jamais reçu de valeur.", "Faute de frappe dans le nom.", "Utilisation de la variable avant sa définition, ou en dehors de la fonction où elle a été définie."],
    fixes: ["Définissez la variable et affectez-lui une valeur avant de l'utiliser.", "Vérifiez que le nom correspond exactement, lettre par lettre, car Python distingue les majuscules des minuscules."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError : syntaxe invalide (invalid syntax)",
    explain: "Python a trouvé un mot ou un symbole à un endroit non autorisé par les règles du langage. L'erreur réelle se trouve souvent avant la ligne indiquée.",
    causes: ["Oubli d'une virgule, d'une parenthèse ou d'un symbole entre deux éléments.", "Utilisation de = au lieu de == dans une condition.", "Utilisation d'un mot réservé comme nom de variable."],
    fixes: ["Examinez la ligne indiquée et la précédente à la recherche d'une parenthèse ou d'une virgule manquante.", "Utilisez == pour comparer et = pour affecter."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError : ':' attendu (expected ':')",
    explain: "Une instruction composée comme if, for, while ou def doit se terminer par deux-points : à la fin de sa ligne.",
    causes: ["Oubli des deux-points : après la condition ou le nom de la fonction."],
    fixes: ["Ajoutez : à la fin de la ligne de l'instruction composée, avant l'indentation."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError : chaîne non fermée (unterminated string literal)",
    explain: "Vous avez commencé une chaîne par un guillemet sans la fermer sur la même ligne.",
    causes: ["Oubli du guillemet de fermeture à la fin de la chaîne.", "Utilisation de deux types de guillemets différents pour l'ouverture et la fermeture."],
    fixes: ["Fermez la chaîne avec le même guillemet que celui d'ouverture.", "Pour les chaînes sur plusieurs lignes, utilisez \"\"\" \"\"\"."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError : fin de ligne pendant la lecture d'une chaîne (EOL while scanning)",
    explain: "Python a atteint la fin de la ligne alors qu'il lisait encore une chaîne non fermée.",
    causes: ["Guillemet de fermeture manquant à la fin de la chaîne.", "Le caractère \\ en fin de ligne empêche la fermeture de la chaîne."],
    fixes: ["Ajoutez le guillemet de fermeture approprié.", "Mettez à jour Python ou utilisez les chaînes sur plusieurs lignes avec \"\"\"."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError : fin de fichier inattendue (unexpected EOF)",
    explain: "Le fichier s'est terminé alors que Python attendait la fin d'une instruction, souvent une parenthèse ou une liste non fermée.",
    causes: ["Liste, parenthèse ou instruction interrompue au milieu.", "Oubli de fermer la dernière parenthèse du fichier."],
    fixes: ["Terminez l'instruction et fermez toutes les parenthèses ouvertes.", "Vérifiez la dernière ligne du fichier."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError : la parenthèse n'a pas été fermée (was never closed)",
    explain: "Vous avez ouvert la parenthèse {br} sans la fermer avec la parenthèse correspondante.",
    causes: ["Oubli de la parenthèse de fermeture.", "Parenthèse fermante placée au mauvais endroit, ce qui amène l'interpréteur à en chercher une autre."],
    fixes: ["Ajoutez la parenthèse de fermeture appropriée.", "Utilisez un éditeur qui colore les parenthèses correspondantes."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError : parenthèse fermante en trop (unmatched)",
    explain: "Vous avez trouvé la parenthèse fermante {br} sans parenthèse ouvrante correspondante.",
    causes: ["Parenthèse en trop en fin de ligne.", "Oubli de la parenthèse ouvrante au début de l'instruction."],
    fixes: ["Supprimez la parenthèse en trop.", "Assurez-vous que chaque parenthèse ouvrante a sa parenthèse fermante."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError : caractère non autorisé (invalid character)",
    explain: "Python a trouvé un caractère non accepté dans le code, souvent un guillemet typographique arabe ou intelligent comme “ ” ou un caractère étrange.",
    causes: ["Copier le code depuis un document transforme les guillemets en guillemets intelligents.", "Saisie d'une virgule arabe ، ou d'un point arabe à la place du caractère latin."],
    fixes: ["Remplacez les guillemets intelligents par des guillemets \" ou ' ordinaires.", "Remplacez la virgule arabe par la virgule latine ,."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError : erreur dans f-string",
    explain: "La syntaxe de la chaîne f-string est incorrecte : {detail}.",
    causes: ["Accolade { non fermée dans la chaîne.", "Utilisation du même guillemet à l'intérieur d'une f-string."],
    fixes: ["Fermez chaque accolade { par }.", "Utilisez un guillemet différent à l'intérieur de l'expression, ou adaptez la syntaxe à votre version de Python."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError : affectation impossible à une valeur constante (cannot assign to literal)",
    explain: "Vous avez tenté d'affecter une valeur à un nombre ou à une chaîne constants, alors que l'affectation nécessite un nom de variable.",
    causes: ["Le nombre ou la chaîne a été placé par erreur du côté de l'affectation.", "Confusion entre == et = dans une condition."],
    fixes: ["Placez le nom de la variable à gauche de =.", "Utilisez == pour la comparaison."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError : affectation impossible à un appel de fonction (cannot assign to function call)",
    explain: "Vous avez placé un appel de fonction du côté de l'affectation, alors que le côté gauche doit être un nom de variable.",
    causes: ["Écriture de () après un nom de variable à gauche de l'affectation.", "Oubli de ==, vous avez écrit = dans une condition."],
    fixes: ["Calculez la valeur dans une variable et affectez-la.", "Utilisez == pour la comparaison."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError : parenthèses manquantes dans print (Missing parentheses)",
    explain: "Vous avez écrit print à la manière de Python 2, sans parenthèses, alors que Python 3 les exige.",
    causes: ["Copie d'un ancien exemple en syntaxe Python 2.", "Oubli des parenthèses dans print."],
    fixes: ["Placez le texte ou la valeur entre parenthèses : print(...)."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError : bloc indenté attendu (expected an indented block)",
    explain: "La ligne précédente se termine par deux-points :, donc la ligne suivante doit être indentée, mais elle ne l'est pas.",
    causes: ["Oubli de l'indentation sous if, for ou def.", "Bloc totalement vide après les deux-points."],
    fixes: ["Indentez la ligne suivante de quatre espaces.", "Si le bloc est vide, utilisez pass."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError : indentation inattendue (unexpected indent)",
    explain: "Python a trouvé une ligne indentée sans raison, c'est-à-dire qui ne suit pas une instruction composée.",
    causes: ["Espaces superflus en début de ligne.", "Ligne copiée d'un autre endroit avec une indentation différente."],
    fixes: ["Supprimez les espaces superflus en début de ligne.", "Assurez-vous que toutes les lignes d'un même niveau ont la même indentation."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError : l'indentation ne correspond à aucun niveau extérieur",
    explain: "L'indentation de cette ligne ne correspond à aucun niveau précédent, Python ne sait donc pas à quel bloc elle appartient.",
    causes: ["Nombre d'espaces incohérent entre les lignes.", "Code copié avec une indentation différente."],
    fixes: ["Donnez à chaque niveau de code un nombre fixe d'espaces (4 espaces).", "Utilisez un éditeur qui affiche les espaces."],
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
    title: "TabError : mélange de tabulations et d'espaces",
    explain: "Vous avez utilisé parfois la touche Tab et parfois des espaces pour l'indentation, et Python rejette ce mélange.",
    causes: ["Certaines lignes commencent par Tab et d'autres par des espaces.", "Les paramètres de l'éditeur convertissent Tab différemment."],
    fixes: ["Utilisez uniquement des espaces (4 espaces par niveau).", "Dans l'éditeur, activez la conversion des tabulations en espaces."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError : impossible de concaténer une chaîne avec une valeur d'un autre type (can only concatenate str)",
    explain: "Vous avez tenté de concaténer une chaîne avec une valeur de type {t} au moyen de +, alors que Python ne convertit pas les types automatiquement.",
    causes: ["Utilisation de + entre une chaîne et un nombre.", "Valeur provenant de input(), qui est toujours une chaîne."],
    fixes: ["Convertissez le nombre en chaîne avec str().", "Ou placez le nombre dans une f-string, il sera alors converti automatiquement en texte."],
    bad: `print("Âge : " + 20)`,
    good: `print("Âge : " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError : opération non prise en charge entre deux types (unsupported operand type(s))",
    explain: "L'opérateur {op} n'accepte pas les types {a} et {b} ensemble.",
    causes: ["Chaîne avec un nombre dans une opération arithmétique.", "Valeur None dans une opération arithmétique."],
    fixes: ["Convertissez la chaîne en nombre avec int() ou float().", "Assurez-vous que les variables contiennent des valeurs numériques avant le calcul."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError : impossible d'indexer NoneType (not subscriptable)",
    explain: "La variable vaut None (c'est-à-dire rien), et vous essayez d'accéder à un élément avec [].",
    causes: ["Fonction qui ne renvoie rien car elle ne contient pas de return.", "Variable qui n'a pas reçu de valeur ou qui provient d'une opération ratée."],
    fixes: ["Assurez-vous que la fonction renvoie une valeur avec return.", "Vérifiez que la valeur n'est pas None avant de l'indexer."],
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
    title: "AttributeError : attribut ou méthode inexistant (has no attribute)",
    explain: "L'objet de type {type} ne possède pas l'attribut ou la méthode {attr}.",
    causes: ["Nom de fonction ou d'attribut mal orthographié.", "Utilisation d'une méthode propre à un autre type, comme append sur une chaîne.", "La variable vaut None."],
    fixes: ["Vérifiez le type de l'objet avec type().", "Consultez la documentation du type pour connaître les méthodes disponibles."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError : l'objet n'est pas appelable (object is not callable)",
    explain: "Vous avez tenté d'appeler une valeur de type {t} comme une fonction en écrivant des parenthèses ().",
    causes: ["Écriture de () après le nom d'une variable qui contient une valeur.", "Masquage du nom d'une fonction intégrée par une variable, par exemple str = 5."],
    fixes: ["Renommez la variable pour qu'elle ne masque pas le nom de la fonction intégrée.", "Assurez-vous d'appeler réellement une fonction."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError : arguments manquants lors de l'appel de la fonction (missing required positional argument)",
    explain: "La fonction {fn} nécessite {n} argument(s) supplémentaire(s) que vous n'avez pas transmis lors de l'appel.",
    causes: ["Appel de la fonction sans transmettre l'argument requis.", "La définition de la fonction exige un paramètre dont vous n'avez pas besoin."],
    fixes: ["Transmettez les valeurs manquantes lors de l'appel.", "Donnez au paramètre une valeur par défaut dans la définition de la fonction s'il est facultatif."],
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
    title: "TypeError : arguments en trop lors de l'appel de la fonction (takes positional arguments but given)",
    explain: "La fonction {fn} n'accepte que {n} argument(s), mais vous en avez transmis {m}.",
    causes: ["Transmission de plus de valeurs que le nombre de paramètres de la définition.", "La définition de la fonction ne contient pas le paramètre que vous transmettez."],
    fixes: ["Supprimez les valeurs en trop de l'appel.", "Ajoutez le paramètre manquant à la définition de la fonction."],
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
    title: "TypeError : objet non itérable (object is not iterable)",
    explain: "Vous avez tenté de parcourir une valeur de type {t} avec une boucle for ou un déballage, alors que ce type n'est pas itérable.",
    causes: ["Vous avez oublié d'utiliser range() avec le nombre dans la boucle.", "Fonction qui ne renvoie aucune valeur, donc le résultat est None."],
    fixes: ["Utilisez range(n) pour parcourir un nombre.", "Assurez-vous que la variable est une liste, une chaîne ou un ensemble avant de la parcourir."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError : l'indice d'une liste doit être un entier (list indices)",
    explain: "L'indice d'une liste doit être un entier, alors que vous avez utilisé une valeur de type {t}.",
    causes: ["Écriture de l'indice sous forme de texte, comme '1'.", "Calcul de l'indice avec la division /, ce qui donne un nombre décimal."],
    fixes: ["Utilisez un entier sans guillemets.", "Utilisez // au lieu de / pour calculer l'indice."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError : impossible de convertir la chaîne en entier (invalid literal for int)",
    explain: "La fonction int() n'a pas pu convertir la chaîne '{v}' en entier.",
    causes: ["La chaîne contient des lettres ou des symboles non numériques.", "La chaîne est un nombre décimal, comme 3.5.", "La chaîne est vide."],
    fixes: ["Utilisez float() pour les nombres décimaux.", "Vérifiez la saisie avant la conversion, ou utilisez try et except."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError : trop de valeurs à déballer (too many values to unpack)",
    explain: "Le déballage ne comporte que {n} variables, alors que la liste contient davantage de valeurs.",
    causes: ["Le nombre de noms de variables est inférieur au nombre d'éléments.", "Liste plus longue que prévu."],
    fixes: ["Augmentez le nombre de variables pour qu'il corresponde au nombre d'éléments.", "Utilisez *rest pour regrouper les éléments en trop."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError : pas assez de valeurs à déballer (not enough values to unpack)",
    explain: "Vous essayez de déballer les valeurs dans {n} variables, mais la liste ne contient que {g} élément(s).",
    causes: ["Le nombre de variables est supérieur au nombre d'éléments.", "Fonction qui renvoie moins d'éléments que prévu."],
    fixes: ["Réduisez le nombre de variables pour qu'il corresponde au nombre d'éléments.", "Vérifiez la longueur de la liste avant le déballage."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError : indice hors de la plage de la liste (list index out of range)",
    explain: "Vous tentez d'accéder à une position inexistante dans la liste. La numérotation commence à 0 et se termine à la longueur - 1.",
    causes: ["L'indice est égal à la longueur de la liste ou lui est supérieur.", "Boucle qui dépasse le dernier élément de la liste."],
    fixes: ["Utilisez un indice compris entre 0 et len(liste) - 1.", "Dans les boucles, utilisez for x in liste au lieu d'indexer."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError : clé absente du dictionnaire",
    explain: "Le dictionnaire ne contient pas la clé {key}, l'accès avec [] a donc échoué.",
    causes: ["La clé est écrite différemment de la clé enregistrée.", "La clé n'a pas encore été ajoutée au dictionnaire."],
    fixes: ["Utilisez get() avec une valeur par défaut.", "Vérifiez la présence de la clé avec l'opérateur in avant d'y accéder."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError : division par zéro",
    explain: "Vous avez tenté une division par zéro, opération non définie mathématiquement.",
    causes: ["Le dénominateur est une variable dont la valeur est zéro, sans vérification.", "Calcul de la moyenne d'une liste vide."],
    fixes: ["Vérifiez que le dénominateur n'est pas égal à zéro avant la division.", "Ajoutez une condition pour traiter ce cas particulier."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError : module introuvable (No module named)",
    explain: "Le module {mod} n'est pas installé, ou son nom dans l'importation diffère du nom du paquet.",
    causes: ["Vous n'avez pas encore installé le module.", "Vous exécutez Python depuis un environnement différent de celui où le module a été installé.", "Le nom d'importation diffère du nom du paquet, comme cv2 pour le paquet opencv."],
    fixes: ["Installez le module avec la commande pip install nom_du_module.", "Vérifiez que le module est installé dans la même version de Python que celle qui exécute votre code."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError : impossible d'importer le nom (cannot import name)",
    explain: "Le module existe, mais le nom {name} n'y est pas défini.",
    causes: ["Nom de fonction mal orthographié.", "Fichier local portant le nom d'un module standard, comme random.py.", "La fonction existe dans une autre version du module."],
    fixes: ["Consultez la documentation du module pour vérifier le nom exact.", "Renommez le fichier local qui porte le nom d'un module standard."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError : fichier introuvable (No such file or directory)",
    explain: "Le fichier {path} n'existe pas dans le chemin depuis lequel le programme s'exécute.",
    causes: ["Nom ou extension du fichier mal écrit.", "Le dossier d'exécution n'est pas celui qui contient le fichier."],
    fixes: ["Vérifiez le nom et l'extension du fichier.", "Utilisez un chemin complet ou vérifiez le dossier d'exécution."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError : profondeur de récursion dépassée (maximum recursion depth)",
    explain: "La fonction s'appelle elle-même sans arrêt, et le nombre d'appels dépasse la limite autorisée.",
    causes: ["Absence de condition d'arrêt dans la fonction récursive.", "La condition d'arrêt n'est jamais vraie à cause d'une erreur de logique."],
    fixes: ["Ajoutez une condition d'arrêt claire au début de la fonction.", "Transformez la solution en boucle while ou for."],
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
    title: "UnboundLocalError : variable locale utilisée avant affectation (cannot access local variable)",
    explain: "Vous utilisez la variable {name} dans une fonction avant de lui affecter une valeur dans cette fonction.",
    causes: ["Modification d'une variable globale depuis l'intérieur d'une fonction sans déclaration global.", "Affectation d'une valeur à la variable dans la fonction après son utilisation."],
    fixes: ["Passez la variable à la fonction comme paramètre et renvoyez sa nouvelle valeur.", "Ou utilisez global si vous devez modifier la variable globale."],
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
    title: "StopIteration : fin des éléments (StopIteration)",
    explain: "L'itérateur a atteint sa fin et ne contient plus d'éléments, ce qui arrive souvent avec next().",
    causes: ["Appel de next() plus de fois que le nombre d'éléments.", "Réutilisation d'un itérateur déjà épuisé."],
    fixes: ["Utilisez next(it, None) pour définir une valeur à la fin.", "Utilisez une boucle for au lieu d'appeler next() manuellement."],
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
    title: "UnicodeDecodeError : échec du décodage (can't decode byte)",
    explain: "Le fichier n'est pas dans l'encodage {codec} avec lequel vous essayez de le lire.",
    causes: ["Le fichier est enregistré en UTF-8, alors que Python le lit avec un autre encodage par défaut.", "Le fichier est binaire, comme une image, et non du texte."],
    fixes: ["Ajoutez encoding=\"utf-8\" lors de l'ouverture du fichier.", "Si le fichier est binaire, ouvrez-le en mode \"rb\"."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError : dépassement de la plage de valeurs (OverflowError)",
    explain: "La valeur est supérieure à la limite que la fonction peut traiter : {msg}.",
    causes: ["Calcul d'une exponentielle trop grande, comme exp(1000).", "Conversion d'un nombre très grand en nombre décimal."],
    fixes: ["Réduisez la taille des valeurs dans le calcul.", "Utilisez une bibliothèque de grands nombres ou des valeurs plus petites."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError : variable non définie (is not defined)",
    explain: "Vous utilisez {name} sans l'avoir défini dans ce contexte, ou vous avez écrit son nom différemment de sa définition.",
    causes: ["Vous avez oublié let, const ou var avant la définition.", "Faute de frappe dans le nom.", "La variable est définie dans une autre fonction et n'est donc pas visible d'ici.", "Le fichier du script ou la bibliothèque qui définit ce nom n'a pas été chargé."],
    fixes: ["Définissez la variable avec let ou const avant de l'utiliser.", "Vérifiez que la casse du nom correspond et que le fichier requis est chargé avant le code."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError : accès avant l'initialisation (before initialization)",
    explain: "Vous avez utilisé {name} avant la ligne où vous l'avez défini. Les variables let et const ne sont pas remontées en haut du code comme le fait var.",
    causes: ["Utilisation de la variable sur une ligne située avant sa définition.", "Fonction qui appelle une variable qui n'a pas encore été créée."],
    fixes: ["Déplacez la définition avant la première utilisation.", "Utilisez la fonction après l'initialisation des variables dont elle dépend."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError : lecture d'une propriété d'une valeur indéfinie (Cannot read properties of undefined)",
    explain: "Vous avez tenté de lire la propriété '{p}' d'une valeur de type {t}, alors que cette valeur n'existe pas à ce moment-là.",
    causes: ["Variable à laquelle aucune valeur n'a encore été affectée.", "Élément DOM introuvable, comme getElementById avec un identifiant erroné.", "Données non encore reçues du serveur ou d'une fonction asynchrone.", "Fonction qui ne renvoie rien, donc le résultat est undefined."],
    fixes: ["Vérifiez la valeur avant d'y accéder avec if ou avec l'opérateur ?., par exemple obj?.name.", "Assurez-vous que l'élément existe dans la page avant de l'utiliser."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError : affectation d'une propriété sur une valeur indéfinie (Cannot set properties of undefined)",
    explain: "Vous avez tenté d'écrire la propriété '{p}' sur une valeur de type {t}, alors que l'objet n'a pas encore été créé.",
    causes: ["Déclaration d'une variable objet sans lui donner la valeur {}.", "Objet provenant d'une fonction qui ne renvoie rien."],
    fixes: ["Créez d'abord l'objet avec {} ou avec la syntaxe appropriée.", "Assurez-vous que la variable contient un objet avant d'y écrire."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError : n'est pas une fonction (is not a function)",
    explain: "Vous avez tenté d'appeler {fn} avec des parenthèses (), mais ce n'est pas une fonction.",
    causes: ["Nom de fonction mal orthographié.", "La fonction n'a pas encore été définie ou importée.", "La bibliothèque renvoie une valeur d'un autre type, comme export default au lieu d'une fonction."],
    fixes: ["Vérifiez l'orthographe du nom et la définition de la fonction avant de l'appeler.", "Contrôlez le type de la valeur avec typeof avant l'appel."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError : valeur non itérable (is not iterable)",
    explain: "Vous avez tenté de parcourir {x} avec une boucle for...of ou un déballage [...], alors que cette valeur n'est pas itérable.",
    causes: ["Utilisation d'un objet ordinaire {} dans for...of.", "Fonction qui ne renvoie pas de tableau, donc le résultat est undefined."],
    fixes: ["Utilisez Object.keys, Object.values ou Object.entries avec l'objet.", "Assurez-vous que la valeur est un tableau, une chaîne ou une Map avant de la parcourir."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError : modification d'une constante (Assignment to constant variable)",
    explain: "Les variables déclarées avec const ne peuvent pas changer de valeur après leur définition.",
    causes: ["Utilisation de const pour une variable qui changera plus tard.", "Oubli que la valeur est constante lors d'une nouvelle affectation."],
    fixes: ["Utilisez let si vous allez modifier la valeur.", "Créez une nouvelle variable au lieu de modifier la constante."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError : jeton inattendu (Unexpected token)",
    explain: "JavaScript a trouvé un symbole ou un mot à un endroit non autorisé par les règles ; la cause se trouve souvent un peu avant la ligne indiquée.",
    causes: ["Parenthèse ou virgule en trop ou manquante.", "Mot réservé utilisé comme nom.", "Code situé dans une fonction dont l'accolade n'est pas correctement fermée."],
    fixes: ["Examinez les parenthèses et les virgules de la ligne et de la précédente.", "Utilisez un éditeur qui affiche les erreurs et met en correspondance les parenthèses."],
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
    title: "SyntaxError : texte qui n'est pas du JSON valide (is not valid JSON)",
    explain: "La fonction JSON.parse tente de lire un texte qui n'est pas du JSON correct ; elle a souvent reçu du HTML au lieu des données.",
    causes: ["Le serveur a renvoyé une page HTML, comme une page d'erreur 404, au lieu de JSON.", "Fichier JSON contenant une virgule en trop ou des guillemets simples."],
    fixes: ["Affichez le texte brut avant l'analyse et vérifiez son contenu.", "Utilisez des guillemets doubles pour les noms de clés et les textes en JSON."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError : fin de code inattendue (Unexpected end of input)",
    explain: "Le fichier ou le bloc s'est terminé alors que JavaScript attendait la fermeture d'une parenthèse ou d'une accolade.",
    causes: ["Accolade { ou parenthèse ( non fermée.", "Copie d'une partie du code en oubliant sa fin."],
    fixes: ["Fermez chaque parenthèse ou accolade ouverte.", "Utilisez un éditeur qui fait correspondre les parenthèses ouvrantes et fermantes."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError : ')' manquante après la liste des paramètres",
    explain: "L'appel de la fonction n'est pas fermé par une parenthèse ) avant le point-virgule ou la fin de ligne.",
    causes: ["Oubli de la parenthèse fermante à la fin de l'appel.", "Guillemet non fermé dans les paramètres."],
    fixes: ["Ajoutez ) avant le point-virgule.", "Assurez-vous de fermer tous les guillemets dans l'appel."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError : identifiant inattendu (Unexpected identifier)",
    explain: "JavaScript a trouvé un nom après une valeur ou une expression sans point-virgule entre les deux, souvent à cause d'une ligne sans point-virgule.",
    causes: ["Oubli de ; à la fin de la ligne précédente.", "Écriture de deux noms consécutifs sans symbole de séparation."],
    fixes: ["Ajoutez ; à la fin de chaque instruction.", "Placez chaque déclaration sur une ligne distincte."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError : jeton invalide (Invalid or unexpected token)",
    explain: "JavaScript a trouvé un symbole non accepté dans le code, souvent un guillemet intelligent ou un caractère invisible.",
    causes: ["Copier le code depuis un document transforme les guillemets en guillemets intelligents.", "Guillemet non fermé correctement."],
    fixes: ["Remplacez les guillemets intelligents par des guillemets \" ou ' ordinaires.", "Assurez-vous de fermer chaque texte avec le même guillemet."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError : variable déclarée deux fois (has already been declared)",
    explain: "Vous avez déclaré {name} plus d'une fois dans le même contexte avec let ou const.",
    causes: ["Copie d'une ligne de déclaration sans supprimer l'ancienne.", "Deux variables portant le même nom dans le même fichier."],
    fixes: ["Supprimez la déclaration en trop ou changez son nom.", "Utilisez une simple réaffectation sans let si vous voulez changer la valeur."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError : await en dehors d'une fonction async",
    explain: "Vous avez utilisé le mot await à un endroit non permis : il ne fonctionne que dans une fonction async ou dans un module ES en haut du fichier.",
    causes: ["Oubli du mot async avant la fonction.", "Utilisation de await dans une fonction ordinaire ou un gestionnaire d'événement ordinaire."],
    fixes: ["Rendez la fonction async.", "Ou utilisez directement then() avec la promesse."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError : utilisation de import en dehors d'un module ES",
    explain: "Node.js traite le fichier comme CommonJS, alors que la syntaxe import est celle des modules ES.",
    causes: ["Le fichier est exécuté avec Node sans indication qu'il s'agit d'un module.", "Copie d'un exemple récent sans configurer le projet."],
    fixes: ["Utilisez require au lieu de import en CommonJS.", "Ou ajoutez \"type\": \"module\" dans le fichier package.json."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError : pile d'appels saturée (Maximum call stack size exceeded)",
    explain: "La fonction s'appelle elle-même sans arrêt, ce qui sature la pile d'exécution.",
    causes: ["Absence de condition d'arrêt dans la fonction récursive.", "Deux fonctions s'appellent mutuellement sans fin."],
    fixes: ["Ajoutez une condition d'arrêt claire.", "Transformez la solution en boucle while ou for."],
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
    title: "RangeError : longueur de tableau invalide (Invalid array length)",
    explain: "La longueur du tableau doit être un entier positif dans une certaine limite.",
    causes: ["Passage d'un nombre négatif à Array.", "Passage d'une valeur décimale ou non numérique comme longueur du tableau."],
    fixes: ["Assurez-vous que la longueur est un entier positif.", "Vérifiez la valeur avant de créer le tableau."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise) : promesse rejetée non gérée",
    explain: "Une promesse Promise a échoué, et vous n'avez ajouté ni catch ni try et catch avec await pour gérer l'erreur.",
    causes: ["Utilisation de then sans catch.", "Appel d'une fonction async sans await ni catch."],
    fixes: ["Ajoutez .catch() après la chaîne then.", "Placez le code await dans un bloc try et catch."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS : la requête a été bloquée par la politique de partage entre origines",
    explain: "Le navigateur a bloqué la requête parce que le serveur n'autorise pas l'accès depuis cette origine, ou parce que la page a été ouverte depuis file://.",
    causes: ["Le serveur n'envoie pas l'en-tête Access-Control-Allow-Origin.", "La page est ouverte directement depuis le fichier au lieu d'un serveur local."],
    fixes: ["Activez CORS sur le serveur pour autoriser le domaine demandé.", "Lancez le projet via un serveur local au lieu d'ouvrir le fichier directement."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError : échec de la requête (Failed to fetch)",
    explain: "La requête n'a pas atteint le serveur : le réseau est peut-être coupé, l'adresse erronée, le serveur arrêté, ou la requête bloquée par CORS.",
    causes: ["Le serveur est arrêté ou l'adresse est mal écrite.", "La connexion Internet est coupée.", "La politique CORS bloque la requête."],
    fixes: ["Ouvrez l'adresse dans le navigateur pour vérifier qu'elle fonctionne.", "Examinez l'onglet Network des outils de développement et vérifiez CORS."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error : module introuvable (Cannot find module)",
    explain: "Node.js ne trouve pas le fichier ou le paquet {mod}.",
    causes: ["Le paquet n'est pas installé dans le projet.", "Le chemin relatif est incorrect.", "L'extension du fichier est manquante ou le fichier n'existe pas."],
    fixes: ["Installez le paquet avec la commande npm install nom_du_paquet.", "Vérifiez le chemin relatif et la présence du fichier."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE : port déjà utilisé",
    explain: "Le port sur lequel vous tentez d'écouter est occupé par un autre programme, souvent une autre instance du serveur en cours d'exécution.",
    causes: ["Lancement du serveur deux fois sur le même port.", "Un autre programme utilise le port."],
    fixes: ["Arrêtez l'autre instance du serveur.", "Ou changez le numéro de port."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT : fichier ou dossier introuvable",
    explain: "Node.js a tenté d'ouvrir un fichier ou un dossier inexistant au chemin indiqué.",
    causes: ["Nom de fichier erroné ou extension manquante.", "Le chemin est relatif à un dossier d'exécution différent."],
    fixes: ["Vérifiez l'existence du fichier avant de le lire avec fs.existsSync.", "Utilisez un chemin construit à partir du dossier du fichier courant."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError : structure circulaire impossible à convertir en JSON",
    explain: "L'objet contient une référence circulaire, c'est-à-dire qu'il pointe vers lui-même directement ou indirectement, et JSON.stringify ne peut pas le convertir.",
    causes: ["Objet contenant une propriété qui pointe vers lui-même.", "Élément DOM ou objet complexe passé à JSON.stringify."],
    fixes: ["Supprimez la propriété circulaire avant la conversion.", "Convertissez en un objet simple ne contenant que les données nécessaires."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error : symbole introuvable (cannot find symbol)",
    explain: "Le compilateur n'a trouvé aucune variable, fonction ou classe portant ce nom. Consultez la ligne symbol du message pour connaître le nom visé.",
    causes: ["Nom mal orthographié.", "La variable est définie dans un autre contexte.", "Vous avez oublié l'import d'une classe comme ArrayList.", "Vous n'avez jamais déclaré la variable."],
    fixes: ["Corrigez le nom selon la ligne symbol.", "Ajoutez l'import approprié, par exemple import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error : conversion pouvant entraîner une perte de données (possible lossy conversion)",
    explain: "La conversion de {a} vers {b} peut faire perdre une partie de la valeur, comme les décimales, c'est pourquoi Java la refuse automatiquement.",
    causes: ["Affectation d'un nombre décimal à une variable entière.", "Le résultat de la division de deux entiers comporte une partie décimale."],
    fixes: ["Utilisez un type plus large, comme double, pour la variable.", "Si la conversion est voulue, utilisez une conversion explicite comme (int)."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error : types incompatibles (incompatible types)",
    explain: "Vous tentez d'affecter une valeur incompatible avec le type de la variable : {a}.",
    causes: ["Affectation d'un texte à une variable numérique, ou l'inverse.", "Renvoi d'un type différent de celui de la fonction."],
    fixes: ["Faites correspondre le type de la valeur à celui de la variable.", "Convertissez explicitement la valeur si la conversion a un sens."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error : instruction return manquante (missing return statement)",
    explain: "La fonction doit renvoyer une valeur dans tous les chemins d'exécution possibles, or il existe ici un chemin qui ne renvoie rien.",
    causes: ["return uniquement dans un if, sans chemin alternatif.", "Oubli de return à la fin de la fonction."],
    fixes: ["Ajoutez return à la fin de la fonction comme valeur par défaut.", "Ajoutez un else qui renvoie une valeur pour l'autre cas."],
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
    title: "error : point-virgule ; attendu",
    explain: "Oubli du point-virgule ; à la fin de l'instruction, que Java exige toujours.",
    causes: ["Oubli de ; après une instruction ou une déclaration.", "Ligne qui se termine de façon incomplète."],
    fixes: ["Ajoutez ; à la fin de la ligne indiquée ou de la précédente."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error : le nom du fichier ne correspond pas à la classe publique (is public, should be declared in a file named)",
    explain: "La classe publique {cls} doit être dans un fichier nommé exactement {file}.",
    causes: ["Fichier nommé différemment de la classe publique.", "Deux classes publiques dans le même fichier."],
    fixes: ["Renommez le fichier pour qu'il corresponde au nom de la classe publique.", "Ou rendez la classe non publique en supprimant public."],
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
    title: "error : instruction inaccessible (unreachable statement)",
    explain: "Il existe une ligne après return, break ou throw qui ne sera jamais exécutée, c'est pourquoi le compilateur la refuse.",
    causes: ["Écriture de code directement après return.", "Boucle while(true) sans break avant le code qui suit."],
    fixes: ["Déplacez la ligne avant return.", "Supprimez le code qui ne sera jamais exécuté."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error : variable peut-être non initialisée (might not have been initialized)",
    explain: "La variable {v} peut ne pas recevoir de valeur avant d'être utilisée dans certains chemins d'exécution.",
    causes: ["Déclaration de la variable sans valeur puis utilisation.", "Affectation de la valeur dans un if sans else."],
    fixes: ["Donnez une valeur initiale à la variable lors de sa déclaration.", "Assurez-vous que chaque chemin affecte une valeur à la variable."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error : membre non static dans un contexte static",
    explain: "{m} est un membre non static, qui ne peut pas être utilisé directement depuis main ni depuis une méthode static sans objet.",
    causes: ["Appel direct d'une méthode ordinaire depuis main.", "Variable ordinaire dans une classe utilisée depuis une méthode static."],
    fixes: ["Rendez le membre static s'il doit être partagé.", "Ou créez un objet de la classe et appelez le membre à travers lui."],
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
    title: "NullPointerException : pointeur nul (null)",
    explain: "Vous tentez d'utiliser un objet dont la valeur est null, c'est-à-dire qui n'a pas été créé ou à qui null a été affecté.",
    causes: ["Variable de texte à laquelle null a été affecté, puis dont une méthode a été appelée.", "Objet non créé avec new.", "Map.get a renvoyé null pour une clé inexistante."],
    fixes: ["Créez l'objet avant de l'utiliser.", "Vérifiez null avec if (x != null) ou utilisez Objects.requireNonNull."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException : indice hors des limites du tableau",
    explain: "Vous avez tenté d'accéder à l'indice {i} alors que la longueur du tableau est {n}. Les indices commencent à 0 et se terminent à la longueur - 1.",
    causes: ["L'indice est exactement égal à la longueur.", "Boucle qui dépasse le dernier élément."],
    fixes: ["Utilisez un indice compris entre 0 et longueur - 1.", "Utilisez une boucle for-each si vous n'avez pas besoin de l'indice."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException : indice hors des limites de la chaîne",
    explain: "L'indice demandé dans la chaîne est hors de ses limites, ce qui arrive avec charAt ou substring.",
    causes: ["Utilisation de charAt avec un indice égal à la longueur de la chaîne.", "substring avec des bornes erronées."],
    fixes: ["Assurez-vous que l'indice est compris entre 0 et longueur de la chaîne - 1.", "Vérifiez la longueur de la chaîne avant l'extraction."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException : division par zéro",
    explain: "Division d'un entier par zéro, ce qui n'est pas permis en Java pour les entiers.",
    causes: ["Le dénominateur est une variable dont la valeur est zéro.", "Calcul de la moyenne d'une liste vide."],
    fixes: ["Vérifiez que le dénominateur n'est pas égal à zéro.", "Utilisez double si cela convient au calcul."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException : texte qui ne représente pas un entier",
    explain: "La fonction n'a pas pu convertir le texte « {v} » en nombre, car il contient des lettres ou une virgule décimale.",
    causes: ["Texte contenant des lettres ou des espaces.", "Nombre décimal converti en int."],
    fixes: ["Utilisez Double.parseDouble pour les nombres décimaux.", "Vérifiez le texte avec matches ou try et catch."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException : conversion de type incompatible",
    explain: "Vous avez tenté de convertir un objet de type {a} en {b}, alors qu'il n'en est pas un.",
    causes: ["Conversion d'un Object vers un type qui ne correspond pas à l'objet réel.", "Éléments d'une liste de types mélangés."],
    fixes: ["Vérifiez le type avec instanceof avant la conversion.", "Assurez-vous que la valeur est du bon type lors de son ajout."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException : la saisie ne correspond pas au type attendu",
    explain: "Le Scanner attendait un type donné, comme un entier, mais il a trouvé un texte, ou l'inverse.",
    causes: ["L'utilisateur a saisi des lettres là où un nombre est attendu.", "L'ordre entre nextInt et nextLine est incorrect."],
    fixes: ["Vérifiez avant la lecture avec hasNextInt().", "Lisez la ligne entière avec nextLine, puis convertissez-la."],
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
    title: "ConcurrentModificationException : modification d'une liste pendant son parcours",
    explain: "Vous avez modifié la liste pendant son parcours avec une boucle for-each, ce que Java refuse de poursuivre.",
    causes: ["Suppression d'un élément de la liste dans un for-each.", "Ajout d'un élément à la liste dans cette même boucle."],
    fixes: ["Utilisez removeIf pour supprimer des éléments.", "Ou utilisez un Iterator avec sa méthode remove."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError : saturation de la pile",
    explain: "Appel récursif sans fin : une fonction s'appelle elle-même sans condition de sortie, ce qui sature la pile d'exécution.",
    causes: ["Absence de condition d'arrêt dans la fonction récursive.", "La condition d'arrêt n'est jamais vérifiée."],
    fixes: ["Ajoutez une condition d'arrêt claire au début de la fonction.", "Transformez la solution en boucle."],
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
    title: "OutOfMemoryError : mémoire épuisée",
    explain: "Le programme demande plus de mémoire qu'il n'en est disponible, souvent à cause d'une boucle qui crée des objets sans fin ou de données très volumineuses.",
    causes: ["Boucle qui ajoute des objets à une liste sans s'arrêter.", "Chargement d'un fichier très volumineux entièrement en mémoire."],
    fixes: ["Traitez les données par petits lots.", "Videz les listes dont vous n'avez plus besoin."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error : exception non gérée (unreported exception)",
    explain: "La fonction lève l'exception {e}, qui est de type checked ; vous devez donc la gérer avec try et catch ou la déclarer dans throws.",
    causes: ["Appel d'une fonction qui lève une exception checked sans la gérer.", "Lancement d'une exception checked dans une fonction qui ne la déclare pas."],
    fixes: ["Entourez l'appel avec try et catch.", "Ou ajoutez throws {e} à la définition de la fonction."],
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
    title: "error : fin de fichier atteinte avant la fin du code (reached end of file while parsing)",
    explain: "Le fichier se termine alors qu'une accolade { reste non fermée, si bien que la définition de la classe ou de la fonction est incomplète.",
    causes: ["Oubli de l'accolade fermante } à la fin de la fonction ou de la classe.", "Parenthèse en trop ou manquante au milieu du code."],
    fixes: ["Ajoutez l'accolade fermante manquante.", "Utilisez un éditeur qui fait correspondre les accolades pour localiser l'erreur."],
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
    title: "error : variable déjà définie (is already defined)",
    explain: "Vous avez défini la variable {v} plus d'une fois dans le même contexte.",
    causes: ["Copie d'une ligne de déclaration sans supprimer l'ancienne.", "Définition de la variable à l'intérieur de la boucle et à l'extérieur avec le même nom."],
    fixes: ["Supprimez la déclaration en trop ou changez son nom.", "Utilisez une simple réaffectation sans indiquer à nouveau le type de la variable."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error : le compilateur attendait un symbole avant le mot indiqué (expected before)",
    explain: "Le compilateur attendait {what} à l'endroit indiqué, mais il a trouvé autre chose ; l'erreur se trouve souvent à la ligne précédant le message.",
    causes: ["Oubli du point-virgule ; à la fin de la ligne précédente.", "Parenthèse non fermée à la ligne précédente."],
    fixes: ["Ajoutez ; ou fermez la parenthèse à la ligne précédente.", "Rappelez-vous que le compilateur indique parfois la ligne qui suit la véritable erreur."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error : nom non déclaré dans ce contexte (was not declared in this scope)",
    explain: "La variable ou la fonction {n} n'est pas déclarée à cet endroit du code.",
    causes: ["Faute de frappe dans le nom.", "La variable est définie dans une autre fonction.", "Vous avez oublié #include pour la bibliothèque qui définit ce nom."],
    fixes: ["Définissez le nom avant de l'utiliser ou transmettez-le comme paramètre.", "Ajoutez le #include approprié en haut du fichier."],
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
    title: "error : identifiant non déclaré (use of undeclared identifier)",
    explain: "Le compilateur clang n'a pas trouvé la déclaration de {n} dans ce contexte.",
    causes: ["Faute de frappe dans le nom.", "La variable est définie dans un autre contexte, ou n'a jamais été définie."],
    fixes: ["Corrigez le nom ou définissez la variable avant de l'utiliser."],
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
    title: "undefined reference : l'éditeur de liens n'a pas trouvé la définition",
    explain: "Vous avez déclaré {s} sans en écrire la définition, ou vous n'avez pas lié le fichier qui la contient lors de la compilation.",
    causes: ["Oubli d'écrire le corps de la fonction.", "Le fichier source qui définit la fonction n'a pas été transmis au compilateur.", "Erreur dans une bibliothèque liée ou dans l'ordre de l'édition de liens."],
    fixes: ["Écrivez la définition de la fonction ou de la variable.", "Ajoutez le fichier source ou la bibliothèque à la commande de compilation."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault : accès à une mémoire non autorisée",
    explain: "Le programme a tenté d'accéder à une mémoire qui ne lui appartient pas, souvent un pointeur nul, un indice hors du tableau ou un pointeur libéré.",
    causes: ["Pointeur non initialisé ou dont la valeur est NULL, puis utilisé.", "Indice hors des limites du tableau.", "Utilisation de la mémoire après free."],
    fixes: ["Assurez-vous que le pointeur désigne une mémoire valide avant de l'utiliser.", "Exécutez le programme avec gdb ou valgrind pour localiser la ligne."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function : appel d'une fonction avant sa déclaration",
    explain: "Vous avez appelé la fonction {f} avant de la définir ou de la déclarer ; le compilateur a donc supposé son type automatiquement.",
    causes: ["La fonction est définie plus bas, après son appel.", "Oubli du #include du fichier qui la déclare."],
    fixes: ["Placez le prototype de la fonction avant main.", "Ajoutez le #include du fichier approprié."],
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
    title: "error : le compilateur attendait une expression (expected primary-expression)",
    explain: "Le compilateur attendait une valeur ou une variable à cet endroit, mais il a trouvé un symbole qui n'est pas valide ici.",
    causes: ["Signe = sans valeur après lui.", "Parenthèse ou virgule à un endroit où l'expression ne les accepte pas."],
    fixes: ["Ajoutez la valeur requise après = ou entre les parenthèses.", "Vérifiez les virgules et les parenthèses avant l'endroit indiqué."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error : conversion de type invalide (invalid conversion)",
    explain: "Vous avez tenté de convertir {a} en {b} de façon non autorisée en C ou C++.",
    causes: ["Affectation d'une valeur à un pointeur sans adresse.", "Confusion entre le type de la valeur et le type du pointeur."],
    fixes: ["Affectez au pointeur l'adresse d'une variable à l'aide de &.", "Assurez-vous que les types correspondent ou convertissez-les explicitement."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error : aucune fonction correspondante à l'appel (no matching function for call)",
    explain: "L'appel {f} ne correspond à aucune définition de la fonction en nombre ou en type de paramètres.",
    causes: ["Passage d'un nombre de paramètres différent de celui de la définition.", "Passage d'un type qui ne peut pas être converti en type attendu."],
    fixes: ["Faites correspondre les paramètres à la définition de la fonction.", "Consultez la signature de la fonction dans la documentation ou le fichier d'en-tête."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error : redéfinition de (redefinition of)",
    explain: "Vous avez défini ou déclaré {n} plus d'une fois dans le même contexte.",
    causes: ["Copie d'une ligne de définition sans supprimer l'ancienne.", "Fichier d'en-tête inclus plusieurs fois sans protection."],
    fixes: ["Supprimez la définition en trop.", "Ajoutez une protection d'en-tête #ifndef ou #pragma once au fichier d'en-tête."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error : types conflictuels (conflicting types)",
    explain: "La première déclaration de {n} diffère de la déclaration ou de la définition suivante par le type de retour ou les paramètres.",
    causes: ["Modification du type de retour entre la déclaration et la définition.", "Nombre ou type de paramètres différent entre les deux versions."],
    fixes: ["Rendez la signature identique dans la déclaration et la définition.", "Mettez à jour la déclaration pour qu'elle corresponde à la définition."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning : la fonction se termine sans return (control reaches end)",
    explain: "La fonction est censée renvoyer une valeur, mais certains chemins se terminent sans return, ce qui est un comportement non défini.",
    causes: ["return uniquement dans un if.", "Oubli de return à la fin de la fonction."],
    fixes: ["Ajoutez return à la fin de la fonction.", "Assurez-vous que chaque chemin renvoie une valeur."],
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
    title: "stack smashing detected : écriture au-delà des limites de la pile",
    explain: "Écriture hors des limites d'un tableau sur la pile, ce qui a corrompu des données protégées, souvent à cause de strcpy ou d'un indice en trop.",
    causes: ["Copie d'un texte plus long que le tableau avec strcpy.", "Boucle qui écrit après la fin du tableau."],
    fixes: ["Utilisez strncpy avec la taille du tableau et assurez-vous de terminer le texte par zéro.", "Vérifiez les bornes avant d'écrire."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning : indice hors des limites du tableau (array subscript out of bounds)",
    explain: "Le code lit ou écrit en dehors des limites du tableau, ce qui provoque un comportement imprévisible.",
    causes: ["Indice égal ou supérieur à la taille du tableau.", "Boucle qui compte jusqu'à la taille au lieu de taille - 1."],
    fixes: ["Utilisez des indices de 0 à taille - 1.", "Vérifiez l'indice avant d'y accéder."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer ou double free",
    explain: "Vous avez libéré une mémoire déjà libérée, ou un pointeur qui ne provient pas de malloc.",
    causes: ["Appel de free deux fois sur le même pointeur.", "Libération d'un pointeur qui désigne une variable locale ou un élément du tableau."],
    fixes: ["Mettez le pointeur à NULL après free.", "Assurez-vous que chaque zone mémoire n'est libérée qu'une seule fois, et par la même source."],
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
    title: "multiple definition : définition en double dans plusieurs fichiers",
    explain: "La définition de {n} existe dans plusieurs fichiers source, souvent parce qu'un fichier d'en-tête contient une définition et non une simple déclaration.",
    causes: ["Écriture d'une définition de variable ou de fonction dans un fichier d'en-tête.", "Inclusion du fichier d'en-tête dans plusieurs fichiers source."],
    fixes: ["Faites du fichier d'en-tête une simple déclaration avec extern ou un prototype.", "Placez la définition dans un seul fichier source."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error : valeur affectable requise (lvalue required)",
    explain: "Vous avez tenté une affectation à une expression qui n'a pas d'emplacement en mémoire, comme une valeur constante ou le résultat d'une fonction.",
    causes: ["Placement du nombre à gauche de l'affectation.", "Tentative d'incrémenter une valeur renvoyée par une fonction."],
    fixes: ["Placez le nom de la variable à gauche de =.", "Enregistrez le résultat de la fonction dans une variable, puis modifiez-la."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning : comparaison d'un entier signé avec un entier non signé (signedness)",
    explain: "Vous avez comparé un entier signé à un entier non signé ; la valeur négative devient alors un grand nombre et le résultat change.",
    causes: ["Utilisation de size_t ou unsigned int avec int dans les boucles.", "Compteur entier comparé à la longueur d'un tableau."],
    fixes: ["Rendez les deux types identiques quant au signe.", "Utilisez le même type pour les deux variables."],
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
    title: "warning : le format d'affichage ne correspond pas au type de la variable (format expects argument)",
    explain: "Le format d'affichage %{f} attend un type {t}, mais la variable transmise est d'un autre type, ce qui peut afficher des valeurs erronées.",
    causes: ["Utilisation de %d pour un nombre décimal.", "Oubli du type de la variable lors d'une modification du code."],
    fixes: ["Utilisez %f pour les nombres décimaux et %d pour les entiers.", "Assurez-vous que chaque format correspond au type de sa variable."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning : variable lue avant son initialisation (used uninitialized)",
    explain: "La variable {v} est lue avant de recevoir une valeur, si bien que sa valeur est aléatoire.",
    causes: ["Déclaration d'une variable sans valeur initiale.", "Affectation de la valeur uniquement dans un chemin conditionnel."],
    fixes: ["Donnez une valeur initiale à la variable lors de sa déclaration.", "Assurez-vous que tous les chemins lui affectent une valeur."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error : fichier inclus introuvable (No such file or directory)",
    explain: "Le fichier demandé par #include, {f}, est introuvable dans les chemins de recherche.",
    causes: ["Nom de fichier mal orthographié.", "Le fichier ne se trouve pas dans le même dossier ni dans les chemins du compilateur.", "Le fichier d'en-tête de la bibliothèque n'est pas installé."],
    fixes: ["Corrigez le nom du fichier dans #include.", "Utilisez \" \" pour les fichiers locaux et < > pour les bibliothèques système."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing : exception non interceptée",
    explain: "L'exception {ex} a été lancée sans être interceptée par aucun catch, ce qui a mis fin au programme. Cela arrive souvent lorsque l'on dépasse les bornes d'un vector ou d'une string avec at().",
    causes: ["Utilisation de at() avec un indice hors des limites.", "Exception lancée sans try et catch."],
    fixes: ["Vérifiez l'indice avant d'utiliser at().", "Placez le code susceptible de lancer une exception dans un bloc try et catch."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103 : le nom n'existe pas dans le contexte actuel",
    explain: "La variable ou la fonction {n} n'est pas définie dans ce contexte.",
    causes: ["Faute de frappe dans le nom.", "La variable est définie dans un autre bloc ou une autre fonction.", "Vous avez oublié de définir la variable."],
    fixes: ["Définissez la variable avant de l'utiliser.", "Vérifiez que la casse du nom correspond."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002 : point-virgule ; attendu",
    explain: "Oubli du point-virgule ; à la fin de l'instruction, que C# exige.",
    causes: ["Oubli de ; après une instruction ou une déclaration.", "Ligne qui se termine de façon incomplète."],
    fixes: ["Ajoutez ; à la fin de la ligne indiquée ou de la précédente."],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029 : conversion implicite impossible entre les deux types",
    explain: "C# ne convertit pas automatiquement de {a} vers {b}, car la conversion peut faire perdre des données ou parce que les types sont incompatibles.",
    causes: ["Affectation d'un texte à une variable numérique.", "Affectation d'un nombre décimal à une variable entière."],
    fixes: ["Convertissez la valeur explicitement, par exemple avec int.Parse pour un texte.", "Changez le type de la variable pour qu'il corresponde à la valeur."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161 : la fonction ne renvoie pas de valeur dans tous les chemins",
    explain: "La fonction doit renvoyer une valeur dans tous les chemins possibles, or il existe ici un chemin qui se termine sans return.",
    causes: ["return uniquement dans un if.", "Oubli de return à la fin de la fonction."],
    fixes: ["Ajoutez return à la fin de la fonction.", "Ajoutez un else qui renvoie une valeur pour l'autre cas."],
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
    title: "CS0246 : type ou espace de noms introuvable",
    explain: "C# n'a pas trouvé le type ou l'espace de noms {t}, probablement parce que vous n'avez pas écrit le using approprié ou que vous n'avez pas ajouté la bibliothèque.",
    causes: ["Oubli du using pour l'espace de noms, comme System.Collections.Generic.", "Faute d'orthographe dans le nom du type."],
    fixes: ["Ajoutez le using approprié en haut du fichier.", "Vérifiez le nom du type et ajoutez le paquet s'il provient d'une bibliothèque externe."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165 : variable locale utilisée avant affectation",
    explain: "La variable locale {v} est utilisée avant de recevoir une valeur.",
    causes: ["Déclaration de la variable sans valeur puis lecture.", "Affectation de la valeur uniquement dans un if."],
    fixes: ["Donnez une valeur initiale à la variable lors de sa déclaration.", "Assurez-vous que tous les chemins lui affectent une valeur."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120 : un objet est requis pour accéder à un membre non static",
    explain: "{m} est un membre non static qui nécessite un objet pour être utilisé ; il ne peut pas être atteint directement depuis une méthode static.",
    causes: ["Utilisation d'un membre ordinaire dans une méthode static.", "Oubli de créer un objet de la classe."],
    fixes: ["Rendez le membre static s'il doit être partagé.", "Ou créez un objet de la classe et utilisez le membre à travers lui."],
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
    title: "NullReferenceException : référence nulle (null)",
    explain: "Vous tentez d'utiliser un objet dont la valeur est null, c'est-à-dire qui n'a pas été créé ou à qui null a été affecté.",
    causes: ["Variable de texte valant null, puis lecture de Length.", "Objet non créé avec new.", "Un dictionnaire a renvoyé null pour une clé inexistante."],
    fixes: ["Vérifiez null avant l'utilisation avec if (x != null) ou avec ?.", "Créez l'objet avant de l'utiliser."],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException : indice hors des limites du tableau",
    explain: "Vous avez tenté d'accéder à un indice hors du tableau ; les indices commencent à 0 et se terminent à la longueur - 1.",
    causes: ["L'indice est égal à la longueur du tableau.", "Boucle qui dépasse le dernier élément."],
    fixes: ["Utilisez des indices de 0 à longueur - 1.", "Utilisez foreach si vous n'avez pas besoin de l'indice."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException : format de texte invalide",
    explain: "Le texte ne correspond pas au format requis pour la conversion, comme int.Parse sur un texte non numérique.",
    causes: ["Texte contenant des lettres lors de la conversion en nombre.", "Texte vide lors de la conversion."],
    fixes: ["Utilisez int.TryParse pour vérifier avant la conversion.", "Vérifiez la saisie avant de la convertir."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException : conversion de type invalide",
    explain: "Vous avez tenté de convertir un objet de type {a} en {b}, alors qu'il n'en est pas un.",
    causes: ["Conversion d'un object vers un type qui ne correspond pas à la valeur réelle.", "Éléments de types différents dans une collection."],
    fixes: ["Vérifiez le type avec is avant la conversion.", "Utilisez as pour une conversion sûre."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException : division par zéro",
    explain: "Division d'un entier par zéro, ce qui lève une exception en C#.",
    causes: ["Le dénominateur est une variable dont la valeur est zéro.", "Calcul de la moyenne d'un ensemble vide."],
    fixes: ["Vérifiez que le dénominateur n'est pas égal à zéro.", "Utilisez double si le calcul peut produire des fractions."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
