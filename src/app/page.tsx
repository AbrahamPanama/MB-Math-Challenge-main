'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveSave } from '@/lib/saveManager';
import type { SaveSlot, Category } from '@/lib/types';

const CategoryButton = ({
  href,
  title,
  time,
  focus,
  bestTime,
}: {
  href: string;
  title: string;
  time: string;
  focus: string;
  bestTime?: number | null;
}) => (
  <Link
    href={href}
    className="w-full p-4 bg-white border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl flex items-center justify-between group transition-all shadow-sm hover:shadow-md"
  >
    <div className="text-left">
      <span className="block font-bold text-slate-700 text-lg">{title}</span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded text-[10px]">{time}</span>
        {bestTime !== null && bestTime !== undefined && (
          <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px]">⚡ {bestTime.toFixed(1)}s</span>
        )}
      </div>
      <span className="text-xs text-indigo-500 block mt-1">{focus}</span>
    </div>
    <span className="text-slate-300 group-hover:text-indigo-500 text-2xl transition-colors">→</span>
  </Link>
);

export default function Home() {
  const router = useRouter();
  const [save, setSave] = useState<SaveSlot | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = getActiveSave();
    if (!s) {
      router.push('/save-select');
      return;
    }
    setSave(s);
    setMounted(true);
  }, [router]);

  if (!mounted || !save) return null;

  const accuracy = save.totalQuestions > 0 ? Math.round((save.totalCorrect / save.totalQuestions) * 100) : 0;

  const getBestTime = (cat: Category) => save.stats[cat]?.bestTime ?? null;

  return (
    <div id="app" className="w-full min-h-screen sm:min-h-0 sm:max-w-lg sm:mx-auto sm:my-8 bg-white sm:rounded-2xl sm:shadow-2xl overflow-hidden sm:border sm:border-slate-100 relative">
      <div className="bg-indigo-600 p-6 text-white transition-colors duration-500 relative overflow-hidden" id="header-bg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>MathMaster 20</span>
          </h1>
          <button
            onClick={() => router.push('/save-select')}
            className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 hover:bg-white/30 transition-all"
          >
            <span className="text-[10px] font-mono opacity-90">
              💾 {save.playerName}
            </span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 relative z-10">
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Partidas</p>
            <p id="score" className="text-2xl font-black tabular-nums">{save.totalGames}</p>
          </div>
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Precisión</p>
            <p className="text-2xl font-black tabular-nums">{accuracy}%</p>
          </div>
          <div className="text-center bg-indigo-700/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-500/30">
            <p className="text-indigo-200 text-[9px] uppercase font-bold tracking-widest mb-1">Aciertos</p>
            <p id="best-time" className="text-2xl font-black tabular-nums">{save.totalCorrect}</p>
          </div>
        </div>
      </div>

      <div id="screen-container" className="p-6">
        <div id="menu-screen" className="space-y-4 py-2">
          <div className="text-center mb-8">
            <span className="text-4xl block mb-2">🧠</span>
            <h2 className="text-2xl font-bold text-slate-800">Entrenamiento Mental</h2>
            <p className="text-slate-500 text-sm mt-1">Supera las 20 preguntas antes de que se agote el tiempo.</p>
          </div>
          <CategoryButton href="/practice/multiplication" title="Multiplicación" time="2:00 MIN" focus="Enfoque: Tablas 6, 7, 8, 9" bestTime={getBestTime('multiplication')} />
          <CategoryButton href="/practice/addition" title="Sumas" time="2:00 MIN" focus="Enfoque: Llevadas difíciles" bestTime={getBestTime('addition')} />
          <CategoryButton href="/practice/divisibility" title="Divisibilidad" time="1:30 MIN" focus="Enfoque: Reglas del 3 y 9" bestTime={getBestTime('divisibility')} />
          <CategoryButton href="/practice/fractions" title="Fracciones" time="2:00 MIN" focus="Enfoque: Simplificar, comparar, operar" bestTime={getBestTime('fractions')} />

          {/* Stats & Switch Player */}
          <div className="pt-4 flex gap-3">
            <Link
              href="/stats"
              className="flex-1 py-3 text-center bg-slate-50 border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl font-bold text-sm text-slate-500 hover:text-indigo-600 transition-all"
            >
              📊 Estadísticas
            </Link>
            <button
              onClick={() => router.push('/save-select')}
              className="flex-1 py-3 text-center bg-slate-50 border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl font-bold text-sm text-slate-500 hover:text-indigo-600 transition-all"
            >
              💾 Cambiar Jugador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
