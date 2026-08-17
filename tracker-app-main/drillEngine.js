// Two kinds of practice, because two kinds of knowledge need practising.
//
// GENERATED drills produce a fresh problem every time from a rule. Right
// for maths, where the point is repetition until a method is automatic —
// a fixed bank of twenty questions gets memorised rather than learned.
//
// QUIZ drills are authored scenarios with explanations. Right for
// judgement — "your soil test shows pH 5.2, what does that mean" has no
// formula, and the explanation is where the learning actually happens.
//
// Every drill declares levels. You climb by getting a run of answers
// right, and drop back a level after repeated misses, so difficulty
// tracks ability instead of a schedule.

function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function gcd(a, b) {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// --- maths generators ------------------------------------------------

function genArithmetic(level) {
  if (level === 0) {
    const a = ri(2, 20), b = ri(2, 20);
    const op = pick(['+', '-']);
    const ans = op === '+' ? a + b : a - b;
    return { question: `${a} ${op} ${b} = ?`, answer: ans };
  }
  if (level === 1) {
    const a = ri(2, 12), b = ri(2, 12);
    return { question: `${a} × ${b} = ?`, answer: a * b };
  }
  if (level === 2) {
    const b = ri(2, 12), ans = ri(2, 12);
    return { question: `${b * ans} ÷ ${b} = ?`, answer: ans };
  }
  // fractions reduced to lowest terms
  const d = ri(2, 9), n1 = ri(1, d - 1), n2 = ri(1, d - 1);
  const num = n1 + n2;
  const g = gcd(num, d);
  return {
    question: `${n1}/${d} + ${n2}/${d} = ?  (give as a/b in lowest terms)`,
    answer: `${num / g}/${d / g}`,
    isText: true,
  };
}

function genAlgebra(level) {
  if (level === 0) {
    const x = ri(1, 12), a = ri(2, 9), b = ri(1, 20);
    return { question: `Solve for x:   ${a}x + ${b} = ${a * x + b}`, answer: x };
  }
  if (level === 1) {
    const x = ri(2, 10), a = ri(2, 6), b = ri(1, 10), c = ri(2, 5);
    return {
      question: `Solve for x:   ${a}x − ${b} = ${c}x + ${(a - c) * x - b - 0}`.replace(
        /\+ -/, '− '
      ),
      answer: x,
    };
  }
  if (level === 2) {
    const a = ri(1, 6), b = ri(1, 6);
    return {
      question: `Expand:   (x + ${a})(x + ${b})\nGive as x^2 + Bx + C — enter B,C`,
      answer: `${a + b},${a * b}`,
      isText: true,
    };
  }
  const r1 = ri(1, 8), r2 = ri(1, 8);
  return {
    question: `Solve:   x² − ${r1 + r2}x + ${r1 * r2} = 0\nEnter both roots, smallest first, as a,b`,
    answer: `${Math.min(r1, r2)},${Math.max(r1, r2)}`,
    isText: true,
  };
}

function genTrig(level) {
  const table = [
    { deg: 0, sin: '0', cos: '1' },
    { deg: 30, sin: '1/2', cos: '√3/2' },
    { deg: 45, sin: '√2/2', cos: '√2/2' },
    { deg: 60, sin: '√3/2', cos: '1/2' },
    { deg: 90, sin: '1', cos: '0' },
  ];
  if (level === 0) {
    const t = pick(table);
    const fn = pick(['sin', 'cos']);
    return {
      question: `${fn}(${t.deg}°) = ?`,
      answer: fn === 'sin' ? t.sin : t.cos,
      isText: true,
      hint: 'Use exact values: 0, 1/2, √2/2, √3/2, 1',
    };
  }
  if (level === 1) {
    const a = pick([3, 6, 9]), b = a * (4 / 3);
    return {
      question: `Right triangle with legs ${a} and ${b}. What is the hypotenuse?`,
      answer: Math.round(Math.sqrt(a * a + b * b) * 100) / 100,
      hint: 'Pythagoras: a² + b² = c²',
    };
  }
  if (level === 2) {
    const opp = ri(3, 12), hyp = opp + ri(2, 8);
    const deg = Math.round((Math.asin(opp / hyp) * 180) / Math.PI);
    return {
      question: `Opposite = ${opp}, hypotenuse = ${hyp}. Find the angle in degrees (nearest whole).`,
      answer: deg,
      hint: 'θ = arcsin(opposite / hypotenuse)',
    };
  }
  const deg = pick([30, 45, 60, 90, 120, 180]);
  return {
    question: `Convert ${deg}° to radians as a multiple of π.\nEnter like 1/2 for π/2, or 1 for π.`,
    answer: (() => {
      const g = gcd(deg, 180);
      const n = deg / g, d = 180 / g;
      return d === 1 ? `${n}` : `${n}/${d}`;
    })(),
    isText: true,
  };
}

function genLinearAlgebra(level) {
  if (level === 0) {
    const a = [ri(1, 6), ri(1, 6)], b = [ri(1, 6), ri(1, 6)];
    return {
      question: `Dot product:   [${a}] · [${b}] = ?`,
      answer: a[0] * b[0] + a[1] * b[1],
      hint: 'Multiply matching components, then add.',
    };
  }
  if (level === 1) {
    const v = [ri(1, 8), ri(1, 8)];
    const mag = Math.round(Math.sqrt(v[0] ** 2 + v[1] ** 2) * 100) / 100;
    return { question: `Magnitude of vector [${v}] = ?  (2 dp)`, answer: mag };
  }
  if (level === 2) {
    const m = [[ri(1, 5), ri(1, 5)], [ri(1, 5), ri(1, 5)]];
    return {
      question: `Determinant of\n[ ${m[0][0]}  ${m[0][1]} ]\n[ ${m[1][0]}  ${m[1][1]} ]`,
      answer: m[0][0] * m[1][1] - m[0][1] * m[1][0],
      hint: 'ad − bc',
    };
  }
  const deg = pick([0, 90, 180, 270]);
  const pt = [ri(1, 5), ri(1, 5)];
  const rad = (deg * Math.PI) / 180;
  const x = Math.round(pt[0] * Math.cos(rad) - pt[1] * Math.sin(rad));
  const y = Math.round(pt[0] * Math.sin(rad) + pt[1] * Math.cos(rad));
  return {
    question: `Rotate point [${pt}] by ${deg}° about the origin.\nEnter as x,y`,
    answer: `${x},${y}`,
    isText: true,
    hint: 'x\' = x·cosθ − y·sinθ,   y\' = x·sinθ + y·cosθ',
  };
}

function genCalculus(level) {
  if (level === 0) {
    const a = ri(2, 9), n = ri(2, 5);
    return {
      question: `Differentiate:   f(x) = ${a}x^${n}\nEnter as Ax^B, e.g. 6x^2`,
      answer: `${a * n}x^${n - 1}`,
      isText: true,
      hint: 'Power rule: bring the exponent down, subtract one from it.',
    };
  }
  if (level === 1) {
    const a = ri(2, 6), b = ri(2, 9), c = ri(1, 9);
    return {
      question: `Differentiate:   f(x) = ${a}x^3 + ${b}x^2 + ${c}x\nEnter as Ax^2+Bx+C`,
      answer: `${a * 3}x^2+${b * 2}x+${c}`,
      isText: true,
    };
  }
  if (level === 2) {
    const a = ri(2, 8), n = ri(1, 4);
    return {
      question: `Integrate:   ∫ ${a * (n + 1)}x^${n} dx\nIgnore +C. Enter as Ax^B`,
      answer: `${a}x^${n + 1}`,
      isText: true,
      hint: 'Reverse the power rule: add one to the exponent, divide by the new exponent.',
    };
  }
  const a = ri(2, 6), n = ri(2, 4), t = ri(1, 4);
  return {
    question: `f(x) = ${a}x^${n}. What is f'(${t})?`,
    answer: a * n * Math.pow(t, n - 1),
    hint: 'Differentiate first, then substitute.',
  };
}

// --- drill definitions -----------------------------------------------

export const DRILLS = {
  // Robotics — Foundations
  math_core: {
    id: 'math_core',
    name: 'Maths: arithmetic → calculus',
    kind: 'generated',
    levels: [
      { name: 'Arithmetic', gen: (l) => genArithmetic(l), sub: 4 },
      { name: 'Algebra', gen: (l) => genAlgebra(l), sub: 4 },
      { name: 'Trigonometry', gen: (l) => genTrig(l), sub: 4 },
      { name: 'Linear algebra', gen: (l) => genLinearAlgebra(l), sub: 4 },
      { name: 'Calculus', gen: (l) => genCalculus(l), sub: 4 },
    ],
  },
  linalg_focus: {
    id: 'linalg_focus',
    name: 'Linear algebra drills',
    kind: 'generated',
    levels: [{ name: 'Vectors & matrices', gen: (l) => genLinearAlgebra(l), sub: 4 }],
  },
  calculus_focus: {
    id: 'calculus_focus',
    name: 'Calculus drills',
    kind: 'generated',
    levels: [{ name: 'Derivatives & integrals', gen: (l) => genCalculus(l), sub: 4 }],
  },

  // Robotics — Electronics
  ohms_law: {
    id: 'ohms_law',
    name: "Ohm's law & circuits",
    kind: 'generated',
    levels: [
      {
        name: "Ohm's law",
        sub: 3,
        gen: (l) => {
          if (l === 0) {
            const i = ri(1, 9), r = ri(10, 200);
            return { question: `I = ${i}A, R = ${r}Ω. Find V.`, answer: i * r, hint: 'V = I × R' };
          }
          if (l === 1) {
            const v = ri(5, 24), r = pick([10, 20, 50, 100]);
            return {
              question: `V = ${v}V, R = ${r}Ω. Find I in amps (3 dp).`,
              answer: Math.round((v / r) * 1000) / 1000,
              hint: 'I = V / R',
            };
          }
          const r1 = pick([100, 220, 330]), r2 = pick([100, 220, 330]);
          return {
            question: `${r1}Ω and ${r2}Ω in series. Total resistance?`,
            answer: r1 + r2,
            hint: 'Series resistances add.',
          };
        },
      },
      {
        name: 'LED resistor sizing',
        sub: 2,
        gen: (l) => {
          const supply = pick([5, 9, 12]);
          const vf = 2;
          const ma = pick([10, 20]);
          const r = Math.round(((supply - vf) / (ma / 1000)));
          if (l === 0) {
            return {
              question: `${supply}V supply, LED forward voltage 2V, target ${ma}mA.\nWhat resistor value (Ω)?`,
              answer: r,
              hint: 'R = (Vsupply − Vforward) / I,  with I in amps',
            };
          }
          return {
            question: `Same circuit: what power does the resistor dissipate, in mW? (nearest whole)`,
            answer: Math.round((supply - vf) * (ma / 1000) * 1000),
            hint: 'P = V × I across the resistor',
          };
        },
      },
    ],
  },

  // Robotics — Mechanical
  torque_gearing: {
    id: 'torque_gearing',
    name: 'Torque & gear ratios',
    kind: 'generated',
    levels: [
      {
        name: 'Torque',
        sub: 3,
        gen: (l) => {
          if (l === 0) {
            const m = ri(1, 10), d = pick([0.1, 0.2, 0.25, 0.5]);
            return {
              question: `Mass ${m}kg at ${d}m from the pivot. Torque in N·m? (g = 9.81, 2 dp)`,
              answer: Math.round(m * 9.81 * d * 100) / 100,
              hint: 'τ = m × g × r',
            };
          }
          if (l === 1) {
            const inT = ri(1, 5), ratio = pick([2, 3, 4, 5]);
            return {
              question: `Motor gives ${inT}N·m through a ${ratio}:1 reduction. Output torque?`,
              answer: inT * ratio,
              hint: 'Reduction multiplies torque by the ratio.',
            };
          }
          const rpm = pick([100, 200, 300]), ratio = pick([2, 4, 5]);
          return {
            question: `${rpm} RPM through a ${ratio}:1 reduction. Output RPM?`,
            answer: rpm / ratio,
            hint: 'Speed divides by the same ratio torque multiplies by.',
          };
        },
      },
    ],
  },

  // Robotics — Control
  pid_concepts: {
    id: 'pid_concepts',
    name: 'PID & control concepts',
    kind: 'quiz',
    levels: [{ name: 'Feedback control', sub: 1 }],
    questions: [
      {
        q: 'Your robot consistently stops just short of its target and stays there. Which term fixes it?',
        options: ['Increase P', 'Add/increase I', 'Increase D', 'Reduce the setpoint'],
        correct: 1,
        why: 'A constant offset that never resolves is steady-state error. The integral term accumulates that error over time and drives it to zero. Raising P alone usually just adds oscillation.',
      },
      {
        q: 'The robot oscillates around the target, overshooting each way. Best first move?',
        options: ['Increase I', 'Increase D', 'Increase P', 'Add a delay'],
        correct: 1,
        why: 'The derivative term responds to how fast the error is changing, which damps the approach and reduces overshoot. Adding I here would make it worse.',
      },
      {
        q: 'What does the proportional term actually respond to?',
        options: ['Accumulated past error', 'Current error', 'Rate of change of error', 'Target value'],
        correct: 1,
        why: 'P acts on the error right now. I acts on accumulated error, D on how quickly the error is changing. Knowing which is which is most of tuning.',
      },
      {
        q: 'Why is delay() harmful in a control loop?',
        options: [
          'It uses too much memory',
          'It blocks the processor so nothing else runs',
          'It is less accurate than millis()',
          'It only works on Arduino',
        ],
        correct: 1,
        why: 'delay() halts everything. A control loop must keep reading sensors and updating outputs; blocking for even 100ms can make a balancing robot fall.',
      },
    ],
  },

  // Farming
  farm_land: {
    id: 'farm_land',
    name: 'Land & water judgement',
    kind: 'quiz',
    levels: [{ name: 'Assessing land', sub: 1 }],
    questions: [
      {
        q: 'A seller shows you land on a dry summer day. What matters most to check before offering?',
        options: [
          'The view from the house',
          'How it drains after heavy rain',
          'The colour of the grass',
          'Fence paint condition',
        ],
        correct: 1,
        why: 'Drainage decides whether the access road is usable in February and where stock can stand in the wet. It is nearly impossible to fix cheaply and never shows on a nice day.',
      },
      {
        q: 'Soil test comes back at pH 5.2 for intended pasture. What does that tell you?',
        options: [
          'Ideal, nothing to do',
          'Acidic — likely needs lime, which costs money and takes time',
          'Too alkaline for grass',
          'It only matters for vegetables',
        ],
        correct: 1,
        why: 'Most pasture grasses prefer roughly 6.0–7.0. At 5.2 nutrient availability drops and yields suffer. Liming works but is a recurring cost and acts slowly — worth using in price negotiation.',
      },
      {
        q: 'There is a creek on the property. Can you water livestock from it?',
        options: [
          'Yes, water on your land is yours',
          'Only if it is year-round',
          'Depends on local water rights — check before buying',
          'Only with a pump',
        ],
        correct: 2,
        why: 'Having water on your land and being permitted to use it are separate legal questions, and rules vary enormously by region. Confirm with the local authority in writing before you commit.',
      },
      {
        q: 'A lactating cow in hot weather may drink roughly how much per day?',
        options: ['5 gallons', '10 gallons', '30+ gallons', '100 gallons'],
        correct: 2,
        why: 'People routinely underestimate this. Peak demand across a whole herd is what your water source must actually meet — calculate for the hottest month at full headcount.',
      },
    ],
  },
  farm_money: {
    id: 'farm_money',
    name: 'Farm business judgement',
    kind: 'quiz',
    levels: [{ name: 'Money & markets', sub: 1 }],
    questions: [
      {
        q: 'You price your product by matching what the neighbouring farm charges. What is the risk?',
        options: [
          'None, market price is market price',
          'Their costs are not your costs — you may be selling below what it costs you',
          'You will undercut them',
          'It is illegal',
        ],
        correct: 1,
        why: 'Different land, feed prices, and scale mean different cost per unit. Price from your own costs plus a margin, then check it against the market — not the other way round.',
      },
      {
        q: 'When calculating cost per unit, whose labour is most often left out?',
        options: ['The vet', 'Hired help', 'Your own', 'The processor'],
        correct: 2,
        why: 'Leaving your own labour out makes an unprofitable enterprise look profitable, sometimes for years. If you do not pay yourself, you are subsidising the buyer.',
      },
      {
        q: 'Cash runs out most often at which point in year one?',
        options: [
          'Before the first sale',
          'After the first sale but before the second batch is funded',
          'At tax time',
          'During winter',
        ],
        correct: 1,
        why: 'People budget to the first sale and stop. But you usually need to buy the next batch of stock or seed before the first payment clears — budget past the first sale, not to it.',
      },
    ],
  },
};

export function drillLevelCount(drill) {
  return drill.levels.reduce((n, l) => n + (l.sub || 1), 0);
}

// Flatten (level, sub-level) into a single ladder index.
export function drillStageAt(drill, index) {
  let i = index;
  for (let li = 0; li < drill.levels.length; li++) {
    const lvl = drill.levels[li];
    const subs = lvl.sub || 1;
    if (i < subs) return { level: lvl, levelIndex: li, sub: i };
    i -= subs;
  }
  const last = drill.levels[drill.levels.length - 1];
  return { level: last, levelIndex: drill.levels.length - 1, sub: (last.sub || 1) - 1 };
}

export function makeQuestion(drill, index) {
  const stage = drillStageAt(drill, index);
  if (drill.kind === 'quiz') {
    const q = drill.questions[Math.floor(Math.random() * drill.questions.length)];
    return { ...q, isQuiz: true, stageName: stage.level.name };
  }
  const gen = stage.level.gen(stage.sub);
  return { ...gen, stageName: `${stage.level.name} ${stage.sub + 1}` };
}

// Loose comparison so formatting differences don't count as wrong.
export function checkAnswer(question, given) {
  const norm = (v) =>
    String(v).toLowerCase().replace(/\s+/g, '').replace(/\*/g, '').replace(/×/g, '');
  if (question.isText) return norm(given) === norm(question.answer);
  const g = parseFloat(given);
  const a = parseFloat(question.answer);
  if (isNaN(g) || isNaN(a)) return norm(given) === norm(question.answer);
  return Math.abs(g - a) < 0.02;
}

