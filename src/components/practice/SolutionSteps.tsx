'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SolutionStep, StepVisual } from '@/lib/fraction-solution';
import {
  fractionToneClasses,
  fractionToneCopy,
  type FractionTone,
} from '@/lib/fraction-visual-tokens';

type SolutionStepsProps = {
  steps: SolutionStep[];
  onComplete?: () => void;
  calmMode?: boolean;
  className?: string;
};

function FractionToken({
  n,
  d,
  tone,
  label,
}: {
  n: number | string;
  d: number | string;
  tone: FractionTone;
  label?: string;
}) {
  const toneClasses = fractionToneClasses[tone];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`inline-flex flex-col items-center font-black leading-none ${toneClasses.text}`}>
        <span>{n}</span>
        <span className={`my-1 h-1 w-12 rounded-full ${toneClasses.bg}`} />
        <span>{d}</span>
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label ?? fractionToneCopy[tone]}
      </span>
    </div>
  );
}

function BarVisual({
  fraction,
  tone,
}: {
  fraction: { n: number; d: number };
  tone: FractionTone;
}) {
  const toneClasses = fractionToneClasses[tone];
  const filled = Math.max(0, Math.min(fraction.n, fraction.d));
  return (
    <div className="space-y-2">
      <div className={`flex h-10 overflow-hidden rounded-full border-2 bg-white ${toneClasses.border}`}>
        {Array.from({ length: Math.max(1, fraction.d) }).map((_, index) => (
          <span
            key={index}
            className={`flex-1 ${index < filled ? toneClasses.fill : toneClasses.empty} ${
              index === fraction.d - 1 ? '' : 'border-r border-white'
            }`}
          />
        ))}
      </div>
      <p className={`text-center text-xs font-black ${toneClasses.text}`}>
        {fraction.n}/{fraction.d}
      </p>
    </div>
  );
}

function AreaVisual({ visual }: { visual: Extract<StepVisual, { kind: 'area' }> }) {
  const cells = useMemo(
    () =>
      Array.from({ length: visual.a.d * visual.b.d }).map((_, index) => {
        const row = Math.floor(index / visual.b.d);
        const col = index % visual.b.d;
        return {
          index,
          rowShaded: row < visual.a.n,
          colShaded: col < visual.b.n,
        };
      }),
    [visual.a.d, visual.a.n, visual.b.d, visual.b.n]
  );

  return (
    <div className="space-y-3">
      <div
        className="mx-auto grid max-w-[300px] overflow-hidden rounded-2xl border-2 border-amber-300 bg-white"
        style={{ gridTemplateColumns: `repeat(${visual.b.d}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.index}
            className={`aspect-square border border-white ${
              cell.rowShaded && cell.colShaded
                ? 'bg-amber-400'
                : cell.rowShaded
                  ? 'bg-indigo-200'
                  : cell.colShaded
                    ? 'bg-emerald-200'
                    : 'bg-slate-100'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-xs font-bold text-slate-500">
        Doble sombreado: {visual.a.n * visual.b.n} de {visual.a.d * visual.b.d} celdas.
      </p>
    </div>
  );
}

function StepVisualRenderer({ visual }: { visual: StepVisual }) {
  if (visual.kind === 'fractions') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-white p-4">
        {visual.items.map((item, index) => (
          <div key={`${item.tone}-${index}`} className="flex items-center gap-4">
            {index > 0 && visual.op && (
              <span className="text-2xl font-black text-slate-300">{visual.op}</span>
            )}
            <FractionToken n={item.n} d={item.d} tone={item.tone} label={item.label} />
          </div>
        ))}
      </div>
    );
  }

  if (visual.kind === 'bars') {
    return (
      <div className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <BarVisual fraction={visual.a} tone="a" />
        {visual.b && <BarVisual fraction={visual.b} tone="b" />}
        {visual.result && <BarVisual fraction={visual.result} tone="result" />}
      </div>
    );
  }

  if (visual.kind === 'area') {
    return <AreaVisual visual={visual} />;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-5 rounded-2xl bg-white p-4">
      <FractionToken n={visual.from.n} d={visual.from.d} tone="b" label="Original" />
      <span className="text-3xl font-black text-slate-300">→</span>
      <FractionToken n={visual.to.n} d={visual.to.d} tone="result" label="Reciproco" />
    </div>
  );
}

export function SolutionSteps({
  steps,
  onComplete,
  calmMode = false,
  className = '',
}: SolutionStepsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<string | number | null>(null);
  const [reportedComplete, setReportedComplete] = useState(false);
  const activeStep = steps[activeIndex] ?? null;
  const completedSteps = steps.slice(0, Math.min(activeIndex, steps.length));
  const isComplete = activeIndex >= steps.length;

  useEffect(() => {
    setActiveIndex(0);
    setWrongChoice(null);
    setReportedComplete(false);
  }, [steps]);

  useEffect(() => {
    if (!isComplete || reportedComplete) return;
    setReportedComplete(true);
    onComplete?.();
  }, [isComplete, onComplete, reportedComplete]);

  const advance = () => {
    setWrongChoice(null);
    setActiveIndex((index) => Math.min(index + 1, steps.length));
  };

  const choose = (choice: string | number) => {
    if (!activeStep?.micro) return;
    if (String(choice) === String(activeStep.micro.answer)) {
      advance();
      return;
    }
    setWrongChoice(choice);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {completedSteps.length > 0 && (
        <div className="space-y-2" aria-label="Pasos completados">
          {completedSteps.map((step) => (
            <div
              key={step.id}
              className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm"
            >
              <p className="font-black text-emerald-700">✓ {step.title}</p>
              <p className="mt-1 font-medium text-emerald-900">{step.resultLine}</p>
            </div>
          ))}
        </div>
      )}

      {activeStep && (
        <section
          className="rounded-3xl border-2 border-indigo-100 bg-indigo-50 p-5 shadow-sm"
          aria-live="polite"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                Paso {activeIndex + 1} / {steps.length}
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-800">{activeStep.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                {activeStep.instruction}
              </p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-indigo-600">
              {activeIndex + 1}/{steps.length}
            </div>
          </div>

          <StepVisualRenderer visual={activeStep.visual} />

          <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700">
            {activeStep.resultLine}
          </div>

          {activeStep.micro ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-black text-slate-700">{activeStep.micro.prompt}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {activeStep.micro.choices.map((choice) => (
                  <button
                    key={String(choice)}
                    onClick={() => choose(choice)}
                    className="min-h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 py-3 text-lg font-black text-slate-700 transition-all hover:border-indigo-300 hover:text-indigo-700 active:scale-95"
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {wrongChoice !== null && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-800">
                  {activeStep.micro.misconception ??
                    `Casi. La respuesta de este paso es ${activeStep.micro.answer}. Intentalo otra vez.`}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={advance}
              className="mt-4 w-full rounded-2xl bg-indigo-600 px-4 py-3 font-black text-white transition-all hover:bg-indigo-700 active:scale-95"
            >
              Entendido
            </button>
          )}
        </section>
      )}

      {isComplete && (
        <div
          className={`rounded-3xl border border-amber-100 bg-amber-50 p-5 text-center ${
            calmMode ? '' : 'animate-pop'
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
            Recap completo
          </p>
          <p className="mt-2 text-lg font-black text-amber-800">
            Ya resolviste todos los pasos. Ahora la respuesta no salio de memoria: salio del camino.
          </p>
        </div>
      )}
    </div>
  );
}
