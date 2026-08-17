// See pyLesson1.js for the structure template this follows.

export const PY_LESSON_3 = {
  id: 'py3',
  day: 3,
  level: 'beginner',
  title: 'Control Flow and Logical Operators',
  goal: 'Make your program take different paths depending on conditions, instead of always running top to bottom.',
  time: '45-60 min total',
  video: {
    title: 'If Statements, Comparisons & Logical Operators',
    source: 'freeCodeCamp',
    videoId: 'rfscVS0vtbw',
    start: 1850, // straight on from the day 2 clip
    end: 2650,
    note: 'Re-check the timestamps once against the video before relying on them — same caveat as day 2.',
  },
  project: {
    name: 'Treasure Island',
    brief:
      'Build a text adventure. Ask the player questions at each step ("Cross the bridge or swim?"), and use if/elif/else to send them down different paths depending on their answer. One path should lead to treasure, the rest should lead to a game-over message.',
    starter:
      'print("You\'re at a crossroads. Turn left or right?")\nchoice = input().lower()\n\n# your if/elif/else chain here\n',
    stretch:
      'Add a second decision point after the first one survives — so reaching the treasure needs two correct choices in a row, not one.',
    check: {
      q: 'choice = "left". Which condition correctly checks for it?',
      options: ['if choice = "left":', 'if choice == "left":', 'if choice == left:', 'if choice equals "left":'],
      correct: 1,
      why: '== compares. A single = assigns, and would actually be a syntax error here.',
    },
  },
  parts: [
    {
      id: 'py3a',
      title: 'Comparison operators',
      type: 'concept',
      minutes: 3,
      body:
        'Comparisons ask a yes/no question and always produce a bool: True or False. == checks equality. != checks "not equal". < > <= >= compare size, and work on numbers the way you would expect.',
      code: 'print(5 == 5)     # True\nprint(5 == 6)     # False\nprint(5 != 6)     # True\nprint(3 < 5)      # True\nprint(5 <= 5)     # True',
      check: {
        q: 'What does 7 != 7 evaluate to?',
        options: ['True', 'False', 'Error', '7'],
        correct: 1,
        why: '7 does equal 7, so "not equal" is False.',
      },
    },
    {
      id: 'py3b',
      title: '== vs = is the classic first bug',
      type: 'warning',
      minutes: 4,
      body:
        '= assigns a value. == asks whether two values are equal. Writing if choice = "left": is not a subtle logic error — Python refuses to run it at all, which is actually the kind version of this bug. The trap is real code that runs but does the wrong thing because of a stray typo elsewhere, so it is worth building the habit now.',
      code: '# if choice = "left":     SyntaxError, will not even run\n\nif choice == "left":      # correct\n    print("You head left.")',
      check: {
        q: 'What happens if you write if x = 5: in Python?',
        options: ['It runs and checks equality', 'SyntaxError', 'It assigns 5 to x silently', 'Nothing, it is ignored'],
        correct: 1,
        why: '= is not valid inside a condition in Python, so this fails immediately rather than silently misbehaving.',
      },
    },
    {
      id: 'py3c',
      title: 'if, and what "indented" means',
      type: 'concept',
      minutes: 4,
      body:
        'An if statement runs the indented block underneath it only when the condition is True. The colon and the indentation are not decoration — they are how Python knows where the block starts and ends. Four spaces is the standard indent.',
      code: 'health = 20\n\nif health <= 0:\n    print("Game over")\n    print("You have been defeated")\n\nprint("This always runs")   # not indented, always executes',
      check: {
        q: 'health = 5. What prints from the code above?',
        options: ['Game over\\nYou have been defeated\\nThis always runs', 'This always runs', 'Nothing', 'Game over'],
        correct: 1,
        why: 'The condition health <= 0 is False, so the indented block is skipped. Only the unindented line always runs.',
      },
    },
    {
      id: 'py3d',
      title: 'else catches everything the if did not',
      type: 'concept',
      minutes: 3,
      body:
        'else has no condition of its own — it runs whenever the if above it was False. Together they cover every case: exactly one of the two blocks runs, never both, never neither.',
      code: 'age = 15\n\nif age >= 18:\n    print("You can vote")\nelse:\n    print("Not yet")',
      check: {
        q: 'Can both the if block and the else block run in the same pass?',
        options: ['Yes, if conditions overlap', 'No, exactly one runs', 'Only if nested', 'Only with and'],
        correct: 1,
        why: 'if/else is exclusive by construction: the condition is either True or False, never both.',
      },
    },
    {
      id: 'py3e',
      title: 'elif for more than two paths',
      type: 'concept',
      minutes: 5,
      body:
        'elif ("else if") chains additional conditions after the first. Python checks them top to bottom and runs the first one that matches, then skips the rest — even if a later condition would also have been True. Order matters.',
      code: 'score = 85\n\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelif score >= 70:\n    print("C")\nelse:\n    print("F")\n\n# prints "B" - the first matching branch wins, checking stops there',
      check: {
        q: 'score = 95. Using the code above, what prints?',
        options: ['A', 'B', 'A and B', 'F'],
        correct: 0,
        why: '90+ matches the first condition, so Python prints "A" and never even checks the elif branches.',
      },
    },
    {
      id: 'py3f',
      title: 'Order matters in elif chains',
      type: 'warning',
      minutes: 4,
      body:
        'Because Python stops at the first True condition, a chain written in the wrong order silently gives wrong answers instead of erroring. This is a quiet bug: the code runs fine, it just always picks the earlier, wrong branch.',
      code: '# WRONG ORDER - score=95 always hits this branch first\nif score >= 60:\n    print("D")     # matches even a 95!\nelif score >= 90:\n    print("A")     # never reached\n\n# RIGHT ORDER - most specific / highest condition first\nif score >= 90:\n    print("A")\nelif score >= 60:\n    print("D")',
      check: {
        q: 'Why does putting score >= 60 before score >= 90 break the grading?',
        options: ['It does not break anything', 'The first matching condition wins, so a 95 matches >= 60 before it ever reaches >= 90', 'Python checks them in reverse', 'elif requires sorted conditions'],
        correct: 1,
        why: 'A 95 satisfies score >= 60 too, and since that check comes first, Python stops there and never reaches the >= 90 branch.',
      },
    },
    {
      id: 'py3g',
      title: 'and, or, not — combining conditions',
      type: 'concept',
      minutes: 5,
      body:
        'and requires both sides to be True. or requires at least one side. not flips a bool the other way. These let you write one condition that captures a rule with more than one part, instead of nesting ifs for everything.',
      code: 'age = 25\nhas_ticket = True\n\nif age >= 18 and has_ticket:\n    print("Entry allowed")\n\nis_weekend = False\nis_holiday = True\nif is_weekend or is_holiday:\n    print("No school")\n\nif not has_ticket:\n    print("Buy a ticket first")',
      check: {
        q: 'age=16, has_ticket=True. Does "age >= 18 and has_ticket" allow entry?',
        options: ['Yes', 'No', 'Error', 'Depends on has_ticket only'],
        correct: 1,
        why: 'and needs both sides True. age >= 18 is False here, so the whole expression is False regardless of the ticket.',
      },
    },
    {
      id: 'py3h',
      title: 'and vs or is a common mix-up',
      type: 'warning',
      minutes: 4,
      body:
        'It is easy to write or when you mean and, especially when translating an English sentence like "if it is not left and not right" into code. Read the condition back in plain English and check it says what you actually mean.',
      code: 'choice = "left"\n\n# WRONG: this is True for almost everything, since\n# most strings are not equal to BOTH "left" and "right"\nif choice != "left" or choice != "right":\n    print("invalid")   # fires even when choice IS "left"\n\n# RIGHT\nif choice != "left" and choice != "right":\n    print("invalid")   # only fires when it is neither',
      check: {
        q: 'choice = "left". Does "choice != \'left\' or choice != \'right\'" evaluate to True or False?',
        options: ['True', 'False'],
        correct: 0,
        why: 'choice != "right" is True (since choice is "left"), and or only needs one side True — so the whole thing is True, even though "left" is actually valid.',
      },
    },
    {
      id: 'py3i',
      title: 'Nesting if statements',
      type: 'concept',
      minutes: 5,
      body:
        'An if block can contain another if inside it, indented one level further. This is useful when the second question only makes sense after the first has already been answered. It can also usually be flattened into a single condition with and — nesting is a tool, not always the best choice.',
      code: 'has_key = True\nis_locked = True\n\nif is_locked:\n    if has_key:\n        print("Door opens")\n    else:\n        print("You need a key")\nelse:\n    print("Door was already open")\n\n# same logic, flattened:\nif is_locked and has_key:\n    print("Door opens")\nelif is_locked and not has_key:\n    print("You need a key")\nelse:\n    print("Door was already open")',
      check: {
        q: 'What is the main downside of deep nesting compared to and/or?',
        options: ['It runs slower', 'It gets harder to read as it grows', 'It is not allowed in Python', 'It cannot use else'],
        correct: 1,
        why: 'Nesting is functionally fine but readability drops fast beyond two or three levels — flattening with and/or often reads more clearly.',
      },
    },
    {
      id: 'py3j',
      title: 'Worked example: the crossroads decision',
      type: 'worked',
      minutes: 6,
      body:
        'Step 1 — get the input and normalise it. .lower() means "LEFT", "Left", and "left" all match the same branch, so the player is not punished for capitalisation.\n\nStep 2 — write the if/elif/else chain, one branch per meaningful choice, plus a catch-all else for anything unexpected.',
      code: 'print("You\'re at a crossroads. Turn left or right?")\nchoice = input().lower()\n\nif choice == "left":\n    print("You fall into a pit.")\nelif choice == "right":\n    print("You find the treasure!")\nelse:\n    print("You stand still, confused, and are eaten by a grue.")',
      check: {
        q: 'The player types "RIGHT". What happens with .lower() applied?',
        options: ['Falls into the pit', 'Finds the treasure', 'Confused/eaten branch', 'Nothing, RIGHT does not match'],
        correct: 1,
        why: '.lower() turns "RIGHT" into "right", which matches the elif branch exactly.',
      },
    },
    {
      id: 'py3k',
      title: 'Worked example: two decisions in a row',
      type: 'worked',
      minutes: 6,
      body:
        'For the stretch goal, the second question should only be asked once the first has already gone the right way — which is exactly what nesting (or a chain of and-conditions) is for. This also shows why an early elif/else that ends the story needs to actually stop there rather than falling through to the next question.',
      code: 'print("Turn left or right?")\nchoice1 = input().lower()\n\nif choice1 == "left":\n    print("You fall into a pit. Game over.")\nelif choice1 == "right":\n    print("You find a locked door. Push or pull?")\n    choice2 = input().lower()\n    if choice2 == "pull":\n        print("The door opens. Treasure!")\n    else:\n        print("The door will not budge. Game over.")\nelse:\n    print("You hesitate too long. Game over.")',
      check: {
        q: 'choice1="left". Does the player ever see the push/pull question?',
        options: ['Yes, always', 'No — that branch is only inside the "right" elif', 'Only if they answer twice', 'Depends on choice2'],
        correct: 1,
        why: 'The push/pull question is nested inside the elif choice1 == "right" block, so choosing "left" never reaches it.',
      },
    },
  ],
  test: [
    { q: 'What does == check?', options: ['Assignment', 'Equality', 'Inequality', 'Nothing, it is invalid'], correct: 1, why: '== compares two values for equality and returns a bool.' },
    { q: 'What happens if you write if x = 5: in Python?', options: ['Runs fine', 'SyntaxError', 'Assigns silently', 'Compares x to 5'], correct: 1, why: 'A single = is assignment, not a valid condition, so Python raises a SyntaxError.' },
    { q: 'Can an if/else pair run both blocks in the same pass?', options: ['Yes', 'No, exactly one runs', 'Only when nested', 'Only with elif'], correct: 1, why: 'The condition is either True or False; exactly one branch executes.' },
    { q: 'In an if/elif/elif/else chain, how many branches run at most?', options: ['All matching ones', 'Exactly one — the first match', 'Zero always', 'Two'], correct: 1, why: 'Python stops checking as soon as it finds the first True condition.' },
    { q: 'Why does branch order matter in an elif chain?', options: ['It does not matter', 'The first matching condition wins, even if a later one would also match', 'Python checks them alphabetically', 'elif requires numeric conditions'], correct: 1, why: 'A value can satisfy more than one condition; whichever is checked first determines the outcome.' },
    { q: 'What does "and" require to be True?', options: ['At least one side True', 'Both sides True', 'Neither side True', 'Exactly one side True'], correct: 1, why: 'and is only True when both operands are True.' },
    { q: 'What does "or" require to be True?', options: ['Both sides True', 'At least one side True', 'Neither side True', 'It is always True'], correct: 1, why: 'or is True if either side (or both) is True.' },
    { q: 'x = 5. What does "not x == 5" evaluate to?', options: ['True', 'False', 'Error', '5'], correct: 1, why: 'x == 5 is True, and not flips it to False.' },
    { q: 'choice="left". Does "choice != \'left\' or choice != \'right\'" evaluate to True or False?', options: ['True', 'False'], correct: 0, why: 'choice != "right" is True, and or only needs one True side, making the whole thing True even though "left" is valid.' },
    { q: 'What is the main risk of deep if-nesting?', options: ['It cannot use else', 'It is slower to run', 'It becomes hard to read as it grows', 'Python limits nesting depth'], correct: 2, why: 'Nesting works correctly but readability drops quickly past a couple of levels.' },
    { q: 'What does .lower() do to user input before comparison?', options: ['Deletes it', 'Converts it to lowercase so casing does not affect matching', 'Converts it to a number', 'Reverses the string'], correct: 1, why: '.lower() normalises case so "LEFT", "Left", and "left" all match the same branch.' },
    { q: 'age=20, has_ticket=False. Does "age >= 18 and has_ticket" allow entry?', options: ['Yes', 'No', 'Error', 'Depends on age only'], correct: 1, why: 'and needs both sides True; has_ticket is False, so the whole expression is False.' },
    { q: 'What indentation convention does Python use for if blocks?', options: ['Tabs only', 'Curly braces, indentation is optional', '4 spaces is the standard', 'Semicolons'], correct: 2, why: 'Python uses indentation (4 spaces is the convention) to define blocks, not braces.' },
    { q: 'Which correctly checks that a choice is neither "left" nor "right"?', options: ['choice != "left" or choice != "right"', 'choice != "left" and choice != "right"', 'choice == "left" and choice == "right"', 'not choice'], correct: 1, why: 'and requires both conditions to hold — the choice must fail to match "left" AND fail to match "right".' },
  ],
};
