'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Equal, Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  FractionVisual,
  type VisualizerMode,
  visualizerOptions,
} from '@/components/teoria/FractionVisual';

export default function FractionsDemo() {
  const [whole, setWhole] = useState(1);
  const [numerator, setNumerator] = useState(2);
  const [denominator, setDenominator] = useState(5);
  const [factor, setFactor] = useState(2);
  const [visualizer, setVisualizer] = useState<VisualizerMode>('pill');

  const improperNumerator = whole * denominator + numerator;
  const equivalentNumerator = numerator * factor;
  const equivalentDenominator = denominator * factor;

  const updateDenominator = (nextDenominator: number) => {
    setDenominator(nextDenominator);
    setNumerator((current) => Math.min(current, nextDenominator - 1));
  };

  const reset = () => {
    setWhole(1);
    setNumerator(2);
    setDenominator(5);
    setFactor(2);
    setVisualizer('pill');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <Link
          href="/teoria"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-indigo-600"
        >
          <ArrowLeft size={16} /> Volver a teoria
        </Link>

        <header className="rounded-3xl bg-white p-6 text-center shadow-xl shadow-slate-200/80">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
            <BookOpen size={26} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            Fracciones mixtas y equivalentes
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-slate-500">
            Mira como una fraccion mixta junta unidades completas con una parte, y como una
            fraccion equivalente conserva el mismo tamano aunque tenga mas piezas.
          </p>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/80">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-800">Elige un visualizador</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Cambia la forma para ver la misma fraccion con objetos distintos.
            </p>
          </div>

          <RadioGroup
            value={visualizer}
            onValueChange={(value) => setVisualizer(value as VisualizerMode)}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {visualizerOptions.map((option) => (
              <Label
                key={option.id}
                htmlFor={`visualizer-${option.id}`}
                className={`flex min-h-[104px] cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-all ${
                  visualizer === option.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem id={`visualizer-${option.id}`} value={option.id} />
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
            <h2 className="text-xl font-black text-slate-800">Numero mixto</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Cada visual completo cuenta como una unidad. El visual parcial muestra la fraccion
              que queda.
            </p>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
              <div className="mb-5 flex flex-wrap justify-center gap-3">
                {Array.from({ length: whole }).map((_, index) => (
                  <div key={index} className="w-48">
                    <FractionVisual
                      numerator={denominator}
                      denominator={denominator}
                      label="1 entero"
                      mode={visualizer}
                    />
                  </div>
                ))}
                <div className="w-48">
                  <FractionVisual
                    numerator={numerator}
                    denominator={denominator}
                    label={`${numerator}/${denominator}`}
                    mode={visualizer}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Conversion
                </p>
                <p className="mt-2 text-3xl font-black text-indigo-700">
                  {whole} {numerator}/{denominator} = {improperNumerator}/{denominator}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Enteros</span>
                  <span className="text-xl font-black text-indigo-600">{whole}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-xl border-2"
                    onClick={() => setWhole((value) => Math.max(1, value - 1))}
                  >
                    <Minus className="mr-2 h-4 w-4" /> Quitar
                  </Button>
                  <Button
                    className="h-11 flex-1 rounded-xl bg-indigo-600"
                    onClick={() => setWhole((value) => Math.min(3, value + 1))}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Agregar
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Partes sombreadas</span>
                  <span className="text-xl font-black text-indigo-600">{numerator}</span>
                </div>
                <Slider
                  value={[numerator]}
                  aria-label="Partes sombreadas"
                  min={1}
                  max={denominator - 1}
                  step={1}
                  onValueChange={(value) => setNumerator(value[0])}
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Partes por unidad</span>
                  <span className="text-xl font-black text-indigo-600">{denominator}</span>
                </div>
                <Slider
                  value={[denominator]}
                  aria-label="Partes por unidad"
                  min={2}
                  max={10}
                  step={1}
                  onValueChange={(value) => updateDenominator(value[0])}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/80">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <Equal size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Fracciones equivalentes</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  La cantidad sombreada no cambia. Solo dividimos la misma unidad en mas partes.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="space-y-6">
                <FractionVisual
                  numerator={numerator}
                  denominator={denominator}
                  label={`${numerator}/${denominator}`}
                  tone="emerald"
                  mode={visualizer}
                />
                <FractionVisual
                  numerator={equivalentNumerator}
                  denominator={equivalentDenominator}
                  label={`${equivalentNumerator}/${equivalentDenominator}`}
                  tone="emerald"
                  mode={visualizer}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-white p-5 text-center shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Mismo tamano
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  {numerator}/{denominator} = {equivalentNumerator}/{equivalentDenominator}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-700">Multiplicar piezas por</span>
                  <span className="text-xl font-black text-emerald-600">{factor}</span>
                </div>
                <Slider
                  value={[factor]}
                  aria-label="Multiplicar piezas por"
                  min={2}
                  max={5}
                  step={1}
                  onValueChange={(value) => setFactor(value[0])}
                />
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-bold leading-6 text-slate-600">
                  Multiplica numerador y denominador por el mismo numero. El visual se divide en
                  mas piezas, pero la parte sombreada ocupa el mismo espacio.
                </p>
              </div>

              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-2 border-slate-100 font-black"
                onClick={reset}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar visual
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
