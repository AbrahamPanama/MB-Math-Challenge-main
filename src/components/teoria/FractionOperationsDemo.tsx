'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Divide, Equal, RotateCcw, TimerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  FractionVisual,
  type VisualizerMode,
  visualizerOptions,
} from '@/components/teoria/FractionVisual';
import { buildFractionSolution, type SolutionStep } from '@/lib/fraction-solution';

type OperationMode = 'add' | 'subtract';

const denomChoices = [2, 3, 4, 6, 8, 12];

const gcd = (a: number, b: number): number => {
  const left = Math.abs(a);
  const right = Math.abs(b);
  return right === 0 ? left : gcd(right, left % right);
};

const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

const formatFraction = (n: number, d: number): string => {
  if (d === 0) return '0';
  const divisor = gcd(n, d) || 1;
  const reducedN = n / divisor;
  const reducedD = d / divisor;
  return reducedD === 1 ? String(reducedN) : `${reducedN}/${reducedD}`;
};

const fractionValue = (n: number, d: number) => n / d;

export default function FractionOperationsDemo() {
  const [visualizer, setVisualizer] = useState<VisualizerMode>('pill');
  const [operationMode, setOperationMode] = useState<OperationMode>('add');
  const [leftNumerator, setLeftNumerator] = useState(1);
  const [leftDenomIndex, setLeftDenomIndex] = useState(2);
  const [rightNumerator, setRightNumerator] = useState(1);
  const [rightDenomIndex, setRightDenomIndex] = useState(3);
  const [multNumerator, setMultNumerator] = useState(2);
  const [multDenomIndex, setMultDenomIndex] = useState(1);
  const [areaNumerator, setAreaNumerator] = useState(1);
  const [areaDenomIndex, setAreaDenomIndex] = useState(2);
  const [dividendNumerator, setDividendNumerator] = useState(3);
  const [divisorNumerator, setDivisorNumerator] = useState(1);

  const leftD = denomChoices[leftDenomIndex];
  const rightD = denomChoices[rightDenomIndex];
  const multD = denomChoices[multDenomIndex];
  const areaD = denomChoices[areaDenomIndex];
  const divisionD = 4;

  const commonD = lcm(leftD, rightD);
  const commonLeftN = leftNumerator * (commonD / leftD);
  const commonRightN = rightNumerator * (commonD / rightD);
  const operationResultN =
    operationMode === 'add' ? commonLeftN + commonRightN : commonLeftN - commonRightN;
  const operationIsPositive = operationResultN >= 0;
  const operationSymbol = operationMode === 'add' ? '+' : '-';

  const productN = multNumerator * areaNumerator;
  const productD = multD * areaD;
  const divisionResultN = dividendNumerator * divisionD;
  const divisionResultD = divisionD * divisorNumerator;
  const operationTrace = useMemo(
    () =>
      buildFractionSolution(
        `${operationMode === 'add' ? 'add' : 'sub'}-${leftD === rightD ? 'same' : 'diff'}-denom`,
        { n1: leftNumerator, d1: leftD, n2: rightNumerator, d2: rightD }
      ),
    [leftD, leftNumerator, operationMode, rightD, rightNumerator]
  );
  const multiplicationTrace = useMemo(
    () =>
      buildFractionSolution('mult-fractions', {
        n1: multNumerator,
        d1: multD,
        n2: areaNumerator,
        d2: areaD,
      }),
    [areaD, areaNumerator, multD, multNumerator]
  );
  const divisionTrace = useMemo(
    () =>
      buildFractionSolution('div-fractions', {
        n1: dividendNumerator,
        d1: divisionD,
        n2: divisorNumerator,
        d2: divisionD,
      }),
    [dividendNumerator, divisionD, divisorNumerator]
  );

  const areaCells = useMemo(
    () =>
      Array.from({ length: multD * areaD }).map((_, index) => {
        const row = Math.floor(index / areaD);
        const col = index % areaD;
        const isRowShaded = row < multNumerator;
        const isColumnShaded = col < areaNumerator;
        return {
          index,
          isRowShaded,
          isColumnShaded,
          isOverlap: isRowShaded && isColumnShaded,
        };
      }),
    [areaD, areaNumerator, multD, multNumerator]
  );
  const divisionCells = useMemo(
    () =>
      Array.from({ length: divisionD }).map((_, index) => ({
        index,
        isInsideDividend: index < dividendNumerator,
        isGroupStart: index % divisorNumerator === 0,
      })),
    [dividendNumerator, divisorNumerator, divisionD]
  );

  const reset = () => {
    setVisualizer('pill');
    setOperationMode('add');
    setLeftNumerator(1);
    setLeftDenomIndex(2);
    setRightNumerator(1);
    setRightDenomIndex(3);
    setMultNumerator(2);
    setMultDenomIndex(1);
    setAreaNumerator(1);
    setAreaDenomIndex(2);
    setDividendNumerator(3);
    setDivisorNumerator(1);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <Link
          href="/teoria"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-indigo-600"
        >
          <ArrowLeft size={16} /> Volver a teoria
        </Link>

        <header className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-200/80">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <Calculator size={26} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            Operaciones con fracciones
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-slate-500">
            Suma, resta, multiplica y divide fracciones mirando que pasa con las partes antes de
            operar con los numeros.
          </p>
          <Button
            asChild
            className="mt-5 h-11 rounded-2xl bg-indigo-600 px-5 font-black"
          >
            <Link href="/practice-guided/fractions">
              <TimerOff className="mr-2 h-4 w-4" /> Practicar paso a paso
            </Link>
          </Button>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/80">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">Visualizador</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Usa la misma fraccion con varias formas para que la idea no dependa de un solo dibujo.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-2xl border-2 border-slate-100 font-black"
              onClick={reset}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
            </Button>
          </div>

          <RadioGroup
            value={visualizer}
            onValueChange={(value) => setVisualizer(value as VisualizerMode)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {visualizerOptions.map((option) => (
              <Label
                key={option.id}
                htmlFor={`operations-visualizer-${option.id}`}
                className={`flex min-h-[104px] cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-all ${
                  visualizer === option.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem id={`operations-visualizer-${option.id}`} value={option.id} />
                  <span className="text-sm font-black">{option.label}</span>
                </div>
                <span className="text-xs font-medium leading-5 text-slate-500">
                  {option.description}
                </span>
              </Label>
            ))}
          </RadioGroup>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/80">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-black text-slate-800">Suma y resta</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Cuando los denominadores son distintos, primero cortamos ambas fracciones en piezas del
              mismo tamaño.
            </p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
              <RadioGroup
                value={operationMode}
                onValueChange={(value) => setOperationMode(value as OperationMode)}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  ['add', 'Sumar'],
                  ['subtract', 'Restar'],
                ].map(([value, label]) => (
                  <Label
                    key={value}
                    htmlFor={`operation-${value}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 font-black ${
                      operationMode === value
                        ? 'border-indigo-500 bg-white text-indigo-700'
                        : 'border-indigo-100 bg-indigo-100/60 text-slate-500'
                    }`}
                  >
                    <RadioGroupItem id={`operation-${value}`} value={value} />
                    {label}
                  </Label>
                ))}
              </RadioGroup>

              <div className="grid gap-4 sm:grid-cols-2">
                <FractionVisual
                  numerator={leftNumerator}
                  denominator={leftD}
                  label={`${leftNumerator}/${leftD}`}
                  mode={visualizer}
                />
                <FractionVisual
                  numerator={rightNumerator}
                  denominator={rightD}
                  label={`${rightNumerator}/${rightD}`}
                  mode={visualizer}
                />
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Igualar denominadores
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FractionVisual
                    numerator={commonLeftN}
                    denominator={commonD}
                    label={`${commonLeftN}/${commonD}`}
                    tone="emerald"
                    mode={visualizer}
                  />
                  <FractionVisual
                    numerator={commonRightN}
                    denominator={commonD}
                    label={`${commonRightN}/${commonD}`}
                    tone="emerald"
                    mode={visualizer}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Resultado
                </p>
                <p className="mt-2 text-3xl font-black text-indigo-700">
                  {operationIsPositive
                    ? `${commonLeftN}/${commonD} ${operationSymbol} ${commonRightN}/${commonD} = ${formatFraction(operationResultN, commonD)}`
                    : 'Elige una primera fraccion mayor para restar.'}
                </p>
              </div>
              <TraceStrip steps={operationTrace} />
            </div>

            <div className="space-y-5">
              <FractionControls
                title="Primera fraccion"
                numerator={leftNumerator}
                denominator={leftD}
                denomIndex={leftDenomIndex}
                onNumeratorChange={setLeftNumerator}
                onDenomIndexChange={(index) => {
                  setLeftDenomIndex(index);
                  setLeftNumerator((current) => Math.min(current, denomChoices[index] - 1));
                }}
              />
              <FractionControls
                title="Segunda fraccion"
                numerator={rightNumerator}
                denominator={rightD}
                denomIndex={rightDenomIndex}
                onNumeratorChange={setRightNumerator}
                onDenomIndexChange={(index) => {
                  setRightDenomIndex(index);
                  setRightNumerator((current) => Math.min(current, denomChoices[index] - 1));
                }}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/80">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-black text-slate-800">Multiplicacion: modelo de area</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Las filas muestran una fraccion y las columnas la otra. El traslape explica el producto.
            </p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <div
                className="mx-auto grid max-w-[420px] overflow-hidden rounded-3xl border-2 border-emerald-500 bg-white"
                style={{ gridTemplateColumns: `repeat(${areaD}, minmax(0, 1fr))` }}
              >
                {areaCells.map((cell) => (
                  <div
                    key={cell.index}
                    className={`aspect-square border border-white ${
                      cell.isOverlap
                        ? 'bg-emerald-500 shadow-inner ring-2 ring-inset ring-emerald-700/20'
                          : cell.isRowShaded
                            ? 'bg-indigo-200'
                            : cell.isColumnShaded
                              ? 'bg-amber-200'
                              : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-5 rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Celdas con doble sombreado
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {multNumerator}/{multD} x {areaNumerator}/{areaD} = {formatFraction(productN, productD)}
                </p>
              </div>
              <TraceStrip steps={multiplicationTrace} />
            </div>

            <div className="space-y-5">
              <FractionControls
                title="Filas sombreadas"
                numerator={multNumerator}
                denominator={multD}
                denomIndex={multDenomIndex}
                onNumeratorChange={setMultNumerator}
                onDenomIndexChange={(index) => {
                  setMultDenomIndex(index);
                  setMultNumerator((current) => Math.min(current, denomChoices[index] - 1));
                }}
              />
              <FractionControls
                title="Columnas sombreadas"
                numerator={areaNumerator}
                denominator={areaD}
                denomIndex={areaDenomIndex}
                onNumeratorChange={setAreaNumerator}
                onDenomIndexChange={(index) => {
                  setAreaDenomIndex(index);
                  setAreaNumerator((current) => Math.min(current, denomChoices[index] - 1));
                }}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/80">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <Divide size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Division: invertir y multiplicar</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Mira cuantas fracciones pequenas caben dentro de una fraccion mayor.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <FractionVisual
                    numerator={dividendNumerator}
                    denominator={divisionD}
                    label={`fraccion grande ${dividendNumerator}/${divisionD}`}
                    mode={visualizer}
                  />
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <FractionVisual
                    numerator={divisorNumerator}
                    denominator={divisionD}
                    label={`tamano ${divisorNumerator}/${divisionD}`}
                    mode={visualizer}
                  />
                </div>
                <div className="flex min-h-[172px] flex-col items-center justify-center rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Se invierte
                  </p>
                  <div className="mt-3 inline-flex flex-col items-center text-4xl font-black leading-none text-indigo-700">
                    <span>{divisionD}</span>
                    <span className="my-2 h-1 w-14 rounded-full bg-indigo-700" />
                    <span>{divisorNumerator}</span>
                  </div>
                  <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">
                    reciproca
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Cuantos caben
                </p>
                <div className="mt-3 flex overflow-hidden rounded-2xl border-2 border-indigo-500 bg-white">
                  {divisionCells.map((cell) => (
                    <div
                      key={cell.index}
                      className={`h-12 flex-1 ${
                        cell.isInsideDividend ? 'bg-indigo-400' : 'bg-indigo-50'
                      } ${
                        cell.index === 0
                          ? ''
                          : cell.isGroupStart
                            ? 'border-l-4 border-indigo-700'
                            : 'border-l border-white'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm font-bold text-slate-500">
                  Cada marco tiene {divisorNumerator} de {divisionD} partes.
                </p>
              </div>
              <div className="mt-5 rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Invertir la segunda fraccion
                </p>
                <p className="mt-2 text-3xl font-black text-indigo-700">
                  {dividendNumerator}/{divisionD} ÷ {divisorNumerator}/{divisionD} = {dividendNumerator}/{divisionD} x {divisionD}/{divisorNumerator} = {formatFraction(divisionResultN, divisionResultD)}
                </p>
              </div>
              <TraceStrip steps={divisionTrace} />
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Fraccion grande</span>
                  <span className="text-xl font-black text-indigo-600">
                    {dividendNumerator}/{divisionD}
                  </span>
                </div>
                <Slider
                  value={[dividendNumerator]}
                  aria-label="Fraccion grande"
                  min={1}
                  max={divisionD}
                  step={1}
                  onValueChange={(value) => setDividendNumerator(value[0])}
                />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Tamano que debe caber</span>
                  <span className="text-xl font-black text-indigo-600">
                    {divisorNumerator}/{divisionD}
                  </span>
                </div>
                <Slider
                  value={[divisorNumerator]}
                  aria-label="Tamano que debe caber"
                  min={1}
                  max={divisionD}
                  step={1}
                  onValueChange={(value) => setDivisorNumerator(value[0])}
                />
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold leading-6 text-slate-600">
                  Pregunta guia: cuantos grupos de {divisorNumerator}/{divisionD} caben dentro de{' '}
                  {dividendNumerator}/{divisionD}?
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TraceStrip({ steps }: { steps: SolutionStep[] }) {
  return (
    <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        Pasos compartidos
      </p>
      <div className="mt-3 space-y-2">
        {steps.slice(0, 5).map((step) => (
          <div key={step.id} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs font-black text-slate-700">{step.title}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              {step.instruction} {step.resultLine}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FractionControls({
  title,
  numerator,
  denominator,
  denomIndex,
  onNumeratorChange,
  onDenomIndexChange,
}: {
  title: string;
  numerator: number;
  denominator: number;
  denomIndex: number;
  onNumeratorChange: (value: number) => void;
  onDenomIndexChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-black text-slate-700">{title}</span>
        <span className="text-xl font-black text-indigo-600">
          {numerator}/{denominator}
        </span>
      </div>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
            <span>Numerador</span>
            <span>{numerator}</span>
          </div>
          <Slider
            value={[numerator]}
            aria-label={`${title}: numerador`}
            min={1}
            max={denominator - 1}
            step={1}
            onValueChange={(value) => onNumeratorChange(value[0])}
          />
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
            <span>Denominador</span>
            <span>{denominator}</span>
          </div>
          <Slider
            value={[denomIndex]}
            aria-label={`${title}: denominador`}
            min={0}
            max={denomChoices.length - 1}
            step={1}
            onValueChange={(value) => onDenomIndexChange(value[0])}
          />
        </div>
      </div>
    </div>
  );
}
