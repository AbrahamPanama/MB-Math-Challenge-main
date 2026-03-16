import type {
  AttemptRecord,
  AttemptSource,
  Category,
  ChallengeRecord,
  GradeLevel,
  HintUsage,
  MisconceptionTag,
  Problem,
  ProblemAnswer,
  ProblemMetadata,
  SessionDiagnostic,
} from './types';

export const TOTAL_QUESTIONS = 20;
export const REVIEW_INTERVALS = [1, 3, 7] as const;

export type QueuedProblem = {
  problem: Problem;
  source: AttemptSource;
  challengeId: string | null;
};

type ProblemFactory = {
  text: string;
  plainText: string;
  ans: ProblemAnswer;
  type: string;
  subskillId: string;
  label: string;
  pattern: string;
  difficulty: 'easy' | 'medium' | 'hard';
  challengeSeed: Record<string, string | number | boolean>;
  misconceptionHints: MisconceptionTag[];
};

const HARD_NUMBERS = [6, 7, 8, 9, 12];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const renderFrac = (n: number | string, d: number | string): string =>
  `<div style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;gap:2px;vertical-align:middle;"><span>${n}</span><div style="width:100%;height:3px;background:#1e293b;border-radius:2px;"></div><span>${d}</span></div>`;
const renderFracInline = (n: number, d: number): string => `${n}/${d}`;
const fracRow = (...parts: string[]): string =>
  `<div style="display:flex;align-items:center;justify-content:center;gap:0.15em;">${parts.join('')}</div>`;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
const rand = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const buildPositiveDifference = (
  min = 1,
  max = 8,
  maxGap = 4
): { greater: number; smaller: number } => {
  const smaller = rand(min, Math.max(min, max - maxGap));
  const greater = rand(smaller + 1, Math.min(max, smaller + maxGap));
  return { greater, smaller };
};

const stringifySeed = (
  seed: Record<string, string | number | boolean>
): string =>
  Object.entries(seed)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join('|');

const buildReviewKey = (
  category: Category,
  pattern: string,
  seed: Record<string, string | number | boolean>
): string => `${category}:${pattern}:${stringifySeed(seed)}`;

const buildProblem = ({
  text,
  plainText,
  ans,
  type,
  subskillId,
  label,
  pattern,
  difficulty,
  challengeSeed,
  misconceptionHints,
}: ProblemFactory): Problem => ({
  text,
  plainText,
  ans,
  type,
  metadata: {
    subskillId,
    label,
    pattern,
    difficulty,
    reviewKey: buildReviewKey(labelToCategory(label), pattern, challengeSeed),
    challengeSeed,
    misconceptionHints,
  },
});

const labelToCategory = (label: string): Category => {
  switch (label) {
    case 'Tablas de multiplicar':
      return 'multiplication';
    case 'Sumas':
      return 'addition';
    case 'Divisibilidad':
      return 'divisibility';
    case 'Fracciones':
      return 'fractions';
    default:
      return 'combined';
  }
};

export const categoryLabels: Record<Category, string> = {
  multiplication: 'Multiplicación',
  addition: 'Sumas',
  divisibility: 'Divisibilidad',
  fractions: 'Fracciones',
  combined: 'Operaciones combinadas',
};

export const categoryDescriptionKeys: Record<Category, string> = {
  multiplication: 'skillsData.multiplication.description',
  addition: 'skillsData.addition_subtraction.description',
  divisibility: 'skillsData.divisibility.description',
  fractions: 'skillsData.fractions.description',
  combined: 'skillsData.combined.description',
};

export const categoryNameKeys: Record<Category, string> = {
  multiplication: 'skillsData.multiplication.name',
  addition: 'skillsData.addition_subtraction.name',
  divisibility: 'skillsData.divisibility.name',
  fractions: 'skillsData.fractions.name',
  combined: 'skillsData.combined.name',
};

export const defaultGoalsByCategory: Record<Category, string[]> = {
  multiplication: [
    'Quiero recordar mejor las tablas difíciles.',
    'Quiero mantener precisión antes que velocidad.',
    'Quiero superar un reto pendiente.',
  ],
  addition: [
    'Quiero cuidar las llevadas y columnas.',
    'Quiero ir más despacio para cometer menos errores.',
    'Quiero superar un reto pendiente.',
  ],
  divisibility: [
    'Quiero reconocer mejor las reglas de divisibilidad.',
    'Quiero justificar cada respuesta antes de elegir.',
    'Quiero superar un reto pendiente.',
  ],
  fractions: [
    'Quiero fijarme en numerador y denominador.',
    'Quiero simplificar con más seguridad.',
    'Quiero superar un reto pendiente.',
  ],
  combined: [
    'Quiero seguir el orden de operaciones con calma.',
    'Quiero resolver paso a paso sin saltarme paréntesis.',
    'Quiero superar un reto pendiente.',
  ],
};

export const reflectionOptions = [
  'Ahora lo entiendo mejor.',
  'Necesito practicar otra vez.',
  'Quiero ir más despacio la próxima sesión.',
] as const;

const makeDifficulty = (questionIndex: number): 'easy' | 'medium' | 'hard' => {
  if (questionIndex < 6) return 'easy';
  if (questionIndex < 14) return 'medium';
  return 'hard';
};

const makeMultiplicationProblem = (
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  let isReverse = false;
  let a = 2;
  let b = 2;
  if (grade === 3) {
    a = rand(2, 5);
    b = rand(2, 5);
  } else if (grade === 4) {
    isReverse = questionIndex >= 15 && Math.random() > 0.7;
    if (questionIndex < 10) {
      a = rand(2, 9);
      b = rand(2, 9);
    } else {
      a = [6, 7, 8, 9][rand(0, 3)];
      b = rand(2, 9);
    }
  } else if (grade === 5) {
    isReverse = questionIndex >= 10 && Math.random() > 0.5;
    if (questionIndex < 5) {
      a = rand(2, 10);
      b = rand(2, 10);
    } else {
      a = HARD_NUMBERS[rand(0, HARD_NUMBERS.length - 1)];
      b = rand(2, 12);
    }
  } else {
    isReverse =
      questionIndex >= 10 && Math.random() > (questionIndex >= 15 ? 0.2 : 0.5);
    if (questionIndex < 5) {
      a = rand(2, 10);
      b = rand(2, 10);
    } else if (questionIndex < 15) {
      a = HARD_NUMBERS[rand(0, HARD_NUMBERS.length - 1)];
      b = rand(2, 12);
    } else {
      a = HARD_NUMBERS[rand(0, HARD_NUMBERS.length - 1)];
      b = HARD_NUMBERS[rand(0, HARD_NUMBERS.length - 1)];
    }
  }

  if (isReverse) {
    const result = a * b;
    return buildProblem({
      text: `<span class="text-indigo-600 font-bold mr-2">${result}</span> =`,
      plainText: `${result} = __ × __`,
      ans: `${a} × ${b}`,
      type: 'reverse-mult',
      subskillId: 'multiplication-reverse',
      label: 'Tablas de multiplicar',
      pattern: 'reverse',
      difficulty: makeDifficulty(questionIndex),
      challengeSeed: { a, b, reverse: true },
      misconceptionHints: ['reverse_reasoning'],
    });
  }

  return buildProblem({
    text: `${a} × ${b}`,
    plainText: `${a} × ${b}`,
    ans: a * b,
    type: 'standard',
    subskillId: 'multiplication-direct',
    label: 'Tablas de multiplicar',
    pattern: 'standard',
    difficulty: makeDifficulty(questionIndex),
    challengeSeed: { a, b, reverse: false },
    misconceptionHints: ['fact_recall'],
  });
};

const makeAdditionProblem = (
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  let isReverse = false;
  let a = 0;
  let b = 0;
  if (grade === 3) {
    a = rand(2, 9);
    b = rand(2, 9);
  } else if (grade === 4) {
    isReverse = questionIndex >= 15 && Math.random() > 0.7;
    if (questionIndex < 10) {
      a = rand(2, 9);
      b = rand(10, 49);
      if (Math.random() > 0.5) [a, b] = [b, a];
    } else {
      a = rand(10, 49);
      b = rand(10, 49);
    }
  } else if (grade === 5) {
    isReverse = questionIndex >= 10 && Math.random() > 0.5;
    if (questionIndex < 5) {
      a = rand(2, 9);
      b = rand(10, 49);
      if (Math.random() > 0.5) [a, b] = [b, a];
    } else {
      a = rand(10, 69);
      b = rand(10, 69);
    }
  } else {
    isReverse =
      questionIndex >= 10 && Math.random() > (questionIndex >= 15 ? 0.2 : 0.5);
    if (questionIndex < 5) {
      const roll = Math.random();
      if (roll < 0.35) {
        a = rand(2, 9);
        b = rand(2, 9);
      } else if (roll < 0.75) {
        a = rand(2, 9);
        b = rand(10, 49);
        if (Math.random() > 0.5) [a, b] = [b, a];
      } else {
        a = rand(10, 49);
        b = rand(10, 49);
      }
    } else {
      const ends = [7, 8, 9];
      a = rand(0, 7) * 10 + ends[rand(0, 2)];
      b = rand(0, 7) * 10 + ends[rand(0, 2)];
    }
  }

  const hasCarry = (a % 10) + (b % 10) >= 10;
  if (isReverse) {
    const result = a + b;
    return buildProblem({
      text: `<span style="color:#6366f1;font-weight:800;margin-right:0.15em;">${result}</span> =`,
      plainText: `${result} = __ + __`,
      ans: `${a} + ${b}`,
      type: 'reverse-add',
      subskillId: 'addition-reverse',
      label: 'Sumas',
      pattern: 'reverse',
      difficulty: makeDifficulty(questionIndex),
      challengeSeed: { a, b, reverse: true },
      misconceptionHints: ['reverse_reasoning'],
    });
  }

  return buildProblem({
    text: `<div style="display:inline-flex;flex-direction:column;align-items:flex-end;font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:0.05em;">
      <div>${a}</div>
      <div style="display:flex;align-items:baseline;">
        <span style="font-size:0.45em;color:#6366f1;margin-right:0.3em;">+</span>
        <span>${b}</span>
      </div>
      <div style="width:100%;height:4px;background:#1e293b;margin-top:6px;border-radius:2px;"></div>
    </div>`,
    plainText: `${a} + ${b}`,
    ans: a + b,
    type: 'standard',
    subskillId: hasCarry ? 'addition-carry' : 'addition-no-carry',
    label: 'Sumas',
    pattern: hasCarry ? 'carry' : 'no-carry',
    difficulty: makeDifficulty(questionIndex),
    challengeSeed: { a, b, reverse: false, carry: hasCarry },
    misconceptionHints: [hasCarry ? 'place_value' : 'accuracy_lapse'],
  });
};

const makeDivisibilityProblem = (
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  let divisor: number;
  let maxBase: number;
  if (grade <= 4) {
    divisor = [2, 5, 10][rand(0, 2)];
    maxBase = 20;
  } else if (grade === 5) {
    divisor = questionIndex < 10 ? [2, 5, 10][rand(0, 2)] : [3, 9][rand(0, 1)];
    maxBase = 33;
  } else {
    divisor = questionIndex < 8 ? [2, 5, 10][rand(0, 2)] : [3, 9][rand(0, 1)];
    maxBase = 50;
  }

  const base = rand(10, maxBase + 9);
  const isDivisible = Math.random() > 0.5;
  const num = isDivisible
    ? base * divisor
    : base * divisor + rand(1, Math.max(1, divisor - 1));

  return buildProblem({
    text: `<span class="text-slate-500 text-4xl align-middle mr-2">¿</span>${num} ÷ ${divisor}<span class="text-slate-500 text-4xl align-middle ml-2">?</span>`,
    plainText: `¿${num} es divisible entre ${divisor}?`,
    ans: num % divisor === 0,
    type: 'boolean',
    subskillId: `divisibility-${divisor}`,
    label: 'Divisibilidad',
    pattern: `rule-${divisor}`,
    difficulty: makeDifficulty(questionIndex),
    challengeSeed: { num, divisor, isDivisible },
    misconceptionHints: ['divisibility_rule'],
  });
};

const buildFractionProblem = (
  questionType: string,
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  const easyDenoms = [2, 3, 4, 5];
  const medDenoms = [2, 3, 4, 5, 6, 8];
  const hardDenoms = [3, 4, 5, 6, 7, 8, 9, 10, 12];
  const denoms =
    grade <= 5
      ? easyDenoms
      : questionIndex < 7
        ? easyDenoms
        : questionIndex < 14
          ? medDenoms
          : hardDenoms;
  const pickDenom = () => denoms[rand(0, denoms.length - 1)];
  const difficulty = makeDifficulty(questionIndex);

  if (questionType === 'frac-of-number') {
    const d = pickDenom();
    const n = rand(1, d - 1);
    const multiplier = questionIndex < 7 ? rand(2, 5) : rand(2, 7);
    const whole = d * multiplier;
    const result = (n * whole) / d;
    const reverse = Math.random() < (questionIndex < 10 ? 0.15 : 0.35);
    if (reverse) {
      return buildProblem({
        text: fracRow(
          `<span style="color:#6366f1;font-weight:800;">${result}</span>`,
          `<span style="font-size:0.5em;color:#94a3b8;">= ${renderFracInline(n, d)} de ...</span>`
        ),
        plainText: `${result} = ${n}/${d} de __`,
        ans: whole,
        type: 'standard',
        subskillId: 'fractions-of-number',
        label: 'Fracciones',
        pattern: 'reverse-frac-of-number',
        difficulty,
        challengeSeed: { n, d, whole, reverse: true },
        misconceptionHints: ['fraction_operation'],
      });
    }
    return buildProblem({
      text: fracRow(
        renderFrac(n, d),
        `<span style="font-size:0.5em;color:#94a3b8;margin:0 0.2em;">de</span>`,
        `<span style="font-weight:800;">${whole}</span>`
      ),
      plainText: `${n}/${d} de ${whole}`,
      ans: result,
      type: 'standard',
      subskillId: 'fractions-of-number',
      label: 'Fracciones',
      pattern: 'frac-of-number',
      difficulty,
      challengeSeed: { n, d, whole, reverse: false },
      misconceptionHints: ['fraction_operation'],
    });
  }

  if (questionType === 'simplify') {
    const d = pickDenom();
    const n = rand(1, d - 1);
    const g = gcd(n, d);
    const simplN = n / g;
    const simplD = d / g;
    const factor = 2 + rand(0, questionIndex < 7 ? 2 : 4);
    const shownN = simplN * factor;
    const shownD = simplD * factor;
    const reverse = Math.random() < (questionIndex < 10 ? 0.15 : 0.3);
    if (reverse) {
      return buildProblem({
        text: fracRow(renderFrac(simplN, simplD), `<span style="font-size:0.5em;color:#94a3b8;">= ?</span>`),
        plainText: `${simplN}/${simplD} = ?`,
        ans: renderFracInline(shownN, shownD),
        type: 'fraction-str',
        subskillId: 'fractions-simplify',
        label: 'Fracciones',
        pattern: 'reverse-simplify',
        difficulty,
        challengeSeed: { simplN, simplD, shownN, shownD, reverse: true },
        misconceptionHints: ['fraction_simplification'],
      });
    }
    return buildProblem({
      text: `<span style="font-size:0.45em;color:#94a3b8;">Simplifica</span><br>${renderFrac(shownN, shownD)}`,
      plainText: `Simplifica ${shownN}/${shownD}`,
      ans: renderFracInline(simplN, simplD),
      type: 'fraction-str',
      subskillId: 'fractions-simplify',
      label: 'Fracciones',
      pattern: 'simplify',
      difficulty,
      challengeSeed: { simplN, simplD, shownN, shownD, reverse: false },
      misconceptionHints: ['fraction_simplification'],
    });
  }

  if (questionType === 'equivalent') {
    const d = pickDenom();
    const n = rand(1, d - 1);
    const factor = 2 + rand(0, 3);
    const targetD = d * factor;
    const targetN = n * factor;
    return buildProblem({
      text: fracRow(
        renderFrac(n, d),
        `<span style="font-size:0.6em;color:#94a3b8;">=</span>`,
        renderFrac('?', targetD)
      ),
      plainText: `${n}/${d} = ?/${targetD}`,
      ans: targetN,
      type: 'standard',
      subskillId: 'fractions-equivalent',
      label: 'Fracciones',
      pattern: 'equivalent',
      difficulty,
      challengeSeed: { n, d, targetD, targetN },
      misconceptionHints: ['fraction_simplification'],
    });
  }

  if (questionType === 'compare') {
    const d1 = pickDenom();
    const n1 = rand(1, d1 - 1);
    let d2 = pickDenom();
    while (d2 === d1) d2 = pickDenom();
    let n2 = rand(1, d2 - 1);
    while (n1 / d1 === n2 / d2) {
      n2 = rand(1, d2 - 1);
    }
    const val1 = n1 / d1;
    const val2 = n2 / d2;
    const answer = val1 > val2 ? renderFracInline(n1, d1) : renderFracInline(n2, d2);
    return buildProblem({
      text:
        `<div style="font-size:0.45em;color:#94a3b8;text-align:center;margin-bottom:0.3em;">¿Cuál es mayor?</div>` +
        fracRow(
          renderFrac(n1, d1),
          `<span style="font-size:0.6em;color:#94a3b8;margin:0 0.3em;">ó</span>`,
          renderFrac(n2, d2)
        ),
      plainText: `¿Cuál es mayor: ${n1}/${d1} o ${n2}/${d2}?`,
      ans: answer,
      type: 'fraction-str',
      subskillId: 'fractions-compare',
      label: 'Fracciones',
      pattern: 'compare',
      difficulty,
      challengeSeed: { n1, d1, n2, d2 },
      misconceptionHints: ['fraction_comparison'],
    });
  }

  const sameDenom = questionType === 'add-same-denom';
  let d1 = pickDenom();
  let d2 = sameDenom ? d1 : pickDenom();
  while (!sameDenom && d2 === d1) d2 = pickDenom();
  const n1 = rand(1, d1 - 1);
  const n2 = rand(1, d2 - 1);
  const commonD = sameDenom ? d1 : (d1 * d2) / gcd(d1, d2);
  const sumN = n1 * (commonD / d1) + n2 * (commonD / d2);
  const reduced = gcd(sumN, commonD);
  const ansN = sumN / reduced;
  const ansD = commonD / reduced;
  return buildProblem({
    text: fracRow(
      renderFrac(n1, d1),
      `<span style="font-size:0.6em;color:#6366f1;margin:0 0.15em;">+</span>`,
      renderFrac(n2, d2)
    ),
    plainText: `${n1}/${d1} + ${n2}/${d2}`,
    ans: renderFracInline(ansN, ansD),
    type: 'fraction-str',
    subskillId: sameDenom ? 'fractions-add-same-denominator' : 'fractions-add-different-denominator',
    label: 'Fracciones',
    pattern: sameDenom ? 'add-same-denom' : 'add-diff-denom',
    difficulty,
    challengeSeed: { n1, d1, n2, d2, ansN, ansD },
    misconceptionHints: ['fraction_operation'],
  });
};

const makeFractionsProblem = (
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  const g5Types = ['frac-of-number', 'simplify', 'equivalent'];
  const easyTypes = ['frac-of-number', 'simplify', 'equivalent'];
  const medTypes = ['compare', 'add-same-denom', 'simplify', 'equivalent', 'frac-of-number'];
  const hardTypes = ['add-diff-denom', 'add-same-denom', 'compare', 'frac-of-number', 'simplify'];
  const questionType =
    grade <= 5
      ? g5Types[rand(0, g5Types.length - 1)]
      : questionIndex < 7
        ? easyTypes[rand(0, easyTypes.length - 1)]
        : questionIndex < 14
          ? medTypes[rand(0, medTypes.length - 1)]
          : hardTypes[rand(0, hardTypes.length - 1)];
  return buildFractionProblem(questionType, questionIndex, grade);
};

const buildCombinedSeedForTier = (
  tier: number,
  preferredTemplate?: string
): Record<string, string | number | boolean> => {
  const template =
    preferredTemplate ??
    (tier >= 4 ? 'brace-nest' : tier === 3 ? 'bracket-nest' : tier === 2 ? 'double-paren' : 'paren-tail');

  if (template === 'paren-tail') {
    const b = rand(2, 4);
    const c = rand(2, 4);
    const inner = b * c;
    const mode = Math.random() > 0.45 ? 'add' : 'subtract';
    return {
      tier: 1,
      template,
      mode,
      a: mode === 'subtract' ? inner + rand(2, 9) : rand(1, 12),
      b,
      c,
    };
  }

  if (template === 'double-paren') {
    const { greater, smaller } = buildPositiveDifference(1, 7, 3);
    return {
      tier: 2,
      template,
      a: rand(1, 5),
      b: rand(1, 5),
      c: greater,
      d: smaller,
    };
  }

  if (template === 'bracket-nest') {
    const mode = Math.random() > 0.5 ? 'add' : 'subtract';
    if (mode === 'add') {
      return {
        tier: 3,
        template,
        mode,
        a: rand(1, 9),
        b: 2,
        c: rand(1, 4),
        d: rand(1, 4),
        innerMode: 'add',
      };
    }

    const b = rand(2, 3);
    const { greater, smaller } = buildPositiveDifference(1, 6, 4);
    const inner = b * (greater - smaller);
    return {
      tier: 3,
      template,
      mode,
      a: inner + rand(2, 9),
      b,
      c: greater,
      d: smaller,
      innerMode: 'subtract',
    };
  }

  const { greater, smaller } = buildPositiveDifference(1, 6, 4);
  return {
    tier: 4,
    template: 'brace-nest',
    a: rand(1, 6),
    b: rand(1, 6),
    c: rand(2, 3),
    d: greater,
    e: smaller,
    mode: 'add',
  };
};

const buildCombinedProblemFromSeed = ({
  seed,
  difficulty,
  subskillId,
  pattern,
  misconceptionHints,
}: {
  seed: Record<string, string | number | boolean>;
  difficulty: 'easy' | 'medium' | 'hard';
  subskillId?: string;
  pattern?: string;
  misconceptionHints?: MisconceptionTag[];
}): Problem | null => {
  const tier = Number(seed.tier ?? 1);
  const resolvedSubskillId = subskillId ?? `combined-tier-${tier}`;
  const resolvedPattern = pattern ?? String(seed.template ?? `tier-${tier}`);
  const resolvedHints = misconceptionHints ?? ['operation_order'];
  const template = String(seed.template ?? '');
  const a = Number(seed.a ?? 0);
  const b = Number(seed.b ?? 0);
  const c = Number(seed.c ?? 0);
  const d = Number(seed.d ?? 0);
  const e = Number(seed.e ?? 0);

  if (template === 'paren-tail') {
    const isSubtract = seed.mode === 'subtract';
    return buildProblem({
      text: isSubtract ? `${a} − (${b} × ${c})` : `${a} + (${b} × ${c})`,
      plainText: isSubtract ? `${a} - (${b} x ${c})` : `${a} + (${b} x ${c})`,
      ans: isSubtract ? a - b * c : a + b * c,
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  if (template === 'double-paren') {
    return buildProblem({
      text: `(${a} + ${b}) × (${c} − ${d})`,
      plainText: `(${a} + ${b}) x (${c} - ${d})`,
      ans: (a + b) * (c - d),
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  if (template === 'bracket-nest') {
    const isSubtract = seed.mode === 'subtract';
    const usesInnerSubtract = seed.innerMode === 'subtract';
    const innerText = usesInnerSubtract ? `(${c} − ${d})` : `(${c} + ${d})`;
    const innerPlainText = usesInnerSubtract ? `(${c} - ${d})` : `(${c} + ${d})`;
    const innerValue = usesInnerSubtract ? c - d : c + d;
    return buildProblem({
      text: isSubtract ? `${a} − [${b} × ${innerText}]` : `${a} + [${b} × ${innerText}]`,
      plainText: isSubtract
        ? `${a} - [${b} x ${innerPlainText}]`
        : `${a} + [${b} x ${innerPlainText}]`,
      ans: isSubtract ? a - b * innerValue : a + b * innerValue,
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  if (template === 'brace-nest') {
    return buildProblem({
      text: `{(${a} + ${b}) + [${c} × (${d} − ${e})]}`,
      plainText: `{(${a} + ${b}) + [${c} x (${d} - ${e})]}`,
      ans: (a + b) + c * (d - e),
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  if (tier === 1) {
    const text =
      seed.mode === 'subtract' ? `${a} − (${b} × ${c})` : `${a} + (${b} × ${c})`;
    const plainText =
      seed.mode === 'subtract' ? `${a} - (${b} x ${c})` : `${a} + (${b} x ${c})`;
    const ans = seed.mode === 'subtract' ? a - b * c : a + b * c;
    return buildProblem({
      text,
      plainText,
      ans,
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  if (tier === 2) {
    return buildProblem({
      text: `(${a} + ${b}) × (${c} − ${d})`,
      plainText: `(${a} + ${b}) x (${c} - ${d})`,
      ans: (a + b) * (c - d),
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  if (tier === 3) {
    const text =
      seed.mode === 'subtract'
        ? `${a} − [${b} × (${c} + ${d})]`
        : `${a} + [${b} × (${c} + ${d})]`;
    const plainText =
      seed.mode === 'subtract'
        ? `${a} - [${b} x (${c} + ${d})]`
        : `${a} + [${b} x (${c} + ${d})]`;
    const ans = seed.mode === 'subtract' ? a - b * (c + d) : a + b * (c + d);
    return buildProblem({
      text,
      plainText,
      ans,
      type: 'standard',
      subskillId: resolvedSubskillId,
      label: 'Operaciones combinadas',
      pattern: resolvedPattern,
      difficulty,
      challengeSeed: seed,
      misconceptionHints: resolvedHints,
    });
  }

  return buildProblem({
    text: `{${a} × [${b} + (${c} − ${d})]}`,
    plainText: `{${a} x [${b} + (${c} - ${d})]}`,
    ans: a * (b + (c - d)),
    type: 'standard',
    subskillId: resolvedSubskillId,
    label: 'Operaciones combinadas',
    pattern: resolvedPattern,
    difficulty,
    challengeSeed: seed,
    misconceptionHints: resolvedHints,
  });
};

const makeCombinedProblem = (
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  const maxTier = grade <= 4 ? 2 : 4;
  const tierSize = Math.ceil(TOTAL_QUESTIONS / maxTier);
  const currentTier = Math.min(Math.floor(questionIndex / tierSize) + 1, maxTier);
  const seed = buildCombinedSeedForTier(currentTier);
  return (
    buildCombinedProblemFromSeed({
      seed,
      difficulty: makeDifficulty(questionIndex),
      subskillId: `combined-tier-${currentTier}`,
      pattern: String(seed.template ?? `tier-${currentTier}`),
      misconceptionHints: ['operation_order'],
    }) ??
    buildProblem({
      text: `1 + (2 × 2)`,
      plainText: '1 + (2 x 2)',
      ans: 5,
      type: 'standard',
      subskillId: `combined-tier-${currentTier}`,
      label: 'Operaciones combinadas',
      pattern: `tier-${currentTier}`,
      difficulty: makeDifficulty(questionIndex),
      challengeSeed: seed,
      misconceptionHints: ['operation_order'],
    })
  );
};

export const generateProblem = (
  category: Category,
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  switch (category) {
    case 'multiplication':
      return makeMultiplicationProblem(questionIndex, grade);
    case 'addition':
      return makeAdditionProblem(questionIndex, grade);
    case 'divisibility':
      return makeDivisibilityProblem(questionIndex, grade);
    case 'fractions':
      return makeFractionsProblem(questionIndex, grade);
    default:
      return makeCombinedProblem(questionIndex, grade);
  }
};

const createProblemFromTemplate = (
  category: Category,
  metadata: ProblemMetadata
): Problem | null => {
  const seed = metadata.challengeSeed;
  if (category === 'multiplication') {
    const a = Number(seed.a);
    const b = Number(seed.b);
    const reverse = Boolean(seed.reverse);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return reverse
      ? buildProblem({
          text: `<span class="text-indigo-600 font-bold mr-2">${a * b}</span> =`,
          plainText: `${a * b} = __ × __`,
          ans: `${a} × ${b}`,
          type: 'reverse-mult',
          subskillId: metadata.subskillId,
          label: 'Tablas de multiplicar',
          pattern: metadata.pattern,
          difficulty: metadata.difficulty,
          challengeSeed: { a, b, reverse: true },
          misconceptionHints: metadata.misconceptionHints,
        })
      : buildProblem({
          text: `${a} × ${b}`,
          plainText: `${a} × ${b}`,
          ans: a * b,
          type: 'standard',
          subskillId: metadata.subskillId,
          label: 'Tablas de multiplicar',
          pattern: metadata.pattern,
          difficulty: metadata.difficulty,
          challengeSeed: { a, b, reverse: false },
          misconceptionHints: metadata.misconceptionHints,
        });
  }

  if (category === 'addition') {
    const a = Number(seed.a);
    const b = Number(seed.b);
    const reverse = Boolean(seed.reverse);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return reverse
      ? buildProblem({
          text: `<span style="color:#6366f1;font-weight:800;margin-right:0.15em;">${a + b}</span> =`,
          plainText: `${a + b} = __ + __`,
          ans: `${a} + ${b}`,
          type: 'reverse-add',
          subskillId: metadata.subskillId,
          label: 'Sumas',
          pattern: metadata.pattern,
          difficulty: metadata.difficulty,
          challengeSeed: { a, b, reverse: true },
          misconceptionHints: metadata.misconceptionHints,
        })
      : buildProblem({
          text: `<div style="display:inline-flex;flex-direction:column;align-items:flex-end;font-variant-numeric:tabular-nums;line-height:1.15;letter-spacing:0.05em;">
            <div>${a}</div>
            <div style="display:flex;align-items:baseline;">
              <span style="font-size:0.45em;color:#6366f1;margin-right:0.3em;">+</span>
              <span>${b}</span>
            </div>
            <div style="width:100%;height:4px;background:#1e293b;margin-top:6px;border-radius:2px;"></div>
          </div>`,
          plainText: `${a} + ${b}`,
          ans: a + b,
          type: 'standard',
          subskillId: metadata.subskillId,
          label: 'Sumas',
          pattern: metadata.pattern,
          difficulty: metadata.difficulty,
          challengeSeed: {
            a,
            b,
            reverse: false,
            carry: Boolean(seed.carry),
          },
          misconceptionHints: metadata.misconceptionHints,
        });
  }

  if (category === 'divisibility') {
    const num = Number(seed.num);
    const divisor = Number(seed.divisor);
    if (!Number.isFinite(num) || !Number.isFinite(divisor)) return null;
    return buildProblem({
      text: `<span class="text-slate-500 text-4xl align-middle mr-2">¿</span>${num} ÷ ${divisor}<span class="text-slate-500 text-4xl align-middle ml-2">?</span>`,
      plainText: `¿${num} es divisible entre ${divisor}?`,
      ans: num % divisor === 0,
      type: 'boolean',
      subskillId: metadata.subskillId,
      label: 'Divisibilidad',
      pattern: metadata.pattern,
      difficulty: metadata.difficulty,
      challengeSeed: { num, divisor, isDivisible: num % divisor === 0 },
      misconceptionHints: metadata.misconceptionHints,
    });
  }

  if (category === 'fractions') {
    const seed = metadata.challengeSeed;
    if (metadata.pattern === 'frac-of-number') {
      const n = Number(seed.n);
      const d = Number(seed.d);
      const whole = Number(seed.whole);
      return buildProblem({
        text: fracRow(
          renderFrac(n, d),
          `<span style="font-size:0.5em;color:#94a3b8;margin:0 0.2em;">de</span>`,
          `<span style="font-weight:800;">${whole}</span>`
        ),
        plainText: `${n}/${d} de ${whole}`,
        ans: (n * whole) / d,
        type: 'standard',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'reverse-frac-of-number') {
      const n = Number(seed.n);
      const d = Number(seed.d);
      const whole = Number(seed.whole);
      const result = (n * whole) / d;
      return buildProblem({
        text: fracRow(
          `<span style="color:#6366f1;font-weight:800;">${result}</span>`,
          `<span style="font-size:0.5em;color:#94a3b8;">= ${renderFracInline(n, d)} de ...</span>`
        ),
        plainText: `${result} = ${n}/${d} de __`,
        ans: whole,
        type: 'standard',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'simplify') {
      const shownN = Number(seed.shownN);
      const shownD = Number(seed.shownD);
      const simplN = Number(seed.simplN);
      const simplD = Number(seed.simplD);
      return buildProblem({
        text: `<span style="font-size:0.45em;color:#94a3b8;">Simplifica</span><br>${renderFrac(shownN, shownD)}`,
        plainText: `Simplifica ${shownN}/${shownD}`,
        ans: renderFracInline(simplN, simplD),
        type: 'fraction-str',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'reverse-simplify') {
      const shownN = Number(seed.shownN);
      const shownD = Number(seed.shownD);
      const simplN = Number(seed.simplN);
      const simplD = Number(seed.simplD);
      return buildProblem({
        text: fracRow(renderFrac(simplN, simplD), `<span style="font-size:0.5em;color:#94a3b8;">= ?</span>`),
        plainText: `${simplN}/${simplD} = ?`,
        ans: renderFracInline(shownN, shownD),
        type: 'fraction-str',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'equivalent') {
      const n = Number(seed.n);
      const d = Number(seed.d);
      const targetD = Number(seed.targetD);
      const targetN = Number(seed.targetN);
      return buildProblem({
        text: fracRow(
          renderFrac(n, d),
          `<span style="font-size:0.6em;color:#94a3b8;">=</span>`,
          renderFrac('?', targetD)
        ),
        plainText: `${n}/${d} = ?/${targetD}`,
        ans: targetN,
        type: 'standard',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'compare') {
      const n1 = Number(seed.n1);
      const d1 = Number(seed.d1);
      const n2 = Number(seed.n2);
      const d2 = Number(seed.d2);
      const answer =
        n1 / d1 > n2 / d2 ? renderFracInline(n1, d1) : renderFracInline(n2, d2);
      return buildProblem({
        text:
          `<div style="font-size:0.45em;color:#94a3b8;text-align:center;margin-bottom:0.3em;">¿Cuál es mayor?</div>` +
          fracRow(
            renderFrac(n1, d1),
            `<span style="font-size:0.6em;color:#94a3b8;margin:0 0.3em;">ó</span>`,
            renderFrac(n2, d2)
          ),
        plainText: `¿Cuál es mayor: ${n1}/${d1} o ${n2}/${d2}?`,
        ans: answer,
        type: 'fraction-str',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'add-same-denom' || metadata.pattern === 'add-diff-denom') {
      const n1 = Number(seed.n1);
      const d1 = Number(seed.d1);
      const n2 = Number(seed.n2);
      const d2 = Number(seed.d2);
      const ansN = Number(seed.ansN);
      const ansD = Number(seed.ansD);
      return buildProblem({
        text: fracRow(
          renderFrac(n1, d1),
          `<span style="font-size:0.6em;color:#6366f1;margin:0 0.15em;">+</span>`,
          renderFrac(n2, d2)
        ),
        plainText: `${n1}/${d1} + ${n2}/${d2}`,
        ans: renderFracInline(ansN, ansD),
        type: 'fraction-str',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    return null;
  }

  return buildCombinedProblemFromSeed({
    seed,
    difficulty: metadata.difficulty,
    subskillId: metadata.subskillId,
    pattern: metadata.pattern,
    misconceptionHints: metadata.misconceptionHints,
  });
};

const createVariantProblem = (
  challenge: ChallengeRecord,
  sessionOrdinal: number
): Problem | null => {
  const seed = challenge.template.metadata.challengeSeed;
  const pattern = challenge.pattern;

  if (challenge.category === 'multiplication') {
    const a = Number(seed.a);
    const b = Number(seed.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const keep = Math.random() > 0.5 ? a : b;
    const partner = clamp(b + ((sessionOrdinal % 2 === 0 ? 1 : -1) || 1), 2, 12);
    const reverse = pattern === 'reverse';
    return createProblemFromTemplate(challenge.category, {
      ...challenge.template.metadata,
      challengeSeed: { a: keep, b: partner, reverse },
    });
  }

  if (challenge.category === 'addition') {
    const a = Number(seed.a);
    const b = Number(seed.b);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return createProblemFromTemplate(challenge.category, {
      ...challenge.template.metadata,
      challengeSeed: {
        a: clamp(a + (sessionOrdinal % 2 === 0 ? 10 : -10), 2, 99),
        b: clamp(b + (sessionOrdinal % 2 === 0 ? -1 : 1), 2, 99),
        reverse: Boolean(seed.reverse),
        carry: Boolean(seed.carry),
      },
    });
  }

  if (challenge.category === 'divisibility') {
    const divisor = Number(seed.divisor);
    if (!Number.isFinite(divisor)) return null;
    const base = rand(12, 48);
    const isDivisible = sessionOrdinal % 2 === 0;
    const num = isDivisible
      ? base * divisor
      : base * divisor + rand(1, Math.max(1, divisor - 1));
    return createProblemFromTemplate(challenge.category, {
      ...challenge.template.metadata,
      challengeSeed: { num, divisor, isDivisible },
    });
  }

  if (challenge.category === 'combined') {
    const tier = Number(seed.tier ?? 1);
    const template = String(seed.template ?? '');
    return buildCombinedProblemFromSeed({
      seed: buildCombinedSeedForTier(tier, template || undefined),
      difficulty: challenge.template.metadata.difficulty,
      subskillId: challenge.template.metadata.subskillId,
      pattern: challenge.template.metadata.pattern,
      misconceptionHints: challenge.template.metadata.misconceptionHints,
    });
  }

  return null;
};

export const createReviewProblem = (
  challenge: ChallengeRecord,
  sessionOrdinal: number
): Problem => {
  if (challenge.scheduleIndex === 0) {
    const exact = createProblemFromTemplate(
      challenge.category,
      challenge.template.metadata
    );
    if (exact) return exact;
  }

  const variant = createVariantProblem(challenge, sessionOrdinal);
  if (variant) return variant;

  return (
    createProblemFromTemplate(challenge.category, challenge.template.metadata) ?? {
      text: challenge.template.promptHtml,
      plainText: challenge.template.promptText,
      ans: challenge.template.correctAnswer,
      type: challenge.template.type,
      metadata: challenge.template.metadata,
    }
  );
};

export const generateOptions = (
  correctAnswer: ProblemAnswer,
  type: string
): Array<string | number | boolean> => {
  if (typeof correctAnswer === 'boolean') return [true, false];
  const options: Array<string | number | boolean> = [correctAnswer];
  let attempts = 0;

  while (options.length < 5 && attempts < 60) {
    attempts += 1;
    let decoy: string | number | undefined;

    if (type === 'reverse-mult') {
      const parts = String(correctAnswer).split(' × ');
      const target = Number(parts[0]) * Number(parts[1]);
      const a = rand(2, 12);
      const b = rand(2, 12);
      const maybe = `${a} × ${b}`;
      if (!options.includes(maybe) && a * b !== target && Math.abs(a * b - target) <= 16) {
        decoy = maybe;
      }
    } else if (type === 'reverse-add') {
      const parts = String(correctAnswer).split(' + ');
      const target = Number(parts[0]) + Number(parts[1]);
      let a = clamp(Number(parts[0]) + rand(-5, 5), 1, 99);
      let b = clamp(target - a + rand(-3, 3), 1, 99);
      const maybe = `${a} + ${b}`;
      if (!options.includes(maybe) && a + b !== target) decoy = maybe;
    } else if (type === 'fraction-str') {
      const [n, d]: [number, number] = String(correctAnswer)
        .split('/')
        .map(Number) as [number, number];
      const variants: string[] = [
        `${n + 1}/${d}`,
        `${Math.max(1, n - 1)}/${d}`,
        `${n}/${d + 1}`,
        `${n}/${Math.max(1, d - 1)}`,
        `${d}/${n || 1}`,
      ];
      const maybe: string = variants[rand(0, variants.length - 1)];
      if (!options.includes(maybe) && maybe !== correctAnswer) decoy = maybe;
    } else {
      const diff = rand(1, 5) * (Math.random() > 0.5 ? 1 : -1);
      const maybe: number = Number(correctAnswer) + diff;
      if (Number.isFinite(maybe) && maybe > 0 && maybe !== correctAnswer) decoy = maybe;
    }

    if (decoy !== undefined && !options.includes(decoy)) options.push(decoy);
  }

  return options.sort(() => Math.random() - 0.5);
};

export const getQuestionThresholdMs = (
  category: Category,
  grade: GradeLevel
): number => {
  if (category === 'divisibility') return grade === 5 ? 6500 : 5500;
  if (category === 'fractions') return 9000;
  if (category === 'combined') return 8000;
  return 6000;
};

export const inferMisconceptionTags = (
  problem: Problem,
  isCorrect: boolean,
  timeSpentMs: number
): MisconceptionTag[] => {
  const tags = new Set<MisconceptionTag>();
  if (!isCorrect) {
    problem.metadata.misconceptionHints.forEach((tag) => tags.add(tag));
  }
  if (timeSpentMs > getQuestionThresholdMs(labelToCategory(problem.metadata.label), 6)) {
    tags.add('time_pressure');
  }
  if (tags.size === 0) tags.add('accuracy_lapse');
  return Array.from(tags);
};

const misconceptionWhy: Record<MisconceptionTag, string> = {
  fact_recall: 'Algunas tablas clave todavía necesitan más recuperación rápida.',
  reverse_reasoning: 'Costó traducir el problema cuando la operación estaba al revés.',
  place_value: 'Hubo confusión con columnas, llevadas o valor posicional.',
  divisibility_rule: 'Las reglas de divisibilidad todavía no están estables.',
  fraction_simplification: 'Faltó identificar el factor común o la equivalencia de fracciones.',
  fraction_comparison: 'Costó comparar fracciones fijándose en tamaño real y no solo en números sueltos.',
  fraction_operation: 'Hizo falta un paso intermedio para operar fracciones con seguridad.',
  operation_order: 'El orden de operaciones se rompió en algún paso intermedio.',
  time_pressure: 'La velocidad apretó y eso afectó la precisión.',
  accuracy_lapse: 'Hubo pequeños descuidos más que una falta total de comprensión.',
  context_transfer: 'Faltó trasladar la idea matemática a una situación concreta.',
  unknown: 'Se detectó una dificultad general que conviene revisar con más ejemplos.',
};

const misconceptionStrategy: Record<MisconceptionTag, string> = {
  fact_recall: 'Vuelve a practicar esas combinaciones como familias de hechos antes de correr.',
  reverse_reasoning: 'Antes de responder, di en voz baja qué número estás buscando y qué relación debe cumplir.',
  place_value: 'Alinea mentalmente columnas y revisa solo la unidad antes de pasar a decenas.',
  divisibility_rule: 'Comprueba la regla con una mini lista de ejemplos antes de elegir sí o no.',
  fraction_simplification: 'Busca primero un factor común pequeño y verifica si numerador y denominador se pueden dividir.',
  fraction_comparison: 'Piensa si conviene igualar denominadores o convertir a una referencia simple como 1/2.',
  fraction_operation: 'Haz visible el denominador común antes de sumar o comparar.',
  operation_order: 'Resuelve primero lo que está dentro de paréntesis y verifica el resultado antes de seguir.',
  time_pressure: 'Baja un poco el ritmo en los primeros segundos para recuperar precisión.',
  accuracy_lapse: 'Haz una micro pausa antes de tocar la opción final.',
  context_transfer: 'Reescribe el problema con tus propias palabras antes de operar.',
  unknown: 'Haz una versión más simple del problema y luego vuelve al original.',
};

export const fallbackHintForProblem = (
  problem: Problem,
  hintLevel: HintUsage
): string => {
  const primary = problem.metadata.misconceptionHints[0] ?? 'unknown';
  if (primary === 'operation_order') {
    if (hintLevel === 1) {
      return 'Sigue siempre la misma ruta mental: primero (), luego [], después {} y al final lo que quedó afuera.';
    }
    if (hintLevel === 2) {
      return `Haz una mini ruta para "${problem.plainText}": resuelve el grupo más interno, reemplázalo por su resultado y recién entonces sigue con el resto.`;
    }
    return `Tapa mentalmente todo lo exterior y empieza solo por la parte más interna del ejercicio. Cada vez que resuelvas un grupo, vuelve a mirar qué símbolo queda ahora adentro.`;
  }
  if (hintLevel === 1) return misconceptionStrategy[primary];
  if (hintLevel === 2) {
    return `Paso a paso: mira primero ${problem.metadata.label.toLowerCase()} y decide qué operación o regla necesitas antes de calcular.`;
  }
  return `Empieza solo con el primer paso de "${problem.plainText}" y comprueba si tu camino coincide con la regla principal del ejercicio.`;
};

const labelFromSubskill = (subskillId: string): string => {
  const normalized = subskillId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return normalized;
};

export const buildFallbackSessionDiagnostic = ({
  attempts,
  goal,
  dueCount,
}: {
  attempts: AttemptRecord[];
  goal: string;
  dueCount: number;
}): SessionDiagnostic => {
  const grouped = new Map<
    string,
    { total: number; correct: number; label: string; mistakes: MisconceptionTag[] }
  >();

  attempts.forEach((attempt) => {
    const current = grouped.get(attempt.subskillId) ?? {
      total: 0,
      correct: 0,
      label: labelFromSubskill(attempt.subskillId),
      mistakes: [],
    };
    current.total += 1;
    if (attempt.isCorrect) current.correct += 1;
    current.mistakes.push(...attempt.misconceptionTags);
    grouped.set(attempt.subskillId, current);
  });

  const ranked = Array.from(grouped.values());
  const mastered = ranked
    .filter((item) => item.correct / item.total >= 0.75)
    .sort((left, right) => right.correct / right.total - left.correct / left.total)
    .slice(0, 3)
    .map((item) => item.label);
  const struggles = ranked
    .filter((item) => item.correct / item.total < 0.75)
    .sort((left, right) => left.correct / left.total - right.correct / right.total)
    .slice(0, 3)
    .map((item) => item.label);

  const misconceptionCount = new Map<MisconceptionTag, number>();
  attempts.flatMap((attempt) => attempt.misconceptionTags).forEach((tag) => {
    misconceptionCount.set(tag, (misconceptionCount.get(tag) ?? 0) + 1);
  });
  const dominantTag =
    Array.from(misconceptionCount.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ??
    'unknown';

  const incorrectAttempts = attempts.filter((attempt) => !attempt.isCorrect).slice(0, 3);
  const attemptInsights = incorrectAttempts.map((attempt) => ({
    attemptId: attempt.id,
    promptText: attempt.promptText,
    userAnswer: attempt.userAnswer,
    correctAnswer: attempt.correctAnswer,
    explanation:
      misconceptionWhy[attempt.misconceptionTags[0] ?? dominantTag] ??
      misconceptionWhy.unknown,
    microStrategyTip:
      misconceptionStrategy[attempt.misconceptionTags[0] ?? dominantTag] ??
      misconceptionStrategy.unknown,
  }));

  return {
    generatedBy: 'fallback',
    mastered:
      mastered.length > 0
        ? mastered
        : ['Mostraste constancia incluso en los ejercicios nuevos.'],
    struggles:
      struggles.length > 0
        ? struggles
        : ['No hubo un subskill claramente débil, pero conviene revisar la precisión.'],
    whyItHappened: misconceptionWhy[dominantTag],
    strategy: `${misconceptionStrategy[dominantTag]} Meta elegida: ${goal}`,
    nextChallenge:
      struggles[0] ??
      (dueCount > 0
        ? 'Tienes un reto pendiente que volverá pronto.'
        : 'Tu próximo reto será consolidar lo que acabas de mejorar.'),
    nextMission:
      dueCount > 0
        ? 'En la próxima sesión mezclaremos retos pendientes con ejercicios nuevos.'
        : 'La próxima sesión seguirá reforzando lo que más te costó hoy.',
    encouragement:
      incorrectAttempts.length === 0
        ? 'Sesión muy sólida: ahora toca consolidar para que el logro se mantenga.'
        : 'Cada error ya quedó convertido en una pista para el siguiente intento.',
    reviewPreview:
      dueCount > 0
        ? `Hay ${dueCount} reto(s) que volverán más adelante para comprobar si ya los superaste.`
        : 'Lo que costó hoy se guardará como reto para comprobar tu progreso después.',
    attemptInsights,
  };
};

export const buildPracticeQueue = ({
  category,
  grade,
  dueChallenges,
  sessionOrdinal,
  totalQuestions = TOTAL_QUESTIONS,
}: {
  category: Category;
  grade: GradeLevel;
  dueChallenges: ChallengeRecord[];
  sessionOrdinal: number;
  totalQuestions?: number;
}): QueuedProblem[] => {
  const reviewCount = dueChallenges.length
    ? Math.min(dueChallenges.length, Math.max(1, Math.round(totalQuestions * 0.3)))
    : 0;

  const reviewItems: QueuedProblem[] = dueChallenges
    .slice(0, reviewCount)
    .map((challenge) => ({
      problem: createReviewProblem(challenge, sessionOrdinal),
      source: 'review',
      challengeId: challenge.id,
    }));

  const newItems: QueuedProblem[] = Array.from({
    length: totalQuestions - reviewCount,
  }).map((_, index) => ({
    problem: generateProblem(category, index, grade),
    source: 'new',
    challengeId: null,
  }));

  if (reviewItems.length === 0) return newItems;

  const combined = [...newItems];
  reviewItems.forEach((item, index) => {
    const targetIndex = Math.min(
      combined.length,
      Math.round(((index + 1) * totalQuestions) / (reviewItems.length + 1)) - 1
    );
    combined.splice(Math.max(0, targetIndex), 0, item);
  });
  return combined;
};

export const answerToString = (answer: ProblemAnswer): string => String(answer);
