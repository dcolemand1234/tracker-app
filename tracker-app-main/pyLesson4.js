// See pyLesson1.js for the structure template this follows.

export const PY_LESSON_4 = {
  id: 'py4',
  day: 4,
  level: 'beginner',
  title: 'Randomisation and Python Lists',
  goal: 'Store an ordered collection of values in one variable, and let the computer make a genuine choice.',
  time: '45-60 min total',
  video: {
    title: 'Lists, Indexing & the random Module',
    source: 'freeCodeCamp',
    videoId: 'rfscVS0vtbw',
    start: 2650, // straight on from the day 3 clip
    end: 3450,
    note: 'Re-check the timestamps once against the video before relying on them — same caveat as the previous days.',
  },
  project: {
    name: 'Rock Paper Scissors',
    brief:
      'Ask the player to choose rock, paper, or scissors. Have the computer pick randomly from the same three options. Compare the two choices and print who won.',
    starter:
      'import random\n\noptions = ["Rock", "Paper", "Scissors"]\n\nplayer_choice = input("Rock, Paper, or Scissors? ")\ncomputer_choice = random.choice(options)\n\n# your comparison logic here\n',
    stretch:
      'Track wins, losses, and ties across multiple rounds using three counter variables, and print the running score after each round.',
    check: {
      q: 'options = ["Rock", "Paper", "Scissors"]. Which line picks one at random?',
      options: [
        'options[random]',
        'random.choice(options)',
        'random(options)',
        'options.random()',
      ],
      correct: 1,
      why: 'random.choice() takes a list and returns one randomly selected item from it.',
    },
  },
  parts: [
    {
      id: 'py4a',
      title: 'What a list is',
      type: 'concept',
      minutes: 3,
      body:
        'A list holds multiple values in one variable, in order, written inside square brackets and separated by commas. Unlike the types from earlier days, a list is a container — it can hold numbers, strings, even other lists, mixed together if needed.',
      code: 'options = ["Rock", "Paper", "Scissors"]\nscores = [10, 25, 3, 47]\nmixed = ["Alice", 25, True]\n\nprint(options)   # [\'Rock\', \'Paper\', \'Scissors\']\nprint(len(options))   # 3',
      check: {
        q: 'What does len(options) return for options = ["Rock", "Paper", "Scissors"]?',
        options: ['0', '1', '3', 'Error'],
        correct: 2,
        why: 'len() counts the number of items in the list — three strings here.',
      },
    },
    {
      id: 'py4b',
      title: 'Indexing — getting one item out',
      type: 'concept',
      minutes: 5,
      body:
        'Every item in a list has a position, called its index. Counting starts at 0, not 1 — the first item is index 0, the second is index 1, and so on. This trips up almost everyone at first; it is worth saying out loud until it feels normal.',
      code: 'options = ["Rock", "Paper", "Scissors"]\n\nprint(options[0])   # Rock\nprint(options[1])   # Paper\nprint(options[2])   # Scissors',
      check: {
        q: 'options = ["Rock", "Paper", "Scissors"]. What is options[0]?',
        options: ['Rock', 'Paper', 'Scissors', 'Error'],
        correct: 0,
        why: 'Indexing starts at 0, so options[0] is the first item, "Rock".',
      },
    },
    {
      id: 'py4c',
      title: 'Negative indexing',
      type: 'concept',
      minutes: 3,
      body:
        'Negative numbers count from the end of the list instead of the start. -1 is always the last item, -2 the second-to-last, and so on — useful when you want the end of a list without needing to know its exact length.',
      code: 'options = ["Rock", "Paper", "Scissors"]\n\nprint(options[-1])   # Scissors - the last item\nprint(options[-2])   # Paper - second-to-last',
      check: {
        q: 'options = ["Rock", "Paper", "Scissors"]. What is options[-1]?',
        options: ['Rock', 'Paper', 'Scissors', 'IndexError'],
        correct: 2,
        why: '-1 always refers to the last item in the list, regardless of its length.',
      },
    },
    {
      id: 'py4d',
      title: 'IndexError — asking for a position that does not exist',
      type: 'warning',
      minutes: 4,
      body:
        'A list of 3 items has valid indexes 0, 1, and 2 — asking for index 3 does not "wrap around" or return something empty, it crashes the program with an IndexError. This is one of the most common early bugs, especially when a loop runs one step too far.',
      code: 'options = ["Rock", "Paper", "Scissors"]\n\nprint(options[3])\n# IndexError: list index out of range\n# there is no 4th item - valid indexes are 0, 1, 2',
      check: {
        q: 'options has 3 items. What happens with options[3]?',
        options: ['Returns None', 'Returns an empty string', 'IndexError', 'Wraps around to options[0]'],
        correct: 2,
        why: 'Python does not wrap indexes automatically — going one past the last valid index raises IndexError.',
      },
    },
    {
      id: 'py4e',
      title: 'Changing an item in a list',
      type: 'concept',
      minutes: 3,
      body:
        'Unlike a string, a list can be changed after it is created. Assign directly to an index to replace that item, leaving the rest of the list untouched.',
      code: 'options = ["Rock", "Paper", "Scissors"]\noptions[1] = "Lizard"\nprint(options)   # [\'Rock\', \'Lizard\', \'Scissors\']',
      check: {
        q: 'Can you change a single item in a list after creating it?',
        options: ['No, lists are fixed once created', 'Yes, by assigning to that index', 'Only the first item can change', 'Only by creating a new list'],
        correct: 1,
        why: 'Lists are mutable — options[1] = "Lizard" replaces just that one item in place.',
      },
    },
    {
      id: 'py4f',
      title: 'Adding items with append()',
      type: 'concept',
      minutes: 4,
      body:
        '.append() adds one new item onto the end of a list, growing it by one. This is how a list usually gets built up over time — start empty, then append as new values come in.',
      code: 'scores = []\nscores.append(10)\nscores.append(25)\nscores.append(3)\nprint(scores)   # [10, 25, 3]',
      check: {
        q: 'scores = [10, 25]. What does scores after scores.append(3) look like?',
        options: ['[10, 25]', '[3, 10, 25]', '[10, 25, 3]', 'Error'],
        correct: 2,
        why: '.append() always adds the new item to the end of the list.',
      },
    },
    {
      id: 'py4g',
      title: 'The random module',
      type: 'concept',
      minutes: 4,
      body:
        'random is a module — a bundle of extra code not loaded by default, brought in with import. Once imported, random.choice() picks one item from a list at random, and random.randint(a, b) picks a random whole number between a and b, inclusive on both ends.',
      code: 'import random\n\noptions = ["Rock", "Paper", "Scissors"]\nchoice = random.choice(options)\nprint(choice)   # a random one of the three, different each run\n\nroll = random.randint(1, 6)\nprint(roll)   # a random whole number from 1 to 6',
      check: {
        q: 'What does random.randint(1, 6) return?',
        options: ['A random float between 1 and 6', 'A random whole number from 1 to 6, inclusive', 'Always 6', 'A random whole number from 0 to 5'],
        correct: 1,
        why: 'randint() includes both endpoints — 1 and 6 are both possible results, not just the numbers between them.',
      },
    },
    {
      id: 'py4h',
      title: 'import must come before it is used',
      type: 'warning',
      minutes: 3,
      body:
        'import statements are usually placed at the very top of a file, before anything else. Using random.choice() before the import line runs will crash with a NameError, since Python has no idea what "random" refers to yet.',
      code: '# WRONG - used before imported\nchoice = random.choice(["Rock", "Paper", "Scissors"])\nimport random\n# NameError: name \'random\' is not defined\n\n# RIGHT\nimport random\nchoice = random.choice(["Rock", "Paper", "Scissors"])',
      check: {
        q: 'What happens if random.choice() runs before import random?',
        options: ['Works fine, Python figures it out', 'NameError', 'Returns None', 'SyntaxError'],
        correct: 1,
        why: 'Python executes top to bottom — random is not recognised until the import statement has actually run.',
      },
    },
    {
      id: 'py4i',
      title: 'Comparing values with if/elif/else',
      type: 'concept',
      minutes: 5,
      body:
        'Rock Paper Scissors needs to compare the player\'s choice against the computer\'s choice and decide a winner. With three options there are nine possible combinations, but most of the logic reduces to: same choice is a tie, and each choice beats exactly one other and loses to exactly one other.',
      code: 'if player_choice == computer_choice:\n    print("Tie!")\nelif player_choice == "Rock" and computer_choice == "Scissors":\n    print("You win!")\nelif player_choice == "Paper" and computer_choice == "Rock":\n    print("You win!")\nelif player_choice == "Scissors" and computer_choice == "Paper":\n    print("You win!")\nelse:\n    print("Computer wins!")',
      check: {
        q: 'player_choice="Paper", computer_choice="Rock". What prints with the code above?',
        options: ['Tie!', 'You win!', 'Computer wins!', 'Nothing'],
        correct: 1,
        why: 'Paper beats Rock, which matches the second elif condition exactly.',
      },
    },
    {
      id: 'py4j',
      title: 'Worked example: building Rock Paper Scissors',
      type: 'worked',
      minutes: 6,
      body:
        'Step 1 — import random at the top, since it is needed before anything else runs.\n\nStep 2 — store the three options in a list, so both the player prompt and the computer\'s random choice can reference the same source of truth.\n\nStep 3 — get the player\'s choice and the computer\'s random choice.\n\nStep 4 — compare and print the result using the win-condition chain from the previous part.',
      code: 'import random\n\noptions = ["Rock", "Paper", "Scissors"]\n\nplayer_choice = input("Rock, Paper, or Scissors? ")\ncomputer_choice = random.choice(options)\nprint(f"Computer chose: {computer_choice}")\n\nif player_choice == computer_choice:\n    print("Tie!")\nelif player_choice == "Rock" and computer_choice == "Scissors":\n    print("You win!")\nelif player_choice == "Paper" and computer_choice == "Rock":\n    print("You win!")\nelif player_choice == "Scissors" and computer_choice == "Paper":\n    print("You win!")\nelse:\n    print("Computer wins!")',
      check: {
        q: 'Why store the options in a list instead of writing random.choice(["Rock","Paper","Scissors"]) inline each time?',
        options: [
          'It runs faster',
          'One list is reused for both the random pick and staying consistent with spelling/casing everywhere it is needed',
          'Lists are required for random.choice() to work at all',
          'It makes no difference either way',
        ],
        correct: 1,
        why: 'Keeping one list as the single source of truth avoids typos like "rock" vs "Rock" causing comparisons to silently fail later.',
      },
    },
    {
      id: 'py4k',
      title: 'Worked example: tracking score across rounds',
      type: 'worked',
      minutes: 6,
      body:
        'The stretch goal needs three counters that persist across rounds, not just a single round\'s result. This means starting each counter at 0 before the game begins, and incrementing the right one each time a round finishes.',
      code: 'wins = 0\nlosses = 0\nties = 0\n\n# ... after each round, inside the win-condition chain:\nif player_choice == computer_choice:\n    ties = ties + 1\n    print("Tie!")\nelif player_choice == "Rock" and computer_choice == "Scissors":\n    wins = wins + 1\n    print("You win!")\n# ... and so on for the other winning conditions,\n# with losses = losses + 1 in the final else\n\nprint(f"Wins: {wins}  Losses: {losses}  Ties: {ties}")',
      check: {
        q: 'Why must wins = 0 be set before the game loop starts, not inside it?',
        options: [
          'It does not matter where it goes',
          'Setting it inside the loop would reset it back to 0 every single round',
          'Python requires all variables at the very top of the file',
          'wins must be a list, not a number',
        ],
        correct: 1,
        why: 'A counter needs to be initialised once, outside the repeating part, or every round would wipe out the previous count.',
      },
    },
  ],
  test: [
    { q: 'What does len(["a", "b", "c"]) return?', options: ['2', '3', '4', 'Error'], correct: 1, why: 'len() counts the items in the list — three strings here.' },
    { q: 'What is the index of the first item in a list?', options: ['1', '0', '-1', 'It depends on the list'], correct: 1, why: 'Python indexing always starts at 0.' },
    { q: 'options = ["a", "b", "c"]. What is options[-1]?', options: ['"a"', '"b"', '"c"', 'IndexError'], correct: 2, why: '-1 refers to the last item in the list.' },
    { q: 'options has 3 items. What happens with options[5]?', options: ['Returns None', 'IndexError', 'Returns the last item', 'Returns an empty list'], correct: 1, why: 'Asking for an index beyond the list\'s length raises IndexError rather than returning a default value.' },
    { q: 'Can a list contain a mix of strings, numbers, and booleans together?', options: ['No, all items must be the same type', 'Yes', 'Only strings and numbers can mix', 'Only if converted first'], correct: 1, why: 'Python lists can hold any mix of types in the same list.' },
    { q: 'scores = [1, 2]. What does scores.append(3) result in?', options: ['[3, 1, 2]', '[1, 2, 3]', '[1, 2]', 'Error, append needs an index'], correct: 1, why: '.append() always adds the new item to the end.' },
    { q: 'Which module provides random.choice()?', options: ['choice', 'random', 'select', 'math'], correct: 1, why: 'random.choice() and random.randint() both live in the random module.' },
    { q: 'What does random.randint(1, 10) return?', options: ['A float between 1 and 10', 'A whole number from 1 to 10, inclusive', 'A whole number from 0 to 9', 'Always 5'], correct: 1, why: 'randint() includes both endpoints as possible results.' },
    { q: 'What happens if you call a module\'s function before importing it?', options: ['Works fine', 'NameError', 'SyntaxError', 'Returns None'], correct: 1, why: 'Python runs top to bottom, so the module name is unrecognised until its import line has executed.' },
    { q: 'options = ["Rock", "Paper", "Scissors"]. options[1] = "Lizard". What is options now?', options: ['["Rock", "Paper", "Scissors"]', '["Rock", "Lizard", "Scissors"]', '["Lizard", "Rock", "Paper", "Scissors"]', 'Error, lists cannot be changed'], correct: 1, why: 'Assigning to an index replaces just that item; the list is mutable.' },
    { q: 'player_choice="Scissors", computer_choice="Paper". Who wins?', options: ['Player', 'Computer', 'Tie', 'Cannot be determined'], correct: 0, why: 'Scissors beats Paper.' },
    { q: 'Why initialise wins = 0 before the game loop rather than inside it?', options: ['It does not matter', 'Inside the loop would reset it every round', 'Python requires it at the top of the file', 'wins must be a string'], correct: 1, why: 'A running counter needs to be set up once outside the repeating section, or it never accumulates.' },
    { q: 'What is the last valid index of a 5-item list?', options: ['5', '4', '-1', 'Both 4 and -1 refer to the last item'], correct: 3, why: 'Index 4 (the 5th position, 0-indexed) and index -1 (counting from the end) both refer to the same last item.' },
    { q: 'Which correctly picks a random item from a list called colors?', options: ['colors.random()', 'random.choice(colors)', 'random.pick(colors)', 'choice(colors)'], correct: 1, why: 'random.choice() takes the list as its argument and returns one randomly selected item.' },
  ],
};
