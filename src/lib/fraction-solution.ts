import type { FractionFocus, FractionTone } from './fraction-visual-tokens';

export type StepVisual =
  | {
      kind: 'fractions';
      items: Array<{
        n: number | string;
        d: number | string;
        tone: FractionTone;
        focus?: FractionFocus;
        label?: string;
      }>;
      op?: '+' | '-' | 'x' | '/';
    }
  | {
      kind: 'bars';
      a: { n: number; d: number };
      b?: { n: number; d: number };
      result?: { n: number; d: number };
      mode: 'same' | 'equalize' | 'combine';
    }
  | { kind: 'area'; a: { n: number; d: number }; b: { n: number; d: number } }
  | { kind: 'flip'; from: { n: number; d: number }; to: { n: number; d: number } };

export type SolutionStep = {
  id: string;
  title: string;
  instruction: string;
  resultLine: string;
  visual: StepVisual;
  micro?: {
    prompt: string;
    answer: string | number;
    choices: Array<string | number>;
    misconception?: string;
  };
};

type Fraction = { n: number; d: number };

const gcd = (a: number, b: number): number => {
  const left = Number.isFinite(a) ? Math.abs(a) : 0;
  const right = Number.isFinite(b) ? Math.abs(b) : 0;
  return right === 0 ? left : gcd(right, left % right);
};

const lcm = (a: number, b: number): number => {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return 1;
  return Math.abs((a * b) / (gcd(a, b) || 1));
};

const readNumber = (
  seed: Record<string, string | number | boolean>,
  key: string,
  fallback: number
): number => {
  const value = Number(seed[key]);
  return Number.isFinite(value) ? value : fallback;
};

const readDenominator = (
  seed: Record<string, string | number | boolean>,
  key: string,
  fallback: number
): number => {
  const value = Math.trunc(readNumber(seed, key, fallback));
  return value > 1 ? value : fallback;
};

const reduce = (fraction: Fraction): Fraction => {
  const sign = fraction.d < 0 ? -1 : 1;
  const n = fraction.n * sign;
  const d = Math.abs(fraction.d);
  const divisor = gcd(n, d) || 1;
  return { n: n / divisor, d: d / divisor };
};

const formatFraction = (n: number, d: number): string => {
  const reduced = reduce({ n, d });
  return reduced.d === 1 ? String(reduced.n) : `${reduced.n}/${reduced.d}`;
};

const formatMixedFromImproper = (n: number, d: number): string => {
  const reduced = reduce({ n, d });
  if (reduced.d === 1) return String(reduced.n);
  const sign = reduced.n < 0 ? -1 : 1;
  const absN = Math.abs(reduced.n);
  const whole = Math.floor(absN / reduced.d) * sign;
  const remainder = absN % reduced.d;
  if (whole === 0) return `${reduced.n}/${reduced.d}`;
  if (remainder === 0) return String(whole);
  return `${whole} ${remainder}/${reduced.d}`;
};

const fracText = (fraction: Fraction): string => `${fraction.n}/${fraction.d}`;
const mixedText = (whole: number, fraction: Fraction): string =>
  `${whole} ${fraction.n}/${fraction.d}`;

const rotateChoices = (choices: Array<string | number>, answer: string | number) => {
  const unique = choices.filter(
    (choice, index, all) => all.findIndex((item) => String(item) === String(choice)) === index
  );
  const answerIndex = unique.findIndex((choice) => String(choice) === String(answer));
  if (answerIndex === -1) unique.unshift(answer);
  const seed = String(answer)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const offset = unique.length ? seed % unique.length : 0;
  return [...unique.slice(offset), ...unique.slice(0, offset)].slice(0, 3);
};

const makeMicro = (
  prompt: string,
  answer: string | number,
  distractors: Array<string | number>,
  misconception?: string
): SolutionStep['micro'] => ({
  prompt,
  answer,
  choices: rotateChoices([answer, ...distractors], answer),
  misconception,
});

const finalStep = (
  id: string,
  answer: string,
  visual: StepVisual,
  distractors: Array<string | number> = []
): SolutionStep => ({
  id,
  title: 'Paso final: Simplifica',
  instruction: 'Reduce la fraccion si se puede.',
  resultLine: `Resultado: ${answer}`,
  visual,
  micro: makeMicro('Elige el resultado simplificado.', answer, distractors),
});

const buildAddSubtractSteps = ({
  pattern,
  left,
  right,
  answerText,
  mixedAnswer = false,
}: {
  pattern: string;
  left: Fraction;
  right: Fraction;
  answerText?: string;
  mixedAnswer?: boolean;
}): SolutionStep[] => {
  const isSubtract = pattern.includes('sub');
  const sameDenom = left.d === right.d;
  const op = isSubtract ? '-' : '+';
  const commonD = lcm(left.d, right.d);
  const leftCommon = { n: left.n * (commonD / left.d), d: commonD };
  const rightCommon = { n: right.n * (commonD / right.d), d: commonD };
  const resultN = isSubtract ? leftCommon.n - rightCommon.n : leftCommon.n + rightCommon.n;
  const resultText = answerText ?? (mixedAnswer ? formatMixedFromImproper(resultN, commonD) : formatFraction(resultN, commonD));

  if (sameDenom) {
    return [
      {
        id: 'same-denominator',
        title: 'Paso 1: Mira el denominador',
        instruction: 'El denominador es el mismo: se queda igual.',
        resultLine: `El denominador sigue siendo ${left.d}.`,
        visual: { kind: 'bars', a: left, b: right, mode: 'same' },
        micro: makeMicro('Que denominador se queda?', left.d, [left.d + 1, Math.max(2, left.d - 1)]),
      },
      {
        id: 'operate-numerators',
        title: `Paso 2: ${isSubtract ? 'Resta' : 'Suma'} numeradores`,
        instruction: `${isSubtract ? 'Resta' : 'Suma'} solo los numeradores.`,
        resultLine: `${left.n} ${op} ${right.n} = ${resultN}; el denominador queda ${commonD}.`,
        visual: {
          kind: 'fractions',
          items: [
            { ...left, tone: 'a', focus: 'num' },
            { ...right, tone: 'b', focus: 'num' },
            { n: resultN, d: commonD, tone: 'result', focus: 'num' },
          ],
          op,
        },
        micro: makeMicro('Cual es el numerador nuevo?', resultN, [left.n + right.n, Math.abs(left.n - right.n) + 1]),
      },
      finalStep('simplify', resultText, {
        kind: 'fractions',
        items: [{ n: resultN, d: commonD, tone: 'result' }],
      }),
    ];
  }

  return [
    {
      id: 'different-denominators',
      title: 'Paso 1: Compara denominadores',
      instruction: 'Los denominadores son distintos: necesitamos uno comun.',
      resultLine: `${left.d} y ${right.d} no son iguales.`,
      visual: { kind: 'bars', a: left, b: right, mode: 'equalize' },
    },
    {
      id: 'common-denominator',
      title: 'Paso 2: Busca el comun',
      instruction: 'Corta ambas fracciones con el mismo denominador.',
      resultLine: `El denominador comun es ${commonD}.`,
      visual: { kind: 'bars', a: leftCommon, b: rightCommon, mode: 'equalize' },
      micro: makeMicro('Cual es el denominador comun?', commonD, [left.d + right.d, Math.max(left.d, right.d)]),
    },
    {
      id: 'convert-fractions',
      title: 'Paso 3: Convierte cada fraccion',
      instruction: 'Multiplica arriba y abajo por el mismo factor.',
      resultLine: `${fracText(left)} = ${fracText(leftCommon)}; ${fracText(right)} = ${fracText(rightCommon)}.`,
      visual: {
        kind: 'fractions',
        items: [
          { ...leftCommon, tone: 'a' },
          { ...rightCommon, tone: 'b' },
        ],
        op,
      },
    },
    {
      id: 'operate-common-numerators',
      title: `Paso 4: ${isSubtract ? 'Resta' : 'Suma'} numeradores`,
      instruction: `Ahora ${isSubtract ? 'resta' : 'suma'} los numeradores.`,
      resultLine: `${leftCommon.n} ${op} ${rightCommon.n} = ${resultN}; el denominador queda ${commonD}.`,
      visual: {
        kind: 'fractions',
        items: [
          { ...leftCommon, tone: 'a', focus: 'num' },
          { ...rightCommon, tone: 'b', focus: 'num' },
          { n: resultN, d: commonD, tone: 'result', focus: 'num' },
        ],
        op,
      },
      micro: makeMicro('Cual es el numerador nuevo?', resultN, [leftCommon.n + rightCommon.n, Math.abs(leftCommon.n - rightCommon.n) + 1]),
    },
    finalStep('simplify', resultText, {
      kind: 'fractions',
      items: [{ n: resultN, d: commonD, tone: 'result' }],
    }),
  ];
};

const buildMultiplySteps = ({
  left,
  right,
  answerText,
  prefix = [],
}: {
  left: Fraction;
  right: Fraction;
  answerText?: string;
  prefix?: SolutionStep[];
}): SolutionStep[] => {
  const productN = left.n * right.n;
  const productD = left.d * right.d;
  const resultText = answerText ?? formatFraction(productN, productD);
  return [
    ...prefix,
    {
      id: 'no-common-denominator',
      title: 'Paso 1: No iguales denominadores',
      instruction: 'No hace falta denominador comun para multiplicar.',
      resultLine: `Multiplica ${fracText(left)} x ${fracText(right)} directamente.`,
      visual: { kind: 'fractions', items: [{ ...left, tone: 'a' }, { ...right, tone: 'b' }], op: 'x' },
      micro: makeMicro('Necesitas denominador comun?', 'No', ['Si']),
    },
    {
      id: 'multiply-numerators',
      title: 'Paso 2: Multiplica arriba',
      instruction: 'Multiplica los numeradores.',
      resultLine: `${left.n} x ${right.n} = ${productN}.`,
      visual: { kind: 'area', a: left, b: right },
      micro: makeMicro('Cual es el numerador del producto?', productN, [left.n + right.n, Math.max(1, productN - 1)]),
    },
    {
      id: 'multiply-denominators',
      title: 'Paso 3: Multiplica abajo',
      instruction: 'Multiplica los denominadores.',
      resultLine: `${left.d} x ${right.d} = ${productD}.`,
      visual: { kind: 'area', a: left, b: right },
      micro: makeMicro('Cual es el denominador del producto?', productD, [left.d + right.d, Math.max(2, productD - 1)]),
    },
    finalStep('simplify-product', resultText, {
      kind: 'fractions',
      items: [{ n: productN, d: productD, tone: 'result' }],
    }),
  ];
};

const buildDivideSteps = ({
  left,
  right,
  answerText,
  prefix = [],
}: {
  left: Fraction;
  right: Fraction;
  answerText?: string;
  prefix?: SolutionStep[];
}): SolutionStep[] => {
  const reciprocal = { n: right.d, d: right.n };
  const productN = left.n * reciprocal.n;
  const productD = left.d * reciprocal.d;
  const resultText = answerText ?? formatFraction(productN, productD);
  return [
    ...prefix,
    {
      id: 'keep-first',
      title: 'Paso 1: Deja la primera',
      instruction: 'La primera fraccion se queda igual.',
      resultLine: `La primera fraccion sigue siendo ${fracText(left)}.`,
      visual: { kind: 'fractions', items: [{ ...left, tone: 'a' }], op: '/' },
    },
    {
      id: 'flip-second',
      title: 'Paso 2: Voltea la segunda',
      instruction: 'Voltea la segunda fraccion: usa su reciproco.',
      resultLine: `${fracText(right)} se convierte en ${fracText(reciprocal)}.`,
      visual: { kind: 'flip', from: right, to: reciprocal },
      micro: makeMicro('Cual es el reciproco?', fracText(reciprocal), [fracText(right), `${right.n}/${Math.max(1, right.d + 1)}`]),
    },
    {
      id: 'change-to-multiply',
      title: 'Paso 3: Cambia la operacion',
      instruction: 'Cambia dividir por multiplicar.',
      resultLine: `${fracText(left)} / ${fracText(right)} = ${fracText(left)} x ${fracText(reciprocal)}.`,
      visual: { kind: 'fractions', items: [{ ...left, tone: 'a' }, { ...reciprocal, tone: 'b' }], op: 'x' },
      micro: makeMicro('Que signo usamos ahora?', 'x', ['/', '+']),
    },
    {
      id: 'multiply-reciprocal',
      title: 'Paso 4: Multiplica',
      instruction: 'Multiplica arriba con arriba y abajo con abajo.',
      resultLine: `${left.n} x ${reciprocal.n} = ${productN}; ${left.d} x ${reciprocal.d} = ${productD}.`,
      visual: { kind: 'area', a: left, b: reciprocal },
    },
    {
      ...finalStep('simplify-division', resultText, {
        kind: 'fractions',
        items: [{ n: productN, d: productD, tone: 'result' }],
      }),
      resultLine: `Resultado: ${resultText}. Preguntate: cuantos ${fracText(right)} caben en ${fracText(left)}?`,
    },
  ];
};

const buildConceptSteps = (
  pattern: string,
  seed: Record<string, string | number | boolean>
): SolutionStep[] => {
  if (pattern === 'equivalent') {
    const n = readNumber(seed, 'n', 1);
    const d = readDenominator(seed, 'd', 2);
    const targetD = readDenominator(seed, 'targetD', d * 2);
    const targetN = readNumber(seed, 'targetN', n * (targetD / d));
    return [
      {
        id: 'same-size',
        title: 'Paso 1: Conserva el tamano',
        instruction: 'Multiplica numerador y denominador por el mismo numero.',
        resultLine: `${n}/${d} ocupa el mismo espacio que ${targetN}/${targetD}.`,
        visual: { kind: 'bars', a: { n, d }, result: { n: targetN, d: targetD }, mode: 'equalize' },
        micro: makeMicro('Que numerador falta?', targetN, [targetN + 1, Math.max(1, targetN - 1)]),
      },
      finalStep('equivalent-result', String(targetN), {
        kind: 'fractions',
        items: [{ n: targetN, d: targetD, tone: 'result' }],
      }),
    ];
  }

  if (pattern === 'simplify' || pattern === 'reverse-simplify') {
    const shownN = readNumber(seed, 'shownN', 2);
    const shownD = readDenominator(seed, 'shownD', 4);
    const simplN = readNumber(seed, 'simplN', reduce({ n: shownN, d: shownD }).n);
    const simplD = readDenominator(seed, 'simplD', reduce({ n: shownN, d: shownD }).d);
    const answer = pattern === 'reverse-simplify' ? `${shownN}/${shownD}` : `${simplN}/${simplD}`;
    return [
      {
        id: 'factor-common',
        title: 'Paso 1: Busca factor comun',
        instruction: 'Divide arriba y abajo por el mismo numero.',
        resultLine: `${shownN}/${shownD} se relaciona con ${simplN}/${simplD}.`,
        visual: { kind: 'fractions', items: [{ n: shownN, d: shownD, tone: 'a' }, { n: simplN, d: simplD, tone: 'result' }] },
      },
      finalStep('simplify-result', answer, {
        kind: 'fractions',
        items: [{ n: simplN, d: simplD, tone: 'result' }],
      }),
    ];
  }

  if (pattern === 'mixed-to-improper' || pattern === 'improper-to-mixed') {
    const whole = readNumber(seed, 'whole', 1);
    const n = readNumber(seed, 'n', 1);
    const d = readDenominator(seed, 'd', 2);
    const improperN = readNumber(seed, 'improperN', whole * d + n);
    const answer = pattern === 'mixed-to-improper' ? `${improperN}/${d}` : mixedText(whole, { n, d });
    return [
      {
        id: 'mixed-formula',
        title: 'Paso 1: Junta enteros y partes',
        instruction: 'Multiplica entero por denominador y suma el numerador.',
        resultLine: `${whole} x ${d} + ${n} = ${improperN}.`,
        visual: { kind: 'fractions', items: [{ n: improperN, d, tone: 'result' }] },
        micro: makeMicro('Cual es el numerador impropio?', improperN, [whole + n, whole * d]),
      },
      finalStep('mixed-result', answer, {
        kind: 'fractions',
        items: [{ n: improperN, d, tone: 'result' }],
      }),
    ];
  }

  if (pattern === 'compare') {
    const n1 = readNumber(seed, 'n1', 1);
    const d1 = readDenominator(seed, 'd1', 2);
    const n2 = readNumber(seed, 'n2', 1);
    const d2 = readDenominator(seed, 'd2', 3);
    const commonD = lcm(d1, d2);
    const left = { n: n1 * (commonD / d1), d: commonD };
    const right = { n: n2 * (commonD / d2), d: commonD };
    const answer = left.n > right.n ? `${n1}/${d1}` : `${n2}/${d2}`;
    return [
      {
        id: 'compare-equalize',
        title: 'Paso 1: Usa el mismo corte',
        instruction: 'Convierte las dos fracciones al mismo denominador.',
        resultLine: `${n1}/${d1} = ${fracText(left)}; ${n2}/${d2} = ${fracText(right)}.`,
        visual: { kind: 'bars', a: left, b: right, mode: 'equalize' },
      },
      finalStep('compare-result', answer, {
        kind: 'fractions',
        items: [
          { ...left, tone: 'a' },
          { ...right, tone: 'b' },
        ],
      }),
    ];
  }

  if (pattern === 'frac-of-number' || pattern === 'reverse-frac-of-number') {
    const n = readNumber(seed, 'n', 1);
    const d = readDenominator(seed, 'd', 2);
    const whole = readNumber(seed, 'whole', d * 2);
    const result = (n * whole) / d;
    const answer = pattern === 'reverse-frac-of-number' ? whole : result;
    return [
      {
        id: 'fraction-of-number',
        title: 'Paso 1: Divide la cantidad',
        instruction: 'Divide el total entre el denominador.',
        resultLine: `${whole} / ${d} = ${whole / d}.`,
        visual: { kind: 'bars', a: { n, d }, mode: 'same' },
      },
      {
        id: 'take-parts',
        title: 'Paso 2: Toma las partes',
        instruction: 'Multiplica ese tamano por el numerador.',
        resultLine: `${whole / d} x ${n} = ${result}.`,
        visual: { kind: 'fractions', items: [{ n, d, tone: 'a' }] },
        micro: makeMicro('Cual es el resultado?', answer, [Number(answer) + 1, Math.max(1, Number(answer) - 1)]),
      },
    ];
  }

  return [
    {
      id: 'read-fraction-problem',
      title: 'Paso 1: Lee la fraccion',
      instruction: 'Mira que pide el problema antes de calcular.',
      resultLine: 'Separa numerador, denominador y operacion.',
      visual: { kind: 'fractions', items: [{ n: '?', d: '?', tone: 'neutral' }] },
    },
    {
      id: 'choose-rule',
      title: 'Paso 2: Elige la regla',
      instruction: 'Usa la regla de fracciones que corresponde.',
      resultLine: 'Calcula despacio y simplifica si se puede.',
      visual: { kind: 'fractions', items: [{ n: '?', d: '?', tone: 'result' }] },
    },
  ];
};

export function buildFractionSolution(
  pattern: string,
  seed: Record<string, string | number | boolean>
): SolutionStep[] {
  const n1 = readNumber(seed, 'n1', 1);
  const d1 = readDenominator(seed, 'd1', 2);
  const n2 = readNumber(seed, 'n2', 1);
  const d2 = readDenominator(seed, 'd2', d1);
  const whole1 = readNumber(seed, 'whole1', 1);
  const whole2 = readNumber(seed, 'whole2', 1);
  const natural = readNumber(seed, 'natural', 2);
  const left = { n: n1, d: d1 };
  const right = { n: n2, d: d2 };

  if (pattern === 'add-same-denom' || pattern === 'add-diff-denom' || pattern === 'sub-same-denom' || pattern === 'sub-diff-denom') {
    return buildAddSubtractSteps({ pattern, left, right });
  }

  if (pattern === 'mixed-add' || pattern === 'mixed-sub') {
    const mixedLeftText = mixedText(whole1, left);
    const mixedRightText = mixedText(whole2, right);
    const leftImproper = { n: whole1 * d1 + n1, d: d1 };
    const rightImproper = { n: whole2 * d2 + n2, d: d2 };
    const commonD = lcm(d1, d2);
    const resultN =
      pattern === 'mixed-sub'
        ? leftImproper.n * (commonD / d1) - rightImproper.n * (commonD / d2)
        : leftImproper.n * (commonD / d1) + rightImproper.n * (commonD / d2);
    const prefix: SolutionStep[] = [];

    if (pattern === 'mixed-sub' && n1 / d1 < n2 / d2 && whole1 > 0) {
      prefix.push({
        id: 'borrow-one',
        title: 'Paso 0: Pide prestado',
        instruction: 'Pide prestado 1 entero para que la resta sea visible.',
        resultLine: `${mixedLeftText} se puede mirar como ${whole1 - 1} ${n1 + d1}/${d1}.`,
        visual: { kind: 'fractions', items: [{ n: n1 + d1, d: d1, tone: 'a' }] },
      });
    }

    prefix.push({
      id: 'mixed-to-improper',
      title: 'Paso 1: Convierte los mixtos',
      instruction: 'Convierte cada numero mixto a fraccion impropia.',
      resultLine: `${mixedLeftText} = ${fracText(leftImproper)}; ${mixedRightText} = ${fracText(rightImproper)}.`,
      visual: {
        kind: 'fractions',
        items: [
          { ...leftImproper, tone: 'a' },
          { ...rightImproper, tone: 'b' },
        ],
        op: pattern === 'mixed-sub' ? '-' : '+',
      },
    });

    return [
      ...prefix,
      ...buildAddSubtractSteps({
        pattern: pattern === 'mixed-sub' ? 'sub-diff-denom' : 'add-diff-denom',
        left: leftImproper,
        right: rightImproper,
        answerText: formatMixedFromImproper(resultN, commonD),
        mixedAnswer: true,
      }),
    ];
  }

  if (pattern === 'mult-natural') {
    const naturalFraction = { n: natural, d: 1 };
    return buildMultiplySteps({
      left: naturalFraction,
      right: left,
      prefix: [
        {
          id: 'natural-as-fraction',
          title: 'Paso 1: Escribe el entero',
          instruction: 'Escribe el numero natural como fraccion sobre 1.',
          resultLine: `${natural} = ${natural}/1.`,
          visual: { kind: 'fractions', items: [{ ...naturalFraction, tone: 'a' }] },
        },
      ],
    });
  }

  if (pattern === 'mult-fractions') {
    return buildMultiplySteps({ left, right });
  }

  if (pattern === 'mult-mixed') {
    const leftImproper = { n: whole1 * d1 + n1, d: d1 };
    return buildMultiplySteps({
      left: leftImproper,
      right,
      answerText: formatMixedFromImproper(leftImproper.n * right.n, leftImproper.d * right.d),
      prefix: [
        {
          id: 'mixed-multiply-convert',
          title: 'Paso 0: Convierte el mixto',
          instruction: 'Convierte el numero mixto a fraccion impropia.',
          resultLine: `${mixedText(whole1, left)} = ${fracText(leftImproper)}.`,
          visual: { kind: 'fractions', items: [{ ...leftImproper, tone: 'a' }] },
        },
      ],
    });
  }

  if (pattern === 'div-fractions') {
    return buildDivideSteps({ left, right });
  }

  if (pattern === 'div-mixed') {
    const leftImproper = { n: whole1 * d1 + n1, d: d1 };
    const rightImproper = { n: whole2 * d2 + n2, d: d2 };
    return buildDivideSteps({
      left: leftImproper,
      right: rightImproper,
      prefix: [
        {
          id: 'mixed-division-convert',
          title: 'Paso 0: Convierte los mixtos',
          instruction: 'Convierte cada numero mixto a fraccion impropia.',
          resultLine: `${mixedText(whole1, left)} = ${fracText(leftImproper)}; ${mixedText(whole2, right)} = ${fracText(rightImproper)}.`,
          visual: {
            kind: 'fractions',
            items: [
              { ...leftImproper, tone: 'a' },
              { ...rightImproper, tone: 'b' },
            ],
            op: '/',
          },
        },
      ],
    });
  }

  return buildConceptSteps(pattern, seed);
}
