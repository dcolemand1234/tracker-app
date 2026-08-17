// STRUCTURE TEMPLATE — every lesson follows this shape.
//
// A lesson is split into PARTS. One part is one screen: a single idea,
// two or three minutes, then a check question before you move on. You
// complete parts individually and progress is tracked per part, so you
// can do 1.3 on the bus and pick up at 1.4 later.
//
// This is the bootcamp structure: small units, each one finished, rather
// than a long page you scroll and hope you absorbed.
//
// part.type controls styling:
//   concept | warning | tip | worked
// part.check is the gate — answer it to mark the part done.

export const PY_LESSON_1 = {
  id: 'py1',
  day: 1,
  level: 'beginner',
  title: 'Variables and Types',
  goal: 'Store values, know what type you are holding, and convert safely.',
  time: '45-60 min total',
  // Free, reputable video for the same material. Watching is optional —
  // the sections stand alone — but a second explanation helps when
  // something has not clicked.
  // Cropped to just the relevant segment. The source is a 4-hour course;
  // start/end are seconds, and the player is told to stop at `end` so you
  // get the variables section only rather than the whole thing.
  video: {
    title: 'Variables & Data Types',
    source: 'freeCodeCamp',
    videoId: 'rfscVS0vtbw',
    start: 508,   // 8:28  - "Variables and Data Types"
    end: 1180,    // 19:40 - end of the types walkthrough
    note: 'An 11-minute clip covering exactly this lesson.',
  },
  // The project belongs to the lesson: learn the thing, build with it
  // immediately. Checked by predicting what the finished program prints.
  project: {
    name: 'Band Name Generator',
    brief:
      'A classic first program. Ask for the city someone grew up in and the name of a pet, then combine them into a band name.\n\nWrite it in a Python file and run it. You need: input() to collect text, variables to store it, and an f-string to build the output.',
    starter:
      'city = input("Which city did you grow up in?\\n")\npet = input("What is your pet\'s name?\\n")\n\n# your line here: print the band name\n',
    stretch:
      'Once it works: strip whitespace from the inputs, capitalise both words, and refuse to run if either answer is empty.',
    check: {
      q: 'With city = "Bath" and pet = "Rex", which line prints "Your band name is Bath Rex"?',
      options: [
        'print("Your band name is " + city + pet)',
        'print(f"Your band name is {city} {pet}")',
        'print("Your band name is {city} {pet}")',
        'print(f"Your band name is city pet")',
      ],
      correct: 1,
      why:
        'The f prefix is what makes braces insert values. Option 1 gives "BathRex" with no space; option 3 has no f so prints the braces literally; option 4 has no braces so prints the words "city pet".',
    },
  },
  parts: [
    {
      id: 'py1a',
      title: 'What a variable actually is',
      type: 'concept',
      minutes: 3,
      body:
        'A variable is a name that points at a value in memory. When you write speed = 10, Python stores the value 10 somewhere and makes the name "speed" refer to it.\n\nThe name is not the value — it is a label attached to one. You can move that label to something else at any time.',
      code: 'speed = 10\nprint(speed)      # 10\n\nspeed = 25        # label moved\nprint(speed)      # 25',
      check: {
        q: 'After x = 5 then x = 9, what does x point at?',
        options: ['5', '9', 'Both', 'An error'],
        correct: 1,
        why: 'Reassigning moves the label. The old value is simply no longer referred to by that name.',
      },
    },
    {
      id: 'py1b',
      title: 'Assignment reads right to left',
      type: 'concept',
      minutes: 3,
      body:
        'A single = is assignment, not equality. The right side is fully evaluated first, then the result is given to the name on the left.\n\nThat is why x = x + 1 makes sense even though it looks wrong mathematically. Python works out x + 1 using the current value, then reassigns.',
      code: 'x = 5\nx = x + 1\n# right side first: 5 + 1 = 6\n# then x points at 6\nprint(x)          # 6',
      check: {
        q: 'x = 3, then x = x * 4. What is x?',
        options: ['3', '4', '12', 'Error'],
        correct: 2,
        why: 'The right side evaluates first: 3 * 4 = 12, then x is reassigned to 12.',
      },
    },
    {
      id: 'py1c',
      title: 'Shorthand operators',
      type: 'tip',
      minutes: 2,
      body:
        '"Take the current value, change it, put it back" is so common that Python has shorthand. These are identical to the long form and used everywhere in real code.',
      code: 'x = 5\n\nx += 1     # x = x + 1   -> 6\nx -= 2     # x = x - 2   -> 4\nx *= 3     # x = x * 3   -> 12\nx /= 4     # x = x / 4   -> 3.0',
      check: {
        q: 'x = 10, then x -= 4. What is x?',
        options: ['4', '6', '14', '-4'],
        correct: 1,
        why: 'x -= 4 is shorthand for x = x - 4, giving 6.',
      },
    },
    {
      id: 'py1d',
      title: 'Naming rules Python enforces',
      type: 'concept',
      minutes: 3,
      body:
        'Break these and your program will not run.\n\n• Must start with a letter or underscore, never a digit\n• Letters, digits, and underscores only — no spaces or hyphens\n• Case sensitive: speed and Speed are different variables\n• Cannot be a reserved word like if, for, class, True, return',
      code: 'speed = 10        # fine\n_speed = 10       # fine\nspeed_2 = 10      # fine\n\n# 2speed = 10     # SyntaxError\n# my speed = 10   # SyntaxError\n# class = 10      # SyntaxError',
      check: {
        q: 'Which name is valid?',
        options: ['2speed', 'my speed', 'motor_speed', 'class'],
        correct: 2,
        why: 'Names cannot start with a digit, contain spaces, or be reserved words.',
      },
    },
    {
      id: 'py1e',
      title: 'Naming conventions professionals follow',
      type: 'tip',
      minutes: 3,
      body:
        'Not enforced, but every Python codebase follows them.\n\n• snake_case for variables: motor_speed, not motorSpeed\n• Descriptive over short: distance_cm beats d\n• ALL_CAPS signals a constant\n• Avoid single letters except loop counters and coordinates\n\nA long name costs you typing it once. A short one costs re-reading the whole function to work out what it holds.',
      code: 'MAX_SPEED = 100          # constant, by convention\ncurrent_speed = 20       # clear\nbattery_percent = 87     # clear\n\ns = 20                   # what is s?\ncurSpd = 20              # not Python style',
      check: {
        q: 'Which follows Python convention for a variable?',
        options: ['MotorSpeed', 'motorSpeed', 'motor_speed', 'MOTORSPEED'],
        correct: 2,
        why: 'snake_case is the Python standard. ALL_CAPS is reserved for constants.',
      },
    },
    {
      id: 'py1f',
      title: 'The four core types',
      type: 'concept',
      minutes: 4,
      body:
        'Every value has a type, which decides what you can do with it.\n\n• int — whole numbers, no decimal point\n• float — has a decimal point (3.0 is a float)\n• str — text in quotes\n• bool — exactly True or False, capitalised\n\ntype() reports which you have, and is the fastest way to diagnose a confusing bug.',
      code: 'count = 42          # int\ntemp  = 36.6        # float\nname  = "rover"     # str\nis_on = True        # bool\n\nprint(type(count))  # <class \'int\'>\nprint(type(temp))   # <class \'float\'>',
      check: {
        q: 'What is the type of 7.0?',
        options: ['int', 'float', 'str', 'bool'],
        correct: 1,
        why: 'A decimal point makes it a float, even though the value is whole.',
      },
    },
    {
      id: 'py1g',
      title: 'Why floats are not exact',
      type: 'warning',
      minutes: 4,
      body:
        'An int is exact. A float is stored in binary and can only approximate most decimals, so tiny errors appear.\n\nThis is not a Python quirk — nearly every language does it. It bites the moment you compare floats with ==, because values that should match may differ in the fifteenth decimal place.\n\nNever test floats with ==. Test whether the difference is small enough.',
      code: 'print(0.1 + 0.2)              # 0.30000000000000004\nprint(0.1 + 0.2 == 0.3)       # False!\n\n# correct approach\nprint(abs((0.1 + 0.2) - 0.3) < 0.0001)   # True',
      check: {
        q: 'Why avoid comparing floats with ==?',
        options: ['Too slow', 'Values stored approximately may differ slightly', 'Not allowed', 'Only works on ints'],
        correct: 1,
        why: 'Binary storage means 0.1 + 0.2 is not exactly 0.3. Compare against a small tolerance.',
      },
    },
    {
      id: 'py1h',
      title: '"10" is not 10',
      type: 'warning',
      minutes: 4,
      body:
        'A string of digits is still text. Python will not silently convert it, because guessing causes worse bugs than refusing.\n\nWith + you get concatenation instead of addition — a wrong answer with no error at all, which is the dangerous kind. With - you get a TypeError, which at least tells you immediately.\n\nThis matters constantly in robotics: sensor input, file contents, and user input all arrive as strings.',
      code: 'print(10 + 5)          # 15\nprint("10" + "5")      # 105  (no error!)\n\n# print("10" - "5")    # TypeError\n\nprint(int("10") + 5)   # 15   (the fix)',
      check: {
        q: 'What does "3" + "4" produce?',
        options: ['7', '"34"', 'TypeError', '34 as an int'],
        correct: 1,
        why: 'Both are strings, so + joins them into "34" rather than adding.',
      },
    },
    {
      id: 'py1i',
      title: 'Converting between types',
      type: 'concept',
      minutes: 4,
      body:
        'int(), float(), str(), and bool() convert values. Each has behaviour worth knowing.\n\n• int() on a float truncates toward zero — it does not round\n• int() on a string only works for clean whole numbers\n• float() accepts whole and decimal strings\n• str() works on anything',
      code: 'print(int(9.99))       # 9    (truncated)\nprint(int(-9.99))      # -9   (toward zero)\nprint(round(9.99))     # 10   (to round, use round)\n\nprint(int("42"))       # 42\n# print(int("9.5"))    # ValueError',
      check: {
        q: 'What is int(-4.8)?',
        options: ['-5', '-4', '4', '-4.8'],
        correct: 1,
        why: 'int() truncates toward zero rather than rounding, giving -4.',
      },
    },
    {
      id: 'py1j',
      title: 'Dynamic typing',
      type: 'concept',
      minutes: 3,
      body:
        'Python works out the type from the value — you never declare it. A variable can also hold a different type later, which languages like C++ forbid.\n\nConvenient, but the responsibility is yours. Nothing stops a variable holding a number in one branch and a string in another, and the resulting bug appears far from its cause.',
      code: 'x = 10\nprint(type(x))     # int\n\nx = "hello"\nprint(type(x))     # str  - allowed\n\nx = True\nprint(type(x))     # bool',
      check: {
        q: 'Can a Python variable hold an int and later a string?',
        options: ['No, it errors', 'Yes, types are dynamic', 'Only with a cast', 'Only in functions'],
        correct: 1,
        why: 'Python is dynamically typed, so the same name can refer to different types over time.',
      },
    },
    {
      id: 'py1k',
      title: 'Multiple assignment and swapping',
      type: 'tip',
      minutes: 3,
      body:
        'Python can assign several names at once. The swap idiom in particular needs a temporary variable in most other languages.',
      code: 'x, y = 1, 2\nprint(x, y)        # 1 2\n\nx, y = y, x        # swap, no temp needed\nprint(x, y)        # 2 1\n\na = b = c = 0      # same value to several names',
      check: {
        q: 'a, b = 3, 9 then a, b = b, a. What is a?',
        options: ['3', '9', '12', 'Error'],
        correct: 1,
        why: 'The right side is evaluated first, capturing both original values before assigning.',
      },
    },
    {
      id: 'py1l',
      title: 'Worked example: a sensor reading arrives as text',
      type: 'worked',
      minutes: 5,
      body:
        'A distance sensor sends "127" as a string. You need it in metres as a number.\n\nStep 1 — see what you have. type(raw) reports str.\n\nStep 2 — the naive attempt fails. raw + 10 raises TypeError, because you cannot add text and a number.\n\nStep 3 — convert, then calculate. int(raw) gives 127, and dividing by 100 gives 1.27.\n\nStep 4 — note the type changed. / always produces a float, so metres is 1.27 not 1. If you needed whole metres you would use // instead.',
      code: 'raw = "127"\nprint(type(raw))       # <class \'str\'>\n\ncm = int(raw)\nmetres = cm / 100\n\nprint(metres)          # 1.27\nprint(type(metres))    # <class \'float\'>',
      check: {
        q: 'raw = "50". What does int(raw) / 4 give?',
        options: ['12', '12.5', '"12.5"', 'TypeError'],
        correct: 1,
        why: 'int("50") is 50, and / always returns a float, so 12.5.',
      },
    },
    {
      id: 'py1m',
      title: 'Worked example: building a status message',
      type: 'worked',
      minutes: 5,
      body:
        'You want to print "Battery: 87%" where 87 is in a variable.\n\nAttempt 1 — "Battery: " + battery fails, because you cannot add a str and an int.\n\nAttempt 2 — convert first with str(battery). Works, but awkward and easy to get wrong with several values.\n\nAttempt 3 — an f-string. Put f before the quote and wrap the variable in braces. Python inserts the value and handles conversion. This is what you should use.',
      code: 'battery = 87\n\n# print("Battery: " + battery)   # TypeError\n\nprint("Battery: " + str(battery) + "%")   # clumsy\n\nprint(f"Battery: {battery}%")             # preferred\nprint(f"Half: {battery / 2}%")            # expressions work',
      check: {
        q: 'Why is an f-string preferred over joining with +?',
        options: ['Faster', 'Handles conversion and reads clearly', 'Required by Python', 'Uses less memory'],
        correct: 1,
        why: 'No manual str() calls and far easier to read, especially with several values.',
      },
    },
  ],
  // Final test. Longer than the per-section checks on purpose: those
  // confirm you followed one idea, this confirms you can hold the whole
  // lesson at once and apply it to problems you have not seen.
  test: [
    { q: 'What is the type of 7.0?', options: ['int', 'float', 'str', 'bool'], correct: 1, why: 'A decimal point makes it a float regardless of the value.' },
    { q: 'What does "3" + "4" produce?', options: ['7', '"34"', 'TypeError', '34'], correct: 1, why: 'String + string concatenates.' },
    { q: 'What is int(-4.8)?', options: ['-5', '-4', '4', '-4.8'], correct: 1, why: 'int() truncates toward zero rather than rounding.' },
    { q: 'Why avoid == on floats?', options: ['Too slow', 'Approximate storage means near-equal values differ', 'Not allowed', 'Ints only'], correct: 1, why: '0.1 + 0.2 is not exactly 0.3 in binary.' },
    { q: 'Which name is valid?', options: ['2speed', 'my speed', 'motor_speed', 'class'], correct: 2, why: 'No leading digits, no spaces, no reserved words.' },
    { q: 'What does x, y = y, x do?', options: ['Nothing', 'Swaps values', 'Errors', 'Sets both to y'], correct: 1, why: 'The right side evaluates first, capturing both originals.' },
    { q: 'x = 4 then x += 3. What is x?', options: ['3', '4', '7', '12'], correct: 2, why: '+= adds in place.' },
    { q: 'Can a variable change type in Python?', options: ['No', 'Yes', 'Only with a cast', 'Only globally'], correct: 1, why: 'Python is dynamically typed.' },
    { q: 'What does print(7 / 2) output?', options: ['3', '3.5', '4', '"3.5"'], correct: 1, why: '/ always produces a float.' },
    { q: 'What happens with int("9.5")?', options: ['9', '10', '9.5', 'ValueError'], correct: 3, why: 'int() on a string only accepts clean whole numbers; use float() first.' },
    { q: 'x = "5"; y = 2. What does x * y give?', options: ['10', '"55"', 'TypeError', '"52"'], correct: 1, why: 'str * int repeats the string, giving "55" — surprising but valid.' },
    { q: 'Which correctly builds "Speed: 20"?', options: ['print("Speed: " + 20)', 'print(f"Speed: {speed}")', 'print("Speed: {speed}")', 'print("Speed: ", + speed)'], correct: 1, why: 'Only the f-string inserts the value; option 1 raises TypeError.' },
    { q: 'ALL_CAPS naming signals what?', options: ['A function', 'A constant', 'A class', 'Private data'], correct: 1, why: 'Convention only — Python does not enforce it, but every codebase follows it.' },
    { q: 'a = b = 0, then a = 5. What is b?', options: ['5', '0', 'None', 'Error'], correct: 1, why: 'Reassigning a moves only that label; b still points at 0.' },
    { q: 'Best way to check a float equals 0.3?', options: ['x == 0.3', 'abs(x - 0.3) < 0.0001', 'int(x) == 0', 'str(x) == "0.3"'], correct: 1, why: 'Compare the difference against a small tolerance.' },
  ],
};

