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
import { buildFractionSolution } from './fraction-solution';

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

type FractionAnswerFormat = {
  ans: number | string;
  type: 'fraction-str' | 'mixed-fraction-str' | 'standard';
};

type FractionOperationPattern =
  | 'add-same-denom'
  | 'add-diff-denom'
  | 'sub-same-denom'
  | 'sub-diff-denom'
  | 'mixed-add'
  | 'mixed-sub'
  | 'mult-fractions'
  | 'mult-natural'
  | 'mult-mixed'
  | 'div-fractions'
  | 'div-mixed';

const HARD_NUMBERS = [6, 7, 8, 9, 12];

const gcd = (a: number, b: number): number => {
  const left = Number.isFinite(a) ? Math.abs(a) : 0;
  const right = Number.isFinite(b) ? Math.abs(b) : 0;
  return right === 0 ? left : gcd(right, left % right);
};
const lcm = (a: number, b: number): number => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return 1;
  return Math.abs((a * b) / (gcd(a, b) || 1));
};
const renderFrac = (n: number | string, d: number | string): string =>
  `<div style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;gap:2px;vertical-align:middle;"><span>${n}</span><div style="width:100%;height:3px;background:#1e293b;border-radius:2px;"></div><span>${d}</span></div>`;
const renderFracInline = (n: number, d: number): string => `${n}/${d}`;
const renderMixedInline = (whole: number, n: number, d: number): string =>
  `${whole} ${n}/${d}`;
const renderMixedHtml = (whole: number, n: number, d: number): string =>
  fracRow(`<span style="font-weight:900;">${whole}</span>`, renderFrac(n, d));
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

const formatFractionAnswer = (n: number, d: number): FractionAnswerFormat => {
  if (d === 0) return { ans: 0, type: 'standard' };
  const sign = d < 0 ? -1 : 1;
  const normalizedN = n * sign;
  const normalizedD = Math.abs(d);
  const divisor = gcd(normalizedN, normalizedD) || 1;
  const reducedN = normalizedN / divisor;
  const reducedD = normalizedD / divisor;
  return reducedD === 1
    ? { ans: reducedN, type: 'standard' }
    : { ans: renderFracInline(reducedN, reducedD), type: 'fraction-str' };
};

const formatMixedAnswer = (whole: number, n: number, d: number): FractionAnswerFormat => {
  if (d === 0) return { ans: 0, type: 'standard' };
  const totalN = whole * d + n;
  const normalized = formatFractionAnswer(totalN, d);
  if (typeof normalized.ans === 'number') return normalized;

  const sign = totalN < 0 ? -1 : 1;
  const absN = Math.abs(totalN);
  const nextWhole = Math.floor(absN / d) * sign;
  const remainder = absN % d;
  if (remainder === 0) return { ans: nextWhole, type: 'standard' };
  if (nextWhole === 0) return normalized;

  const divisor = gcd(remainder, d) || 1;
  return {
    ans: renderMixedInline(nextWhole, remainder / divisor, d / divisor),
    type: 'mixed-fraction-str',
  };
};

const renderFractionStrip = (
  numerator: number,
  denominator: number,
  label?: string
): string => {
  const filled = clamp(numerator, 0, denominator);
  const cells = Array.from({ length: denominator })
    .map((_, index) => {
      const isFilled = index < filled;
      return `<span style="flex:1;height:18px;background:${isFilled ? '#818cf8' : '#eef2ff'};border-right:${index === denominator - 1 ? '0' : '1px solid #c7d2fe'};"></span>`;
    })
    .join('');

  return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:5px;font-size:12px;font-weight:800;color:#64748b;">
    <div style="display:flex;width:150px;overflow:hidden;border:2px solid #6366f1;border-radius:999px;background:#eef2ff;">${cells}</div>
    ${label ? `<span style="font-size:11px;line-height:1;color:#64748b;">${label}</span>` : ''}
  </div>`;
};

const renderMixedVisual = (whole: number, n: number, d: number): string => {
  const wholeBars = Array.from({ length: whole })
    .map(() => renderFractionStrip(d, d))
    .join('');
  return `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:0.15em;">
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:330px;">${wholeBars}${renderFractionStrip(n, d)}</div>
    <span style="font-size:13px;font-weight:900;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">${renderMixedInline(whole, n, d)}</span>
  </div>`;
};

const renderEquivalentVisual = (
  n: number,
  d: number,
  targetN: number,
  targetD: number
): string =>
  `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:0.15em;">
    ${renderFractionStrip(n, d, `${n}/${d}`)}
    ${renderFractionStrip(targetN, targetD, `?/${targetD}`)}
  </div>`;

const FRACTION_OPERATION_PATTERNS: FractionOperationPattern[] = [
  'add-same-denom',
  'add-diff-denom',
  'sub-same-denom',
  'sub-diff-denom',
  'mixed-add',
  'mixed-sub',
  'mult-fractions',
  'mult-natural',
  'mult-mixed',
  'div-fractions',
  'div-mixed',
];

const isFractionOperationPattern = (value: string): value is FractionOperationPattern =>
  FRACTION_OPERATION_PATTERNS.includes(value as FractionOperationPattern);

const compatibleDenoms = [2, 3, 4, 6, 8, 12];

const pickCompatibleDenomPair = (): { d1: number; d2: number } => {
  const pairs = compatibleDenoms.flatMap((d1) =>
    compatibleDenoms
      .filter((d2) => d2 !== d1 && lcm(d1, d2) <= 24)
      .map((d2) => ({ d1, d2 }))
  );
  return pairs[rand(0, pairs.length - 1)] ?? { d1: 3, d2: 4 };
};

const renderFractionOperationPrompt = (
  title: string,
  left: string,
  operator: string,
  right: string
): string =>
  `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">${title}</div>` +
  fracRow(
    left,
    `<span style="font-size:0.6em;color:#6366f1;margin:0 0.15em;">${operator}</span>`,
    right
  );

const operationSubskillIds: Record<FractionOperationPattern, string> = {
  'add-same-denom': 'fractions-add-same-denominator',
  'add-diff-denom': 'fractions-add-different-denominator',
  'sub-same-denom': 'fractions-subtract-same-denominator',
  'sub-diff-denom': 'fractions-subtract-different-denominator',
  'mixed-add': 'fractions-mixed-addition',
  'mixed-sub': 'fractions-mixed-subtraction',
  'mult-fractions': 'fractions-multiply-fractions',
  'mult-natural': 'fractions-multiply-natural',
  'mult-mixed': 'fractions-multiply-mixed',
  'div-fractions': 'fractions-divide-fractions',
  'div-mixed': 'fractions-divide-mixed',
};

const operationMisconceptionHints: Record<FractionOperationPattern, MisconceptionTag[]> = {
  'add-same-denom': ['fraction_operation'],
  'add-diff-denom': ['fraction_common_denominator'],
  'sub-same-denom': ['fraction_operation'],
  'sub-diff-denom': ['fraction_common_denominator'],
  'mixed-add': ['fraction_common_denominator'],
  'mixed-sub': ['fraction_common_denominator'],
  'mult-fractions': ['fraction_multiplication'],
  'mult-natural': ['fraction_multiplication'],
  'mult-mixed': ['fraction_multiplication'],
  'div-fractions': ['fraction_division'],
  'div-mixed': ['fraction_division'],
};

const operationTitles: Record<FractionOperationPattern, string> = {
  'add-same-denom': 'Suma con el mismo denominador',
  'add-diff-denom': 'Primero iguala denominadores',
  'sub-same-denom': 'Resta con el mismo denominador',
  'sub-diff-denom': 'Primero iguala denominadores',
  'mixed-add': 'Suma números mixtos',
  'mixed-sub': 'Resta números mixtos',
  'mult-fractions': 'Multiplica numerador por numerador',
  'mult-natural': 'Multiplica el entero por la fracción',
  'mult-mixed': 'Convierte y multiplica',
  'div-fractions': 'Divide invirtiendo la segunda fracción',
  'div-mixed': 'Convierte, invierte y multiplica',
};

const buildFractionOperationProblemFromSeed = ({
  pattern,
  seed,
  difficulty,
  subskillId,
  misconceptionHints,
}: {
  pattern: FractionOperationPattern;
  seed: Record<string, string | number | boolean>;
  difficulty: 'easy' | 'medium' | 'hard';
  subskillId?: string;
  misconceptionHints?: MisconceptionTag[];
}): Problem => {
  const readNumber = (value: string | number | boolean | undefined, fallback: number) => {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  };
  const readDenominator = (value: string | number | boolean | undefined, fallback: number) => {
    const next = Math.trunc(readNumber(value, fallback));
    return next > 1 ? next : fallback;
  };
  const n1 = readNumber(seed.n1, 1);
  const d1 = readDenominator(seed.d1, 2);
  const n2 = readNumber(seed.n2, 1);
  const d2 = readDenominator(seed.d2, d1);
  const whole1 = readNumber(seed.whole1, 1);
  const whole2 = readNumber(seed.whole2, 1);
  const natural = readNumber(seed.natural, 2);
  const commonD = lcm(d1, d2);
  let answer: FractionAnswerFormat;
  let left = renderFrac(n1, d1);
  let right = renderFrac(n2, d2);
  let operator = '+';
  let plainText = `${n1}/${d1} + ${n2}/${d2}`;

  if (pattern === 'add-same-denom' || pattern === 'add-diff-denom') {
    answer = formatFractionAnswer(n1 * (commonD / d1) + n2 * (commonD / d2), commonD);
  } else if (pattern === 'sub-same-denom' || pattern === 'sub-diff-denom') {
    operator = '−';
    plainText = `${n1}/${d1} - ${n2}/${d2}`;
    answer = formatFractionAnswer(n1 * (commonD / d1) - n2 * (commonD / d2), commonD);
  } else if (pattern === 'mixed-add') {
    left = renderMixedHtml(whole1, n1, d1);
    right = renderMixedHtml(whole2, n2, d2);
    plainText = `${renderMixedInline(whole1, n1, d1)} + ${renderMixedInline(whole2, n2, d2)}`;
    const totalN =
      (whole1 * commonD + n1 * (commonD / d1)) +
      (whole2 * commonD + n2 * (commonD / d2));
    answer = formatMixedAnswer(0, totalN, commonD);
  } else if (pattern === 'mixed-sub') {
    left = renderMixedHtml(whole1, n1, d1);
    right = renderMixedHtml(whole2, n2, d2);
    operator = '−';
    plainText = `${renderMixedInline(whole1, n1, d1)} - ${renderMixedInline(whole2, n2, d2)}`;
    const totalN =
      (whole1 * commonD + n1 * (commonD / d1)) -
      (whole2 * commonD + n2 * (commonD / d2));
    answer = formatMixedAnswer(0, totalN, commonD);
  } else if (pattern === 'mult-natural') {
    left = `<span style="font-weight:900;">${natural}</span>`;
    right = renderFrac(n1, d1);
    operator = '×';
    plainText = `${natural} x ${n1}/${d1}`;
    answer = formatFractionAnswer(natural * n1, d1);
  } else if (pattern === 'mult-fractions') {
    operator = '×';
    plainText = `${n1}/${d1} x ${n2}/${d2}`;
    answer = formatFractionAnswer(n1 * n2, d1 * d2);
  } else if (pattern === 'mult-mixed') {
    left = renderMixedHtml(whole1, n1, d1);
    operator = '×';
    plainText = `${renderMixedInline(whole1, n1, d1)} x ${n2}/${d2}`;
    answer = formatMixedAnswer(0, (whole1 * d1 + n1) * n2, d1 * d2);
  } else if (pattern === 'div-fractions') {
    operator = '÷';
    plainText = `${n1}/${d1} / ${n2}/${d2}`;
    answer = formatFractionAnswer(n1 * d2, d1 * n2);
  } else {
    left = renderMixedHtml(whole1, n1, d1);
    right = renderMixedHtml(whole2, n2, d2);
    operator = '÷';
    plainText = `${renderMixedInline(whole1, n1, d1)} / ${renderMixedInline(whole2, n2, d2)}`;
    answer = formatFractionAnswer((whole1 * d1 + n1) * d2, d1 * (whole2 * d2 + n2));
  }

  return buildProblem({
    text: renderFractionOperationPrompt(operationTitles[pattern], left, operator, right),
    plainText,
    ans: answer.ans,
    type: answer.type,
    subskillId: subskillId ?? operationSubskillIds[pattern],
    label: 'Fracciones',
    pattern,
    difficulty,
    challengeSeed: seed,
    misconceptionHints: misconceptionHints ?? operationMisconceptionHints[pattern],
  });
};

const buildFractionOperationSeed = (
  pattern: FractionOperationPattern,
  questionIndex: number
): Record<string, string | number | boolean> => {
  if (pattern === 'add-same-denom') {
    const d1 = compatibleDenoms[rand(0, 4)];
    return { n1: rand(1, d1 - 1), d1, n2: rand(1, d1 - 1), d2: d1 };
  }

  if (pattern === 'sub-same-denom') {
    const d1 = compatibleDenoms[rand(2, compatibleDenoms.length - 1)];
    const n2 = rand(1, d1 - 2);
    return { n1: rand(n2 + 1, d1 - 1), d1, n2, d2: d1 };
  }

  if (pattern === 'add-diff-denom' || pattern === 'sub-diff-denom') {
    for (let attempts = 0; attempts < 40; attempts += 1) {
      const { d1, d2 } = pickCompatibleDenomPair();
      const n1 = rand(1, d1 - 1);
      const n2 = rand(1, d2 - 1);
      if (pattern === 'add-diff-denom' || n1 / d1 > n2 / d2) {
        return { n1, d1, n2, d2 };
      }
    }
    return { n1: 3, d1: 4, n2: 1, d2: 6 };
  }

  if (pattern === 'mixed-add' || pattern === 'mixed-sub') {
    const { d1, d2 } = pickCompatibleDenomPair();
    const seed = {
      whole1: rand(pattern === 'mixed-sub' ? 2 : 1, 4),
      n1: rand(1, d1 - 1),
      d1,
      whole2: rand(1, 2),
      n2: rand(1, d2 - 1),
      d2,
    };
    if (pattern === 'mixed-sub') {
      const commonD = lcm(d1, d2);
      const left = Number(seed.whole1) * commonD + Number(seed.n1) * (commonD / d1);
      const right = Number(seed.whole2) * commonD + Number(seed.n2) * (commonD / d2);
      if (left <= right) {
        seed.whole1 = Number(seed.whole2) + 1;
      }
    }
    return seed;
  }

  if (pattern === 'mult-natural') {
    const d1 = compatibleDenoms[rand(1, compatibleDenoms.length - 1)];
    return { natural: rand(2, questionIndex < 10 ? 5 : 8), n1: rand(1, d1 - 1), d1 };
  }

  if (pattern === 'mult-fractions' || pattern === 'div-fractions') {
    const { d1, d2 } = pickCompatibleDenomPair();
    return { n1: rand(1, d1 - 1), d1, n2: rand(1, d2 - 1), d2 };
  }

  if (pattern === 'mult-mixed' || pattern === 'div-mixed') {
    const { d1, d2 } = pickCompatibleDenomPair();
    return {
      whole1: rand(1, 3),
      n1: rand(1, d1 - 1),
      d1,
      whole2: pattern === 'div-mixed' ? rand(1, 2) : 0,
      n2: rand(1, d2 - 1),
      d2,
    };
  }

  return { n1: 1, d1: 2, n2: 1, d2: 3 };
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
    'Quiero cuidar el denominador común al sumar y restar.',
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
      text:
        `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">Cuenta las partes sombreadas equivalentes</div>` +
        renderEquivalentVisual(n, d, targetN, targetD) +
        fracRow(
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

  if (questionType === 'mixed-to-improper') {
    const d = pickDenom();
    const n = rand(1, d - 1);
    const whole = rand(1, questionIndex < 10 ? 2 : 3);
    const improperN = whole * d + n;
    return buildProblem({
      text:
        `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">Convierte a fracción impropia</div>` +
        renderMixedVisual(whole, n, d) +
        fracRow(
          `<span style="font-weight:900;">${whole}</span>`,
          renderFrac(n, d),
          `<span style="font-size:0.6em;color:#94a3b8;">=</span>`,
          renderFrac('?', d)
        ),
      plainText: `Convierte ${renderMixedInline(whole, n, d)} a fracción impropia`,
      ans: renderFracInline(improperN, d),
      type: 'fraction-str',
      subskillId: 'fractions-mixed',
      label: 'Fracciones',
      pattern: 'mixed-to-improper',
      difficulty,
      challengeSeed: { whole, n, d, improperN },
      misconceptionHints: ['fraction_operation'],
    });
  }

  if (questionType === 'improper-to-mixed') {
    const d = pickDenom();
    const n = rand(1, d - 1);
    const whole = rand(1, questionIndex < 10 ? 2 : 3);
    const improperN = whole * d + n;
    return buildProblem({
      text:
        `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">Convierte a número mixto</div>` +
        renderMixedVisual(whole, n, d) +
        fracRow(
          renderFrac(improperN, d),
          `<span style="font-size:0.6em;color:#94a3b8;">=</span>`,
          `<span style="font-size:0.55em;color:#94a3b8;">? ${renderFrac('?', d)}</span>`
        ),
      plainText: `Convierte ${improperN}/${d} a número mixto`,
      ans: renderMixedInline(whole, n, d),
      type: 'mixed-fraction-str',
      subskillId: 'fractions-mixed',
      label: 'Fracciones',
      pattern: 'improper-to-mixed',
      difficulty,
      challengeSeed: { whole, n, d, improperN },
      misconceptionHints: ['fraction_operation'],
    });
  }

  if (questionType === 'compare') {
    const d1 = pickDenom();
    const n1 = rand(1, d1 - 1);
    let d2 = d1;
    let n2 = 1;
    let foundComparison = false;
    for (let attempts = 0; attempts < 40; attempts += 1) {
      d2 = pickDenom();
      if (d2 === d1) continue;
      n2 = rand(1, d2 - 1);
      if (n1 * d2 !== n2 * d1) {
        foundComparison = true;
        break;
      }
    }
    if (!foundComparison) {
      d2 = denoms.find((candidate) => candidate !== d1 && candidate > 2) ?? 3;
      n2 = n1 * d2 === d1 ? 2 : 1;
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

  const operationPattern = isFractionOperationPattern(questionType)
    ? questionType
    : 'add-same-denom';
  return buildFractionOperationProblemFromSeed({
    pattern: operationPattern,
    seed: buildFractionOperationSeed(operationPattern, questionIndex),
    difficulty,
  });
};

const makeFractionsProblem = (
  questionIndex: number,
  grade: GradeLevel
): Problem => {
  const grade5EasyTypes = [
    'frac-of-number',
    'simplify',
    'equivalent',
    'mixed-to-improper',
    'add-same-denom',
    'sub-same-denom',
  ];
  const grade5MedTypes = [
    ...grade5EasyTypes,
    'add-diff-denom',
    'sub-diff-denom',
    'mult-natural',
    'mult-fractions',
    'compare',
  ];
  const grade5HardTypes = [
    ...grade5MedTypes,
    'improper-to-mixed',
    'div-fractions',
  ];
  const grade6EasyTypes = [
    'frac-of-number',
    'simplify',
    'equivalent',
    'mixed-to-improper',
    'add-same-denom',
    'sub-same-denom',
    'mult-natural',
  ];
  const grade6MedTypes = [
    ...grade6EasyTypes,
    'add-diff-denom',
    'sub-diff-denom',
    'mult-fractions',
    'mult-mixed',
    'improper-to-mixed',
    'compare',
  ];
  const grade6HardTypes = [
    ...grade6MedTypes,
    'mixed-add',
    'mixed-sub',
    'div-fractions',
    'div-mixed',
  ];
  const pool =
    grade <= 5
      ? questionIndex < 7
        ? grade5EasyTypes
        : questionIndex < 14
          ? grade5MedTypes
          : grade5HardTypes
      : questionIndex < 7
        ? grade6EasyTypes
        : questionIndex < 14
          ? grade6MedTypes
          : grade6HardTypes;
  const questionType =
    pool[rand(0, pool.length - 1)];
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
        text:
          `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">Cuenta las partes sombreadas equivalentes</div>` +
          renderEquivalentVisual(n, d, targetN, targetD) +
          fracRow(
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
    if (metadata.pattern === 'mixed-to-improper') {
      const whole = Number(seed.whole);
      const n = Number(seed.n);
      const d = Number(seed.d);
      const improperN = Number(seed.improperN);
      return buildProblem({
        text:
          `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">Convierte a fracción impropia</div>` +
          renderMixedVisual(whole, n, d) +
          fracRow(
            `<span style="font-weight:900;">${whole}</span>`,
            renderFrac(n, d),
            `<span style="font-size:0.6em;color:#94a3b8;">=</span>`,
            renderFrac('?', d)
          ),
        plainText: `Convierte ${renderMixedInline(whole, n, d)} a fracción impropia`,
        ans: renderFracInline(improperN, d),
        type: 'fraction-str',
        subskillId: metadata.subskillId,
        label: 'Fracciones',
        pattern: metadata.pattern,
        difficulty: metadata.difficulty,
        challengeSeed: seed,
        misconceptionHints: metadata.misconceptionHints,
      });
    }
    if (metadata.pattern === 'improper-to-mixed') {
      const whole = Number(seed.whole);
      const n = Number(seed.n);
      const d = Number(seed.d);
      const improperN = Number(seed.improperN);
      return buildProblem({
        text:
          `<div style="font-size:0.42em;color:#94a3b8;text-align:center;margin-bottom:0.45em;">Convierte a número mixto</div>` +
          renderMixedVisual(whole, n, d) +
          fracRow(
            renderFrac(improperN, d),
            `<span style="font-size:0.6em;color:#94a3b8;">=</span>`,
            `<span style="font-size:0.55em;color:#94a3b8;">? ${renderFrac('?', d)}</span>`
          ),
        plainText: `Convierte ${improperN}/${d} a número mixto`,
        ans: renderMixedInline(whole, n, d),
        type: 'mixed-fraction-str',
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
    if (isFractionOperationPattern(metadata.pattern)) {
      return buildFractionOperationProblemFromSeed({
        pattern: metadata.pattern,
        seed,
        difficulty: metadata.difficulty,
        subskillId: metadata.subskillId,
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

const nudgeNumerator = (
  value: number,
  denominator: number,
  sessionOrdinal: number
): number => {
  const delta = sessionOrdinal % 2 === 0 ? 1 : -1;
  return clamp(value + delta, 1, Math.max(1, denominator - 1));
};

const findNumeratorNear = (
  denominator: number,
  preferred: number,
  predicate: (candidate: number) => boolean
): number | null => {
  if (!Number.isFinite(denominator) || denominator <= 1) return null;
  const candidates = Array.from(
    { length: Math.max(0, Math.trunc(denominator) - 1) },
    (_, index) => index + 1
  ).sort(
    (left, right) =>
      Math.abs(left - preferred) - Math.abs(right - preferred) || left - right
  );
  return candidates.find(predicate) ?? null;
};

const isFractionGreater = (
  n1: number,
  d1: number,
  n2: number,
  d2: number
): boolean => n1 * d2 > n2 * d1;

const isSameFractionValue = (
  n1: number,
  d1: number,
  n2: number,
  d2: number
): boolean => n1 * d2 === n2 * d1;

const buildFractionVariantSeed = (
  pattern: string,
  seed: Record<string, string | number | boolean>,
  sessionOrdinal: number
): Record<string, string | number | boolean> | null => {
  const delta = sessionOrdinal % 2 === 0 ? 1 : -1;
  const next = { ...seed };

  if (pattern === 'frac-of-number' || pattern === 'reverse-frac-of-number') {
    const d = Number(seed.d);
    const whole = Number(seed.whole);
    if (!Number.isFinite(d) || !Number.isFinite(whole)) return null;
    next.whole = Math.max(d * 2, whole + d * delta);
    return next;
  }

  if (pattern === 'simplify' || pattern === 'reverse-simplify') {
    const simplN = Number(seed.simplN);
    const simplD = Number(seed.simplD);
    const factor = Math.max(2, Math.round(Number(seed.shownD) / Math.max(1, simplD)) + delta);
    if (!Number.isFinite(simplN) || !Number.isFinite(simplD)) return null;
    next.shownN = simplN * factor;
    next.shownD = simplD * factor;
    return next;
  }

  if (pattern === 'equivalent') {
    const n = Number(seed.n);
    const d = Number(seed.d);
    const currentFactor = Math.max(2, Math.round(Number(seed.targetD) / Math.max(1, d)));
    const factor = clamp(currentFactor + delta, 2, 5);
    if (!Number.isFinite(n) || !Number.isFinite(d)) return null;
    next.targetD = d * factor;
    next.targetN = n * factor;
    return next;
  }

  if (pattern === 'compare') {
    const d1 = Number(seed.d1);
    const n1 = Number(seed.n1);
    const d2 = Number(seed.d2);
    const n2 = Number(seed.n2);
    if (!Number.isFinite(d1) || !Number.isFinite(n1) || !Number.isFinite(d2) || !Number.isFinite(n2)) {
      return null;
    }
    const preferredN1 = nudgeNumerator(n1, d1, sessionOrdinal);
    const adjustedN1 = findNumeratorNear(
      d1,
      preferredN1,
      (candidate) => candidate !== n1 && !isSameFractionValue(candidate, d1, n2, d2)
    );
    if (adjustedN1 !== null) {
      next.n1 = adjustedN1;
      return next;
    }
    const adjustedN2 = findNumeratorNear(
      d2,
      nudgeNumerator(n2, d2, sessionOrdinal + 1),
      (candidate) => candidate !== n2 && !isSameFractionValue(n1, d1, candidate, d2)
    );
    if (adjustedN2 !== null) {
      next.n2 = adjustedN2;
      return next;
    }
    return null;
  }

  if (pattern === 'mixed-to-improper' || pattern === 'improper-to-mixed') {
    const whole = Number(seed.whole);
    const n = Number(seed.n);
    const d = Number(seed.d);
    if (!Number.isFinite(whole) || !Number.isFinite(n) || !Number.isFinite(d)) return null;
    next.whole = clamp(whole + delta, 1, 4);
    next.improperN = Number(next.whole) * d + n;
    return next;
  }

  if (!isFractionOperationPattern(pattern)) return null;

  if (pattern === 'mixed-add' || pattern === 'mixed-sub' || pattern === 'mult-mixed' || pattern === 'div-mixed') {
    const whole1 = Number(seed.whole1);
    if (!Number.isFinite(whole1)) return null;
    next.whole1 = clamp(whole1 + delta, 1, 5);
    if (pattern === 'mixed-sub') {
      const d1 = Number(seed.d1);
      const d2 = Number(seed.d2);
      const n1 = Number(seed.n1);
      const n2 = Number(seed.n2);
      const whole2 = Number(seed.whole2);
      if (
        !Number.isFinite(d1) ||
        !Number.isFinite(d2) ||
        !Number.isFinite(n1) ||
        !Number.isFinite(n2) ||
        !Number.isFinite(whole2)
      ) {
        return null;
      }
      const commonD = lcm(d1, d2);
      const left =
        Number(next.whole1) * commonD +
        n1 * (commonD / d1);
      const right = whole2 * commonD + n2 * (commonD / d2);
      if (left <= right) {
        next.whole1 = clamp(whole2 + 1, 1, 6);
        const repairedLeft =
          Number(next.whole1) * commonD + n1 * (commonD / d1);
        if (repairedLeft <= right) return null;
      }
    }
    return next;
  }

  if (pattern === 'mult-natural') {
    const natural = Number(seed.natural);
    if (!Number.isFinite(natural)) return null;
    next.natural = clamp(natural + delta, 2, 9);
    return next;
  }

  const d1 = Number(seed.d1);
  const d2 = Number(seed.d2 ?? d1);
  const n1 = Number(seed.n1);
  const n2 = Number(seed.n2);
  if (!Number.isFinite(d1) || !Number.isFinite(d2) || !Number.isFinite(n1) || !Number.isFinite(n2)) {
    return null;
  }

  if (pattern === 'sub-same-denom' || pattern === 'sub-diff-denom') {
    const adjustedN1 = findNumeratorNear(
      d1,
      nudgeNumerator(n1, d1, sessionOrdinal),
      (candidate) => candidate !== n1 && isFractionGreater(candidate, d1, n2, d2)
    );
    if (adjustedN1 !== null) {
      next.n1 = adjustedN1;
      return next;
    }
    const adjustedN2 = findNumeratorNear(
      d2,
      nudgeNumerator(n2, d2, sessionOrdinal + 1),
      (candidate) => candidate !== n2 && isFractionGreater(n1, d1, candidate, d2)
    );
    if (adjustedN2 !== null) {
      next.n2 = adjustedN2;
      return next;
    }
    return null;
  }

  next.n1 = nudgeNumerator(n1, d1, sessionOrdinal);
  return next;
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

  if (challenge.category === 'fractions') {
    const variantSeed = buildFractionVariantSeed(pattern, seed, sessionOrdinal);
    if (!variantSeed) return null;
    return createProblemFromTemplate(challenge.category, {
      ...challenge.template.metadata,
      challengeSeed: variantSeed,
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

const buildClassicFractionDecoy = (problem?: Problem): ProblemAnswer | null => {
  if (!problem || labelToCategory(problem.metadata.label) !== 'fractions') return null;
  const { pattern, challengeSeed: seed } = problem.metadata;
  const n1 = Number(seed.n1);
  const d1 = Number(seed.d1);
  const n2 = Number(seed.n2);
  const d2 = Number(seed.d2);
  const natural = Number(seed.natural);

  if (!Number.isFinite(n1) || !Number.isFinite(d1)) return null;

  if (pattern === 'add-diff-denom') {
    return formatFractionAnswer(n1 + n2, d1 + d2).ans;
  }

  if (pattern === 'sub-diff-denom' && d1 !== d2 && n1 > n2) {
    return formatFractionAnswer(n1 - n2, Math.abs(d1 - d2)).ans;
  }

  if (pattern === 'mult-fractions') {
    return formatFractionAnswer(n1 + n2, d1 + d2).ans;
  }

  if (pattern === 'mult-natural' && Number.isFinite(natural)) {
    return formatFractionAnswer(natural + n1, d1).ans;
  }

  if (pattern === 'div-fractions') {
    return formatFractionAnswer(n1 * n2, d1 * d2).ans;
  }

  return null;
};

export const generateOptions = (
  correctAnswer: ProblemAnswer,
  type: string,
  problem?: Problem
): Array<string | number | boolean> => {
  if (typeof correctAnswer === 'boolean') return [true, false];
  const options: Array<string | number | boolean> = [correctAnswer];
  const classicDecoy = buildClassicFractionDecoy(problem);
  const addOption = (value: string | number | boolean | undefined) => {
    if (
      options.length < 5 &&
      value !== undefined &&
      value !== correctAnswer &&
      !options.includes(value)
    ) {
      options.push(value);
    }
  };
  if (
    classicDecoy !== null &&
    classicDecoy !== correctAnswer &&
    !options.includes(classicDecoy)
  ) {
    options.push(classicDecoy);
  }
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
    } else if (type === 'mixed-fraction-str') {
      const match = /^(\d+)\s+(\d+)\/(\d+)$/.exec(String(correctAnswer));
      if (match) {
        const whole = Number(match[1]);
        const n = Number(match[2]);
        const d = Number(match[3]);
        const variants: string[] = [
          renderMixedInline(whole + 1, n, d),
          renderMixedInline(Math.max(1, whole - 1), n, d),
          renderMixedInline(whole, Math.min(d - 1, n + 1), d),
          renderMixedInline(whole, Math.max(1, n - 1), d),
          renderMixedInline(whole, n, d + 1),
        ];
        const maybe = variants[rand(0, variants.length - 1)];
        if (!options.includes(maybe) && maybe !== correctAnswer) decoy = maybe;
      }
    } else {
      const diff = rand(1, 5) * (Math.random() > 0.5 ? 1 : -1);
      const maybe: number = Number(correctAnswer) + diff;
      if (Number.isFinite(maybe) && maybe > 0 && maybe !== correctAnswer) decoy = maybe;
    }

    addOption(decoy);
  }

  if (options.length < 5 && type === 'fraction-str') {
    const [n, d]: [number, number] = String(correctAnswer)
      .split('/')
      .map(Number) as [number, number];
    [
      `${n + 2}/${d}`,
      `${Math.max(1, n - 2)}/${d}`,
      `${n}/${d + 2}`,
      `${n + d}/${d}`,
      `${Math.max(1, d - n)}/${d}`,
    ].forEach(addOption);
  }

  if (options.length < 5 && type === 'mixed-fraction-str') {
    const match = /^(\d+)\s+(\d+)\/(\d+)$/.exec(String(correctAnswer));
    if (match) {
      const whole = Number(match[1]);
      const n = Number(match[2]);
      const d = Number(match[3]);
      [
        renderMixedInline(whole + 2, n, d),
        renderMixedInline(Math.max(1, whole - 2), n, d),
        renderMixedInline(whole, Math.min(d - 1, n + 2), d),
        renderMixedInline(whole, Math.max(1, n - 2), d),
        renderMixedInline(whole, n, d + 2),
      ].forEach(addOption);
    }
  }

  if (options.length < 5 && type === 'standard') {
    const numericAnswer = Number(correctAnswer);
    [1, -1, 2, -2, 3, -3, 5, -5].forEach((diff) => {
      const maybe = numericAnswer + diff;
      if (Number.isFinite(maybe) && maybe > 0) addOption(maybe);
    });
  }

  return options.sort(() => Math.random() - 0.5);
};

export const getQuestionThresholdMs = (
  category: Category,
  grade: GradeLevel
): number => {
  if (category === 'divisibility') return grade === 5 ? 6500 : 5500;
  if (category === 'fractions') return 11000;
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
  fraction_common_denominator: 'Faltó igualar los denominadores antes de sumar o restar.',
  fraction_multiplication: 'La multiplicación de fracciones necesita multiplicar numeradores y denominadores, y luego simplificar.',
  fraction_division: 'La división de fracciones requiere convertirla en multiplicación usando la fracción recíproca.',
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
  fraction_common_denominator: 'Antes de operar, convierte ambas fracciones al mismo denominador y recién entonces suma o resta numeradores.',
  fraction_multiplication: 'Multiplica numerador por numerador y denominador por denominador, luego simplifica si puedes.',
  fraction_division: 'Cambia la división por multiplicación: deja la primera fracción igual, invierte la segunda y multiplica.',
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
  if (problem.metadata.label === 'Fracciones') {
    const steps = buildFractionSolution(
      problem.metadata.pattern,
      problem.metadata.challengeSeed
    );
    const step = steps[Math.min(Math.max(1, hintLevel) - 1, steps.length - 1)];
    if (step) {
      return `${step.title}: ${step.instruction} ${step.resultLine}`;
    }
  }
  if (primary === 'operation_order') {
    if (hintLevel === 1) {
      return 'Sigue siempre la misma ruta mental: primero (), luego [], después {} y al final lo que quedó afuera.';
    }
    if (hintLevel === 2) {
      return `Haz una mini ruta para "${problem.plainText}": resuelve el grupo más interno, reemplázalo por su resultado y recién entonces sigue con el resto.`;
    }
    return `Tapa mentalmente todo lo exterior y empieza solo por la parte más interna del ejercicio. Cada vez que resuelvas un grupo, vuelve a mirar qué símbolo queda ahora adentro.`;
  }
  if (primary === 'fraction_common_denominator') {
    if (hintLevel === 2) {
      return `Busca un denominador común para "${problem.plainText}". Reescribe ambas fracciones con ese denominador antes de operar.`;
    }
    if (hintLevel === 3) {
      return 'Ejemplo cercano: para 1/3 + 1/6, conviertes 1/3 en 2/6 y luego sumas 2/6 + 1/6.';
    }
  }
  if (primary === 'fraction_multiplication') {
    if (hintLevel === 2) {
      return 'Multiplica los numeradores entre sí y los denominadores entre sí. Al final revisa si la fracción se puede simplificar.';
    }
    if (hintLevel === 3) {
      return 'Ejemplo cercano: 2/3 × 1/4 se piensa como (2×1)/(3×4), entonces queda 2/12 y se simplifica.';
    }
  }
  if (primary === 'fraction_division') {
    if (hintLevel === 2) {
      return 'Deja la primera fracción igual, invierte la segunda y cambia la división por multiplicación.';
    }
    if (hintLevel === 3) {
      return 'Ejemplo cercano: 3/4 ÷ 1/2 se vuelve 3/4 × 2/1. Luego multiplicas y simplificas.';
    }
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
