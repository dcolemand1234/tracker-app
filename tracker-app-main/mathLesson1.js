// Same shape as the Python lessons (video, project, parts[], test[]) but
// `steps` replaces `code` throughout — plain worked arithmetic, no
// variable-assignment syntax, no comments, nothing that reads as a
// programming language. Rendered by StepsBlock in CoursePlayer, a
// visually distinct component from CodeBlock.

export const MATH_LESSON_1 = {
  id: 'm1',
  title: 'Fractions',
  goal: 'Work with parts of a whole confidently, without reaching for a calculator.',
  time: '35-50 min total',
  video: {
    title: 'Adding and Subtracting Fractions',
    source: 'Math Antics',
    videoId: '5juto2ze8Lg',
    start: 0,
    end: 480,
    note:
      'Real, verified video (youtube.com/watch?v=5juto2ze8Lg). The end timestamp is a safe overestimate — Math Antics videos run under 8 minutes, so playback will simply end naturally before hitting it. Worth a one-time check against the actual runtime.',
  },
  project: {
    name: 'Rotate a point, by hand then in code',
    brief:
      'This is the project for the whole Maths phase, not just this lesson — later lessons unlock more of what it needs. For now: fractions show up the moment you scale anything by a ratio. A robot arm has three segments. The first is 40cm. Each following segment is a fraction of the one before it.',
    steps:
      'Segment 1 = 40 cm\n\nSegment 2 is 3/4 the length of Segment 1:\nSegment 2 = 40 × 3/4\n          = 120/4\n          = 30 cm\n\nSegment 3 is 2/3 the length of Segment 2:\nSegment 3 = 30 × 2/3\n          = 60/3\n          = 20 cm\n\nTotal arm length = 40 + 30 + 20 = 90 cm',
    stretch:
      'Do the same with a fourth segment that is 5/6 the length of Segment 3, and find the new total. Keep every step as a fraction until the final line — do not switch to decimals partway through.',
    check: {
      q: 'Segment 1 = 40cm. Segment 2 is 3/4 of that. How long is Segment 2?',
      options: ['25cm', '30cm', '32cm', '35cm'],
      correct: 1,
      why: '40 × 3/4 = 120/4 = 30.',
    },
  },
  parts: [
    {
      id: 'm1a',
      title: 'What a fraction actually is',
      type: 'concept',
      minutes: 3,
      body:
        'A fraction is a division written and held unresolved. The bottom number (denominator) says how many equal parts the whole is split into. The top (numerator) says how many of those parts you have.\n\n3/4 means: split the whole into 4 equal parts, take 3 of them.',
      steps: 'Three quarters, written 3/4:\n\nnumerator  →  3\ndenominator →  4\n\nSame value, different form:\n1/2  =  2/4  =  4/8  =  0.5',
      check: {
        q: 'In 5/8, what does the 8 tell you?',
        options: ['How many parts you have', 'How many equal parts the whole is split into', 'The answer', 'Nothing, it is decoration'],
        correct: 1,
        why: 'The denominator (bottom) sets the size of each part; the numerator (top) counts how many you have.',
      },
    },
    {
      id: 'm1b',
      title: 'Adding needs a common denominator',
      type: 'concept',
      minutes: 5,
      body:
        'You can only add pieces that are the same size. Quarters and thirds are different-sized slices — you cannot combine them directly. Convert both fractions to the same denominator first, then add the tops and leave the bottom alone.',
      steps:
        '1/4 + 1/4  =  2/4  =  1/2\n(already the same size)\n\n1/2 + 1/3:\n  1/2  =  3/6   (multiply top and bottom by 3)\n  1/3  =  2/6   (multiply top and bottom by 2)\n\n3/6 + 2/6  =  5/6',
      check: {
        q: 'What is 1/3 + 1/6?',
        options: ['2/9', '1/2', '2/6', '1/18'],
        correct: 1,
        why: '1/3 = 2/6, so 2/6 + 1/6 = 3/6, which reduces to 1/2.',
      },
    },
    {
      id: 'm1c',
      title: 'Finding a common denominator quickly',
      type: 'concept',
      minutes: 4,
      body:
        'The safest common denominator is always the two denominators multiplied together — it always works, even if it is not the smallest possible one. Once you are comfortable, you can look for a smaller one (the lowest common multiple), but "multiply them together" never fails.',
      steps:
        '1/6 + 1/4:\n\nsafe common denominator  =  6 × 4  =  24\n\n1/6  =  4/24\n1/4  =  6/24\n\n4/24 + 6/24  =  10/24  =  5/12   (reduced)',
      check: {
        q: 'What is a common denominator for 1/5 and 1/7 that is guaranteed to work?',
        options: ['12', '35', '5', '7'],
        correct: 1,
        why: '5 × 7 = 35. Multiplying the two denominators together always gives a valid common denominator.',
      },
    },
    {
      id: 'm1d',
      title: 'Multiplying fractions',
      type: 'concept',
      minutes: 3,
      body:
        'Multiplication is the easy operation with fractions — no common denominator needed. Multiply the tops together, multiply the bottoms together, done.',
      steps: '2/3 × 3/4:\n\ntop:     2 × 3  =  6\nbottom:  3 × 4  =  12\n\n6/12  =  1/2   (reduced)',
      check: {
        q: 'What is 1/2 × 2/5?',
        options: ['3/7', '1/5', '2/10', '2/7'],
        correct: 1,
        why: 'top: 1×2=2, bottom: 2×5=10, giving 2/10 which reduces to 1/5.',
      },
    },
    {
      id: 'm1e',
      title: 'Dividing fractions: flip and multiply',
      type: 'concept',
      minutes: 4,
      body:
        'Dividing by a fraction means flipping the second fraction upside down (its reciprocal) and multiplying instead. This feels arbitrary the first time — the reason is that dividing by 1/4 is really asking "how many quarters fit in this", which is the same question as multiplying by 4.',
      steps:
        '1/2 ÷ 1/4\n\n=  1/2 × 4/1     (flip the second fraction)\n=  4/2\n=  2\n\nCheck: how many quarters fit in a half? Two.',
      check: {
        q: 'What is 2/3 ÷ 1/3?',
        options: ['2/9', '2', '1/2', '3'],
        correct: 1,
        why: '2/3 × 3/1 = 6/3 = 2. Two thirds contains two one-thirds.',
      },
    },
    {
      id: 'm1f',
      title: 'Reducing to lowest terms',
      type: 'concept',
      minutes: 3,
      body:
        'A fraction is fully reduced when the top and bottom share no common factor except 1. Find the largest number that divides evenly into both, and divide both by it. Always reduce your final answer — an un-reduced fraction is not wrong, but it reads as unfinished work.',
      steps: '6/8   ÷ 2  →  3/4\n10/15 ÷ 5  →  2/3\n9/12  ÷ 3  →  3/4',
      check: {
        q: 'What is 12/16 in lowest terms?',
        options: ['6/8', '3/4', '4/5', 'It is already reduced'],
        correct: 1,
        why: '12 and 16 both divide by 4, giving 3/4, which shares no common factor.',
      },
    },
    {
      id: 'm1g',
      title: 'Mixed numbers and improper fractions',
      type: 'concept',
      minutes: 4,
      body:
        'A mixed number like 2 1/2 combines a whole number and a fraction. An improper fraction like 5/2 has a top bigger than the bottom. They are the same value in two forms, and worked problems switch between them constantly.',
      steps:
        'Mixed → improper: multiply the whole number by the denominator, add the numerator, keep the denominator\n\n2 1/2  →  (2×2 + 1)/2  =  5/2\n\nImproper → mixed: divide; the remainder becomes the new numerator\n\n11/4  →  11 ÷ 4 = 2 remainder 3  →  2 3/4',
      check: {
        q: 'What is 13/4 as a mixed number?',
        options: ['3 1/4', '3 1/2', '4 1/4', '3 3/4'],
        correct: 0,
        why: '13 ÷ 4 = 3 remainder 1, giving 3 1/4.',
      },
    },
    {
      id: 'm1h',
      title: 'Where fraction arithmetic goes wrong',
      type: 'warning',
      minutes: 4,
      body:
        'The single most common mistake: adding tops and bottoms straight across, like 1/2 + 1/3 = 2/5. That is not how addition works for fractions — it happens to be how multiplication works for the numerators alone, which is exactly the trap. Always convert to a common denominator before adding or subtracting.',
      steps: 'Wrong:\n1/2 + 1/3  =  2/5\n\nRight:\n1/2 + 1/3\n  =  3/6 + 2/6\n  =  5/6',
      check: {
        q: 'Why is 1/2 + 1/3 = 2/5 wrong?',
        options: ['It is actually correct', 'You cannot add fractions directly across without a common denominator', 'The answer should be negative', '5 is not a valid denominator'],
        correct: 1,
        why: 'Adding numerators and denominators straight across ignores that the two fractions represent differently-sized parts.',
      },
    },
    {
      id: 'm1i',
      title: 'Worked example: scaling a robot arm segment',
      type: 'worked',
      minutes: 5,
      body:
        'Step 1 — read what the fraction is telling you: "3/4 the length" means multiply by 3/4.\n\nStep 2 — write the whole number as a fraction over 1, so the multiplication rule from earlier applies directly.\n\nStep 3 — multiply straight across, then reduce.',
      steps:
        'Segment 1  =  40 cm\nratio      =  3/4\n\nSegment 2  =  40 × 3/4\n           =  40/1 × 3/4\n           =  120/4\n           =  30 cm',
      check: {
        q: 'A segment is 60cm. The next one is 2/3 of that length. How long is it?',
        options: ['30cm', '40cm', '45cm', '90cm'],
        correct: 1,
        why: '60 × 2/3 = 120/3 = 40.',
      },
    },
    {
      id: 'm1j',
      title: 'Worked example: adding three unequal segments',
      type: 'worked',
      minutes: 6,
      body:
        'This is the stretch problem from the project, worked in full. Three arm segments: 40cm, then 3/4 of that, then 2/3 of the second one. The total length needs all three added together — and each step uses a different fraction, so it pulls in everything from this lesson at once.',
      steps:
        'Segment 1  =  40\nSegment 2  =  40 × 3/4  =  30\nSegment 3  =  30 × 2/3  =  20\n\nTotal  =  40 + 30 + 20  =  90 cm\n\n(Every step happened to land on a whole number, so no\ncommon denominator was needed here. That will not\nalways happen — which is exactly why the earlier\nsteps matter.)',
      check: {
        q: 'Segment 1 = 40, Segment 2 = 3/4 of it, Segment 3 = 1/2 of Segment 2. Total length?',
        options: ['70cm', '75cm', '85cm', '90cm'],
        correct: 1,
        why: 'Segment 2 = 30, Segment 3 = 15. 40 + 30 + 15 = 85.',
      },
    },
  ],
  test: [
    { q: 'What does the denominator of a fraction tell you?', options: ['How many parts you have', 'How many equal parts the whole is split into', 'The final answer', 'Nothing important'], correct: 1, why: 'The denominator sets the size of each equal part.' },
    { q: 'What is 1/4 + 1/4?', options: ['2/8', '1/2', '2/4', 'Both 1/2 and 2/4 are correct'], correct: 3, why: '2/4 is the direct sum; 1/2 is the same value reduced. Both are correct.' },
    { q: 'What is 1/2 + 1/3?', options: ['2/5', '5/6', '3/6', '2/6'], correct: 1, why: 'Convert to sixths: 3/6 + 2/6 = 5/6.' },
    { q: 'What is 2/3 × 3/5?', options: ['6/15', '2/5', 'Both 6/15 and 2/5 are correct', '5/8'], correct: 2, why: '2×3=6 and 3×5=15 gives 6/15, which reduces to 2/5. Both forms are valid.' },
    { q: 'What is 3/4 ÷ 1/2?', options: ['3/8', '1 1/2', '3/2', 'Both 1 1/2 and 3/2 are correct'], correct: 3, why: '3/4 × 2/1 = 6/4 = 3/2, which as a mixed number is 1 1/2. Both are the same value.' },
    { q: 'Reduce 8/12 to lowest terms.', options: ['4/6', '2/3', '2/6', '1/2'], correct: 1, why: 'Both 8 and 12 divide by 4, giving 2/3, which cannot be reduced further.' },
    { q: 'What is 2 1/2 as an improper fraction?', options: ['2/5', '5/2', '3/2', '4/2'], correct: 1, why: '(2×2 + 1)/2 = 5/2.' },
    { q: 'What is 11/3 as a mixed number?', options: ['3 1/3', '3 2/3', '2 2/3', '4'], correct: 1, why: '11 ÷ 3 = 3 remainder 2, giving 3 2/3.' },
    { q: 'Why can you not add 1/2 + 1/3 by adding straight across?', options: ['You can, that is correct', 'The pieces are different sizes until converted to a common denominator', 'Fractions cannot be added at all', '3 is a prime number'], correct: 1, why: 'A half and a third are different-sized slices; they need converting to the same size before combining.' },
    { q: 'What is a common denominator for 1/4 and 1/6 that is guaranteed to work (not necessarily the smallest)?', options: ['10', '24', '2', '12'], correct: 1, why: '4 × 6 = 24 always works, even though 12 is the smaller lowest common multiple.' },
    { q: 'A segment is 50cm. The next is 4/5 of that length. How long is it?', options: ['35cm', '40cm', '45cm', '10cm'], correct: 1, why: '50 × 4/5 = 200/5 = 40.' },
    { q: 'What is 5/6 - 1/3?', options: ['4/3', '1/2', '4/6', 'Both 1/2 and 4/6 are correct'], correct: 3, why: '1/3 = 2/6, so 5/6 - 2/6 = 3/6, which reduces to 1/2. Both forms are the same value.' },
    { q: 'What is the reciprocal of 2/5, used when dividing?', options: ['5/2', '-2/5', '2/5', '1/5'], correct: 0, why: 'The reciprocal flips numerator and denominator: 2/5 becomes 5/2.' },
    { q: 'What is 1/3 × 1/3?', options: ['1/6', '2/3', '1/9', '1/3'], correct: 2, why: 'Multiply straight across: 1×1=1, 3×3=9, giving 1/9.' },
  ],
};
