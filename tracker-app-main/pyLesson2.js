// See pyLesson1.js for the structure template this follows.

export const PY_LESSON_2 = {
  id: 'py2',
  day: 2,
  level: 'beginner',
  title: 'Understanding Data Types',
  goal: 'Know the four core types on sight, convert between them deliberately, and do arithmetic without surprises.',
  time: '45-60 min total',
  video: {
    title: 'Numbers, Operators & Data Types',
    source: 'freeCodeCamp',
    videoId: 'rfscVS0vtbw',
    start: 1180,  // 19:40 - straight on from the day 1 clip
    end: 1850,    // 30:50 - end of the operators/rounding walkthrough
    note: 'An 11-minute clip covering exactly this lesson. Re-check the timestamps once against the video before relying on them — source videos get re-edited.',
  },
  project: {
    name: 'Tip Calculator',
    brief:
      'Ask for a total bill, a tip percentage, and how many people are splitting it. Print how much each person owes, in dollars and cents.\n\nYou need: input() (which always gives you a string), conversion to float, the arithmetic operators, and round() to land on two decimal places.',
    starter:
      'bill = input("What was the total bill? $")\ntip = input("What percentage tip would you like to give? 10, 12, or 15? ")\npeople = input("How many people to split the bill? ")\n\n# your lines here: convert, calculate, round, print\n',
    stretch:
      'Once it works: handle a tip of 0 without dividing by anything odd, and make sure 3-way splits of $10 do not silently lose a cent to rounding.',
    check: {
      q: 'bill = "90.00", tip = "10", people = "3". What should each person pay, rounded to 2 dp?',
      options: ['30.00', '33.00', '27.00', '9.90'],
      correct: 1,
      why: '90 + 10% tip = 99. 99 / 3 = 33.00 each.',
    },
  },
  parts: [
    {
      id: 'py2a',
      title: 'The four core types',
      type: 'concept',
      minutes: 3,
      body:
        'Almost everything you touch early on is one of these four:\n\nint — whole numbers: 5, -12, 1000\nfloat — decimals: 5.0, -12.5, 3.14\nstr — text, always in quotes: "hello", "5"\nbool — exactly True or False\n\ntype() tells you which one you are holding. Guessing from how a value looks is how bugs like "5" + 5 happen.',
      code: 'print(type(5))        # <class \'int\'>\nprint(type(5.0))      # <class \'float\'>\nprint(type("5"))      # <class \'str\'>\nprint(type(True))     # <class \'bool\'>',
      check: {
        q: 'What is the type of "5"?',
        options: ['int', 'float', 'str', 'bool'],
        correct: 2,
        why: 'Quotes make it text, regardless of what the text looks like.',
      },
    },
    {
      id: 'py2b',
      title: 'input() always gives you a string',
      type: 'warning',
      minutes: 4,
      body:
        'No exceptions. Type 25 into a prompt and Python hands your program the string "25", not the number 25. Every input() line that feeds into maths needs an explicit conversion first.\n\nThis is the single most common bug in first programs: it runs, it just does the wrong thing.',
      code: 'age = input("Age? ")   # you type 25\nprint(type(age))       # <class \'str\'>\nprint(age + 1)         # TypeError\n\nage = int(input("Age? "))\nprint(age + 1)         # 26 - fixed',
      check: {
        q: 'What type does input() return, no matter what you type?',
        options: ['Whatever it looks like', 'Always str', 'Always int', 'Depends on the prompt'],
        correct: 1,
        why: 'input() is text-in, text-out. Conversion is always your job.',
      },
    },
    {
      id: 'py2c',
      title: 'The arithmetic operators',
      type: 'concept',
      minutes: 3,
      body:
        '+ - * work as you would expect. ** is power, not ^ (that means something else entirely in Python). Two operators need their own attention: / and // behave differently, covered next.',
      code: 'print(4 + 3)     # 7\nprint(4 - 3)     # 1\nprint(4 * 3)     # 12\nprint(4 ** 3)    # 64  (4 to the power 3)',
      check: {
        q: 'What does 2 ** 5 give?',
        options: ['10', '25', '32', '7'],
        correct: 2,
        why: '2 to the power 5 is 32. ** is power in Python, not multiplication or XOR.',
      },
    },
    {
      id: 'py2d',
      title: '/ vs // — the division split',
      type: 'concept',
      minutes: 4,
      body:
        '/ is true division and always returns a float, even when it divides evenly. // is floor division: it divides, then throws away everything after the decimal point.\n\nFor a tip split you almost always want / — you want the exact amount, not a rounded-down one.',
      code: 'print(9 / 2)     # 4.5\nprint(9 // 2)    # 4\nprint(10 / 2)    # 5.0   (still a float!)\nprint(10 // 2)   # 5     (an int)',
      check: {
        q: 'What does 10 / 2 return?',
        options: ['5', '5.0', '"5"', 'Error'],
        correct: 1,
        why: '/ always produces a float, even for a division with no remainder.',
      },
    },
    {
      id: 'py2e',
      title: '% gives you the remainder',
      type: 'concept',
      minutes: 3,
      body:
        '% is modulo: what is left over after dividing as far as it goes. It is how you test for even numbers, and how you split a group into equal shares plus a leftover.',
      code: 'print(10 % 3)    # 1   (3 goes in 3 times, 1 left over)\nprint(8 % 2)     # 0   (even)\nprint(7 % 2)     # 1   (odd)',
      check: {
        q: 'How would you test if a number n is odd?',
        options: ['n % 2 == 0', 'n % 2 == 1', 'n // 2 == 1', 'n / 2'],
        correct: 1,
        why: 'An odd number leaves a remainder of 1 when divided by 2.',
      },
    },
    {
      id: 'py2f',
      title: 'Order of operations',
      type: 'concept',
      minutes: 3,
      body:
        'Same order as maths class: ** first, then * / // %, then + -. Brackets override everything. When a calculation has more than two steps, use brackets even where they are not strictly needed — it costs nothing and removes any doubt.',
      code: 'print(2 + 3 * 4)       # 14, not 20\nprint((2 + 3) * 4)     # 20\nprint(100 + 100 * 15 / 100)   # 115.0',
      check: {
        q: 'What does 100 + 100 * 15 / 100 evaluate to?',
        options: ['30.0', '115.0', '215.0', '1500.0'],
        correct: 1,
        why: '100 * 15 / 100 = 15.0 first, then 100 + 15.0 = 115.0.',
      },
    },
    {
      id: 'py2g',
      title: 'round() is not the same as int()',
      type: 'tip',
      minutes: 4,
      body:
        'int() on a float truncates — it just chops off the decimal part, always toward zero. round() actually rounds to the nearest value, and takes an optional second argument for how many decimal places to keep. For money, round(x, 2) is what you want.',
      code: 'print(int(4.7))        # 4    (chopped, not rounded)\nprint(round(4.7))      # 5    (rounded)\nprint(round(33.333, 2))  # 33.33\nprint(round(4.5))      # 4    (banker\'s rounding - see the check)',
      check: {
        q: 'Which correctly rounds a total to 2 decimal places?',
        options: ['int(total)', 'total // 2', 'round(total, 2)', 'total / 2'],
        correct: 2,
        why: 'round() with a second argument controls the number of decimal places kept.',
      },
    },
    {
      id: 'py2h',
      title: 'bool is a type of its own, sort of',
      type: 'concept',
      minutes: 3,
      body:
        'True and False are their own type, but under the hood they are 1 and 0 — you can even do maths with them. This is a fact worth knowing, not something to lean on: writing True + True in real code is a way to confuse the next reader, including future you.',
      code: 'print(type(True))     # <class \'bool\'>\nprint(True == 1)      # True\nprint(True + True)    # 2   (works, but do not write this)\nprint(int(False))     # 0',
      check: {
        q: 'What does True + True evaluate to?',
        options: ['True', 'Error', '2', '"TrueTrue"'],
        correct: 2,
        why: 'bool is a subtype of int, so True behaves as 1 in arithmetic — even though you should not rely on this in real code.',
      },
    },
    {
      id: 'py2i',
      title: 'Mixing str with numbers goes wrong quietly',
      type: 'warning',
      minutes: 4,
      body:
        'This is the day 1 warning again because it bites hardest exactly where a tip calculator lives: percentages typed in as text. "10" + 5 raises TypeError immediately, which is the good outcome — you find it right away. Silent bugs happen when + isn\'t involved at all but a value you assumed was numeric is still text.',
      code: 'tip_percent = "10"          # from input()\n# bill * tip_percent / 100  # TypeError\n\ntip_percent = int(tip_percent)\nprint(bill * tip_percent / 100)   # works',
      check: {
        q: 'You forget to convert a percentage from input(). What happens when you use it in a division?',
        options: ['Silently wrong answer', 'TypeError', 'Rounds to 0', 'Nothing, it just works'],
        correct: 1,
        why: 'Division and multiplication between str and int/float raise TypeError immediately — unlike +, which can silently concatenate strings instead of adding.',
      },
    },
    {
      id: 'py2j',
      title: 'Worked example: building the tip calculator',
      type: 'worked',
      minutes: 6,
      body:
        'Step 1 — collect the three inputs. All three arrive as strings.\n\nStep 2 — convert. bill and the final amounts need float, since money has decimals; people needs int, since you cannot split something into 2.5 people.\n\nStep 3 — calculate. Add the tip to the bill first, then divide by the number of people.\n\nStep 4 — round for display. Money should never show more than 2 decimal places.',
      code: 'bill = float(input("Total bill? $"))\ntip_percent = int(input("Tip percent? "))\npeople = int(input("Split between how many? "))\n\ntotal = bill + (bill * tip_percent / 100)\neach_person = total / people\n\nprint(f"Each person owes: ${round(each_person, 2)}")',
      check: {
        q: 'bill=50.00, tip=20, people=2. What prints?',
        options: ['$25.0', '$30.0', '$60.0 total', 'Each person owes: $30.0'],
        correct: 3,
        why: '50 + (50*20/100) = 60. 60 / 2 = 30.0. The f-string wraps it in the sentence.',
      },
    },
    {
      id: 'py2k',
      title: 'Worked example: the cent that goes missing',
      type: 'worked',
      minutes: 5,
      body:
        'Split $10.00 three ways at round(x, 2) each and you get 3.33 + 3.33 + 3.33 = 9.99 — a cent short. This is not a Python bug; it is what happens any time you round three equal shares of a number that does not divide evenly by 3, in any currency, on paper or on a screen.\n\nFor a personal tool this is usually fine to leave as-is and just mention it. If it mattered for real, you would round the first two shares and give the last person the remainder, so the totals always add up exactly.',
      code: 'total = 10.00\nshare = round(total / 3, 2)\nprint(share)                 # 3.33\nprint(share * 3)             # 9.99, not 10.00\n\n# a fix, if it matters:\nshare1 = round(total / 3, 2)\nshare2 = round(total / 3, 2)\nshare3 = round(total - share1 - share2, 2)   # gets the remainder',
      check: {
        q: 'Why can three equal 2dp shares of $10.00 fail to add back up to $10.00?',
        options: ['A bug in round()', 'Rounding each share independently loses fractions of a cent', '/ is broken for money', 'Python cannot handle decimals'],
        correct: 1,
        why: 'Each share is rounded on its own, and those small roundings do not necessarily cancel out.',
      },
    },
  ],
  test: [
    { q: 'What is the type of 7.0?', options: ['int', 'float', 'str', 'bool'], correct: 1, why: 'A decimal point makes it a float regardless of the value.' },
    { q: 'What type does input() always return?', options: ['Whatever you typed looks like', 'str', 'int', 'float'], correct: 1, why: 'input() is always text; conversion is always manual.' },
    { q: 'What does 9 // 2 give?', options: ['4.5', '4', '5', '1'], correct: 1, why: 'Floor division discards the remainder and keeps only the whole part.' },
    { q: 'What does 9 % 2 give?', options: ['4', '1', '4.5', '0'], correct: 1, why: '2 goes into 9 four times with 1 left over.' },
    { q: 'What does 2 ** 4 give?', options: ['8', '16', '6', '4'], correct: 1, why: '** is power: 2 to the power 4 is 16.' },
    { q: 'What does round(4.5) round toward, in Python?', options: ['Always up', 'Always down', 'To even (banker\'s rounding)', 'Errors'], correct: 2, why: 'Python 3 uses round-half-to-even for .5 cases, which can surprise people expecting always-up rounding.' },
    { q: 'What is int(9.9)?', options: ['10', '9', '9.9', '0'], correct: 1, why: 'int() truncates toward zero; it does not round.' },
    { q: 'Which correctly rounds money to 2 decimal places?', options: ['int(x)', 'x // 100', 'round(x, 2)', 'str(x)[:2]'], correct: 2, why: 'round() takes an optional decimal-places argument built for exactly this.' },
    { q: '"10" + "5" gives what?', options: ['15', '"15"', '"105"', 'TypeError'], correct: 2, why: 'Both are strings, so + concatenates them into "105".' },
    { q: '"10" * 5 (int 5) gives what?', options: ['50', 'TypeError', '"1010101010"', '"10101010"'], correct: 2, why: 'str * int repeats the string 5 times: "10" five times over.' },
    { q: 'What is True + True?', options: ['Error', 'True', '2', '"TrueTrue"'], correct: 2, why: 'bool is a subtype of int, so True acts as 1 in arithmetic.' },
    { q: 'What does 100 * 15 / 100 evaluate to?', options: ['15', '15.0', '1500', '1.5'], correct: 1, why: '* and / have equal precedence and evaluate left to right; the result is a float.' },
    { q: 'Why does bill * tip_percent / 100 raise TypeError if tip_percent came straight from input()?', options: ['It never does', 'tip_percent is still a string', 'bill is a string', '/ does not support ints'], correct: 1, why: 'Without int() or float(), tip_percent is text, and text cannot be used in multiplication with a number.' },
    { q: 'Splitting $10.00 into 3 rounded shares of $3.33 sums to what?', options: ['$10.00 exactly', '$9.99', '$10.01', 'An error'], correct: 1, why: 'Independent rounding of each share loses a fraction of a cent, landing one cent short.' },
    { q: 'What does 10 / 2 return, as opposed to 10 // 2?', options: ['Both return 5', '10/2 returns 5.0 (float), 10//2 returns 5 (int)', '10/2 errors', 'They are identical in every way'], correct: 1, why: '/ always gives a float result; // gives an int when both operands are ints.' },
  ],
};
