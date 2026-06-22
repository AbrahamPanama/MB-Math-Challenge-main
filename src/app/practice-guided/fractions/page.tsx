'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Gauge, Moon, RotateCcw, Sparkles, TimerOff } from 'lucide-react';
import { SolutionSteps } from '@/components/practice/SolutionSteps';
import { Button } from '@/components/ui/button';
import { buildFractionSolution } from '@/lib/fraction-solution';
import { generateProblem } from '@/lib/practice-engine';
import { getActiveSave } from '@/lib/saveManager';
import type { GradeLevel, Problem } from '@/lib/types';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const patternLabels: Record<string, string> = {
  'add-same-denom': 'Suma con igual denominador',
  'add-diff-denom': 'Suma con denominador comun',
  'sub-same-denom': 'Resta con igual denominador',
  'sub-diff-denom': 'Resta con denominador comun',
  'mixed-add': 'Suma de mixtos',
  'mixed-sub': 'Resta de mixtos',
  'mult-fractions': 'Multiplicacion de fracciones',
  'mult-natural': 'Natural por fraccion',
  'mult-mixed': 'Multiplicacion con mixtos',
  'div-fractions': 'Division de fracciones',
  'div-mixed': 'Division con mixtos',
  equivalent: 'Fracciones equivalentes',
  simplify: 'Simplificar',
  'reverse-simplify': 'Equivalencia',
  'mixed-to-improper': 'Mixto a impropia',
  'improper-to-mixed': 'Impropia a mixto',
  compare: 'Comparar fracciones',
  'frac-of-number': 'Fraccion de un numero',
  'reverse-frac-of-number': 'Encontrar el total',
};

function pickProblem(grade: GradeLevel, ordinal: number, preferredPattern?: string | null) {
  if (!preferredPattern) return generateProblem('fractions', ordinal % 20, grade);

  for (let attempts = 0; attempts < 120; attempts += 1) {
    const problem = generateProblem('fractions', (ordinal + attempts) % 20, grade);
    if (problem.metadata.pattern === preferredPattern) return problem;
  }

  return generateProblem('fractions', ordinal % 20, grade);
}

export default function GuidedFractionsPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(6);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [ordinal, setOrdinal] = useState(0);
  const [complete, setComplete] = useState(false);
  const [calmMode, setCalmMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('mm20-calm') === 'true';
  });

  useEffect(() => {
    const save = getActiveSave();
    const nextGrade = save?.gradeLevel ?? 6;
    setGradeLevel(nextGrade);
    setProblem(pickProblem(nextGrade, 0));
  }, []);

  const steps = useMemo(
    () =>
      problem
        ? buildFractionSolution(problem.metadata.pattern, problem.metadata.challengeSeed)
        : [],
    [problem]
  );

  const chooseNewProblem = (samePattern: boolean) => {
    const nextOrdinal = ordinal + 1;
    const nextProblem = pickProblem(
      gradeLevel,
      nextOrdinal,
      samePattern ? problem?.metadata.pattern : null
    );
    setOrdinal(nextOrdinal);
    setProblem(nextProblem);
    setComplete(false);
  };

  const toggleCalmMode = () => {
    setCalmMode((value) => {
      const next = !value;
      localStorage.setItem('mm20-calm', String(next));
      if (next) localStorage.setItem('mm20-music-muted', 'true');
      return next;
    });
  };

  const motionCalm = calmMode || prefersReducedMotion;
  const patternLabel = problem
    ? patternLabels[problem.metadata.pattern] ?? problem.metadata.pattern
    : 'Fracciones';

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans text-slate-900 md:p-8">
      <main className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/practice/fractions"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft size={16} /> Volver a practica
          </Link>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-2xl border-2 border-slate-100 font-black"
              onClick={toggleCalmMode}
            >
              <Moon className="mr-2 h-4 w-4" />
              {calmMode ? 'Modo calma' : 'Calma off'}
            </Button>
            <Link
              href="/practice/fractions"
              className="inline-flex h-10 items-center rounded-2xl bg-slate-900 px-4 text-sm font-black text-white"
            >
              <Gauge className="mr-2 h-4 w-4" /> Rapido
            </Link>
          </div>
        </div>

        <header className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-200/80">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <TimerOff size={26} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            Fracciones paso a paso
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Sin reloj. Un paso por vez. Cada paso terminado se queda visible para que no tengas que
            cargar todo en la memoria.
          </p>
        </header>

        {problem && (
          <>
            <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/80">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                    {patternLabel}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-800">
                    Resuelve mirando el camino
                  </h2>
                </div>
                <span className="rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  Grado {gradeLevel}
                </span>
              </div>
              <div
                className={`min-h-[130px] rounded-3xl bg-indigo-50 p-6 text-center text-5xl font-black leading-none text-slate-800 ${
                  motionCalm ? '' : 'animate-pop'
                }`}
                dangerouslySetInnerHTML={{ __html: problem.text }}
              />
            </section>

            <SolutionSteps
              steps={steps}
              calmMode={motionCalm}
              onComplete={() => setComplete(true)}
            />

            <section className="grid gap-3 rounded-3xl bg-white p-5 shadow-xl shadow-slate-200/80 sm:grid-cols-2">
              <Button
                className="h-12 rounded-2xl bg-indigo-600 font-black"
                onClick={() => chooseNewProblem(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Otra igual
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-2 border-slate-100 font-black"
                onClick={() => chooseNewProblem(false)}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Otro tipo
              </Button>
              {complete && (
                <p className="sm:col-span-2 text-center text-sm font-bold text-emerald-700">
                  Buen trabajo: ya tienes el procedimiento completo a la vista.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
