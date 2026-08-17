// Maths for robotics, from genuinely zero. Order matters here: the
// search-confirmed robotics sequence puts linear algebra first among the
// "real" maths, but you cannot do linear algebra without fractions,
// negatives, and algebra underneath it. So this course does the
// prerequisites properly, then goes straight at what robotics uses.


import { MATH_LESSON_1 } from './mathLesson1';

export const MATH_COURSE = {
  id: 'math_core',
  name: 'Maths for Robotics',
  blurb: 'Fractions through calculus, aimed at what robots actually need.',
  lessons: [
    MATH_LESSON_1,
    {
      id: 'm2',
      title: 'Decimals, percentages and units',
      goal: 'Convert between forms and never mix units again.',
      sections: [
        {
          heading: 'Fractions, decimals, percentages',
          body: 'Three ways to write the same thing. Divide the fraction to get the decimal; multiply by 100 for the percentage.',
          code: '1/2  = 0.5  = 50%\n1/4  = 0.25 = 25%\n3/4  = 0.75 = 75%\n1/3  = 0.333… ≈ 33.3%',
        },
        {
          heading: 'Percentage of a number',
          body: 'Convert the percentage to a decimal and multiply. 20% of 50 is 0.20 × 50 = 10.',
          code: '20% of 50  = 0.20 × 50 = 10\n15% of 200 = 0.15 × 200 = 30',
        },
        {
          heading: 'Units kill real projects',
          body: 'Millimetres and metres, grams and kilograms, degrees and radians. Mixing them silently produces answers that are wrong by factors of 1000. Write units next to every number.',
          code: '250mm = 0.25m\n1500g = 1.5kg\n180°  = π radians ≈ 3.14 rad',
        },
        {
          heading: 'Always sanity-check magnitude',
          body: 'Before trusting a result, ask whether it is plausible. A robot arm needing 4000 N·m is not a small design error — it is a unit mistake.',
          code: 'Torque for 2kg at 0.3m:\n  2 × 9.81 × 0.3 = 5.9 N·m   ✓ plausible\n  2 × 9.81 × 300 = 5886 N·m  ✗ used mm as m',
        },
      ],
      exercises: [
        { prompt: 'What is 25% of 80?', answer: '20', hint: '0.25 × 80.' },
        { prompt: 'Convert 350mm to metres', answer: '0.35', hint: 'Divide by 1000.' },
        { prompt: 'Write 3/4 as a percentage (number only)', answer: '75', hint: '3 ÷ 4 = 0.75, times 100.' },
      ],
      quiz: [
        { q: 'What is 0.4 as a percentage?', options: ['4%', '40%', '0.4%', '400%'], correct: 1, why: 'Multiply the decimal by 100.' },
        { q: 'A torque calculation gives 6000 N·m for a small arm. Most likely cause?', options: ['Correct', 'A unit mix-up, probably mm used as m', 'Motor too weak', 'Rounding'], correct: 1, why: 'Implausible magnitudes almost always mean units, not arithmetic.' },
        { q: '1500g in kilograms?', options: ['15', '1.5', '150', '0.15'], correct: 1, why: 'Divide by 1000.' },
      ],
    },
    {
      id: 'm3',
      title: 'Negatives and order of operations',
      goal: 'Get the right answer when signs and brackets are involved.',
      sections: [
        {
          heading: 'Negative numbers',
          body: 'Below zero. Adding a negative is subtracting. Subtracting a negative is adding — two minuses make a plus.',
          code: '5 + (-3) = 2\n5 - (-3) = 8\n-5 + 3   = -2\n-5 - 3   = -8',
        },
        {
          heading: 'Multiplying and dividing signs',
          body: 'Same signs give positive, different signs give negative. This is worth knowing cold, because sign errors in rotation matrices are miserable to find.',
          code: ' 3 ×  4 =  12\n-3 ×  4 = -12\n-3 × -4 =  12\n-12 ÷ 4 = -3',
        },
        {
          heading: 'BIDMAS / PEMDAS',
          body: 'Brackets, Indices (powers), Division and Multiplication left to right, then Addition and Subtraction left to right.',
          code: '2 + 3 × 4      = 14   (× first)\n(2 + 3) × 4    = 20   (brackets first)\n2 × 3²         = 18   (power first)\n(2 × 3)²       = 36',
        },
        {
          heading: 'Use brackets deliberately',
          body: 'When an expression is ambiguous to read, add brackets even if the precedence already works. Code you can read six months later beats code that is technically minimal.',
          code: '# Both correct, one is readable:\nresult = a + b * c / d\nresult = a + ((b * c) / d)',
        },
      ],
      exercises: [
        { prompt: '7 - (-2) = ?', answer: '9', hint: 'Subtracting a negative adds.' },
        { prompt: '-4 × -5 = ?', answer: '20', hint: 'Two negatives multiply to a positive.' },
        { prompt: '2 + 3 × 2² = ?', answer: '14', hint: 'Power first, then multiply, then add.' },
      ],
      quiz: [
        { q: 'What is -6 ÷ -2?', options: ['-3', '3', '-12', '12'], correct: 1, why: 'Same signs divide to a positive.' },
        { q: 'What is 10 - 2 × 3?', options: ['24', '4', '6', '30'], correct: 1, why: 'Multiplication first: 2×3=6, then 10-6.' },
        { q: 'In BIDMAS, what comes first?', options: ['Addition', 'Brackets', 'Multiplication', 'Subtraction'], correct: 1, why: 'Brackets override everything else.' },
      ],
    },
    {
      id: 'm4',
      title: 'Algebra: solving for x',
      goal: 'Rearrange equations to isolate the unknown.',
      sections: [
        {
          heading: 'An equation is a balance',
          body: 'Whatever you do to one side you must do to the other. That single rule is all of basic algebra.',
          code: 'x + 3 = 7\n  subtract 3 from both sides\nx = 4',
        },
        {
          heading: 'Undo operations in reverse',
          body: 'To isolate x, undo what is done to it, working backwards through the order of operations.',
          code: '2x + 5 = 13\n  -5 both sides →  2x = 8\n  ÷2 both sides →   x = 4',
        },
        {
          heading: 'Variables on both sides',
          body: 'Gather the x terms on one side and the numbers on the other, then divide.',
          code: '5x - 2 = 3x + 8\n  -3x  →  2x - 2 = 8\n  +2   →  2x = 10\n  ÷2   →  x = 5',
        },
        {
          heading: 'Rearranging formulas',
          body: 'The same rule lets you solve any formula for any variable — which is exactly what you do when sizing motors from a torque requirement.',
          code: 'τ = m × g × r\n\nSolve for r:\n  r = τ / (m × g)',
        },
      ],
      exercises: [
        { prompt: 'Solve: 3x + 6 = 21\n(x = ?)', answer: '5', hint: 'Subtract 6, then divide by 3.' },
        { prompt: 'Solve: 4x - 3 = 2x + 7\n(x = ?)', answer: '5', hint: 'Subtract 2x from both sides first.' },
        { prompt: 'If V = I × R, and V = 12, R = 4, what is I?', answer: '3', hint: 'I = V / R.' },
      ],
      quiz: [
        { q: 'What is the core rule of solving equations?', options: ['Move x left', 'Do the same to both sides', 'Divide first', 'Remove brackets'], correct: 1, why: 'The equation stays balanced only if both sides get identical treatment.' },
        { q: 'Solve 2x = 10', options: ['x = 20', 'x = 5', 'x = 8', 'x = 12'], correct: 1, why: 'Divide both sides by 2.' },
        { q: 'To isolate x in 3x + 2 = 11, what comes first?', options: ['Divide by 3', 'Subtract 2', 'Add 2', 'Multiply by 3'], correct: 1, why: 'Undo in reverse order: the addition goes before the multiplication.' },
      ],
    },
    {
      id: 'm5',
      title: 'Powers, roots and scientific notation',
      goal: 'Handle very large and very small numbers cleanly.',
      sections: [
        {
          heading: 'Powers',
          body: 'x² means x times itself. x³ is three copies multiplied. Anything to the power 0 is 1.',
          code: '2² = 4\n2³ = 8\n2⁰ = 1\n2⁻¹ = 1/2 = 0.5',
        },
        {
          heading: 'Roots undo powers',
          body: 'The square root asks: what number times itself gives this? It appears constantly in distance and magnitude calculations.',
          code: '√9  = 3\n√16 = 4\n√2  ≈ 1.414',
        },
        {
          heading: 'Pythagoras: distance',
          body: 'The distance between two points is a right triangle. This is the single most-used formula in robotics after basic arithmetic.',
          code: 'a² + b² = c²\n\nLegs 3 and 4:\n  9 + 16 = 25\n  c = √25 = 5',
        },
        {
          heading: 'Scientific notation',
          body: 'A compact way of writing extreme values. Moving the decimal right is a positive exponent, left is negative.',
          code: '5000    = 5 × 10³\n0.005   = 5 × 10⁻³\n1200000 = 1.2 × 10⁶',
        },
      ],
      exercises: [
        { prompt: 'What is 3² + 4²?', answer: '25', hint: '9 + 16.' },
        { prompt: 'A right triangle has legs 6 and 8. Hypotenuse?', answer: '10', hint: '36 + 64 = 100, then square root.' },
        { prompt: 'Write 0.02 in scientific notation as 2 × 10^n. What is n?', answer: '-2', hint: 'The decimal moves two places right.' },
      ],
      quiz: [
        { q: 'What is √49?', options: ['7', '24.5', '9', '14'], correct: 0, why: '7 × 7 = 49.' },
        { q: 'Distance between two points uses which formula?', options: ['Ohm\'s law', 'Pythagoras', 'BIDMAS', 'Scientific notation'], correct: 1, why: 'The difference in x and y form a right triangle.' },
        { q: 'What is 2⁰?', options: ['0', '1', '2', 'Undefined'], correct: 1, why: 'Anything to the power zero equals 1.' },
      ],
    },
    {
      id: 'm6',
      title: 'Trigonometry',
      goal: 'Relate angles to distances — how robots know where things are.',
      sections: [
        {
          heading: 'The three ratios',
          body: 'In a right triangle: sin = opposite/hypotenuse, cos = adjacent/hypotenuse, tan = opposite/adjacent. SOH-CAH-TOA is the standard mnemonic.',
          code: 'sin θ = opposite / hypotenuse\ncos θ = adjacent / hypotenuse\ntan θ = opposite / adjacent',
        },
        {
          heading: 'Values worth memorising',
          body: 'These five appear so often that recall saves real time.',
          code: 'θ     sin      cos\n0°    0        1\n30°   1/2      √3/2\n45°   √2/2     √2/2\n60°   √3/2     1/2\n90°   1        0',
        },
        {
          heading: 'Finding an angle',
          body: 'The inverse functions go backwards from a ratio to the angle. Robotics code uses atan2 rather than atan, because it gets the quadrant right.',
          code: 'θ = arcsin(opposite / hypotenuse)\n\nOpposite 3, hypotenuse 5:\n  arcsin(0.6) ≈ 36.87°',
        },
        {
          heading: 'Radians, not degrees',
          body: 'Every programming maths library works in radians. π radians = 180°. Forgetting to convert is one of the most common robotics bugs.',
          code: '180° = π rad ≈ 3.1416\n90°  = π/2 ≈ 1.5708\n\ndegrees → radians: × π/180',
        },
      ],
      exercises: [
        { prompt: 'sin(30°) = ?\n(give as a fraction a/b)', answer: '1/2', hint: 'One of the memorised values.' },
        { prompt: 'Right triangle, legs 5 and 12. Hypotenuse?', answer: '13', hint: '25 + 144 = 169.' },
        { prompt: 'How many degrees is π radians?', answer: '180', hint: 'Half a full turn.' },
      ],
      quiz: [
        { q: 'cos(0°) equals?', options: ['0', '1', '1/2', 'undefined'], correct: 1, why: 'At 0° the adjacent side equals the hypotenuse.' },
        { q: 'Why do maths libraries use radians?', options: ['Tradition', 'It is the natural unit for the underlying maths', 'More precise', 'Smaller numbers'], correct: 1, why: 'Radians make the calculus of trig functions clean, so libraries standardise on them.' },
        { q: 'Which ratio is opposite over adjacent?', options: ['sin', 'cos', 'tan', 'None'], correct: 2, why: 'TOA — tangent is opposite over adjacent.' },
      ],
    },
    {
      id: 'm7',
      title: 'Vectors',
      goal: 'Describe position and direction — the language of robot motion.',
      sections: [
        {
          heading: 'A vector has magnitude and direction',
          body: 'Written as components. [3, 4] means 3 across and 4 up. It can represent a position, a velocity, or a force.',
          code: 'v = [3, 4]\n\nAdding: add components\n[3, 4] + [1, 2] = [4, 6]\n\nScaling: multiply each\n[3, 4] × 2 = [6, 8]',
        },
        {
          heading: 'Magnitude is Pythagoras',
          body: 'The length of a vector. This is why the earlier lesson mattered — magnitude is used constantly for distances and speeds.',
          code: '|[3, 4]| = √(3² + 4²)\n         = √25\n         = 5',
        },
        {
          heading: 'Dot product measures alignment',
          body: 'Multiply matching components and add. Zero means perpendicular, positive means roughly the same direction, negative means opposing.',
          code: '[1, 0] · [0, 1] = 0 + 0 = 0      → perpendicular\n[1, 0] · [1, 0] = 1 + 0 = 1      → aligned\n[1, 0] · [-1, 0] = -1            → opposite',
        },
        {
          heading: 'Unit vectors',
          body: 'A vector of length 1, used purely to express direction. Divide a vector by its own magnitude to normalise it.',
          code: '[3, 4] has magnitude 5\nunit = [3/5, 4/5] = [0.6, 0.8]\nmagnitude of unit = 1',
        },
      ],
      exercises: [
        { prompt: '[2, 3] + [4, 1] = ?\n(write as a,b)', answer: '6,4', hint: 'Add matching components.' },
        { prompt: 'Magnitude of [6, 8]?', answer: '10', hint: '√(36+64).' },
        { prompt: '[2, 3] · [4, 1] = ?', answer: '11', hint: '2×4 + 3×1.' },
      ],
      quiz: [
        { q: 'A dot product of 0 means the vectors are?', options: ['Identical', 'Perpendicular', 'Opposite', 'Parallel'], correct: 1, why: 'cos(90°) = 0, so perpendicular vectors have zero dot product.' },
        { q: 'What is a unit vector?', options: ['A vector of length 1', 'A vector along x', 'An integer vector', 'A zero vector'], correct: 0, why: 'It carries direction only, with magnitude normalised to 1.' },
        { q: 'How do you find a vector\'s magnitude?', options: ['Add the components', 'Pythagoras on the components', 'Multiply components', 'Take the largest'], correct: 1, why: 'Square each component, sum, square root.' },
      ],
    },
    {
      id: 'm8',
      title: 'Matrices and rotation',
      goal: 'Transform points in space — the core of kinematics.',
      sections: [
        {
          heading: 'A matrix is a grid of numbers',
          body: 'Described by rows × columns. A 2×2 matrix transforms 2D vectors; a 3×3 transforms 3D.',
          code: 'M = [ 1  2 ]\n    [ 3  4 ]\n\nshape: 2 rows, 2 columns',
        },
        {
          heading: 'Matrix times vector',
          body: 'Each output component is the dot product of a matrix row with the vector. This is the operation that rotates and scales points.',
          code: '[ 1  2 ] × [ 5 ] = [ 1×5 + 2×6 ] = [ 17 ]\n[ 3  4 ]   [ 6 ]   [ 3×5 + 4×6 ]   [ 39 ]',
        },
        {
          heading: 'The rotation matrix',
          body: 'Rotating a point by θ about the origin. Worth knowing by heart — it appears in every arm, every camera transform, every frame conversion.',
          code: 'R(θ) = [ cosθ  -sinθ ]\n       [ sinθ   cosθ ]\n\nx\' = x·cosθ − y·sinθ\ny\' = x·sinθ + y·cosθ',
        },
        {
          heading: 'Order matters',
          body: 'AB does not equal BA. Rotating then translating puts a robot somewhere different from translating then rotating — a bug that looks like a sensor fault.',
          code: 'Rotate 90° then move +1 x:\n  [1,0] → [0,1] → [1,1]\n\nMove +1 x then rotate 90°:\n  [1,0] → [2,0] → [0,2]',
        },
      ],
      exercises: [
        { prompt: 'Rotate [1, 0] by 90°.\n(write as x,y)', answer: '0,1', hint: 'cos90=0, sin90=1.' },
        { prompt: 'Determinant of [[3,1],[2,4]]?\n(ad − bc)', answer: '10', hint: '3×4 − 1×2.' },
        { prompt: 'Rotate [0, 1] by 180°.\n(write as x,y)', answer: '0,-1', hint: 'cos180=-1, sin180=0.' },
      ],
      quiz: [
        { q: 'Does matrix multiplication commute (AB = BA)?', options: ['Always', 'Never', 'Not in general', 'Only 2×2'], correct: 2, why: 'Order changes the result, which is why transform order is a common source of bugs.' },
        { q: 'What does a rotation matrix preserve?', options: ['Direction', 'Magnitude', 'Sign', 'Nothing'], correct: 1, why: 'Rotation changes direction but never length.' },
        { q: 'Rotating [1,0] by 90° gives?', options: ['[0,1]', '[1,0]', '[-1,0]', '[0,-1]'], correct: 0, why: 'x\'=1·0−0·1=0, y\'=1·1+0·0=1.' },
      ],
    },
    {
      id: 'm9',
      title: 'Derivatives',
      goal: 'Measure rates of change — the basis of control.',
      sections: [
        {
          heading: 'A derivative is a rate of change',
          body: 'How fast something changes as something else changes. Position changing over time is velocity; velocity changing is acceleration.',
          code: 'position  → derivative → velocity\nvelocity  → derivative → acceleration',
        },
        {
          heading: 'The power rule',
          body: 'For xⁿ, bring the exponent down as a multiplier and reduce the exponent by 1. This covers most of what you need early on.',
          code: 'd/dx (x³)   = 3x²\nd/dx (5x²)  = 10x\nd/dx (4x)   = 4\nd/dx (7)    = 0   (constants do not change)',
        },
        {
          heading: 'Term by term',
          body: 'Differentiate each term separately and keep the signs. Longer expressions are not harder, just longer.',
          code: 'f(x) = 3x³ + 2x² + 5x + 9\n\nf\'(x) = 9x² + 4x + 5',
        },
        {
          heading: 'Why control needs this',
          body: 'The D in PID is a derivative of the error signal. It responds to how fast you are approaching the target, which is what damps overshoot.',
          code: 'error changing fast  → large derivative → strong damping\nerror steady         → zero derivative  → no damping',
        },
      ],
      exercises: [
        { prompt: 'Differentiate 4x³\n(write as Ax^B, e.g. 6x^2)', answer: '12x^2', hint: 'Bring down 3, reduce power to 2.' },
        { prompt: 'Differentiate 7x + 3\n(number only)', answer: '7', hint: 'The constant differentiates to 0.' },
        { prompt: 'f(x) = 2x². What is f\'(3)?', answer: '12', hint: "f'(x) = 4x, then substitute 3." },
      ],
      quiz: [
        { q: 'The derivative of a constant is?', options: ['The constant', '0', '1', 'Undefined'], correct: 1, why: 'A constant never changes, so its rate of change is zero.' },
        { q: 'Differentiating position with respect to time gives?', options: ['Acceleration', 'Velocity', 'Distance', 'Force'], correct: 1, why: 'Rate of change of position is velocity.' },
        { q: 'd/dx of x⁵ is?', options: ['5x⁴', 'x⁴', '5x⁶', '4x⁵'], correct: 0, why: 'Power rule: exponent down as multiplier, reduce by one.' },
      ],
    },
    {
      id: 'm10',
      title: 'Integrals',
      goal: 'Accumulate change — the other half of calculus.',
      sections: [
        {
          heading: 'An integral accumulates',
          body: 'The reverse of differentiating. Integrating velocity over time gives distance travelled; integrating error over time is the I in PID.',
          code: 'velocity → integral → distance\nacceleration → integral → velocity',
        },
        {
          heading: 'Reverse the power rule',
          body: 'Add 1 to the exponent, then divide by the new exponent. The +C exists because any constant differentiates to zero, so it cannot be recovered.',
          code: '∫ x² dx = x³/3 + C\n∫ 6x² dx = 2x³ + C\n∫ 4x dx  = 2x² + C',
        },
        {
          heading: 'Area under a curve',
          body: 'A definite integral has limits and gives a number: the area between the curve and the axis. That area is the accumulated quantity.',
          code: '∫₀² 2x dx\n  = [x²]₀²\n  = 4 − 0\n  = 4',
        },
        {
          heading: 'Integral windup',
          body: 'In a PID controller, if the output saturates the integral keeps accumulating error it cannot act on. When it is finally released the response overshoots badly — a real failure with a mathematical cause.',
          code: 'error accumulating while stuck\n  → huge I term\n  → violent overshoot on release',
        },
      ],
      exercises: [
        { prompt: '∫ 6x² dx (ignore +C)\nWrite as Ax^B', answer: '2x^3', hint: 'Add 1 to the power, divide by the new power.' },
        { prompt: '∫ 4x dx (ignore +C)\nWrite as Ax^B', answer: '2x^2', hint: '4 ÷ 2 = 2.' },
        { prompt: 'A robot moves at 3 m/s for 4 seconds. Distance?', answer: '12', hint: 'Constant velocity integrated over time is just v × t.' },
      ],
      quiz: [
        { q: 'Integrating velocity over time gives?', options: ['Acceleration', 'Distance', 'Force', 'Jerk'], correct: 1, why: 'Accumulating velocity over time is distance travelled.' },
        { q: 'Why does an indefinite integral have +C?', options: ['Convention', 'Any constant differentiates to zero and cannot be recovered', 'For accuracy', 'It does not'], correct: 1, why: 'The original constant is lost during differentiation.' },
        { q: 'Which PID term is an integral?', options: ['P', 'I', 'D', 'None'], correct: 1, why: 'I accumulates error over time, exactly as an integral does.' },
      ],
    },
  ],
};

