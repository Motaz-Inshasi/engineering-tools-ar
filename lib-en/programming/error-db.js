export const ERROR_DB = [
  {
    lang: "python", id: "py-name-error",
    pattern: /NameError: name '(?<name>[^']+)' is not defined/,
    title: "NameError: name is not defined",
    explain: "You are using the name {name}, but it was not defined earlier in this scope, or you wrote it differently from its definition.",
    causes: ["The variable was never assigned a value.", "A spelling mistake in the name.", "Using the variable before defining it, or outside the function where it was defined."],
    fixes: ["Define the variable and assign it a value before using it.", "Make sure the name matches exactly, letter by letter, because Python is case-sensitive."],
    bad: `print(totl)
total = 5`,
    good: `total = 5
print(total)`
  },
  {
    lang: "python", id: "py-invalid-syntax",
    pattern: /SyntaxError: invalid syntax/,
    title: "SyntaxError: invalid syntax",
    explain: "Python found a word or symbol in a place the language rules do not allow. The real error is often before the line mentioned.",
    causes: ["Forgetting a comma, bracket, or symbol between two items.", "Using = instead of == inside a condition.", "Writing a reserved word as a variable name."],
    fixes: ["Check the mentioned line and the one before it for a missing bracket or comma.", "Use == for comparison and = for assignment."],
    bad: `if x = 5:
    print(x)`,
    good: `if x == 5:
    print(x)`
  },
  {
    lang: "python", id: "py-expected-colon",
    pattern: /SyntaxError: expected ':'/,
    title: "SyntaxError: expected ':'",
    explain: "A compound statement such as if, for, while or def needs a colon : at the end of its line.",
    causes: ["Forgetting the colon : after the condition or the function name."],
    fixes: ["Add : at the end of the compound statement line, before the indented block."],
    bad: `if x > 5
    print(x)`,
    good: `if x > 5:
    print(x)`
  },
  {
    lang: "python", id: "py-unterminated-string",
    pattern: /SyntaxError: unterminated string literal/,
    title: "SyntaxError: unterminated string literal",
    explain: "You started a string with a quote mark and did not close it on the same line.",
    causes: ["Forgetting the quote mark at the end of the text.", "Using two different quote marks for opening and closing."],
    fixes: ["Close the string with the same quote mark you opened it with.", "For multi-line strings, use \"\"\" \"\"\"."],
    bad: `print("hello)`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-eol-string",
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "SyntaxError: end of line while scanning a string (EOL while scanning)",
    explain: "Python reached the end of the line while still reading a string that was not closed.",
    causes: ["A missing quote mark at the end of the text.", "A \\ at the end of the line breaks the closing quote."],
    fixes: ["Add the appropriate closing quote mark.", "Update Python or use multi-line strings with \"\"\"."],
    bad: `print("hi)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-unexpected-eof",
    pattern: /SyntaxError: unexpected EOF while parsing/,
    title: "SyntaxError: unexpected end of file (unexpected EOF)",
    explain: "The file ended while Python was still waiting to complete a statement, usually a bracket or list that was not closed.",
    causes: ["A list, bracket, or statement left unfinished in the middle.", "Forgetting to close the last bracket in the file."],
    fixes: ["Complete the statement and close all open brackets.", "Check the last line of the file."],
    bad: `x = [1, 2, 3`,
    good: `x = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-paren-not-closed",
    pattern: /SyntaxError: '(?<br>[(\[{])' was never closed/,
    title: "SyntaxError: bracket was never closed",
    explain: "You opened the bracket {br} and did not close it with its matching bracket.",
    causes: ["Forgetting the closing bracket.", "A closing bracket in the wrong place makes the interpreter look for another one."],
    fixes: ["Add the appropriate closing bracket.", "Use an editor that colors matching brackets."],
    bad: `print((1 + 2)`,
    good: `print((1 + 2))`
  },
  {
    lang: "python", id: "py-unmatched-paren",
    pattern: /SyntaxError: unmatched '(?<br>[)\]}])'/,
    title: "SyntaxError: unmatched closing bracket",
    explain: "You found the closing bracket {br} with no matching opening bracket.",
    causes: ["An extra bracket at the end of the line.", "Forgetting the opening bracket at the start of the statement."],
    fixes: ["Delete the extra bracket.", "Make sure every opening bracket has a closing one."],
    bad: `print(1))`,
    good: `print(1)`
  },
  {
    lang: "python", id: "py-invalid-character",
    pattern: /SyntaxError: invalid character/,
    title: "SyntaxError: invalid character",
    explain: "Python found a symbol that is not accepted in code, usually a smart or Arabic quote mark such as “ ” or an unusual character.",
    causes: ["Copying code from a document that converts quote marks into smart quotes.", "Typing an Arabic comma ، or an Arabic dot instead of the Latin one."],
    fixes: ["Replace smart quotes with regular \" or ' quote marks.", "Replace the Arabic comma with an English comma ,."],
    bad: `print(“hi”)`,
    good: `print("hi")`
  },
  {
    lang: "python", id: "py-fstring",
    pattern: /SyntaxError: f-string: (?<detail>[^\n]+)/,
    title: "SyntaxError: error in f-string",
    explain: "The f-string syntax is invalid: {detail}.",
    causes: ["A { bracket is not closed inside the text.", "Using the same quote mark inside an f-string."],
    fixes: ["Close every { bracket with }.", "Use a different quote mark inside the expression, or use the syntax suitable for your Python version."],
    bad: `print(f"{x")`,
    good: `print(f"{x}")`
  },
  {
    lang: "python", id: "py-cannot-assign-literal",
    pattern: /SyntaxError: cannot assign to literal/,
    title: "SyntaxError: cannot assign to literal",
    explain: "You tried to assign a value to a fixed number or text, but assignment needs a variable name.",
    causes: ["Putting the number or text on the assignment side by mistake.", "Confusing == and = in a condition."],
    fixes: ["Put the variable name on the left side of =.", "Use == when comparing."],
    bad: `5 = x`,
    good: `x = 5`
  },
  {
    lang: "python", id: "py-cannot-assign-call",
    pattern: /SyntaxError: cannot assign to function call/,
    title: "SyntaxError: cannot assign to function call",
    explain: "You put a function call on the assignment side, but the left side must be a variable name.",
    causes: ["Writing () after a variable name on the assignment side.", "Forgetting ==, so you wrote = inside a condition."],
    fixes: ["Compute the value first, then assign it to a variable.", "Use == for comparison."],
    bad: `len(items) = 5`,
    good: `count = len(items)`
  },
  {
    lang: "python", id: "py-print-parens",
    pattern: /SyntaxError: Missing parentheses in call to 'print'/,
    title: "SyntaxError: missing parentheses in print call",
    explain: "You wrote print in Python 2 style without parentheses, but Python 3 requires them.",
    causes: ["Copying an old example written in Python 2 syntax.", "Forgetting the parentheses in print."],
    fixes: ["Put the text or value inside the parentheses of print(...)."],
    bad: `print "hello"`,
    good: `print("hello")`
  },
  {
    lang: "python", id: "py-indent-expected",
    pattern: /IndentationError: expected an indented block/,
    title: "IndentationError: expected an indented block",
    explain: "The previous line ends with a colon :, so the code after it must be indented, but it is not.",
    causes: ["Forgetting the indentation under if, for, or def.", "A completely empty block after the colon."],
    fixes: ["Indent the next line by four spaces.", "If the block is empty, use pass."],
    bad: `if x:
print(x)`,
    good: `if x:
    print(x)`
  },
  {
    lang: "python", id: "py-unexpected-indent",
    pattern: /IndentationError: unexpected indent/,
    title: "IndentationError: unexpected indent",
    explain: "Python found a line indented without a reason, meaning it does not follow a compound statement.",
    causes: ["Extra spaces at the start of the line.", "A line copied from another place with different indentation."],
    fixes: ["Remove the extra spaces at the start of the line.", "Make sure all lines at the same level have the same indentation."],
    bad: `x = 1
    y = 2`,
    good: `x = 1
y = 2`
  },
  {
    lang: "python", id: "py-unindent-mismatch",
    pattern: /IndentationError: unindent does not match any outer indentation level/,
    title: "IndentationError: unindent does not match any outer indentation level",
    explain: "The indentation of this line does not equal any previous indentation level, so Python does not know where it belongs.",
    causes: ["Mixing the number of spaces between lines.", "Copying code with different indentation."],
    fixes: ["Make every level of code use a fixed number of spaces (4 spaces).", "Use an editor that shows spaces."],
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
    title: "TabError: mixing tabs and spaces",
    explain: "You sometimes used the Tab key and sometimes spaces for indentation, and Python rejects this mixing.",
    causes: ["Some lines start with Tab and others with spaces.", "Editor settings convert Tab differently."],
    fixes: ["Use spaces only (4 spaces per level).", "In the editor, enable converting Tab to spaces."],
    bad: "if x:\n\tprint(x)\n    print(x)",
    good: `if x:
    print(x)
    print(x)`
  },
  {
    lang: "python", id: "py-concat-str-int",
    pattern: /TypeError: can only concatenate str \(not "(?<t>\w+)"\) to str/,
    title: "TypeError: can only concatenate str (cannot join text with a value of another type)",
    explain: "You tried to join text with a value of type {t} using +, and Python does not convert types automatically.",
    causes: ["Using + between text and a number.", "A value coming from input(), which is always text."],
    fixes: ["Convert the number to text using str().", "Or put the number inside an f-string so it converts to text automatically."],
    bad: `print("Age: " + 20)`,
    good: `print("Age: " + str(20))`
  },
  {
    lang: "python", id: "py-unsupported-operand",
    pattern: /TypeError: unsupported operand type\(s\) for (?<op>[^:\n]+): '(?<a>\w+)' and '(?<b>\w+)'/,
    title: "TypeError: unsupported operand type(s)",
    explain: "The operator {op} does not accept the types {a} and {b} together.",
    causes: ["Text with a number in a calculation.", "A None value inside a calculation."],
    fixes: ["Convert the text to a number using int() or float().", "Make sure the variables hold numeric values before the calculation."],
    bad: `x = "5" - 2`,
    good: `x = int("5") - 2`
  },
  {
    lang: "python", id: "py-nonetype-subscript",
    pattern: /TypeError: 'NoneType' object is not subscriptable/,
    title: "TypeError: cannot index NoneType (not subscriptable)",
    explain: "The variable's value is None (meaning nothing), and you are trying to access an element from it using brackets [].",
    causes: ["A function that returns nothing because it has no return statement.", "A variable that did not get a value, or came from a failed operation."],
    fixes: ["Make sure the function returns a value using return.", "Check that the value is not None before indexing it."],
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
    title: "AttributeError: object has no attribute",
    explain: "The object of type {type} does not have the attribute or method {attr}.",
    causes: ["The method or attribute name is misspelled.", "Using a method that belongs to another type, such as append on a string.", "The variable's value is None."],
    fixes: ["Check the object's type using type().", "Check the documentation of the type to see the methods available for it."],
    bad: `name = "ali"
name.append("x")`,
    good: `names = ["ali"]
names.append("x")`
  },
  {
    lang: "python", id: "py-not-callable",
    pattern: /TypeError: '(?<t>[^']+)' object is not callable/,
    title: "TypeError: object is not callable",
    explain: "You tried to call a value of type {t} as if it were a function by adding parentheses ().",
    causes: ["Adding () after the name of a variable that holds a value.", "Hiding the name of a built-in function with a variable, such as str = 5."],
    fixes: ["Rename the variable so it does not shadow the built-in function name.", "Make sure you are really calling a function."],
    bad: `str = 5
print(str(3))`,
    good: `valor = 5
print(str(3))`
  },
  {
    lang: "python", id: "py-missing-arg",
    pattern: /TypeError: (?<fn>[\w.<>]+)\(\) missing (?<n>\d+) required positional argument/,
    title: "TypeError: missing required positional argument",
    explain: "The function {fn} needs {n} more argument(s) that you did not pass in the call.",
    causes: ["Calling the function without passing the required argument.", "The function definition requires a parameter you do not need."],
    fixes: ["Pass the missing values in the call.", "Give the parameter a default value in the function definition if it is optional."],
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
    title: "TypeError: too many positional arguments (takes positional arguments but given)",
    explain: "The function {fn} accepts only {n} argument(s), but you passed {m}.",
    causes: ["Passing more values than the number of parameters in the definition.", "The function definition does not have the parameter you are passing."],
    fixes: ["Remove the extra values from the call.", "Add the missing parameter to the function definition."],
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
    title: "TypeError: object is not iterable",
    explain: "You tried to loop over a value of type {t} with a for loop or unpacking, and this type is not iterable.",
    causes: ["You forgot to use range() with the number in the loop.", "A function that returns no values, so the result is None."],
    fixes: ["Use range(n) to loop over a number.", "Make sure the variable is a list, a string, or a collection before looping."],
    bad: `for i in 5:
    print(i)`,
    good: `for i in range(5):
    print(i)`
  },
  {
    lang: "python", id: "py-list-indices",
    pattern: /TypeError: list indices must be integers or slices, not (?<t>\w+)/,
    title: "TypeError: list indices must be integers",
    explain: "A list index must be an integer, but you used a value of type {t}.",
    causes: ["Writing the index as text, such as '1'.", "Calculating the index with / division, which produces a decimal number."],
    fixes: ["Use an integer without quote marks.", "Use // instead of / when calculating the index."],
    bad: `nums = [1, 2, 3]
print(nums['1'])`,
    good: `nums = [1, 2, 3]
print(nums[1])`
  },
  {
    lang: "python", id: "py-int-literal",
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(?<v>[^']*)'/,
    title: "ValueError: invalid literal for int()",
    explain: "The int() function could not convert the text '{v}' to an integer.",
    causes: ["The text contains letters or non-numeric symbols.", "The text is a decimal number such as 3.5.", "The text is empty."],
    fixes: ["Use float() for decimal numbers.", "Check the input before converting, or use try and except."],
    bad: `n = int("3.5")`,
    good: `n = float("3.5")`
  },
  {
    lang: "python", id: "py-too-many-values",
    pattern: /ValueError: too many values to unpack \(expected (?<n>\d+)\)/,
    title: "ValueError: too many values to unpack",
    explain: "The unpacking has only {n} variables, while the list contains more values than that.",
    causes: ["There are fewer variable names than items.", "A list longer than you expected."],
    fixes: ["Increase the number of variables to match the number of items.", "Use *rest to collect the extra items."],
    bad: `a, b = [1, 2, 3]`,
    good: `a, b, c = [1, 2, 3]`
  },
  {
    lang: "python", id: "py-not-enough-values",
    pattern: /ValueError: not enough values to unpack \(expected (?<n>\d+), got (?<g>\d+)\)/,
    title: "ValueError: not enough values to unpack",
    explain: "You are trying to unpack the values into {n} variables, but the list contains only {g} items.",
    causes: ["There are more variables than items.", "A function that returns fewer items than you expected."],
    fixes: ["Reduce the number of variables to match the number of items.", "Check the length of the list before unpacking."],
    bad: `a, b, c = [1, 2]`,
    good: `a, b = [1, 2]`
  },
  {
    lang: "python", id: "py-index-out-of-range",
    pattern: /IndexError: list index out of range/,
    title: "IndexError: list index out of range",
    explain: "You are trying to access a position that does not exist in the list. Remember that indexing starts at 0 and ends at length - 1.",
    causes: ["The index equals the length of the list or is greater than it.", "A loop that goes past the last item in the list."],
    fixes: ["Use an index between 0 and len(list) - 1.", "In loops, use for x in list instead of indexing."],
    bad: `a = [1, 2, 3]
print(a[3])`,
    good: `a = [1, 2, 3]
print(a[2])`
  },
  {
    lang: "python", id: "py-key-error",
    pattern: /KeyError: (?<key>[^\n]+)/,
    title: "KeyError: key not found in the dictionary",
    explain: "The dictionary does not contain the key {key}, so access using brackets [] failed.",
    causes: ["The key is written differently from the stored key.", "The key has not been added to the dictionary yet."],
    fixes: ["Use get() with a default value.", "Check that the key exists with the in expression before accessing it."],
    bad: `d = {"a": 1}
print(d["b"])`,
    good: `d = {"a": 1}
print(d.get("b", 0))`
  },
  {
    lang: "python", id: "py-zero-division",
    pattern: /ZeroDivisionError: /,
    title: "ZeroDivisionError: division by zero",
    explain: "You tried to divide by zero, which is mathematically undefined.",
    causes: ["The denominator is a variable whose value is zero without being checked.", "Calculating the average of an empty list."],
    fixes: ["Check that the denominator is not zero before dividing.", "Add a condition that handles the special case."],
    bad: `x = 10 / 0`,
    good: `d = 2
x = 10 / d`
  },
  {
    lang: "python", id: "py-module-not-found",
    pattern: /ModuleNotFoundError: No module named '(?<mod>[^']+)'/,
    title: "ModuleNotFoundError: no module named",
    explain: "The module {mod} is not installed, or its name in the import differs from the package name.",
    causes: ["You have not installed the module yet.", "You are running Python from a different environment than the one where the module was installed.", "The import name differs from the package name, such as cv2 for the opencv package."],
    fixes: ["Install the module with the command pip install module_name.", "Make sure the module is installed for the same Python version you use to run the code."],
    bad: `import numpyy`,
    good: `import numpy`
  },
  {
    lang: "python", id: "py-import-error",
    pattern: /ImportError: cannot import name '(?<name>[^']+)'/,
    title: "ImportError: cannot import name",
    explain: "The module exists, but the name {name} is not defined in it.",
    causes: ["The function name is misspelled.", "A local file that has the same name as a standard library module, such as random.py.", "The function exists in another version of the module."],
    fixes: ["Check the module documentation to confirm the correct name.", "Rename the local file that matches the name of a standard library module."],
    bad: `from math import sqroot`,
    good: `from math import sqrt`
  },
  {
    lang: "python", id: "py-file-not-found",
    pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: '(?<path>[^']+)'/,
    title: "FileNotFoundError: No such file or directory",
    explain: "The file {path} does not exist in the directory the program runs from.",
    causes: ["The file name or extension is misspelled.", "The working directory is not the folder that contains the file."],
    fixes: ["Check the file name and extension.", "Use a full path or check the working directory."],
    bad: `f = open("data.txt")`,
    good: `f = open("data.txt", encoding="utf-8")`
  },
  {
    lang: "python", id: "py-recursion-error",
    pattern: /RecursionError: maximum recursion depth exceeded/,
    title: "RecursionError: maximum recursion depth exceeded",
    explain: "The function keeps calling itself without stopping, so the number of calls exceeds the allowed limit.",
    causes: ["A missing stop condition in the recursive function.", "The stop condition is never met because of a logic error."],
    fixes: ["Add a clear stop condition at the start of the function.", "Convert the solution into a while or for loop."],
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
    title: "UnboundLocalError: cannot access local variable before assignment",
    explain: "You use the variable {name} inside a function before assigning it a value in that function.",
    causes: ["Modifying a variable from outside the function inside it without a global declaration.", "Assigning a value to the variable inside the function after using it."],
    fixes: ["Pass the variable to the function as a parameter and return its value.", "Or use global if you need to modify the global variable."],
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
    title: "StopIteration: no more items",
    explain: "The iterator reached its end and has no more items, usually happening with next().",
    causes: ["Calling next() more times than there are items.", "Reusing an iterator that has already finished."],
    fixes: ["Use next(it, None) to specify a value when it finishes.", "Use a for loop instead of calling next() manually."],
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
    title: "UnicodeDecodeError: can't decode byte",
    explain: "The file is not encoded in {codec}, which is the encoding you are trying to read it with.",
    causes: ["The file is saved in UTF-8 encoding, while Python reads it with another default encoding.", "The file is binary, like an image, and not text."],
    fixes: ["Add encoding=\"utf-8\" when opening the file.", "If the file is binary, open it in \"rb\" mode."],
    bad: `text = open("a.txt").read()`,
    good: `text = open("a.txt", encoding="utf-8").read()`
  },
  {
    lang: "python", id: "py-overflow-error",
    pattern: /OverflowError: (?<msg>[^\n]+)/,
    title: "OverflowError: numerical result out of range",
    explain: "The value is larger than the limit the function can handle: {msg}.",
    causes: ["A very large exponential calculation such as exp(1000).", "Converting a very huge number to a decimal number."],
    fixes: ["Reduce the size of the values in the calculation.", "Use a big-number library or smaller values."],
    bad: `import math
print(math.exp(1000))`,
    good: `import math
print(math.exp(10))`
  },
  {
    lang: "javascript", id: "js-ref-not-defined",
    pattern: /ReferenceError: (?<name>[^\s]+) is not defined/,
    title: "ReferenceError: variable is not defined",
    explain: "You are using {name} but did not define it in this scope, or you wrote its name differently from its definition.",
    causes: ["You forgot the keyword let, const, or var before the declaration.", "A spelling mistake in the name.", "The variable is defined inside another function, so it is not visible here.", "The script file or library that defines the name was not loaded."],
    fixes: ["Declare the variable with let or const before using it.", "Make sure the letter case of the name matches, and that the required file is loaded before the code."],
    bad: `console.log(totl);
let total = 5;`,
    good: `let total = 5;
console.log(total);`
  },
  {
    lang: "javascript", id: "js-before-init",
    pattern: /ReferenceError: Cannot access '(?<name>[^']+)' before initialization/,
    title: "ReferenceError: access before initialization",
    explain: "You used {name} before the line where you declared it. let and const variables are not hoisted to the top of the code as var is.",
    causes: ["Using the variable on a line above its declaration.", "A function that calls a variable that has not been created yet."],
    fixes: ["Move the declaration to before its first use.", "Use the function after initializing the variables it depends on."],
    bad: `console.log(a);
const a = 1;`,
    good: `const a = 1;
console.log(a);`
  },
  {
    lang: "javascript", id: "js-read-props",
    pattern: /TypeError: Cannot read properties of (?<t>undefined|null) \(reading '(?<p>[^']*)'\)/,
    title: "TypeError: Cannot read properties of undefined",
    explain: "You tried to read the property '{p}' from a value of type {t}, but the value does not exist at that moment.",
    causes: ["A variable that has not been assigned a value yet.", "A DOM element does not exist, such as getElementById with a wrong ID.", "Data has not arrived yet from the server or from an asynchronous function.", "A function that returns nothing, so the result is undefined."],
    fixes: ["Check the value before accessing it with if, or with the ?. operator such as obj?.name.", "Make sure the element exists on the page before using it."],
    bad: `const user = undefined;
console.log(user.name);`,
    good: `const user = { name: "Ali" };
console.log(user?.name);`
  },
  {
    lang: "javascript", id: "js-set-props",
    pattern: /TypeError: Cannot set properties of (?<t>undefined|null) \(setting '(?<p>[^']*)'\)/,
    title: "TypeError: Cannot set properties of undefined",
    explain: "You tried to write the property '{p}' on a value of type {t}, but the object has not been created yet.",
    causes: ["Declaring an object variable without giving it a value {}.", "An object that came from a function that returns nothing."],
    fixes: ["Create the object first with {} or the appropriate syntax.", "Make sure the variable holds an object before writing to it."],
    bad: `let obj;
obj.name = "Ali";`,
    good: `let obj = {};
obj.name = "Ali";`
  },
  {
    lang: "javascript", id: "js-not-function",
    pattern: /TypeError: (?<fn>[^\s]+) is not a function/,
    title: "TypeError: is not a function",
    explain: "You tried to call {fn} with parentheses (), but it is not a function.",
    causes: ["The function name is misspelled.", "The function has not been defined yet or was not imported.", "The module returns a value of another kind, such as an export default instead of a function."],
    fixes: ["Check the spelling of the name and the function definition before calling it.", "Check the type of the value with typeof before calling it."],
    bad: `const n = 5;
n();`,
    good: `const f = () => 5;
f();`
  },
  {
    lang: "javascript", id: "js-not-iterable",
    pattern: /TypeError: (?<x>[^\s]+) is not iterable/,
    title: "TypeError: value is not iterable",
    explain: "You tried to loop over {x} with a for...of loop or spread [...], but this value is not iterable.",
    causes: ["Using a plain object {} in a for...of loop.", "A function that does not return an array, so the result is undefined."],
    fixes: ["Use Object.keys, Object.values or Object.entries with the object.", "Make sure the value is an array, a string, or a Map before iterating."],
    bad: `const obj = { a: 1 };
for (const x of obj) {}`,
    good: `const obj = { a: 1 };
for (const k of Object.keys(obj)) {}`
  },
  {
    lang: "javascript", id: "js-const-assign",
    pattern: /TypeError: Assignment to constant variable/,
    title: "TypeError: Assignment to constant variable",
    explain: "Variables declared with const cannot have their value changed after the declaration.",
    causes: ["Using const for a variable that will change later.", "Forgetting that the value is constant when reassigning."],
    fixes: ["Use let if you are going to change the value.", "Create a new variable instead of modifying the constant."],
    bad: `const x = 1;
x = 2;`,
    good: `let x = 1;
x = 2;`
  },
  {
    lang: "javascript", id: "js-unexpected-token",
    pattern: /SyntaxError: Unexpected token/,
    title: "SyntaxError: Unexpected token",
    explain: "JavaScript found a symbol or keyword in a position the rules do not allow, and the cause is often a little before the line mentioned.",
    causes: ["An extra or missing bracket or comma.", "A reserved word used as a name.", "Code inside a function that was not closed correctly."],
    fixes: ["Check the brackets and commas in the line and the one before it.", "Use an editor that shows errors and matches brackets."],
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
    title: "SyntaxError: text is not valid JSON",
    explain: "JSON.parse is trying to read text that is not in valid JSON format, and it often receives HTML instead of data.",
    causes: ["The server returned an HTML page, such as a 404 error page, instead of JSON.", "The JSON has an extra comma or single quote marks."],
    fixes: ["Print the raw text before parsing and check its content.", "Use double quote marks for keys and strings in JSON."],
    bad: `JSON.parse("{name: 'Ali'}");`,
    good: `JSON.parse('{"name": "Ali"}');`
  },
  {
    lang: "javascript", id: "js-unexpected-end",
    pattern: /SyntaxError: Unexpected end of input/,
    title: "SyntaxError: Unexpected end of input",
    explain: "The file or block ended while JavaScript was still waiting for a bracket or brace to be closed.",
    causes: ["A { or ( bracket without a closing one.", "Copying part of the code and ignoring its end."],
    fixes: ["Close every bracket you opened.", "Use an editor that matches open and closed brackets."],
    bad: `function f() {
  return 1;`,
    good: `function f() {
  return 1;
}`
  },
  {
    lang: "javascript", id: "js-missing-paren",
    pattern: /SyntaxError: missing \) after argument list/,
    title: "SyntaxError: missing ')' after argument list",
    explain: "The function call was not closed with ) before the semicolon or the end of the line.",
    causes: ["Forgetting the closing bracket at the end of the call.", "An unclosed quote mark inside the arguments."],
    fixes: ["Add ) before the semicolon.", "Make sure all quote marks inside the call are closed."],
    bad: `console.log('hi';`,
    good: `console.log('hi');`
  },
  {
    lang: "javascript", id: "js-unexpected-identifier",
    pattern: /SyntaxError: Unexpected identifier/,
    title: "SyntaxError: Unexpected identifier",
    explain: "JavaScript found a name after a value or expression with no semicolon separating them, usually because a line is missing its semicolon.",
    causes: ["Forgetting ; at the end of the previous line.", "Writing two names in a row without a symbol separating them."],
    fixes: ["Add ; at the end of each statement.", "Put each declaration on a separate line."],
    bad: `const x = 1 y = 2;`,
    good: `const x = 1;
const y = 2;`
  },
  {
    lang: "javascript", id: "js-invalid-token",
    pattern: /SyntaxError: Invalid or unexpected token/,
    title: "SyntaxError: Invalid or unexpected token",
    explain: "JavaScript found a symbol not accepted in the code, usually a smart quote mark or an invisible character.",
    causes: ["Copying code from a document that converts quote marks into smart quotes.", "A quote mark that was not closed correctly."],
    fixes: ["Replace smart quotes with regular \" or ' quote marks.", "Make sure every string is closed with the same quote mark."],
    bad: `const s = “hello”;`,
    good: `const s = "hello";`
  },
  {
    lang: "javascript", id: "js-redeclared",
    pattern: /SyntaxError: Identifier '(?<name>[^']+)' has already been declared/,
    title: "SyntaxError: Identifier has already been declared",
    explain: "You declared {name} more than once in the same scope using let or const.",
    causes: ["Copying a declaration line without deleting the old one.", "Two variables with the same name in the same file."],
    fixes: ["Delete the extra declaration or rename it.", "Use reassignment without let if you want to change the value."],
    bad: `let a = 1;
let a = 2;`,
    good: `let a = 1;
a = 2;`
  },
  {
    lang: "javascript", id: "js-await-outside-async",
    pattern: /SyntaxError: await is only valid/,
    title: "SyntaxError: await outside an async function",
    explain: "You used the keyword await where it is not allowed. It works only inside an async function or at the top level of an ES module.",
    causes: ["Forgetting the async keyword before the function.", "Using await inside a regular function or a regular event handler."],
    fixes: ["Make the function async.", "Or use then() directly with the promise."],
    bad: `const d = await fetch("/x");`,
    good: `async function load() {
  const d = await fetch("/x");
  return d;
}`
  },
  {
    lang: "javascript", id: "js-esm-import",
    pattern: /SyntaxError: Cannot use import statement outside a module/,
    title: "SyntaxError: using import outside an ES module",
    explain: "Node.js treats the file as CommonJS, while you are using the import syntax of ES modules.",
    causes: ["The file is run with Node without being declared as a module.", "Copying a modern example without setting up the project configuration."],
    fixes: ["Use require instead of import in CommonJS.", "Or add \"type\": \"module\" in the package.json file."],
    bad: `import fs from "fs";`,
    good: `const fs = require("fs");`
  },
  {
    lang: "javascript", id: "js-max-call-stack",
    pattern: /RangeError: Maximum call stack size exceeded/,
    title: "RangeError: Maximum call stack size exceeded",
    explain: "The function keeps calling itself without stopping, so the call stack fills up.",
    causes: ["A missing stop condition in the recursive function.", "Two functions that call each other endlessly."],
    fixes: ["Add a clear stop condition.", "Convert the solution into a while or for loop."],
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
    title: "RangeError: Invalid array length",
    explain: "The array length must be a positive integer within a certain limit.",
    causes: ["Passing a negative number to Array.", "Passing a decimal or non-numeric value as the array length."],
    fixes: ["Make sure the length is a positive integer.", "Check the value before creating the array."],
    bad: `const a = new Array(-1);`,
    good: `const a = new Array(3);`
  },
  {
    lang: "javascript", id: "js-uncaught-promise",
    pattern: /Uncaught \(in promise\)|UnhandledPromiseRejection/,
    title: "Uncaught (in promise): Unhandled rejected promise",
    explain: "A Promise failed, and you did not add a catch or use try and catch with await to handle the error.",
    causes: ["Using then without catch.", "Calling an async function without await or catch."],
    fixes: ["Add .catch() after the then chain.", "Wrap the await code in try and catch."],
    bad: `fetch("/x").then((r) => r.json());`,
    good: `fetch("/x").then((r) => r.json()).catch(console.error);`
  },
  {
    lang: "javascript", id: "js-cors",
    pattern: /blocked by CORS policy/,
    title: "CORS: the request was blocked by the cross-origin sharing policy",
    explain: "The browser blocked the request because the server did not allow access from this origin, or because the page was opened from file://.",
    causes: ["The server does not send the Access-Control-Allow-Origin header.", "The page is opened directly from the file instead of a local server."],
    fixes: ["Enable CORS on the server to allow the required origin.", "Run the project through a local server instead of opening the file directly."],
    bad: `fetch("https://api.example.com/data");`,
    good: `fetch("/api/data");`
  },
  {
    lang: "javascript", id: "js-failed-fetch",
    pattern: /Failed to fetch|NetworkError when attempting to fetch/,
    title: "TypeError: Failed to fetch",
    explain: "The request did not reach the server. The network may be down, the address may be wrong, the server may be stopped, or CORS may be blocking it.",
    causes: ["The server is stopped or the address is misspelled.", "The internet connection is down.", "A CORS policy is blocking the request."],
    fixes: ["Open the address in the browser to check that it works.", "Check the Network tab in the developer tools and verify CORS."],
    bad: `fetch("http://localhost:9999/data");`,
    good: `fetch("http://localhost:3000/data");`
  },
  {
    lang: "javascript", id: "js-cannot-find-module",
    pattern: /Error: Cannot find module '(?<mod>[^']+)'/,
    title: "Error: Cannot find module",
    explain: "Node.js cannot find the file or package {mod}.",
    causes: ["The package is not installed in the project.", "The relative path is wrong.", "The file extension is missing or the file does not exist."],
    fixes: ["Install the package with the command npm install package_name.", "Check the relative path and that the file exists."],
    bad: `const x = require("./utils");`,
    good: `const x = require("./utils.js");`
  },
  {
    lang: "javascript", id: "js-eaddrinuse",
    pattern: /EADDRINUSE/,
    title: "EADDRINUSE: Port is already in use",
    explain: "The port you are trying to listen on is busy with another program, and often another copy of the server is already running.",
    causes: ["Running the server twice on the same port.", "Another program is using the port."],
    fixes: ["Stop the other copy of the server.", "Or change the port number."],
    bad: `app.listen(3000);
app.listen(3000);`,
    good: `app.listen(3001);`
  },
  {
    lang: "javascript", id: "js-enoent",
    pattern: /ENOENT: no such file or directory/,
    title: "ENOENT: File or directory does not exist",
    explain: "Node.js tried to open a file or folder that does not exist at the specified path.",
    causes: ["The file name is wrong or its extension is missing.", "The path is relative to a different working folder."],
    fixes: ["Check that the file exists before reading it with fs.existsSync.", "Use a path based on the current file's folder."],
    bad: `fs.readFileSync("data.txt");`,
    good: `if (fs.existsSync("data.txt")) fs.readFileSync("data.txt");`
  },
  {
    lang: "javascript", id: "js-circular-json",
    pattern: /TypeError: Converting circular structure to JSON/,
    title: "TypeError: Converting circular structure to JSON",
    explain: "The object contains a circular reference, meaning it points to itself directly or indirectly, and JSON.stringify cannot convert it.",
    causes: ["An object that has a property pointing to itself.", "A DOM object or a complex object passed to JSON.stringify."],
    fixes: ["Remove the circular property before converting.", "Convert it to a simple object that contains only the required data."],
    bad: `const a = {};
a.self = a;
JSON.stringify(a);`,
    good: `const a = { name: "x" };
JSON.stringify(a);`
  },
  {
    lang: "java", id: "java-cannot-find-symbol",
    pattern: /error: cannot find symbol/,
    title: "error: cannot find symbol",
    explain: "The compiler did not find a variable, method, or class with this name. Look at the symbol line in the message to find the intended name.",
    causes: ["A name with a spelling mistake.", "The variable is defined in another scope.", "Forgetting the import for a class such as ArrayList.", "The variable was never declared."],
    fixes: ["Correct the name according to the symbol line.", "Add the appropriate import, such as import java.util.ArrayList;"],
    bad: `int total = 5;
System.out.println(totl);`,
    good: `int total = 5;
System.out.println(total);`
  },
  {
    lang: "java", id: "java-lossy-conversion",
    pattern: /error: incompatible types: possible lossy conversion from (?<a>\w+) to (?<b>\w+)/,
    title: "error: possible lossy conversion",
    explain: "Converting from {a} to {b} may lose part of the value, such as decimal fractions, so Java rejects it automatically.",
    causes: ["Assigning a decimal number to an integer variable.", "The result of dividing two integers has a fraction."],
    fixes: ["Make the variable a wider type, such as double.", "If the conversion is intended, use an explicit cast such as (int)."],
    bad: `int x = 3.5;`,
    good: `double x = 3.5;`
  },
  {
    lang: "java", id: "java-incompatible-types",
    pattern: /error: incompatible types: (?<a>[^\n]+)/,
    title: "error: incompatible types",
    explain: "You are trying to assign a value that does not match the variable's type: {a}.",
    causes: ["Assigning text to a numeric variable or vice versa.", "Returning a type different from the function's type."],
    fixes: ["Make the value's type match the variable's type.", "Convert the value explicitly if the conversion makes sense."],
    bad: `int x = "5";`,
    good: `int x = 5;`
  },
  {
    lang: "java", id: "java-missing-return",
    pattern: /error: missing return statement/,
    title: "error: missing return statement",
    explain: "The function must return a value on every possible execution path, and here there is a path that returns nothing.",
    causes: ["return only inside an if, with no alternative path.", "Forgetting return at the end of the function."],
    fixes: ["Add a return at the end of the function as a default value.", "Add an else that returns a value for the other case."],
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
    title: "error: ';' expected",
    explain: "You forgot the semicolon ; at the end of the statement, and Java always requires it.",
    causes: ["Forgetting ; after a statement or declaration.", "The line ends incompletely."],
    fixes: ["Add ; at the end of the mentioned line or the line before it."],
    bad: `int x = 5
System.out.println(x);`,
    good: `int x = 5;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-public-class-file",
    pattern: /class (?<cls>\w+) is public, should be declared in a file named (?<file>[\w.]+)/,
    title: "error: file name does not match the public class (is public, should be declared in a file named)",
    explain: "The public class {cls} must be inside a file named exactly {file}.",
    causes: ["Naming the file differently from the public class.", "Two public classes in one file."],
    fixes: ["Rename the file to match the public class name.", "Or make the class non-public by removing public."],
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
    title: "error: statement cannot be reached (unreachable statement)",
    explain: "There is a line after return, break or throw, so it will never run and the compiler rejects it.",
    causes: ["Writing code right after return.", "A while(true) loop with no break before the following code."],
    fixes: ["Move the line to before return.", "Delete code that never runs."],
    bad: `return 1;
System.out.println("x");`,
    good: `System.out.println("x");
return 1;`
  },
  {
    lang: "java", id: "java-uninitialized",
    pattern: /error: variable (?<v>\w+) might not have been initialized/,
    title: "error: variable may not have been initialized (might not have been initialized)",
    explain: "The variable {v} may not receive a value before it is used in some execution paths.",
    causes: ["Declaring a variable without a value and then using it.", "Assigning the value inside an if without an else."],
    fixes: ["Give the variable an initial value when declared.", "Make sure every path assigns a value to the variable."],
    bad: `int x;
System.out.println(x);`,
    good: `int x = 0;
System.out.println(x);`
  },
  {
    lang: "java", id: "java-static-context",
    pattern: /error: non-static (?:method|variable) (?<m>\w+)(?:\([^)\n]*\))? cannot be referenced from a static context/,
    title: "error: non-static member from static context",
    explain: "{m} is a non-static member, and cannot be used directly from main or any static method without an object.",
    causes: ["Calling a regular method directly from main.", "A regular variable inside a class used from a static method."],
    fixes: ["Make the member static if it is shared.", "Or create an object of the class and call the member through it."],
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
    title: "NullPointerException: null pointer (null)",
    explain: "You are using an object whose value is null, meaning it was not created yet or was assigned null.",
    causes: ["A string variable assigned null, then its method was called.", "An object not created with new.", "Map.get returned null for a key that does not exist."],
    fixes: ["Create the object before using it.", "Check for null with if (x != null) or use Objects.requireNonNull."],
    bad: `String s = null;
System.out.println(s.length());`,
    good: `String s = "hi";
System.out.println(s.length());`
  },
  {
    lang: "java", id: "java-array-index",
    pattern: /java\.lang\.ArrayIndexOutOfBoundsException: Index (?<i>-?\d+) out of bounds for length (?<n>\d+)/,
    title: "ArrayIndexOutOfBoundsException: array index out of bounds",
    explain: "You tried to access index {i} while the array length is {n}. Indexes start at 0 and end at length - 1.",
    causes: ["The index equals the length exactly.", "A loop that goes past the last element."],
    fixes: ["Use an index between 0 and length - 1.", "Use a for-each loop if you do not need the index."],
    bad: `int[] a = new int[3];
a[3] = 5;`,
    good: `int[] a = new int[3];
a[2] = 5;`
  },
  {
    lang: "java", id: "java-string-index",
    pattern: /java\.lang\.StringIndexOutOfBoundsException/,
    title: "StringIndexOutOfBoundsException: string index out of bounds",
    explain: "The requested index in the string is outside its bounds, which happens with charAt or substring.",
    causes: ["Using charAt with an index equal to the string length.", "substring with wrong bounds."],
    fixes: ["Make sure the index is between 0 and string length - 1.", "Check the string length before extracting."],
    bad: `String s = "abc";
System.out.println(s.charAt(3));`,
    good: `String s = "abc";
System.out.println(s.charAt(2));`
  },
  {
    lang: "java", id: "java-arithmetic",
    pattern: /java\.lang\.ArithmeticException: \/ by zero/,
    title: "ArithmeticException: division by zero",
    explain: "Integer division by zero, which is not allowed in Java for integers.",
    causes: ["The divisor is a variable whose value is zero.", "Calculating the average of an empty list."],
    fixes: ["Check that the divisor is not zero.", "Use double if it suits the calculation."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
  {
    lang: "java", id: "java-number-format",
    pattern: /java\.lang\.NumberFormatException: For input string: "(?<v>[^"\n]*)"/,
    title: "NumberFormatException: string does not represent a valid integer",
    explain: "The function could not convert the string «{v}» to a number, because it contains letters or a decimal point.",
    causes: ["A string containing letters or spaces.", "A decimal number converted to int."],
    fixes: ["Use Double.parseDouble for decimal numbers.", "Check the string with matches or try and catch."],
    bad: `int n = Integer.parseInt("3.5");`,
    good: `double n = Double.parseDouble("3.5");`
  },
  {
    lang: "java", id: "java-class-cast",
    pattern: /java\.lang\.ClassCastException: class (?<a>[\w.$]+) cannot be cast to class (?<b>[\w.$]+)/,
    title: "ClassCastException: incompatible type cast",
    explain: "You tried to convert an object of type {a} to {b}, but it is not of that type.",
    causes: ["Converting an Object to a type that does not match the actual object.", "List elements of mixed types."],
    fixes: ["Check the type with instanceof before casting.", "Make sure the value is of the correct type when adding it."],
    bad: `Object o = "hi";
Integer i = (Integer) o;`,
    good: `Object o = 5;
Integer i = (Integer) o;`
  },
  {
    lang: "java", id: "java-input-mismatch",
    pattern: /java\.util\.InputMismatchException/,
    title: "InputMismatchException: input does not match the expected type",
    explain: "The Scanner expected a certain type, such as an integer, but found text or the reverse.",
    causes: ["The user entered letters where a number is expected.", "The order between nextInt and nextLine is incorrect."],
    fixes: ["Check before reading with hasNextInt().", "Read the whole line with nextLine then convert it."],
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
    title: "ConcurrentModificationException: modifying a list while iterating over it",
    explain: "You modified the list while iterating over it with a for-each loop, so Java refused to continue.",
    causes: ["Removing an item from the list inside a for-each loop.", "Adding an item to the list inside the same loop."],
    fixes: ["Use removeIf to remove items.", "Or use an Iterator with its remove method."],
    bad: `for (String s : list) {
  list.remove(s);
}`,
    good: `list.removeIf(s -> s.isEmpty());`
  },
  {
    lang: "java", id: "java-stack-overflow",
    pattern: /java\.lang\.StackOverflowError/,
    title: "StackOverflowError: stack overflow",
    explain: "Infinite recursive call: a function calls itself without an exit condition, so the execution stack overflowed.",
    causes: ["A missing stop condition in the recursive function.", "The stopping condition is never met."],
    fixes: ["Add a clear stop condition at the start of the function.", "Convert the solution to a loop."],
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
    title: "OutOfMemoryError: out of memory",
    explain: "The program requests more memory than is available, usually due to a loop that creates objects endlessly or huge data.",
    causes: ["A loop that keeps adding objects to a list without stopping.", "Loading a huge file entirely into memory."],
    fixes: ["Process the data in small batches.", "Empty lists you no longer need."],
    bad: `List<int[]> list = new ArrayList<>();
while (true) list.add(new int[1000000]);`,
    good: `for (int i = 0; i < 10; i++) {
  int[] chunk = new int[1000];
}`
  },
  {
    lang: "java", id: "java-unreported-exception",
    pattern: /error: unreported exception (?<e>[\w.]+); must be caught or declared to be thrown/,
    title: "error: unhandled exception (unreported exception)",
    explain: "The function throws the exception {e}, which is of the checked type, so you must handle it with try and catch or declare it in throws.",
    causes: ["Calling a function that throws a checked exception without handling it.", "Throwing a checked exception inside a function that does not declare it."],
    fixes: ["Wrap the call in try and catch.", "Or add throws {e} to the function declaration."],
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
    title: "error: reached end of file while parsing (reached end of file while parsing)",
    explain: "The file ended while a { bracket was still unclosed, so the class or function definition was not completed.",
    causes: ["Forgetting the closing bracket } at the end of the function or class.", "An extra or missing bracket in the middle of the code."],
    fixes: ["Add the missing closing bracket.", "Use an editor that matches brackets to locate the error."],
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
    title: "error: variable defined twice (is already defined)",
    explain: "You defined the variable {v} more than once in the same scope.",
    causes: ["Copying a declaration line without deleting the old one.", "Defining the variable once inside the loop and once outside it with the same name."],
    fixes: ["Delete the extra declaration or rename it.", "Use reassignment without the variable type."],
    bad: `int count = 1;
int count = 2;`,
    good: `int count = 1;
count = 2;`
  },
  {
    lang: "cpp", id: "cpp-expected-before",
    pattern: /error: expected (?<what>[^\n]{1,40}?) before/,
    title: "error: compiler expected a symbol before the mentioned word (expected before)",
    explain: "The compiler expected {what} at the mentioned position, but found something else. The mistake is often on the line before the message location.",
    causes: ["Forgetting the semicolon ; at the end of the previous line.", "An unclosed bracket on the previous line."],
    fixes: ["Add ; or close the bracket on the previous line.", "Remember that the compiler sometimes points to the line after the real error."],
    bad: `int x = 5
return 0;`,
    good: `int x = 5;
return 0;`
  },
  {
    lang: "cpp", id: "cpp-not-declared",
    pattern: /error: '(?<n>\w+)' was not declared in this scope/,
    title: "error: name not declared in this scope (was not declared in this scope)",
    explain: "The variable or function {n} is not declared at this place in the code.",
    causes: ["A spelling mistake in the name.", "The variable is declared inside another function.", "Forgetting #include for the library that declares the name."],
    fixes: ["Declare the name before using it or pass it as a parameter.", "Add the appropriate #include at the top of the file."],
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
    title: "error: undeclared identifier (use of undeclared identifier)",
    explain: "The clang compiler did not find the definition of {n} in this scope.",
    causes: ["A spelling mistake in the name.", "The variable is declared in another scope or was never declared."],
    fixes: ["Correct the name or declare the variable before using it."],
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
    title: "undefined reference: the linker did not find the definition",
    explain: "You declared {s} but did not write its definition, or did not link the file that contains its definition during compilation.",
    causes: ["Forgetting to write the function body.", "Not passing the source file that defines the function to the compiler.", "An error in a linked library or the linking order."],
    fixes: ["Write the definition of the function or variable.", "Add the source file or library to the compile command."],
    bad: `void hi();
int main() { hi(); }`,
    good: `void hi() {}
int main() { hi(); }`
  },
  {
    lang: "cpp", id: "cpp-segfault",
    pattern: /Segmentation fault/,
    title: "Segmentation fault: access to memory that is not allowed",
    explain: "The program tried to access memory it does not own, usually a null pointer, an out-of-range array index, or a freed pointer.",
    causes: ["A pointer that was not initialized or whose value is NULL and then used.", "An array index out of bounds.", "Using memory after free."],
    fixes: ["Make sure the pointer points to valid memory before using it.", "Run the program with gdb or valgrind to locate the line."],
    bad: `int *p = NULL;
*p = 5;`,
    good: `int x = 0;
int *p = &x;
*p = 5;`
  },
  {
    lang: "cpp", id: "cpp-implicit-declaration",
    pattern: /implicit declaration of function [`']?(?<f>\w+)/,
    title: "implicit declaration of function: calling a function before declaring it",
    explain: "You called the function {f} before defining or declaring it, so the compiler assumed its type automatically.",
    causes: ["The function is defined at the bottom after being called.", "Forgetting #include for the file that declares it."],
    fixes: ["Place the function prototype before main.", "Add #include for the correct file."],
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
    title: "error: compiler expected an expression (expected primary-expression)",
    explain: "The compiler expected a value or variable at this position, but found a symbol that does not fit here.",
    causes: ["An = sign with no value after it.", "A bracket or comma in a place the expression does not accept it."],
    fixes: ["Add the required value after = or inside the brackets.", "Check the commas and brackets before the mentioned position."],
    bad: `int x = ;`,
    good: `int x = 0;`
  },
  {
    lang: "cpp", id: "cpp-invalid-conversion",
    pattern: /error: invalid conversion from '(?<a>[^']{1,60})' to '(?<b>[^']{1,60})'/,
    title: "error: invalid conversion (invalid conversion)",
    explain: "You tried to convert {a} to {b} in a way that is not allowed in C or C++.",
    causes: ["Assigning a value to a pointer without an address.", "Confusing the value type with the pointer type."],
    fixes: ["Assign the address of a variable to the pointer using &.", "Make sure the types match or convert them explicitly."],
    bad: `int *p = 5;`,
    good: `int x = 5;
int *p = &x;`
  },
  {
    lang: "cpp", id: "cpp-no-matching-call",
    pattern: /error: no matching function for call to '(?<f>[^'\n]{1,80})'/,
    title: "error: no matching function for call (no matching function for call)",
    explain: "The call {f} does not match any function definition in terms of the number or type of parameters.",
    causes: ["Passing a different number of arguments than the definition.", "Passing a type that cannot convert to the required type."],
    fixes: ["Match the arguments with the function definition.", "Review the function signature in the documentation or the header file."],
    bad: `void show(int x) {}
show("a", 2);`,
    good: `void show(int x) {}
show(2);`
  },
  {
    lang: "cpp", id: "cpp-redefinition",
    pattern: /error: redefinition of '(?<n>[^'\n]{1,80})'/,
    title: "error: redefinition of (redefinition of)",
    explain: "You defined or declared {n} more than once in the same scope.",
    causes: ["Copying the definition line without deleting the old one.", "A header file included more than once without a guard."],
    fixes: ["Delete the extra definition.", "Add a header guard #ifndef or #pragma once to the header file."],
    bad: `int x = 1;
int x = 2;`,
    good: `int x = 1;
x = 2;`
  },
  {
    lang: "cpp", id: "cpp-conflicting-types",
    pattern: /error: conflicting types for '(?<n>[^'\n]{1,80})'/,
    title: "error: conflicting types (conflicting types)",
    explain: "The first declaration of {n} differs in return type or parameters from the later declaration or definition.",
    causes: ["Changing the return type between the declaration and the definition.", "A different number or type of parameters between the two versions."],
    fixes: ["Make the signature match in the declaration and the definition.", "Update the declaration to match the definition."],
    bad: `int add(int a, int b);
float add(int a, int b) { return 0; }`,
    good: `int add(int a, int b);
int add(int a, int b) { return a + b; }`
  },
  {
    lang: "cpp", id: "cpp-control-reaches-end",
    pattern: /warning: control reaches end of non-void function/,
    title: "warning: function ends without return (control reaches end)",
    explain: "The function is expected to return a value, but some paths end without return, which is undefined behavior.",
    causes: ["return only inside an if.", "Forgetting return at the end of the function."],
    fixes: ["Add return at the end of the function.", "Make sure every path returns a value."],
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
    title: "stack smashing detected: writing outside the stack bounds",
    explain: "You wrote outside the bounds of an array on the stack, corrupting protected data, usually because of strcpy or an excessive index.",
    causes: ["Copying a string longer than the array using strcpy.", "A loop writing past the end of the array."],
    fixes: ["Use strncpy with the array size and make sure the string ends with zero.", "Check the bounds before writing."],
    bad: `char b[4];
strcpy(b, "hello world");`,
    good: `char b[32];
strncpy(b, "hello", 31);
b[31] = 0;`
  },
  {
    lang: "cpp", id: "cpp-array-bounds",
    pattern: /array subscript .*out of bounds|is above array bounds/,
    title: "warning: array subscript out of bounds (array subscript out of bounds)",
    explain: "The code reads or writes outside the array bounds, which causes unexpected behavior.",
    causes: ["An index equal to or greater than the array size.", "A loop counting up to the size instead of size - 1."],
    fixes: ["Use indexes from 0 to size - 1.", "Check the index before accessing it."],
    bad: `int a[3];
a[3] = 1;`,
    good: `int a[3];
a[2] = 1;`
  },
  {
    lang: "cpp", id: "cpp-double-free",
    pattern: /free\(\): invalid pointer|double free detected|double free or corruption/,
    title: "free(): invalid pointer or double free",
    explain: "You freed memory that was already freed, or freed a pointer that did not come from malloc.",
    causes: ["Calling free twice on the same pointer.", "Freeing a pointer that points to a local variable or inside an array."],
    fixes: ["Set the pointer to NULL after free.", "Make sure every block of memory is freed exactly once and by the same source."],
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
    title: "multiple definition: duplicate definition in more than one file",
    explain: "The definition of {n} exists in more than one source file, usually because a header file contains a definition and not just a declaration.",
    causes: ["Writing a variable or function definition inside a header file.", "Including the header file in more than one source file."],
    fixes: ["Make the header file declarations only, using extern or a prototype.", "Place the definition in one source file."],
    bad: `int counter = 0;`,
    good: `static int counter = 0;`
  },
  {
    lang: "cpp", id: "cpp-lvalue-required",
    pattern: /error: lvalue required as/,
    title: "error: lvalue required (lvalue required)",
    explain: "You tried to assign to an expression that has no memory location, such as a constant or a function result.",
    causes: ["Placing the number on the left side of the assignment.", "Trying to increment a value returned by a function."],
    fixes: ["Put the variable name on the left side of =.", "Store the function result in a variable and then modify it."],
    bad: `int x;
5 = x;`,
    good: `int x;
x = 5;`
  },
  {
    lang: "cpp", id: "cpp-sign-compare",
    pattern: /warning: comparison (?:of integer expressions of different signedness|between signed and unsigned)/,
    title: "warning: comparison between signed and unsigned integer (signedness)",
    explain: "You compared a signed number with an unsigned number, so the negative value becomes a large number and the result changes.",
    causes: ["Using size_t or unsigned int with int in loops.", "A signed integer counter compared with the length of an array."],
    fixes: ["Make both types match in signedness.", "Use the same type for both variables."],
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
    title: "warning: format string does not match variable type (format expects argument)",
    explain: "The format %{f} expects a {t} type, but the passed variable is of another type, which may print wrong values.",
    causes: ["Using %d for a decimal number.", "Forgetting the variable type when changing the code."],
    fixes: ["Use %f for decimal numbers and %d for integers.", "Make sure each format matches the type of its variable."],
    bad: `printf("%d", 3.5);`,
    good: `printf("%f", 3.5);`
  },
  {
    lang: "cpp", id: "cpp-uninitialized",
    pattern: /warning: '(?<v>\w+)' (?:is used|may be used) uninitialized/,
    title: "warning: variable used before initialization (used uninitialized)",
    explain: "The variable {v} is read before it receives a value, so its value is random.",
    causes: ["Declaring a variable without an initial value.", "Assigning the value only in a conditional path."],
    fixes: ["Give the variable an initial value when declared.", "Make sure every path assigns a value to it."],
    bad: `int x;
printf("%d", x);`,
    good: `int x = 0;
printf("%d", x);`
  },
  {
    lang: "cpp", id: "cpp-no-such-file",
    pattern: /fatal error: (?<f>[^\n:]{1,200}): No such file or directory/,
    title: "fatal error: included file does not exist (No such file or directory)",
    explain: "The file requested by #include, which is {f}, does not exist in the search paths.",
    causes: ["The file name is misspelled.", "The file is not in the same folder or in the compiler paths.", "The header file of the library is not installed."],
    fixes: ["Correct the file name in #include.", "Use \" \" for local files and < > for system libraries."],
    bad: `#include <myheader.h>`,
    good: `#include "myheader.h"`
  },
  {
    lang: "cpp", id: "cpp-terminate-exception",
    pattern: /terminate called after throwing an instance of 'std::(?<ex>\w+)'/,
    title: "terminate called after throwing: uncaught exception",
    explain: "The exception {ex} was thrown and not caught by any catch, so the program ended. This usually happens when going beyond the bounds of a vector or string when using at().",
    causes: ["Using at() with an index out of bounds.", "A thrown exception without try and catch."],
    fixes: ["Check the index before using at().", "Wrap the code that may throw an exception in try and catch."],
    bad: `std::vector<int> v;
v.at(0);`,
    good: `std::vector<int> v = {1};
if (!v.empty()) std::cout << v.at(0);`
  },
  {
    lang: "csharp", id: "cs-0103",
    pattern: /CS0103: The name '(?<n>[^'\n]+)' does not exist in the current context/,
    title: "CS0103: name does not exist in the current context",
    explain: "The variable or function {n} is not declared in this scope.",
    causes: ["A spelling mistake in the name.", "The variable is declared inside another block or another function.", "Forgetting to declare the variable."],
    fixes: ["Declare the variable before using it.", "Make sure the letter case of the name matches."],
    bad: `Console.WriteLine(total);`,
    good: `int total = 5;
Console.WriteLine(total);`
  },
  {
    lang: "csharp", id: "cs-1002",
    pattern: /CS1002: ; expected/,
    title: "CS1002: ; expected",
    explain: "You forgot the semicolon ; at the end of the statement, and C# requires it.",
    causes: ["Forgetting ; after a statement or declaration.", "The line ends incompletely."],
    fixes: ["Add ; at the end of the mentioned line or the line before it."],
    bad: `int x = 5
Console.WriteLine(x);`,
    good: `int x = 5;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0029",
    pattern: /CS0029: Cannot implicitly convert type '(?<a>[^'\n]+)' to '(?<b>[^'\n]+)'/,
    title: "CS0029: no implicit conversion between the two types",
    explain: "C# does not convert automatically from {a} to {b} because the conversion may lose data or because the types are incompatible.",
    causes: ["Assigning text to a numeric variable.", "Assigning a decimal number to an integer variable."],
    fixes: ["Convert the value explicitly, such as int.Parse for text.", "Change the variable type to match the value."],
    bad: `int x = "5";`,
    good: `int x = int.Parse("5");`
  },
  {
    lang: "csharp", id: "cs-0161",
    pattern: /CS0161: .+: not all code paths return a value/,
    title: "CS0161: not all code paths return a value",
    explain: "The function must return a value in all possible paths, but here there is a path that ends without return.",
    causes: ["return only inside an if.", "Forgetting return at the end of the function."],
    fixes: ["Add return at the end of the function.", "Add an else that returns a value for the other case."],
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
    title: "CS0246: type or namespace not found",
    explain: "C# could not find the type or namespace {t}, usually because you did not write the proper using or did not add the library.",
    causes: ["Forgetting the using for a namespace such as System.Collections.Generic.", "Misspelling the type name."],
    fixes: ["Add the proper using at the top of the file.", "Check the type name and add the package if it comes from an external library."],
    bad: `List<int> l = new List<int>();`,
    good: `using System.Collections.Generic;
List<int> l = new List<int>();`
  },
  {
    lang: "csharp", id: "cs-0165",
    pattern: /CS0165: Use of unassigned local variable '(?<v>[^'\n]+)'/,
    title: "CS0165: local variable used before it is assigned",
    explain: "The local variable {v} is used before a value is assigned to it.",
    causes: ["Declaring the variable without a value and then reading it.", "Assigning the value only inside an if."],
    fixes: ["Give the variable an initial value when declared.", "Make sure every path assigns a value to it."],
    bad: `int x;
Console.WriteLine(x);`,
    good: `int x = 0;
Console.WriteLine(x);`
  },
  {
    lang: "csharp", id: "cs-0120",
    pattern: /CS0120: An object reference is required for the non-static field, method, or property '(?<m>[^'\n]+)'/,
    title: "CS0120: an object is required to access a non-static member",
    explain: "{m} is a non-static member that needs an object to be used, and cannot be accessed directly from a static method.",
    causes: ["Using a regular member inside a static method.", "Forgetting to create an object of the class."],
    fixes: ["Make the member static if it is shared.", "Or create an object of the class and use the member through it."],
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
    title: "NullReferenceException: null reference (null)",
    explain: "You are using an object whose value is null, meaning it was not created yet or was assigned null.",
    causes: ["A string variable whose value is null, then reading its Length.", "An object not created with new.", "A dictionary returned null for a key that does not exist."],
    fixes: ["Check for null before use with if (x != null) or with ?.", "Create the object before using it."],
    bad: `string s = null;
Console.WriteLine(s.Length);`,
    good: `string s = "hi";
Console.WriteLine(s.Length);`
  },
  {
    lang: "csharp", id: "cs-index-range",
    pattern: /System\.IndexOutOfRangeException/,
    title: "IndexOutOfRangeException: array index out of range",
    explain: "You tried to access an index outside the array, while indexes start at 0 and end at length - 1.",
    causes: ["The index equals the array length.", "A loop that goes past the last element."],
    fixes: ["Use indexes from 0 to length - 1.", "Use foreach if you do not need the index."],
    bad: `int[] a = new int[3];
a[3] = 1;`,
    good: `int[] a = new int[3];
a[2] = 1;`
  },
  {
    lang: "csharp", id: "cs-format",
    pattern: /System\.FormatException/,
    title: "FormatException: invalid string format",
    explain: "The text does not match the format required for conversion, such as int.Parse on non-numeric text.",
    causes: ["Text containing letters when converted to a number.", "An empty string during conversion."],
    fixes: ["Use int.TryParse to check before converting.", "Check the input before converting it."],
    bad: `int n = int.Parse("abc");`,
    good: `int n = int.Parse("42");`
  },
  {
    lang: "csharp", id: "cs-invalid-cast",
    pattern: /System\.InvalidCastException: Unable to cast object of type '(?<a>[^'\n]+)' to type '(?<b>[^'\n]+)'/,
    title: "InvalidCastException: invalid type cast",
    explain: "You tried to convert an object of type {a} to {b}, but it is not of that type.",
    causes: ["Converting an object to a type that does not match the actual value.", "Elements of different types inside a collection."],
    fixes: ["Check the type with is before casting.", "Use as for a safe cast."],
    bad: `object o = "hi";
int i = (int)o;`,
    good: `object o = 5;
int i = (int)o;`
  },
  {
    lang: "csharp", id: "cs-divide-by-zero",
    pattern: /System\.DivideByZeroException/,
    title: "DivideByZeroException: division by zero",
    explain: "Integer division by zero, which throws an exception in C#.",
    causes: ["The divisor is a variable whose value is zero.", "Calculating the average of an empty collection."],
    fixes: ["Check that the divisor is not zero.", "Use double if the calculation may involve fractions."],
    bad: `int r = 10 / 0;`,
    good: `int r = 10 / 2;`
  },
];
